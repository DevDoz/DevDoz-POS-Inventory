import { IpcMain } from 'electron'
import { prisma } from '../services/database'

interface AdjustInventoryPayload {
  productId: number
  type: 'ADD' | 'REMOVE' | 'ADJUSTMENT'
  quantity: number
  notes?: string
}

interface InventoryFilters {
  productId?: number
  type?: string
  startDate?: string
  endDate?: string
}

/**
 * Registers all inventory-related IPC handlers.
 */
export function registerInventoryHandlers(ipcMain: IpcMain): void {
  // ==================== ADJUST STOCK ====================
  ipcMain.handle('inventory:adjust', async (_event, data: AdjustInventoryPayload) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: data.productId }
      })
      if (!product) return { success: false, error: 'Product not found' }

      // Calculate new quantity
      let quantityChange = data.quantity
      if (data.type === 'REMOVE') quantityChange = -data.quantity

      const newQuantity = product.quantity + quantityChange
      if (newQuantity < 0) {
        return { success: false, error: 'Cannot reduce stock below zero' }
      }

      // Update product quantity and log the change
      await prisma.$transaction([
        prisma.product.update({
          where: { id: data.productId },
          data: { quantity: newQuantity }
        }),
        prisma.inventoryLog.create({
          data: {
            productId: data.productId,
            type: data.type,
            quantity: quantityChange,
            notes: data.notes || null
          }
        })
      ])

      return { success: true, data: { newQuantity } }
    } catch (error) {
      console.error('[IPC:inventory:adjust] Error:', error)
      return { success: false, error: 'Failed to adjust inventory' }
    }
  })

  // ==================== GET LOGS ====================
  ipcMain.handle('inventory:getLogs', async (_event, filters: InventoryFilters = {}) => {
    try {
      const where: Record<string, unknown> = {}

      if (filters.productId) where['productId'] = filters.productId
      if (filters.type) where['type'] = filters.type
      if (filters.startDate || filters.endDate) {
        where['createdAt'] = {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate + 'T23:59:59') } : {})
        }
      }

      const logs = await prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            select: { id: true, productName: true, sku: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500
      })

      return { success: true, data: logs }
    } catch (error) {
      console.error('[IPC:inventory:getLogs] Error:', error)
      return { success: false, error: 'Failed to fetch inventory logs' }
    }
  })

  // ==================== GET LOGS BY PRODUCT ====================
  ipcMain.handle('inventory:getLogsByProduct', async (_event, productId: number) => {
    try {
      const logs = await prisma.inventoryLog.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' }
      })
      return { success: true, data: logs }
    } catch (error) {
      console.error('[IPC:inventory:getLogsByProduct] Error:', error)
      return { success: false, error: 'Failed to fetch product inventory logs' }
    }
  })
}
