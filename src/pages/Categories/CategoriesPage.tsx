import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import ConfirmModal from '@/components/Modals/ConfirmModal'
import { FormField } from '@/components/Forms/FormField'
import { categoriesApi } from '@/services/api'
import { formatDate } from '@/utils/formatters'

interface Category {
  id: number
  name: string
  description: string | null
  color: string
  createdAt: string
}

// Preset color swatches
const COLOR_SWATCHES = [
  '#27AAE1', '#16A34A', '#F59E0B', '#DC2626',
  '#8B5CF6', '#06B6D4', '#EC4899', '#F97316',
  '#64748B', '#0EA5E9', '#10B981', '#6366F1'
]

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Max 50 characters'),
  description: z.string().max(200).optional(),
  color: z.string().default('#27AAE1')
})
type CategoryFormData = z.infer<typeof categorySchema>

// =====================
// CATEGORY MODAL
// =====================

const CategoryModal: React.FC<{
  category: Category | null
  onClose: () => void
  onSave: () => void
}> = ({ category, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedColor, setSelectedColor] = useState(category?.color || '#27AAE1')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? { name: category.name, description: category.description || '', color: category.color }
      : { color: '#27AAE1' }
  })

  const onSubmit = async (data: CategoryFormData) => {
    setIsLoading(true)
    setError('')
    const payload = { ...data, color: selectedColor }
    const response = category
      ? await categoriesApi.update(category.id, payload)
      : await categoriesApi.create(payload)

    if (response.success) { onSave(); onClose() }
    else setError(response.error || 'Failed to save category')
    setIsLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} id="category-form">
          <div className="p-6 space-y-5">
            {/* Preview badge */}
            <div className="flex items-center gap-3">
              <span
                className="px-4 py-1.5 rounded-full text-white text-sm font-medium shadow-sm transition-all"
                style={{ backgroundColor: selectedColor }}
              >
                Preview Label
              </span>
              <span className="text-xs text-text-muted">This is how the badge will look</span>
            </div>

            <FormField
              id="category-name"
              label="Category Name"
              placeholder="e.g. Electronics, Food, Clothing..."
              registration={register('name')}
              error={errors.name}
              required
            />

            <FormField
              id="category-description"
              label="Description"
              placeholder="Optional short description..."
              registration={register('description')}
              error={errors.description}
            />

            {/* Color Picker */}
            <div>
              <label className="label">Badge Color</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setSelectedColor(color); setValue('color', color) }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-text-primary scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {/* Custom color input */}
                <div className="relative">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => { setSelectedColor(e.target.value); setValue('color', e.target.value) }}
                    className="w-8 h-8 rounded-full border-2 border-border cursor-pointer"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>

            {error && <div className="p-3 bg-danger-light text-danger rounded-lg text-sm">{error}</div>}
          </div>

          <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" id="category-save" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : category ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================
// CATEGORIES PAGE
// =====================

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    setIsLoading(true)
    const res = await categoriesApi.getAll()
    if (res.success && res.data) setCategories(res.data)
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    await categoriesApi.delete(deletingId)
    setDeletingId(null)
    setIsDeleting(false)
    loadCategories()
  }

  const columns: ColumnDef<Category, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Category',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ backgroundColor: row.original.color + '25' }}
          >
            <Tag className="w-4 h-4" style={{ color: row.original.color }} />
          </div>
          <div>
            <span
              className="px-3 py-1 rounded-full text-white text-xs font-semibold"
              style={{ backgroundColor: row.original.color }}
            >
              {row.original.name}
            </span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="text-text-secondary text-sm">{(getValue() as string) || '—'}</span>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-xs text-text-muted">{formatDate(getValue() as string)}</span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            id={`edit-category-${row.original.id}`}
            onClick={() => { setEditing(row.original); setShowModal(true) }}
            className="btn btn-secondary btn-sm"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            id={`delete-category-${row.original.id}`}
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
          <h1 className="page-title">Categories</h1>
          <p className="text-text-secondary text-sm">{categories.length} product categories</p>
        </div>
        <button
          id="add-category"
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Color swatch overview */}
      {categories.length > 0 && (
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-3 font-medium uppercase tracking-wider">All Categories</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setEditing(cat); setShowModal(true) }}
                className="px-3 py-1.5 rounded-full text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: cat.color }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={categories}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No categories yet. Add your first category to organize products!"
        showPagination={false}
      />

      {showModal && (
        <CategoryModal
          category={editing}
          onClose={() => setShowModal(false)}
          onSave={loadCategories}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Category"
        message="Deleting this category will unlink it from all products. The products themselves will not be deleted. Continue?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default CategoriesPage
