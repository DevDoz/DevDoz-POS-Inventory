import dayjs from 'dayjs'

/**
 * Format a number as currency.
 * @example formatCurrency(1234.5, '$') → '$1,234.50'
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(date: string | Date, format = 'DD/MM/YYYY'): string {
  return dayjs(date).format(format)
}

/**
 * Format a datetime string to a readable format with time.
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

/**
 * Format a number of bytes to a human-readable size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength = 30): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Generate a SKU from a product name.
 * @example generateSKU('Green Tea 500ml') → 'GT500'
 */
export function generateSKU(productName: string): string {
  const words = productName.trim().split(/\s+/)
  const initials = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((w) => w.slice(0, 2).toUpperCase())
    .join('')
  const suffix = Math.floor(Math.random() * 1000)
  return `${initials}${suffix}`
}

/**
 * Returns a color class based on stock level.
 */
export function getStockStatusColor(quantity: number, limit: number): string {
  if (quantity === 0) return 'text-danger'
  if (quantity <= limit) return 'text-warning'
  return 'text-success'
}

/**
 * Returns a badge class based on stock level.
 */
export function getStockBadgeClass(quantity: number, limit: number): string {
  if (quantity === 0) return 'badge-danger'
  if (quantity <= limit) return 'badge-warning'
  return 'badge-success'
}

/**
 * Returns the text label for stock status.
 */
export function getStockStatusLabel(quantity: number, limit: number): string {
  if (quantity === 0) return 'Out of Stock'
  if (quantity <= limit) return 'Low Stock'
  return 'In Stock'
}

/**
 * Format inventory log type to a readable label.
 */
export function formatInventoryType(type: string): string {
  const labels: Record<string, string> = {
    ADD: 'Stock Added',
    REMOVE: 'Stock Removed',
    ADJUSTMENT: 'Adjustment',
    SALE: 'Sale Deduction',
    INITIAL: 'Initial Stock'
  }
  return labels[type] || type
}

/**
 * Get relative time from a date.
 * @example getRelativeTime('2024-01-01') → '3 months ago'
 */
export function getRelativeTime(date: string | Date): string {
  const now = dayjs()
  const then = dayjs(date)
  const diffMins = now.diff(then, 'minute')

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = now.diff(then, 'hour')
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = now.diff(then, 'day')
  if (diffDays < 7) return `${diffDays}d ago`

  return formatDate(date)
}
