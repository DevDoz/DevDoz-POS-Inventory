import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload script — exposes a typed API surface to the renderer process
 * via contextBridge. The renderer never has direct access to Node.js or Electron APIs.
 */

// Type-safe IPC invoker
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args)
}

// Expose the API to the renderer
contextBridge.exposeInMainWorld('api', {
  // ==================== AUTH ====================
  auth: {
    login: (username: string, password: string) =>
      invoke('auth:login', username, password),
    logout: () => invoke('auth:logout'),
    getSession: () => invoke('auth:getSession'),
    getUsers: () => invoke('auth:getUsers'),
    createUser: (data: unknown) => invoke('auth:createUser', data),
    updateUser: (id: number, data: unknown) => invoke('auth:updateUser', id, data),
    deleteUser: (id: number) => invoke('auth:deleteUser', id),
    changePassword: (id: number, oldPassword: string, newPassword: string) =>
      invoke('auth:changePassword', id, oldPassword, newPassword)
  },

  // ==================== PRODUCTS ====================
  products: {
    getAll: (filters?: unknown) => invoke('products:getAll', filters),
    getById: (id: number) => invoke('products:getById', id),
    create: (data: unknown) => invoke('products:create', data),
    update: (id: number, data: unknown) => invoke('products:update', id, data),
    delete: (id: number) => invoke('products:delete', id),
    search: (query: string) => invoke('products:search', query),
    getLowStock: () => invoke('products:getLowStock'),
    importCSV: () => invoke('products:importCSV'),
    exportCSV: () => invoke('products:exportCSV'),
    getCategories: () => invoke('products:getCategories')
  },

  // ==================== SALES ====================
  sales: {
    create: (data: unknown) => invoke('sales:create', data),
    getAll: (filters?: unknown) => invoke('sales:getAll', filters),
    getById: (id: number) => invoke('sales:getById', id),
    getTodayStats: () => invoke('sales:getTodayStats'),
    getMonthlyStats: () => invoke('sales:getMonthlyStats'),
    getWeeklyStats: () => invoke('sales:getWeeklyStats'),
    printReceipt: (saleId: number) => invoke('sales:printReceipt', saleId)
  },

  // ==================== INVENTORY ====================
  inventory: {
    adjust: (data: unknown) => invoke('inventory:adjust', data),
    getLogs: (filters?: unknown) => invoke('inventory:getLogs', filters),
    getLogsByProduct: (productId: number) => invoke('inventory:getLogsByProduct', productId)
  },

  // ==================== CUSTOMERS ====================
  customers: {
    getAll: (filters?: unknown) => invoke('customers:getAll', filters),
    getById: (id: number) => invoke('customers:getById', id),
    create: (data: unknown) => invoke('customers:create', data),
    update: (id: number, data: unknown) => invoke('customers:update', id, data),
    delete: (id: number) => invoke('customers:delete', id),
    getPurchaseHistory: (id: number) => invoke('customers:getPurchaseHistory', id)
  },

  // ==================== REPORTS ====================
  reports: {
    getDailyReport: (date: string) => invoke('reports:getDaily', date),
    getMonthlyReport: (year: number, month: number) => invoke('reports:getMonthly', year, month),
    getProductReport: (filters?: unknown) => invoke('reports:getProducts', filters),
    getRevenueReport: (filters?: unknown) => invoke('reports:getRevenue', filters),
    exportPDF: (type: string, filters?: unknown) => invoke('reports:exportPDF', type, filters),
    exportExcel: (type: string, filters?: unknown) => invoke('reports:exportExcel', type, filters),
    getDashboardStats: () => invoke('reports:getDashboardStats')
  },

  // ==================== SETTINGS ====================
  settings: {
    get: (key: string) => invoke('settings:get', key),
    getAll: () => invoke('settings:getAll'),
    set: (key: string, value: string) => invoke('settings:set', key, value),
    setMultiple: (data: Record<string, string>) => invoke('settings:setMultiple', data),
    createBackup: () => invoke('settings:createBackup'),
    listBackups: () => invoke('settings:listBackups'),
    restoreBackup: (filename: string) => invoke('settings:restoreBackup', filename),
    getAppVersion: () => invoke('settings:getAppVersion')
  }
})
