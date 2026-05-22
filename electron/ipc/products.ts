import { IpcMain, dialog, app } from 'electron'
import { prisma } from '../services/database'
import { join } from 'path'
import * as fs from 'fs'

interface ProductFilters {
  category?: string
  search?: string
  lowStock?: boolean
  isActive?: boolean
}

interface CreateProductPayload {
  productName: string
  sku: string
  barcode?: string
  category?: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  lowStockLimit?: number
  image?: string
}

/**
 * Registers all product-related IPC handlers.
 */
export function registerProductHandlers(ipcMain: IpcMain): void {
  // ==================== GET ALL PRODUCTS ====================
  ipcMain.handle('products:getAll', async (_event, filters: ProductFilters = {}) => {
    try {
      const where: Record<string, unknown> = { isActive: true }

      if (filters.category) where['category'] = filters.category
      if (filters.lowStock) {
        // Products where quantity <= lowStockLimit
        // We handle this in post-filter since SQLite doesn't support column comparisons easily
      }
      if (filters.search) {
        where['OR'] = [
          { productName: { contains: filters.search } },
          { sku: { contains: filters.search } },
          { barcode: { contains: filters.search } }
        ]
      }

      let products = await prisma.product.findMany({
        where,
        orderBy: { productName: 'asc' }
      })

      if (filters.lowStock) {
        products = products.filter((p) => p.quantity <= p.lowStockLimit)
      }

      return { success: true, data: products }
    } catch (error) {
      console.error('[IPC:products:getAll] Error:', error)
      return { success: false, error: 'Failed to fetch products' }
    }
  })

  // ==================== GET BY ID ====================
  ipcMain.handle('products:getById', async (_event, id: number) => {
    try {
      const product = await prisma.product.findUnique({ where: { id } })
      if (!product) return { success: false, error: 'Product not found' }
      return { success: true, data: product }
    } catch (error) {
      console.error('[IPC:products:getById] Error:', error)
      return { success: false, error: 'Failed to fetch product' }
    }
  })

  // ==================== CREATE PRODUCT ====================
  ipcMain.handle('products:create', async (_event, data: CreateProductPayload) => {
    try {
      // Check for duplicate SKU
      const existing = await prisma.product.findFirst({ where: { sku: data.sku } })
      if (existing) return { success: false, error: 'SKU already exists' }

      const product = await prisma.product.create({ data })

      // Log initial inventory
      if (data.quantity > 0) {
        await prisma.inventoryLog.create({
          data: {
            productId: product.id,
            type: 'INITIAL',
            quantity: data.quantity,
            notes: 'Initial stock'
          }
        })
      }

      return { success: true, data: product }
    } catch (error) {
      console.error('[IPC:products:create] Error:', error)
      return { success: false, error: 'Failed to create product' }
    }
  })

  // ==================== UPDATE PRODUCT ====================
  ipcMain.handle('products:update', async (_event, id: number, data: Partial<CreateProductPayload>) => {
    try {
      // If quantity changed, log inventory adjustment
      if (data.quantity !== undefined) {
        const existing = await prisma.product.findUnique({ where: { id } })
        if (existing && existing.quantity !== data.quantity) {
          const diff = data.quantity - existing.quantity
          await prisma.inventoryLog.create({
            data: {
              productId: id,
              type: 'ADJUSTMENT',
              quantity: diff,
              notes: 'Manual quantity adjustment'
            }
          })
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: { ...data, updatedAt: new Date() }
      })
      return { success: true, data: product }
    } catch (error) {
      console.error('[IPC:products:update] Error:', error)
      return { success: false, error: 'Failed to update product' }
    }
  })

  // ==================== DELETE PRODUCT (soft delete) ====================
  ipcMain.handle('products:delete', async (_event, id: number) => {
    try {
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      })
      return { success: true }
    } catch (error) {
      console.error('[IPC:products:delete] Error:', error)
      return { success: false, error: 'Failed to delete product' }
    }
  })

  // ==================== SEARCH PRODUCTS ====================
  ipcMain.handle('products:search', async (_event, query: string) => {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { productName: { contains: query } },
            { sku: { contains: query } },
            { barcode: { equals: query } }
          ]
        },
        take: 20,
        orderBy: { productName: 'asc' }
      })
      return { success: true, data: products }
    } catch (error) {
      console.error('[IPC:products:search] Error:', error)
      return { success: false, error: 'Search failed' }
    }
  })

  // ==================== GET LOW STOCK ====================
  ipcMain.handle('products:getLowStock', async () => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true }
      })
      const lowStock = products.filter((p) => p.quantity <= p.lowStockLimit)
      return { success: true, data: lowStock }
    } catch (error) {
      console.error('[IPC:products:getLowStock] Error:', error)
      return { success: false, error: 'Failed to fetch low stock products' }
    }
  })

  // ==================== GET CATEGORIES ====================
  ipcMain.handle('products:getCategories', async () => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true, category: { not: null } },
        select: { category: true },
        distinct: ['category']
      })
      const categories = products.map((p) => p.category).filter(Boolean)
      return { success: true, data: categories }
    } catch (error) {
      console.error('[IPC:products:getCategories] Error:', error)
      return { success: false, error: 'Failed to fetch categories' }
    }
  })

  // ==================== IMPORT CSV ====================
  ipcMain.handle('products:importCSV', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Products CSV',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      const csvContent = fs.readFileSync(result.filePaths[0], 'utf-8')
      const lines = csvContent.trim().split('\n')
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

      let imported = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] || ''
        })

        try {
          await prisma.product.upsert({
            where: { sku: row['sku'] || `SKU-${Date.now()}-${i}` },
            update: {
              productName: row['productname'] || row['name'] || 'Unknown',
              category: row['category'] || null,
              purchasePrice: parseFloat(row['purchaseprice'] || '0'),
              sellingPrice: parseFloat(row['sellingprice'] || row['price'] || '0'),
              quantity: parseInt(row['quantity'] || '0'),
              lowStockLimit: parseInt(row['lowstocklimit'] || '10'),
              barcode: row['barcode'] || null
            },
            create: {
              sku: row['sku'] || `SKU-${Date.now()}-${i}`,
              productName: row['productname'] || row['name'] || 'Unknown',
              category: row['category'] || null,
              purchasePrice: parseFloat(row['purchaseprice'] || '0'),
              sellingPrice: parseFloat(row['sellingprice'] || row['price'] || '0'),
              quantity: parseInt(row['quantity'] || '0'),
              lowStockLimit: parseInt(row['lowstocklimit'] || '10'),
              barcode: row['barcode'] || null
            }
          })
          imported++
        } catch (err) {
          failed++
          errors.push(`Row ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      return {
        success: true,
        data: { imported, failed, errors: errors.slice(0, 10) }
      }
    } catch (error) {
      console.error('[IPC:products:importCSV] Error:', error)
      return { success: false, error: 'Failed to import CSV' }
    }
  })

  // ==================== EXPORT CSV ====================
  ipcMain.handle('products:exportCSV', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Products',
        defaultPath: `products-export-${new Date().toISOString().split('T')[0]}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { productName: 'asc' }
      })

      const headers = [
        'ID', 'Product Name', 'SKU', 'Barcode', 'Category',
        'Purchase Price', 'Selling Price', 'Quantity', 'Low Stock Limit', 'Created At'
      ]

      const rows = products.map((p) => [
        p.id, `"${p.productName}"`, p.sku, p.barcode || '',
        `"${p.category || ''}"`, p.purchasePrice, p.sellingPrice,
        p.quantity, p.lowStockLimit, p.createdAt.toISOString()
      ])

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      fs.writeFileSync(result.filePath, csv, 'utf-8')

      return { success: true, data: { path: result.filePath, count: products.length } }
    } catch (error) {
      console.error('[IPC:products:exportCSV] Error:', error)
      return { success: false, error: 'Failed to export CSV' }
    }
  })
  // ==================== PICK PRODUCT IMAGE ====================
  ipcMain.handle('products:pickImage', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Product Image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No image selected' }
      }

      const srcPath = result.filePaths[0]
      const ext = srcPath.split('.').pop() || 'jpg'
      const filename = `product-${Date.now()}.${ext}`
      const imagesDir = join(app.getPath('userData'), 'product-images')

      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true })
      }

      const destPath = join(imagesDir, filename)
      fs.copyFileSync(srcPath, destPath)

      return { success: true, data: { path: destPath, filename } }
    } catch (error) {
      console.error('[IPC:products:pickImage] Error:', error)
      return { success: false, error: 'Failed to pick image' }
    }
  })

  // ==================== GET ALL CATEGORIES ====================
  ipcMain.handle('categories:getAll', async () => {
    try {
      const categories = await (prisma as any).$queryRaw`
        SELECT id, name, description, color, createdAt FROM "Category" ORDER BY name ASC
      `
      return { success: true, data: categories }
    } catch (error) {
      console.error('[IPC:categories:getAll] Error:', error)
      return { success: false, error: 'Failed to fetch categories' }
    }
  })

  // ==================== CREATE CATEGORY ====================
  ipcMain.handle('categories:create', async (_event, data: { name: string; description?: string; color?: string }) => {
    try {
      // Check duplicate
      const existing = await (prisma as any).$queryRaw`
        SELECT id FROM "Category" WHERE name = ${data.name} LIMIT 1
      ` as any[]
      if (existing.length > 0) {
        return { success: false, error: 'Category already exists' }
      }

      await (prisma as any).$executeRaw`
        INSERT INTO "Category" (name, description, color, createdAt)
        VALUES (${data.name}, ${data.description || null}, ${data.color || '#27AAE1'}, datetime('now'))
      `
      const created = await (prisma as any).$queryRaw`
        SELECT id, name, description, color, createdAt FROM "Category" WHERE name = ${data.name} LIMIT 1
      `
      return { success: true, data: (created as any[])[0] }
    } catch (error) {
      console.error('[IPC:categories:create] Error:', error)
      return { success: false, error: 'Failed to create category' }
    }
  })

  // ==================== UPDATE CATEGORY ====================
  ipcMain.handle('categories:update', async (_event, id: number, data: { name?: string; description?: string; color?: string }) => {
    try {
      if (data.name) {
        await (prisma as any).$executeRaw`
          UPDATE "Category" SET name = ${data.name}, description = ${data.description || null}, color = ${data.color || '#27AAE1'}
          WHERE id = ${id}
        `
      }
      const updated = await (prisma as any).$queryRaw`
        SELECT id, name, description, color, createdAt FROM "Category" WHERE id = ${id} LIMIT 1
      `
      return { success: true, data: (updated as any[])[0] }
    } catch (error) {
      console.error('[IPC:categories:update] Error:', error)
      return { success: false, error: 'Failed to update category' }
    }
  })

  // ==================== DELETE CATEGORY ====================
  ipcMain.handle('categories:delete', async (_event, id: number) => {
    try {
      // Unlink products from this category first
      const cat = await (prisma as any).$queryRaw`SELECT name FROM "Category" WHERE id = ${id} LIMIT 1` as any[]
      if (cat.length > 0) {
        await prisma.product.updateMany({
          where: { category: cat[0].name },
          data: { category: null }
        })
      }
      await (prisma as any).$executeRaw`DELETE FROM "Category" WHERE id = ${id}`
      return { success: true }
    } catch (error) {
      console.error('[IPC:categories:delete] Error:', error)
      return { success: false, error: 'Failed to delete category' }
    }
  })
}
