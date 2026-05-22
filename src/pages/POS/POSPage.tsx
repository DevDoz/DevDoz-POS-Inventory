import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Plus, Minus, Trash2, ShoppingCart, User, Printer, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { productsApi, customersApi, salesApi } from '@/services/api'
import { formatCurrency } from '@/utils/formatters'
import type { Product, Customer, Sale } from '@/types'
import ReceiptModal from './ReceiptModal'

const POSPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const {
    items, totals, customerId, customerName, discount, paymentMethod,
    addItem, removeItem, updateQuantity, setDiscount, setCustomer,
    setPaymentMethod, clearCart, taxRate
  } = useCartStore()

  const { user } = useAuthStore()
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => {
    loadData()
    searchRef.current?.focus()
  }, [])

  const loadData = async () => {
    const [productsRes, customersRes] = await Promise.all([
      productsApi.getAll({ isActive: true }),
      customersApi.getAll()
    ])
    if (productsRes.success && productsRes.data) {
      setProducts(productsRes.data)
      setFilteredProducts(productsRes.data)
    }
    if (customersRes.success && customersRes.data) setCustomers(customersRes.data)
  }

  // Search / barcode handler
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query)
      if (!query.trim()) {
        setFilteredProducts(products)
        return
      }
      // Check if it's a barcode scan (exact match)
      const barcodeMatch = products.find(
        (p) => p.barcode === query && p.quantity > 0
      )
      if (barcodeMatch && query.length > 5) {
        addItem({
          productId: barcodeMatch.id,
          productName: barcodeMatch.productName,
          sku: barcodeMatch.sku,
          price: barcodeMatch.sellingPrice,
          quantity: 1,
          maxQuantity: barcodeMatch.quantity
        })
        setSearchQuery('')
        setFilteredProducts(products)
        return
      }
      // Filter by name, SKU, barcode
      const lower = query.toLowerCase()
      const filtered = products.filter(
        (p) =>
          p.productName.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower) ||
          p.barcode?.includes(query)
      )
      setFilteredProducts(filtered)
    },
    [products, addItem]
  )

  const handleAddToCart = (product: Product) => {
    if (product.quantity <= 0) return
    addItem({
      productId: product.id,
      productName: product.productName,
      sku: product.sku,
      price: product.sellingPrice,
      quantity: 1,
      maxQuantity: product.quantity
    })
  }

  const handleCompleteSale = async () => {
    if (items.length === 0 || !user) return
    setIsProcessing(true)
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price
        })),
        customerId: customerId || undefined,
        userId: user.userId,
        discount: totals.discount,
        taxRate,
        paymentMethod,
        notes: ''
      }
      const response = await salesApi.create(payload)
      if (response.success && response.data) {
        setCompletedSale(response.data as Sale)
        setShowReceipt(true)
        clearCart()
        // Refresh products (stock updated)
        loadData()
      } else {
        alert(`Sale failed: ${response.error}`)
      }
    } catch (err) {
      alert('Failed to process sale. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = async () => {
    if (!completedSale) return
    await salesApi.printReceipt(completedSale.id)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 -mt-2">
      {/* ==================== LEFT: PRODUCT SEARCH ==================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-border overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={searchRef}
              id="pos-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products or scan barcode..."
              className="input pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setFilteredProducts(products) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  id={`product-${product.id}`}
                  onClick={() => handleAddToCart(product)}
                  disabled={product.quantity <= 0}
                  className={`
                    group relative p-3 rounded-xl border-2 text-left transition-all duration-150
                    ${product.quantity <= 0
                      ? 'border-border opacity-50 cursor-not-allowed bg-gray-50'
                      : 'border-border hover:border-primary hover:shadow-card-hover bg-white cursor-pointer'
                    }
                  `}
                >
                  {/* Out of stock overlay */}
                  {product.quantity <= 0 && (
                    <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                      <span className="badge-danger text-[10px]">Out of Stock</span>
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="w-full h-20 rounded-lg mb-2 overflow-hidden bg-gray-100 flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-300">
                        {product.productName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Category badge */}
                  {product.category && (
                    <span className="badge badge-info text-[10px] mb-1">{product.category}</span>
                  )}

                  <div className="font-medium text-text-primary text-sm leading-tight line-clamp-2 mb-1">
                    {product.productName}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-primary font-bold text-sm">
                      {formatCurrency(product.sellingPrice, currencySymbol)}
                    </span>
                    <span className={`text-xs font-medium ${product.quantity <= product.lowStockLimit ? 'text-warning' : 'text-text-muted'}`}>
                      {product.quantity}
                    </span>
                  </div>

                  {/* Hover add icon */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== RIGHT: CART ==================== */}
      <div className="w-80 flex flex-col bg-white rounded-xl border border-border overflow-hidden flex-shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold text-text-primary">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span>Cart</span>
            {items.length > 0 && (
              <span className="badge badge-info">{items.length}</span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-danger hover:underline"
              id="clear-cart"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Customer selector */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
            <User className="w-4 h-4" />
            <span>Customer</span>
          </div>
          <select
            id="customer-select"
            value={customerId || ''}
            onChange={(e) => {
              const id = parseInt(e.target.value)
              const customer = customers.find((c) => c.id === id)
              setCustomer(id || null, customer?.name || null)
            }}
            className="input text-sm"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted py-8">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click products to add</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.productId} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {item.productName}
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatCurrency(item.price, currencySymbol)} each
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-text-muted hover:text-danger ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-50
                                   disabled:opacity-30 text-text-secondary transition-colors"
                        id={`qty-dec-${item.productId}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-text-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-50
                                   disabled:opacity-30 text-text-secondary transition-colors"
                        id={`qty-inc-${item.productId}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {formatCurrency(item.subtotal, currencySymbol)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & checkout */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Discount input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary w-16 flex-shrink-0">Discount</label>
            <input
              id="cart-discount"
              type="number"
              min="0"
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="input text-sm py-1.5 flex-1"
              placeholder="0.00"
            />
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-secondary w-16 flex-shrink-0">Payment</label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input text-sm py-1.5 flex-1"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="TRANSFER">Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal, currencySymbol)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-danger">
                <span>Discount</span>
                <span>-{formatCurrency(totals.discount, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-secondary">
              <span>Tax ({taxRate}%)</span>
              <span>{formatCurrency(totals.taxAmount, currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold text-text-primary pt-1.5 border-t border-border text-base">
              <span>Grand Total</span>
              <span className="text-primary">{formatCurrency(totals.grandTotal, currencySymbol)}</span>
            </div>
          </div>

          {/* Complete Sale button */}
          <button
            id="complete-sale"
            onClick={handleCompleteSale}
            disabled={items.length === 0 || isProcessing}
            className="btn btn-primary w-full py-3 text-base"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <ReceiptModal
          sale={completedSale}
          currencySymbol={currencySymbol}
          onClose={() => { setShowReceipt(false); setCompletedSale(null) }}
          onPrint={handlePrintReceipt}
        />
      )}
    </div>
  )
}

export default POSPage
