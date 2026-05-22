import React from 'react'
import { X, Printer, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import type { Sale } from '@/types'

interface ReceiptModalProps {
  sale: Sale
  currencySymbol: string
  onClose: () => void
  onPrint: () => void
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, currencySymbol, onClose, onPrint }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success header */}
        <div className="bg-gradient-primary p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Sale Complete!</h2>
          <p className="text-white/80 text-sm mt-1">Invoice {sale.invoiceNo}</p>
        </div>

        {/* Receipt preview */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="text-center font-bold text-sm mb-2">RECEIPT</div>
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span>{sale.invoiceNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDateTime(sale.createdAt)}</span>
            </div>
            {(sale as any).customer && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{(sale as any).customer.name}</span>
              </div>
            )}
            <div className="border-t border-dashed border-gray-300 my-2" />

            {/* Items */}
            {sale.items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate max-w-[160px]">
                  {item.product?.productName} × {item.quantity}
                </span>
                <span>{formatCurrency(item.subtotal, currencySymbol)}</span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 my-2" />
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal, currencySymbol)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount, currencySymbol)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(sale.tax, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-2 mt-1">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.grandTotal, currencySymbol)}</span>
            </div>
            <div className="text-center text-gray-500 mt-2">Thank You!</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            id="receipt-print"
            onClick={onPrint}
            className="btn btn-secondary flex-1"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            id="receipt-close"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReceiptModal
