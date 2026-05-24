import React, { useState, useEffect } from 'react'
import { Plus, Search, Upload, Download, Edit2, Trash2, AlertTriangle, ImageIcon, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import ConfirmModal from '@/components/Modals/ConfirmModal'
import { FormField } from '@/components/Forms/FormField'
import { productsApi, categoriesApi } from '@/services/api'
import { formatCurrency, getStockBadgeClass, getStockStatusLabel, generateSKU } from '@/utils/formatters'
import { useSettingsStore } from '@/store/settingsStore'
import type { Product } from '@/types'

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

interface Category {
  id: number
  name: string
  color: string
}

// =====================
// Image resize utility (runs in renderer, no IPC needed)
// =====================
function resizeImage(file: File, maxSize = 400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

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
  const [categories, setCategories] = useState<Category[]>([])
  const [imagePreview, setImagePreview] = useState<string>(product?.image || '')
  const [isResizing, setIsResizing] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const {
    register, handleSubmit, formState: { errors },
    setValue, watch
  } = useForm<ProductFormData>({
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
    categoriesApi.getAll().then((res) => {
      if (res.success && res.data) setCategories(res.data)
    })
  }, [])

  // Handle file selected via the hidden input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsResizing(true)
    try {
      const base64 = await resizeImage(file)
      setImagePreview(base64)
    } catch {
      setError('Failed to process image. Please try another file.')
    }
    setIsResizing(false)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    setError('')
    const payload = {
      ...data,
      category: data.category || undefined,
      barcode: data.barcode || undefined,
      image: imagePreview || undefined    // base64 data URL or empty
    }
    const response = product
      ? await productsApi.update(product.id, payload)
      : await productsApi.create(payload)

    if (response.success) { onSave(); onClose() }
    else setError(response.error || 'Failed to save product')
    setIsLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 flex items-center justify-center">✕</button>
        </div>

        {/* Hidden file input — triggered programmatically */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <form onSubmit={handleSubmit(onSubmit)} id="product-form">
          <div className="p-6">
            <div className="flex gap-5">
              {/* LEFT: Image Upload */}
              <div className="flex-shrink-0">
                <label className="label mb-2">Product Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    w-32 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center
                    cursor-pointer transition-all group overflow-hidden relative select-none
                    ${imagePreview
                      ? 'border-primary'
                      : 'border-border hover:border-primary hover:bg-blue-50'
                    }
                  `}
                >
                  {isResizing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-text-muted">Processing...</span>
                    </div>
                  ) : imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <span className="text-white text-xs font-semibold">Change Photo</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-text-muted mb-2 group-hover:text-primary transition-colors" />
                      <span className="text-xs text-text-muted group-hover:text-primary transition-colors text-center px-2">
                        Click to upload
                      </span>
                      <span className="text-[10px] text-text-muted mt-0.5">JPG, PNG, WebP</span>
                    </>
                  )}
                </div>
                {imagePreview && !isResizing && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImagePreview('') }}
                    className="mt-1.5 text-xs text-danger hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {/* RIGHT: Form Fields */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <FormField
                  id="productName"
                  label="Product Name"
                  placeholder="Enter product name"
                  registration={register('productName')}
                  error={errors.productName}
                  required
                  className="col-span-2"
                />
                <div>
                  <label className="label">SKU *</label>
                  <input
                    id="sku"
                    className={`input ${errors.sku ? 'input-error' : ''}`}
                    placeholder="e.g. PROD-001"
                    {...register('sku')}
                  />
                  {errors.sku && <p className="error-text">{errors.sku.message}</p>}
                  {!product && productName && (
                    <button
                      type="button"
                      onClick={() => setValue('sku', generateSKU(productName))}
                      className="text-[11px] text-primary hover:underline mt-0.5"
                    >
                      Auto-generate
                    </button>
                  )}
                </div>
                <FormField
                  id="barcode"
                  label="Barcode"
                  placeholder="Scan or type..."
                  registration={register('barcode')}
                  error={errors.barcode}
                />
              </div>
            </div>

            {/* Category + Prices row */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="category" className="label">
                  Category
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); onClose() }}
                    className="ml-2 text-primary text-xs font-normal hover:underline"
                    title="Go to Categories page to manage"
                  >
                    Manage →
                  </a>
                </label>
                {categories.length > 0 ? (
                  <select id="category" className="input" {...register('category')}>
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="category"
                    className="input"
                    placeholder="No categories yet..."
                    readOnly
                    title="Add categories first from the Categories page"
                  />
                )}
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
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4 mt-4">
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
                hint="Alert when qty drops to this"
              />
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-4 p-3 bg-danger-light text-danger rounded-lg text-sm">{error}</div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" id="product-save" className="btn btn-primary" disabled={isLoading || isResizing}>
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
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => {
    loadProducts()
    categoriesApi.getAll().then((res) => {
      if (res.success && res.data) setCategories(res.data)
    })
  }, [])

  const loadProducts = async () => {
    setIsLoading(true)
    const response = await productsApi.getAll()
    if (response.success && response.data) setProducts(response.data)
    setIsLoading(false)
  }

  // Filtered products by category
  const filteredProducts = filterCategory
    ? products.filter((p) => p.category === filterCategory)
    : products

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
    if (response.success) alert('Exported successfully!')
  }

  const columns: ColumnDef<Product, unknown>[] = [
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {/* Image thumbnail */}
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
            {row.original.image ? (
              <img
                src={row.original.image}
                alt={row.original.productName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-text-muted" />
            )}
          </div>
          <div>
            <div className="font-medium text-text-primary">{row.original.productName}</div>
            <div className="text-xs text-text-muted">{row.original.sku}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const catName = row.original.category
        const cat = categories.find((c) => c.name === catName)
        return catName ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-white text-xs font-semibold"
            style={{ backgroundColor: cat?.color || '#BEF949' }}
          >
            {catName}
          </span>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        )
      }
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Price',
      cell: ({ getValue }) => <span className="font-medium">{formatCurrency(getValue() as number, currencySymbol)}</span>
    },
    {
      accessorKey: 'quantity',
      header: 'Stock',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.quantity}</span>
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
            <Edit2 className="w-3.5 h-3.5" /> Edit
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
          <p className="text-text-secondary text-sm">{filteredProducts.length} of {products.length} products</p>
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

      {/* Search + Category filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            id="product-search"
            type="text"
            placeholder="Search products..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="input pl-10 w-64"
          />
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterCategory === ''
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.name ? '' : cat.name)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filterCategory === cat.name ? 'text-white shadow-sm' : 'text-white opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: cat.color }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredProducts}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        emptyMessage="No products found."
      />

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowModal(false)}
          onSave={loadProducts}
        />
      )}

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
