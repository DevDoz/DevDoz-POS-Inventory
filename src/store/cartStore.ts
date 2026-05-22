import { create } from 'zustand'
import type { CartItem, CartTotals } from '@/types'

interface CartState {
  items: CartItem[]
  customerId: number | null
  customerName: string | null
  discount: number
  taxRate: number
  paymentMethod: string
  notes: string

  // Computed totals
  totals: CartTotals

  // Actions
  addItem: (item: Omit<CartItem, 'subtotal'>) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  setDiscount: (discount: number) => void
  setTaxRate: (rate: number) => void
  setCustomer: (id: number | null, name: string | null) => void
  setPaymentMethod: (method: string) => void
  setNotes: (notes: string) => void
  clearCart: () => void
}

function computeTotals(items: CartItem[], discount: number, taxRate: number): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const discountAmount = Math.min(discount, subtotal) // Discount can't exceed subtotal
  const taxable = subtotal - discountAmount
  const taxAmount = (taxable * taxRate) / 100
  const grandTotal = taxable + taxAmount

  return { subtotal, discount: discountAmount, taxAmount, grandTotal }
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  discount: 0,
  taxRate: 10,
  paymentMethod: 'CASH',
  notes: '',
  totals: { subtotal: 0, discount: 0, taxAmount: 0, grandTotal: 0 },

  addItem: (newItem) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === newItem.productId)

      let updatedItems: CartItem[]
      if (existing) {
        // Increase quantity (respect max stock)
        const newQty = Math.min(existing.quantity + newItem.quantity, existing.maxQuantity)
        updatedItems = state.items.map((i) =>
          i.productId === newItem.productId
            ? { ...i, quantity: newQty, subtotal: newQty * i.price }
            : i
        )
      } else {
        const qty = Math.min(newItem.quantity, newItem.maxQuantity)
        updatedItems = [
          ...state.items,
          { ...newItem, quantity: qty, subtotal: qty * newItem.price }
        ]
      }

      return {
        items: updatedItems,
        totals: computeTotals(updatedItems, state.discount, state.taxRate)
      }
    })
  },

  removeItem: (productId) => {
    set((state) => {
      const updatedItems = state.items.filter((i) => i.productId !== productId)
      return {
        items: updatedItems,
        totals: computeTotals(updatedItems, state.discount, state.taxRate)
      }
    })
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      const updatedItems = state.items.map((i) =>
        i.productId === productId
          ? {
              ...i,
              quantity: Math.max(1, Math.min(quantity, i.maxQuantity)),
              subtotal: Math.max(1, Math.min(quantity, i.maxQuantity)) * i.price
            }
          : i
      )
      return {
        items: updatedItems,
        totals: computeTotals(updatedItems, state.discount, state.taxRate)
      }
    })
  },

  setDiscount: (discount) => {
    set((state) => ({
      discount,
      totals: computeTotals(state.items, discount, state.taxRate)
    }))
  },

  setTaxRate: (rate) => {
    set((state) => ({
      taxRate: rate,
      totals: computeTotals(state.items, state.discount, rate)
    }))
  },

  setCustomer: (id, name) => {
    set({ customerId: id, customerName: name })
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method })
  },

  setNotes: (notes) => {
    set({ notes })
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: null,
      discount: 0,
      paymentMethod: 'CASH',
      notes: '',
      totals: { subtotal: 0, discount: 0, taxAmount: 0, grandTotal: 0 }
    })
  }
}))
