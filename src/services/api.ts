/**
 * API service — typed wrapper over window.api IPC calls
 * Handles errors consistently and returns typed IpcResponse
 */

import type {
  IpcResponse,
  Product,
  Customer,
  Sale,
  InventoryLog,
  User,
  DashboardStats,
  Session,
  DailyReport,
  MonthlyReport,
  ProductReport,
  RevenueReport,
  AppSettings
} from '@/types'

// Type for the global API exposed by preload
declare global {
  interface Window {
    api: {
      auth: {
        login: (username: string, password: string) => Promise<IpcResponse<{ id: number; username: string; email: string | null; role: string }>>
        logout: () => Promise<IpcResponse>
        getSession: () => Promise<IpcResponse<Session>>
        getUsers: () => Promise<IpcResponse<User[]>>
        createUser: (data: unknown) => Promise<IpcResponse<User>>
        updateUser: (id: number, data: unknown) => Promise<IpcResponse<User>>
        deleteUser: (id: number) => Promise<IpcResponse>
        changePassword: (id: number, oldPassword: string, newPassword: string) => Promise<IpcResponse>
      }
      products: {
        getAll: (filters?: unknown) => Promise<IpcResponse<Product[]>>
        getById: (id: number) => Promise<IpcResponse<Product>>
        create: (data: unknown) => Promise<IpcResponse<Product>>
        update: (id: number, data: unknown) => Promise<IpcResponse<Product>>
        delete: (id: number) => Promise<IpcResponse>
        search: (query: string) => Promise<IpcResponse<Product[]>>
        getLowStock: () => Promise<IpcResponse<Product[]>>
        importCSV: () => Promise<IpcResponse<{ imported: number; failed: number; errors: string[] }>>
        exportCSV: () => Promise<IpcResponse<{ path: string; count: number }>>
        getCategories: () => Promise<IpcResponse<string[]>>
      }
      sales: {
        create: (data: unknown) => Promise<IpcResponse<Sale>>
        getAll: (filters?: unknown) => Promise<IpcResponse<Sale[]>>
        getById: (id: number) => Promise<IpcResponse<Sale>>
        getTodayStats: () => Promise<IpcResponse<{ totalRevenue: number; totalSales: number; sales: Sale[] }>>
        getMonthlyStats: () => Promise<IpcResponse<Array<{ month: string; totalSales: number; totalRevenue: number }>>>
        getWeeklyStats: () => Promise<IpcResponse<Array<{ day: string; totalSales: number; totalRevenue: number }>>>
        printReceipt: (saleId: number) => Promise<IpcResponse>
      }
      inventory: {
        adjust: (data: unknown) => Promise<IpcResponse<{ newQuantity: number }>>
        getLogs: (filters?: unknown) => Promise<IpcResponse<InventoryLog[]>>
        getLogsByProduct: (productId: number) => Promise<IpcResponse<InventoryLog[]>>
      }
      customers: {
        getAll: (filters?: unknown) => Promise<IpcResponse<Customer[]>>
        getById: (id: number) => Promise<IpcResponse<Customer>>
        create: (data: unknown) => Promise<IpcResponse<Customer>>
        update: (id: number, data: unknown) => Promise<IpcResponse<Customer>>
        delete: (id: number) => Promise<IpcResponse>
        getPurchaseHistory: (id: number) => Promise<IpcResponse<Sale[]>>
      }
      reports: {
        getDashboardStats: () => Promise<IpcResponse<DashboardStats>>
        getDailyReport: (date: string) => Promise<IpcResponse<DailyReport>>
        getMonthlyReport: (year: number, month: number) => Promise<IpcResponse<MonthlyReport>>
        getProductReport: (filters?: unknown) => Promise<IpcResponse<ProductReport[]>>
        getRevenueReport: (filters?: unknown) => Promise<IpcResponse<RevenueReport>>
        exportPDF: (type: string, filters?: unknown) => Promise<IpcResponse>
        exportExcel: (type: string, filters?: unknown) => Promise<IpcResponse<{ path: string }>>
      }
      settings: {
        get: (key: string) => Promise<IpcResponse<string | null>>
        getAll: () => Promise<IpcResponse<AppSettings>>
        set: (key: string, value: string) => Promise<IpcResponse>
        setMultiple: (data: Record<string, string>) => Promise<IpcResponse>
        createBackup: () => Promise<IpcResponse<{ path: string }>>
        listBackups: () => Promise<IpcResponse<Array<{ filename: string; size: number; createdAt: string }>>>
        restoreBackup: (filename: string) => Promise<IpcResponse>
        getAppVersion: () => Promise<IpcResponse<string>>
      }
    }
  }
}

// ==================== AUTH API ====================
export const authApi = {
  login: (username: string, password: string) =>
    window.api.auth.login(username, password),
  logout: () => window.api.auth.logout(),
  getSession: () => window.api.auth.getSession(),
  getUsers: () => window.api.auth.getUsers(),
  createUser: (data: unknown) => window.api.auth.createUser(data),
  updateUser: (id: number, data: unknown) => window.api.auth.updateUser(id, data),
  deleteUser: (id: number) => window.api.auth.deleteUser(id),
  changePassword: (id: number, old: string, next: string) =>
    window.api.auth.changePassword(id, old, next)
}

// ==================== PRODUCTS API ====================
export const productsApi = {
  getAll: (filters?: unknown) => window.api.products.getAll(filters),
  getById: (id: number) => window.api.products.getById(id),
  create: (data: unknown) => window.api.products.create(data),
  update: (id: number, data: unknown) => window.api.products.update(id, data),
  delete: (id: number) => window.api.products.delete(id),
  search: (query: string) => window.api.products.search(query),
  getLowStock: () => window.api.products.getLowStock(),
  importCSV: () => window.api.products.importCSV(),
  exportCSV: () => window.api.products.exportCSV(),
  getCategories: () => window.api.products.getCategories()
}

// ==================== SALES API ====================
export const salesApi = {
  create: (data: unknown) => window.api.sales.create(data),
  getAll: (filters?: unknown) => window.api.sales.getAll(filters),
  getById: (id: number) => window.api.sales.getById(id),
  getTodayStats: () => window.api.sales.getTodayStats(),
  getMonthlyStats: () => window.api.sales.getMonthlyStats(),
  getWeeklyStats: () => window.api.sales.getWeeklyStats(),
  printReceipt: (saleId: number) => window.api.sales.printReceipt(saleId)
}

// ==================== INVENTORY API ====================
export const inventoryApi = {
  adjust: (data: unknown) => window.api.inventory.adjust(data),
  getLogs: (filters?: unknown) => window.api.inventory.getLogs(filters),
  getLogsByProduct: (productId: number) => window.api.inventory.getLogsByProduct(productId)
}

// ==================== CUSTOMERS API ====================
export const customersApi = {
  getAll: (filters?: unknown) => window.api.customers.getAll(filters),
  getById: (id: number) => window.api.customers.getById(id),
  create: (data: unknown) => window.api.customers.create(data),
  update: (id: number, data: unknown) => window.api.customers.update(id, data),
  delete: (id: number) => window.api.customers.delete(id),
  getPurchaseHistory: (id: number) => window.api.customers.getPurchaseHistory(id)
}

// ==================== REPORTS API ====================
export const reportsApi = {
  getDashboardStats: () => window.api.reports.getDashboardStats(),
  getDailyReport: (date: string) => window.api.reports.getDailyReport(date),
  getMonthlyReport: (year: number, month: number) =>
    window.api.reports.getMonthlyReport(year, month),
  getProductReport: (filters?: unknown) => window.api.reports.getProductReport(filters),
  getRevenueReport: (filters?: unknown) => window.api.reports.getRevenueReport(filters),
  exportPDF: (type: string, filters?: unknown) => window.api.reports.exportPDF(type, filters),
  exportExcel: (type: string, filters?: unknown) => window.api.reports.exportExcel(type, filters)
}

// ==================== SETTINGS API ====================
export const settingsApi = {
  get: (key: string) => window.api.settings.get(key),
  getAll: () => window.api.settings.getAll(),
  set: (key: string, value: string) => window.api.settings.set(key, value),
  setMultiple: (data: Record<string, string>) => window.api.settings.setMultiple(data),
  createBackup: () => window.api.settings.createBackup(),
  listBackups: () => window.api.settings.listBackups(),
  restoreBackup: (filename: string) => window.api.settings.restoreBackup(filename),
  getAppVersion: () => window.api.settings.getAppVersion()
}
