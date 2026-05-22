import React, { useState, useEffect } from 'react'
import { Plus, Search, Upload, Download, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import ConfirmModal from '@/components/Modals/ConfirmModal'
import { FormField, FormSelect } from '@/components/Forms/FormField'
import { productsApi } from '@/services/api'
import { formatCurrency, getStockBadgeClass, getStockStatusLabel, generateSKU } from '@/utils/formatters'
import { useSettingsStore } from '@/store/settingsStore'
import type { Product } from '@/types'

// =====================
// PRODUCT FORM SCHEMA
// =====================

const productSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, 'Must be 0 or more'),
  sellingPrice: z.coerce.number().min(0.01, 'Must be greater than 0'),
  quantity: z.coerce.number().int().min(0, 'Must be 0 or more'),
  lowStockLimit: z.coerce.number().int().min(0).default(10)
})

type ProductFormData = z.infer<typeof productSchema>

// =====================
// PRODUCT MODAL
// =====================

const ProductModal: React.FC<{
  product: Product | null
  onClose: () => void
  onSave: () => void
}> = ({ product, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          productName: product.productName,
          sku: product.sku,
          barcode: product.barcode || '',
          category: product.category || '',
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          quantity: product.quantity,
          lowStockLimit: product.lowStockLimit
        }
      : { quantity: 0, lowStockLimit: 10, purchasePrice: 0, sellingPrice: 0 }
  })

  const productName = watch('productName')

  useEffect(() => {
    productsApi.getCategories().then((res) => {
      if (res.success && res.data) setCategories(res.data as string[])
    })
  }, [])

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    setError('')
    try {
      const response = product
        ? await productsApi.update(product.id, data)
        : await productsApi.create(data)

      if (response.success) {
        onSave()
        onClose()
      } else {
        setError(response.error || 'Failed to save product')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 flex items-center justify-center">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} id="product-form">
          <div className="p-6 grid grid-cols-2 gap-4">
            <FormField
              id="productName"
              label="Product Name"
              placeholder="Enter product name"
              registration={register('productName')}
              error={errors.productName}
              required
              className="col-span-2"
            />
            <FormField
              id="sku"
              label="SKU"
              placeholder="e.g., PROD-001"
              registration={register('sku')}
              error={errors.sku}
              required
              hint={!product ? "Auto-generate based on name" : undefined}
            />
            <FormField
              id="barcode"
              label="Barcode"
              placeholder="Scan or enter barcode"
              registration={register('barcode')}
              error={errors.barcode}
            />
            <div>
              <label className="label">Category</label>
              <input
                id="category"
                list="category-options"
                className="input"
                placeholder="e.g., Electronics, Food..."
                {...register('category')}
              />
              <datalist id="category-options">
                {categories.map((c) => <option key={c} value={c || ''} />)}
              </datalist>
            </div>
            <FormField
              id="purchasePrice"
              label="Purchase Price"
              type="number"
              placeholder="0.00"
              registration={register('purchasePrice')}
              error={errors.purchasePrice}
              required
            />
            <FormField
              id="sellingPrice"
              label="Selling Price"
              type="number"
              placeholder="0.00"
              registration={register('sellingPrice')}
              error={errors.sellingPrice}
              required
            />
            <FormField
              id="quantity"
              label="Quantity in Stock"
              type="number"
              placeholder="0"
              registration={register('quantity')}
              error={errors.quantity}
            />
            <FormField
              id="lowStockLimit"
              label="Low Stock Alert At"
              type="number"
              placeholder="10"
              registration={register('lowStockLimit')}
              error={errors.lowStockLimit}
              hint="Alert when stock drops to this number"
            />
          </div>

          {error && (
            <div className="mx-6 mb-4 p-3 bg-danger-light text-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Generate SKU helper */}
          {!product && productName && (
            <div className="mx-6 mb-4">
              <button
                type="button"
                onClick={() => setValue('sku', generateSKU(productName))}
                className="text-xs text-primary hover:underline"
              >
                Auto-generate SKU from name
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" id="product-save" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================
// PRODUCTS PAGE
// =====================

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    setIsLoading(true)
    const response = await productsApi.getAll()
    if (response.success && response.data) setProducts(response.data)
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    await productsApi.delete(deletingId)
    setDeletingId(null)
    setIsDeleting(false)
    loadProducts()
  }

  const handleImportCSV = async () => {
    const response = await productsApi.importCSV()
    if (response.success && response.data) {
      const { imported, failed } = response.data as { imported: number; failed: number; errors: string[] }
      alert(`Import complete: ${imported} imported, ${failed} failed`)
      loadProducts()
    }
  }

  const handleExportCSV = async () => {
    const response = await productsApi.exportCSV()
    if (response.success) {
      alert(`Exported successfully!`)
    }
  }

  const columns: ColumnDef<Product, unknown>[] = [
    {
      accessorKey: 'productName',
      header: 'Product Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-text-primary">{row.original.productName}</div>
          <div className="text-xs text-text-muted">{row.original.sku}</div>
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? <span className="badge badge-info">{val}</span> : <span className="text-text-muted text-xs">—</span>
      }
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Price',
      cell: ({ getValue }) => (
        <span className="font-medium">{formatCurrency(getValue() as number, currencySymbol)}</span>
      )
    },
    {
      accessorKey: 'quantity',
      header: 'Stock',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>{row.original.quantity}</span>
          <span className={`badge ${getStockBadgeClass(row.original.quantity, row.original.lowStockLimit)}`}>
            {row.original.quantity <= row.original.lowStockLimit && row.original.quantity > 0 && (
              <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {getStockStatusLabel(row.original.quantity, row.original.lowStockLimit)}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            id={`edit-product-${row.original.id}`}
            onClick={() => { setEditingProduct(row.original); setShowModal(true) }}
            className="btn btn-secondary btn-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            id={`delete-product-${row.original.id}`}
            onClick={() => setDeletingId(row.original.id)}
            className="btn btn-danger btn-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-text-secondary text-sm">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImportCSV} className="btn btn-secondary btn-sm">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            id="add-product"
            onClick={() => { setEditingProduct(null); setShowModal(true) }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          id="product-search"
          type="text"
          placeholder="Search products..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Table */}
      <DataTable
        data={products}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        emptyMessage="No products found. Add your first product to get started."
      />

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowModal(false)}
          onSave={loadProducts}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default ProductsPage
