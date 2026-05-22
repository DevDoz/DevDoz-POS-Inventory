import { IpcMain } from 'electron'
import { prisma } from '../services/database'
import { mainWindow } from '../main'
import { printReceipt } from '../services/printer'
import dayjs from 'dayjs'

interface CartItem {
  productId: number
  quantity: number
  price: number
}

interface CreateSalePayload {
  items: CartItem[]
  customerId?: number
  userId: number
  discount: number
  taxRate: number
  paymentMethod: string
  notes?: string
}

interface SaleFilters {
  startDate?: string
  endDate?: string
  customerId?: number
  paymentMethod?: string
}

/**
 * Generates the next invoice number in format INV-XXXXX
 */
async function generateInvoiceNo(): Promise<string> {
  const lastSale = await prisma.sales.findFirst({
    orderBy: { id: 'desc' }
  })

  const lastId = lastSale?.id || 0
  const nextId = lastId + 1
  return `INV-${String(nextId).padStart(5, '0')}`
}

/**
 * Registers all sales-related IPC handlers.
 */
export function registerSalesHandlers(ipcMain: IpcMain): void {
  // ==================== CREATE SALE ====================
  ipcMain.handle('sales:create', async (_event, data: CreateSalePayload) => {
    try {
      // Validate all products exist and have sufficient stock
      for (const item of data.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        })
        if (!product) {
          return { success: false, error: `Product ID ${item.productId} not found` }
        }
        if (product.quantity < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for "${product.productName}". Available: ${product.quantity}`
          }
        }
      }

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discountAmount = data.discount || 0
      const taxAmount = ((subtotal - discountAmount) * data.taxRate) / 100
      const grandTotal = subtotal - discountAmount + taxAmount

      const invoiceNo = await generateInvoiceNo()

      // Execute everything in a transaction
      const sale = await prisma.$transaction(async (tx) => {
        // Create the sale
        const newSale = await tx.sales.create({
          data: {
            invoiceNo,
            customerId: data.customerId || null,
            userId: data.userId,
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            grandTotal,
            paymentMethod: data.paymentMethod,
            notes: data.notes || null,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
              }))
            }
          },
          include: {
            items: { include: { product: true } },
            customer: true
          }
        })

        // Deduct stock for each item
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } }
          })

          // Log the inventory change
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'SALE',
              quantity: -item.quantity,
              notes: `Sale invoice: ${invoiceNo}`
            }
          })
        }

        return newSale
      })

      return { success: true, data: sale }
    } catch (error) {
      console.error('[IPC:sales:create] Error:', error)
      return { success: false, error: 'Failed to create sale' }
    }
  })

  // ==================== GET ALL SALES ====================
  ipcMain.handle('sales:getAll', async (_event, filters: SaleFilters = {}) => {
    try {
      const where: Record<string, unknown> = {}

      if (filters.startDate || filters.endDate) {
        where['createdAt'] = {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate + 'T23:59:59') } : {})
        }
      }

      if (filters.customerId) where['customerId'] = filters.customerId
      if (filters.paymentMethod) where['paymentMethod'] = filters.paymentMethod

      const sales = await prisma.sales.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, username: true } },
          items: {
            include: {
              product: { select: { id: true, productName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500
      })

      return { success: true, data: sales }
    } catch (error) {
      console.error('[IPC:sales:getAll] Error:', error)
      return { success: false, error: 'Failed to fetch sales' }
    }
  })

  // ==================== GET BY ID ====================
  ipcMain.handle('sales:getById', async (_event, id: number) => {
    try {
      const sale = await prisma.sales.findUnique({
        where: { id },
        include: {
          customer: true,
          user: { select: { id: true, username: true, role: true } },
          items: {
            include: { product: true }
          }
        }
      })
      if (!sale) return { success: false, error: 'Sale not found' }
      return { success: true, data: sale }
    } catch (error) {
      console.error('[IPC:sales:getById] Error:', error)
      return { success: false, error: 'Failed to fetch sale' }
    }
  })

  // ==================== TODAY'S STATS ====================
  ipcMain.handle('sales:getTodayStats', async () => {
    try {
      const today = dayjs().startOf('day').toDate()
      const tomorrow = dayjs().endOf('day').toDate()

      const sales = await prisma.sales.findMany({
        where: {
          createdAt: { gte: today, lte: tomorrow }
        }
      })

      const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0)
      const totalSales = sales.length

      return {
        success: true,
        data: { totalRevenue, totalSales, sales }
      }
    } catch (error) {
      console.error('[IPC:sales:getTodayStats] Error:', error)
      return { success: false, error: 'Failed to get today stats' }
    }
  })

  // ==================== MONTHLY STATS ====================
  ipcMain.handle('sales:getMonthlyStats', async () => {
    try {
      // Last 12 months of data
      const months = []
      for (let i = 11; i >= 0; i--) {
        const month = dayjs().subtract(i, 'month')
        const start = month.startOf('month').toDate()
        const end = month.endOf('month').toDate()

        const sales = await prisma.sales.findMany({
          where: { createdAt: { gte: start, lte: end } }
        })

        months.push({
          month: month.format('MMM YYYY'),
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.grandTotal, 0)
        })
      }

      return { success: true, data: months }
    } catch (error) {
      console.error('[IPC:sales:getMonthlyStats] Error:', error)
      return { success: false, error: 'Failed to get monthly stats' }
    }
  })

  // ==================== WEEKLY STATS ====================
  ipcMain.handle('sales:getWeeklyStats', async () => {
    try {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, 'day')
        const start = day.startOf('day').toDate()
        const end = day.endOf('day').toDate()

        const sales = await prisma.sales.findMany({
          where: { createdAt: { gte: start, lte: end } }
        })

        days.push({
          day: day.format('ddd DD/MM'),
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.grandTotal, 0)
        })
      }

      return { success: true, data: days }
    } catch (error) {
      console.error('[IPC:sales:getWeeklyStats] Error:', error)
      return { success: false, error: 'Failed to get weekly stats' }
    }
  })

  // ==================== PRINT RECEIPT ====================
  ipcMain.handle('sales:printReceipt', async (_event, saleId: number) => {
    try {
      if (!mainWindow) throw new Error('Main window not available')
      await printReceipt(saleId, mainWindow)
      return { success: true }
    } catch (error) {
      console.error('[IPC:sales:printReceipt] Error:', error)
      return { success: false, error: 'Failed to print receipt' }
    }
  })
}
