import React, { useState, useEffect } from 'react'
import { Search, Filter, Eye, Printer } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import { salesApi } from '@/services/api'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { useSettingsStore } from '@/store/settingsStore'
import type { Sale } from '@/types'

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => { loadSales() }, [])

  const loadSales = async () => {
    setIsLoading(true)
    const response = await salesApi.getAll({ startDate: startDate || undefined, endDate: endDate || undefined })
    if (response.success && response.data) setSales(response.data)
    setIsLoading(false)
  }

  const handlePrint = async (saleId: number) => {
    await salesApi.printReceipt(saleId)
  }

  const columns: ColumnDef<Sale, unknown>[] = [
    {
      accessorKey: 'invoiceNo',
      header: 'Invoice',
      cell: ({ getValue }) => <span className="font-mono font-medium text-primary">{getValue() as string}</span>
    },
    {
      accessorKey: 'createdAt',
      header: 'Date & Time',
      cell: ({ getValue }) => <span className="text-xs">{formatDateTime(getValue() as string)}</span>
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => <span>{(row.original as any).customer?.name || 'Walk-in'}</span>
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment',
      cell: ({ getValue }) => (
        <span className="badge badge-gray">{getValue() as string}</span>
      )
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ getValue }) => (
        <span className="font-semibold text-success">{formatCurrency(getValue() as number, currencySymbol)}</span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            id={`view-sale-${row.original.id}`}
            onClick={() => setSelectedSale(row.original)}
            className="btn btn-secondary btn-sm"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            id={`print-sale-${row.original.id}`}
            onClick={() => handlePrint(row.original.id)}
            className="btn btn-secondary btn-sm"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="text-text-secondary text-sm">{sales.length} sales records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            id="sales-search"
            type="text"
            placeholder="Search by invoice, customer..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input pl-10 w-60"
          />
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input
            id="sales-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input
            id="sales-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </div>
        <button onClick={loadSales} className="btn btn-primary btn-sm">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <DataTable
        data={sales}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        emptyMessage="No sales found for the selected period."
      />

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-panel max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Sale Details — {selectedSale.invoiceNo}</h2>
              <button onClick={() => setSelectedSale(null)} className="btn-ghost w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-muted">Date:</span> <span className="font-medium">{formatDateTime(selectedSale.createdAt)}</span></div>
                <div><span className="text-text-muted">Payment:</span> <span className="badge badge-gray ml-1">{selectedSale.paymentMethod}</span></div>
                <div><span className="text-text-muted">Customer:</span> <span className="font-medium">{(selectedSale as any).customer?.name || 'Walk-in'}</span></div>
                <div><span className="text-text-muted">Cashier:</span> <span className="font-medium">{(selectedSale as any).user?.username}</span></div>
              </div>
              <div>
                <h3 className="font-medium mb-2 text-sm">Items</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs text-text-muted font-semibold">Product</th>
                        <th className="text-center p-3 text-xs text-text-muted font-semibold">Qty</th>
                        <th className="text-right p-3 text-xs text-text-muted font-semibold">Price</th>
                        <th className="text-right p-3 text-xs text-text-muted font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="p-3">{item.product?.productName}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.price, currencySymbol)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.subtotal, currencySymbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-4 text-text-secondary"><span>Subtotal:</span><span>{formatCurrency(selectedSale.subtotal, currencySymbol)}</span></div>
                {selectedSale.discount > 0 && <div className="flex gap-4 text-danger"><span>Discount:</span><span>-{formatCurrency(selectedSale.discount, currencySymbol)}</span></div>}
                <div className="flex gap-4 text-text-secondary"><span>Tax:</span><span>{formatCurrency(selectedSale.tax, currencySymbol)}</span></div>
                <div className="flex gap-4 font-bold text-base border-t border-border pt-2 mt-1"><span>Total:</span><span className="text-primary">{formatCurrency(selectedSale.grandTotal, currencySymbol)}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => handlePrint(selectedSale.id)} className="btn btn-secondary">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button onClick={() => setSelectedSale(null)} className="btn btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesPage
