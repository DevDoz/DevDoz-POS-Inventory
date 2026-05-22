import { IpcMain, dialog, app } from 'electron'
import { prisma } from '../services/database'
import dayjs from 'dayjs'
import * as path from 'path'
import * as fs from 'fs'
import ExcelJS from 'exceljs'

interface ReportFilters {
  startDate?: string
  endDate?: string
  productId?: number
}

/**
 * Registers all reports-related IPC handlers.
 */
export function registerReportHandlers(ipcMain: IpcMain): void {
  // ==================== DASHBOARD STATS ====================
  ipcMain.handle('reports:getDashboardStats', async () => {
    try {
      const today = dayjs().startOf('day').toDate()
      const todayEnd = dayjs().endOf('day').toDate()

      const [
        totalProducts,
        lowStockProducts,
        totalCustomers,
        todaySales,
        allSales,
        recentSales,
        recentLogs
      ] = await Promise.all([
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.findMany({ where: { isActive: true } }),
        prisma.customer.count(),
        prisma.sales.findMany({ where: { createdAt: { gte: today, lte: todayEnd } } }),
        prisma.sales.findMany(),
        prisma.sales.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { name: true } } }
        }),
        prisma.inventoryLog.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { product: { select: { productName: true } } }
        })
      ])

      const lowStockCount = lowStockProducts.filter((p) => p.quantity <= p.lowStockLimit).length
      const totalRevenue = allSales.reduce((sum, s) => sum + s.grandTotal, 0)
      const todayRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0)

      return {
        success: true,
        data: {
          totalProducts,
          lowStockItems: lowStockCount,
          totalCustomers,
          totalSales: allSales.length,
          totalRevenue,
          todaySales: todaySales.length,
          todayRevenue,
          recentSales,
          recentInventoryLogs: recentLogs
        }
      }
    } catch (error) {
      console.error('[IPC:reports:getDashboardStats] Error:', error)
      return { success: false, error: 'Failed to get dashboard stats' }
    }
  })

  // ==================== DAILY REPORT ====================
  ipcMain.handle('reports:getDaily', async (_event, date: string) => {
    try {
      const start = dayjs(date).startOf('day').toDate()
      const end = dayjs(date).endOf('day').toDate()

      const sales = await prisma.sales.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: {
          customer: { select: { name: true } },
          items: { include: { product: { select: { productName: true } } } }
        },
        orderBy: { createdAt: 'asc' }
      })

      const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0)
      const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0)
      const totalTax = sales.reduce((sum, s) => sum + s.tax, 0)

      return {
        success: true,
        data: { date, sales, totalRevenue, totalDiscount, totalTax, totalCount: sales.length }
      }
    } catch (error) {
      console.error('[IPC:reports:getDaily] Error:', error)
      return { success: false, error: 'Failed to get daily report' }
    }
  })

  // ==================== MONTHLY REPORT ====================
  ipcMain.handle('reports:getMonthly', async (_event, year: number, month: number) => {
    try {
      const start = dayjs(`${year}-${month}-01`).startOf('month').toDate()
      const end = dayjs(`${year}-${month}-01`).endOf('month').toDate()

      const sales = await prisma.sales.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'asc' }
      })

      // Group by day
      const byDay: Record<string, { count: number; revenue: number }> = {}
      sales.forEach((s) => {
        const day = dayjs(s.createdAt).format('YYYY-MM-DD')
        if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 }
        byDay[day].count++
        byDay[day].revenue += s.grandTotal
      })

      return {
        success: true,
        data: {
          year,
          month,
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.grandTotal, 0),
          byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v }))
        }
      }
    } catch (error) {
      console.error('[IPC:reports:getMonthly] Error:', error)
      return { success: false, error: 'Failed to get monthly report' }
    }
  })

  // ==================== PRODUCT REPORT ====================
  ipcMain.handle('reports:getProducts', async (_event, filters: ReportFilters = {}) => {
    try {
      const where: Record<string, unknown> = {}
      if (filters.startDate || filters.endDate) {
        where['sale'] = {
          createdAt: {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate + 'T23:59:59') } : {})
          }
        }
      }
      if (filters.productId) where['productId'] = filters.productId

      const items = await prisma.saleItem.findMany({
        where,
        include: { product: { select: { productName: true, sku: true, category: true } } }
      })

      // Aggregate by product
      const byProduct: Record<
        number,
        { productId: number; productName: string; sku: string; category: string | null; totalQuantity: number; totalRevenue: number }
      > = {}

      items.forEach((item) => {
        if (!byProduct[item.productId]) {
          byProduct[item.productId] = {
            productId: item.productId,
            productName: item.product.productName,
            sku: item.product.sku,
            category: item.product.category,
            totalQuantity: 0,
            totalRevenue: 0
          }
        }
        byProduct[item.productId].totalQuantity += item.quantity
        byProduct[item.productId].totalRevenue += item.subtotal
      })

      const data = Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue)
      return { success: true, data }
    } catch (error) {
      console.error('[IPC:reports:getProducts] Error:', error)
      return { success: false, error: 'Failed to get product report' }
    }
  })

  // ==================== REVENUE REPORT ====================
  ipcMain.handle('reports:getRevenue', async (_event, filters: ReportFilters = {}) => {
    try {
      const where: Record<string, unknown> = {}
      if (filters.startDate || filters.endDate) {
        where['createdAt'] = {
          ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
          ...(filters.endDate ? { lte: new Date(filters.endDate + 'T23:59:59') } : {})
        }
      }

      const sales = await prisma.sales.findMany({ where })
      const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0)
      const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0)
      const totalTax = sales.reduce((sum, s) => sum + s.tax, 0)
      const netRevenue = totalRevenue - totalTax

      // Group by payment method
      const byPayment: Record<string, { count: number; total: number }> = {}
      sales.forEach((s) => {
        if (!byPayment[s.paymentMethod]) byPayment[s.paymentMethod] = { count: 0, total: 0 }
        byPayment[s.paymentMethod].count++
        byPayment[s.paymentMethod].total += s.grandTotal
      })

      return {
        success: true,
        data: {
          totalRevenue,
          totalDiscount,
          totalTax,
          netRevenue,
          totalSales: sales.length,
          byPaymentMethod: Object.entries(byPayment).map(([method, v]) => ({ method, ...v }))
        }
      }
    } catch (error) {
      console.error('[IPC:reports:getRevenue] Error:', error)
      return { success: false, error: 'Failed to get revenue report' }
    }
  })

  // ==================== EXPORT EXCEL ====================
  ipcMain.handle('reports:exportExcel', async (_event, type: string, filters: ReportFilters = {}) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Report',
        defaultPath: `${type}-report-${dayjs().format('YYYY-MM-DD')}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'DevDoz POS'

      const sheet = workbook.addWorksheet('Report')

      if (type === 'sales') {
        const where: Record<string, unknown> = {}
        if (filters.startDate || filters.endDate) {
          where['createdAt'] = {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate + 'T23:59:59') } : {})
          }
        }

        const sales = await prisma.sales.findMany({
          where,
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        })

        sheet.columns = [
          { header: 'Invoice No', key: 'invoiceNo', width: 15 },
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Customer', key: 'customer', width: 20 },
          { header: 'Subtotal', key: 'subtotal', width: 12 },
          { header: 'Discount', key: 'discount', width: 12 },
          { header: 'Tax', key: 'tax', width: 12 },
          { header: 'Grand Total', key: 'grandTotal', width: 14 },
          { header: 'Payment', key: 'paymentMethod', width: 12 }
        ]

        sales.forEach((s) => {
          sheet.addRow({
            invoiceNo: s.invoiceNo,
            date: dayjs(s.createdAt).format('DD/MM/YYYY HH:mm'),
            customer: s.customer?.name || 'Walk-in',
            subtotal: s.subtotal,
            discount: s.discount,
            tax: s.tax,
            grandTotal: s.grandTotal,
            paymentMethod: s.paymentMethod
          })
        })
      }

      await workbook.xlsx.writeFile(result.filePath)
      return { success: true, data: { path: result.filePath } }
    } catch (error) {
      console.error('[IPC:reports:exportExcel] Error:', error)
      return { success: false, error: 'Failed to export Excel' }
    }
  })

  // ==================== EXPORT PDF ====================
  ipcMain.handle('reports:exportPDF', async (_event, type: string, _filters: ReportFilters = {}) => {
    // PDF export is handled by the renderer printing the page
    return { success: true, data: { message: 'Use window.print() in renderer' } }
  })
}
