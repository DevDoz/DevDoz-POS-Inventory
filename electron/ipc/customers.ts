import { IpcMain } from 'electron'
import { prisma } from '../services/database'

interface CreateCustomerPayload {
  name: string
  phone?: string
  email?: string
  address?: string
}

interface CustomerFilters {
  search?: string
}

/**
 * Registers all customer-related IPC handlers.
 */
export function registerCustomerHandlers(ipcMain: IpcMain): void {
  // ==================== GET ALL CUSTOMERS ====================
  ipcMain.handle('customers:getAll', async (_event, filters: CustomerFilters = {}) => {
    try {
      const where: Record<string, unknown> = {}

      if (filters.search) {
        where['OR'] = [
          { name: { contains: filters.search } },
          { phone: { contains: filters.search } },
          { email: { contains: filters.search } }
        ]
      }

      const customers = await prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { sales: true } }
        }
      })

      return { success: true, data: customers }
    } catch (error) {
      console.error('[IPC:customers:getAll] Error:', error)
      return { success: false, error: 'Failed to fetch customers' }
    }
  })

  // ==================== GET BY ID ====================
  ipcMain.handle('customers:getById', async (_event, id: number) => {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          sales: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              items: { include: { product: { select: { productName: true } } } }
            }
          }
        }
      })
      if (!customer) return { success: false, error: 'Customer not found' }
      return { success: true, data: customer }
    } catch (error) {
      console.error('[IPC:customers:getById] Error:', error)
      return { success: false, error: 'Failed to fetch customer' }
    }
  })

  // ==================== CREATE CUSTOMER ====================
  ipcMain.handle('customers:create', async (_event, data: CreateCustomerPayload) => {
    try {
      const customer = await prisma.customer.create({ data })
      return { success: true, data: customer }
    } catch (error) {
      console.error('[IPC:customers:create] Error:', error)
      return { success: false, error: 'Failed to create customer' }
    }
  })

  // ==================== UPDATE CUSTOMER ====================
  ipcMain.handle('customers:update', async (_event, id: number, data: Partial<CreateCustomerPayload>) => {
    try {
      const customer = await prisma.customer.update({
        where: { id },
        data: { ...data, updatedAt: new Date() }
      })
      return { success: true, data: customer }
    } catch (error) {
      console.error('[IPC:customers:update] Error:', error)
      return { success: false, error: 'Failed to update customer' }
    }
  })

  // ==================== DELETE CUSTOMER ====================
  ipcMain.handle('customers:delete', async (_event, id: number) => {
    try {
      await prisma.customer.delete({ where: { id } })
      return { success: true }
    } catch (error) {
      console.error('[IPC:customers:delete] Error:', error)
      return { success: false, error: 'Failed to delete customer' }
    }
  })

  // ==================== GET PURCHASE HISTORY ====================
  ipcMain.handle('customers:getPurchaseHistory', async (_event, id: number) => {
    try {
      const sales = await prisma.sales.findMany({
        where: { customerId: id },
        include: {
          items: {
            include: { product: { select: { productName: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return { success: true, data: sales }
    } catch (error) {
      console.error('[IPC:customers:getPurchaseHistory] Error:', error)
      return { success: false, error: 'Failed to fetch purchase history' }
    }
  })
}
