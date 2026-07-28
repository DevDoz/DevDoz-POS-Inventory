/**
 * Shared TypeScript types for DevDoz POS
 * Mirror of Prisma models + IPC payload types
 */

// =====================
// ENUMS
// =====================

export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER'

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'

export type InventoryLogType = 'ADD' | 'REMOVE' | 'ADJUSTMENT' | 'SALE' | 'INITIAL'

// =====================
// MODELS
// =====================

export interface User {
  id: number
  username: string
  email: string | null
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface Product {
  id: number
  productName: string
  sku: string
  barcode: string | null
  category: string | null
  purchasePrice: number
  sellingPrice: number
  quantity: number
  lowStockLimit: number
  image: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
  updatedAt?: string
  _count?: { sales: number }
}

export interface Sale {
  id: number
  invoiceNo: string
  customerId: number | null
  userId: number
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  paymentMethod: string
  notes: string | null
  createdAt: string

  // Relations (optional — included when fetched with include)
  customer?: { id: number; name: string } | null
  user?: { id: number; username: string }
  items?: SaleItem[]
}

export interface SaleItem {
  id: number
  saleId: number
  productId: number
  quantity: number
  price: number
  subtotal: number

  // Relations
  product?: Product
  sale?: Sale
}

export interface InventoryLog {
  id: number
  productId: number
  type: InventoryLogType
  quantity: number
  notes: string | null
  createdAt: string

  // Relations
  product?: Pick<Product, 'id' | 'productName' | 'sku'>
}

// =====================
// SESSION
// =====================

export interface Session {
  userId: number
  username: string
  email: string | null
  role: Role
  isLoggedIn: boolean
}

// =====================
// CART
// =====================

export interface CartItem {
  productId: number
  productName: string
  sku: string
  price: number
  quantity: number
  subtotal: number
  maxQuantity: number // Available stock
}

export interface CartTotals {
  subtotal: number
  discount: number
  taxAmount: number
  grandTotal: number
}

// =====================
// DASHBOARD
// =====================

export interface DashboardStats {
  totalProducts: number
  lowStockItems: number
  totalCustomers: number
  totalSales: number
  totalRevenue: number
  todaySales: number
  todayRevenue: number
  recentSales: Sale[]
  recentInventoryLogs: InventoryLog[]
}

// =====================
// SETTINGS
// =====================

export interface AppSettings {
  store_name: string
  store_address: string
  store_phone: string
  store_email: string
  currency_symbol: string
  tax_rate: string
  receipt_footer: string
  low_stock_default: string
  backup_enabled: string
  primary_color?: string
}

// =====================
// REPORTS
// =====================

export interface DailyReport {
  date: string
  sales: Sale[]
  totalRevenue: number
  totalDiscount: number
  totalTax: number
  totalCount: number
}

export interface MonthlyReport {
  year: number
  month: number
  totalSales: number
  totalRevenue: number
  byDay: Array<{ date: string; count: number; revenue: number }>
}

export interface ProductReport {
  productId: number
  productName: string
  sku: string
  category: string | null
  totalQuantity: number
  totalRevenue: number
}

export interface RevenueReport {
  totalRevenue: number
  totalDiscount: number
  totalTax: number
  netRevenue: number
  totalSales: number
  byPaymentMethod: Array<{ method: string; count: number; total: number }>
}

// =====================
// IPC RESPONSE WRAPPER
// =====================

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// =====================
// FORM PAYLOADS
// =====================

export interface LoginForm {
  username: string
  password: string
}

export interface ProductForm {
  productName: string
  sku: string
  barcode?: string
  category?: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  lowStockLimit: number
}

export interface CustomerForm {
  name: string
  phone?: string
  email?: string
  address?: string
}

export interface UserForm {
  username: string
  email?: string
  password: string
  role: Role
}

export interface InventoryAdjustForm {
  productId: number
  type: 'ADD' | 'REMOVE' | 'ADJUSTMENT'
  quantity: number
  notes?: string
}

// =====================
// PERMISSIONS MAP
// =====================

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['dashboard', 'pos', 'products', 'inventory', 'customers', 'sales', 'reports', 'users', 'settings'],
  MANAGER: ['dashboard', 'reports', 'inventory', 'sales', 'products', 'customers'],
  CASHIER: ['dashboard', 'pos', 'products', 'customers']
}
