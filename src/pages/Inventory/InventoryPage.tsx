import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import { FormField, FormSelect } from '@/components/Forms/FormField'
import { inventoryApi, productsApi } from '@/services/api'
import { formatDateTime, formatInventoryType } from '@/utils/formatters'
import type { InventoryLog, Product } from '@/types'

const adjustSchema = z.object({
  productId: z.coerce.number().min(1, 'Select a product'),
  type: z.enum(['ADD', 'REMOVE', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional()
})

type AdjustFormData = z.infer<typeof adjustSchema>

const InventoryPage: React.FC = () => {
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: 'ADD', quantity: 1 }
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setIsLoading(true)
    const [logsRes, productsRes] = await Promise.all([
      inventoryApi.getLogs(),
      productsApi.getAll()
    ])
    if (logsRes.success && logsRes.data) setLogs(logsRes.data)
    if (productsRes.success && productsRes.data) setProducts(productsRes.data)
    setIsLoading(false)
  }

  const onSubmit = async (data: AdjustFormData) => {
    setIsSubmitting(true)
    setError('')
    const response = await inventoryApi.adjust(data)
    if (response.success) {
      reset()
      setShowForm(false)
      loadData()
    } else {
      setError(response.error || 'Adjustment failed')
    }
    setIsSubmitting(false)
  }

  const columns: ColumnDef<InventoryLog, unknown>[] = [
    {
      accessorKey: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{(row.original as any).product?.productName}</div>
          <div className="text-xs text-text-muted">{(row.original as any).product?.sku}</div>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as string
        const colorMap: Record<string, string> = {
          ADD: 'badge-success', REMOVE: 'badge-danger',
          ADJUSTMENT: 'badge-warning', SALE: 'badge-info', INITIAL: 'badge-gray'
        }
        return <span className={`badge ${colorMap[type] || 'badge-gray'}`}>{formatInventoryType(type)}</span>
      }
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity Change',
      cell: ({ getValue }) => {
        const qty = getValue() as number
        return (
          <span className={`font-semibold ${qty > 0 ? 'text-success' : 'text-danger'}`}>
            {qty > 0 ? '+' : ''}{qty}
          </span>
        )
      }
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => <span className="text-text-muted text-xs">{(getValue() as string) || '—'}</span>
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-xs text-text-muted">{formatDateTime(getValue() as string)}</span>
    }
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-text-secondary text-sm">Stock adjustment logs</p>
        </div>
        <button id="adjust-stock" onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Adjust Stock
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          id="inventory-search"
          type="text"
          placeholder="Search inventory logs..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="input pl-10"
        />
      </div>

      <DataTable
        data={logs}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        emptyMessage="No inventory logs found."
      />

      {/* Adjust Stock Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Adjust Stock</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} id="inventory-form">
              <div className="p-6 space-y-4">
                <FormSelect
                  id="productId"
                  label="Product"
                  registration={register('productId')}
                  options={products.map((p) => ({ value: String(p.id), label: `${p.productName} (Stock: ${p.quantity})` }))}
                  error={errors.productId}
                  placeholder="Select product..."
                  required
                />
                <FormSelect
                  id="type"
                  label="Adjustment Type"
                  registration={register('type')}
                  options={[
                    { value: 'ADD', label: 'Add Stock' },
                    { value: 'REMOVE', label: 'Remove Stock' },
                    { value: 'ADJUSTMENT', label: 'Manual Adjustment' }
                  ]}
                  error={errors.type}
                  required
                />
                <FormField id="quantity" label="Quantity" type="number" placeholder="1" registration={register('quantity')} error={errors.quantity} required />
                <FormField id="notes" label="Notes" placeholder="Reason for adjustment..." registration={register('notes')} error={errors.notes} />
                {error && <div className="p-3 bg-danger-light text-danger rounded-lg text-sm">{error}</div>}
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary" disabled={isSubmitting}>Cancel</button>
                <button type="submit" id="inventory-save" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage
