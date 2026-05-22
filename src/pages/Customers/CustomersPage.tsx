import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import ConfirmModal from '@/components/Modals/ConfirmModal'
import { FormField } from '@/components/Forms/FormField'
import { customersApi } from '@/services/api'
import { formatDate, getRelativeTime } from '@/utils/formatters'
import type { Customer } from '@/types'

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional()
})

type CustomerFormData = z.infer<typeof customerSchema>

const CustomerModal: React.FC<{
  customer: Customer | null
  onClose: () => void
  onSave: () => void
}> = ({ customer, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? { name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '' }
      : {}
  })

  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true)
    setError('')
    const payload = { ...data, email: data.email || undefined }
    const response = customer
      ? await customersApi.update(customer.id, payload)
      : await customersApi.create(payload)

    if (response.success) {
      onSave(); onClose()
    } else {
      setError(response.error || 'Failed to save customer')
    }
    setIsLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} id="customer-form">
          <div className="p-6 space-y-4">
            <FormField id="name" label="Full Name" placeholder="Customer name" registration={register('name')} error={errors.name} required />
            <div className="grid grid-cols-2 gap-4">
              <FormField id="phone" label="Phone" placeholder="+1 234 567 8900" registration={register('phone')} error={errors.phone} />
              <FormField id="email" label="Email" type="email" placeholder="customer@email.com" registration={register('email')} error={errors.email} />
            </div>
            <FormField id="address" label="Address" placeholder="Street, City, Country" registration={register('address')} error={errors.address} />
            {error && <div className="p-3 bg-danger-light text-danger rounded-lg text-sm">{error}</div>}
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" id="customer-save" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : customer ? 'Update' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    setIsLoading(true)
    const res = await customersApi.getAll()
    if (res.success && res.data) setCustomers(res.data)
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    await customersApi.delete(deletingId)
    setDeletingId(null)
    setIsDeleting(false)
    loadCustomers()
  }

  const columns: ColumnDef<Customer, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-text-primary">{row.original.name}</div>
          <div className="text-xs text-text-muted">{row.original.email || 'No email'}</div>
        </div>
      )
    },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue() as string || '—' },
    {
      accessorKey: '_count',
      header: 'Total Purchases',
      cell: ({ row }) => (
        <span className="badge badge-info">{(row.original._count?.sales ?? 0)} sales</span>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ getValue }) => <span className="text-text-muted text-xs">{formatDate(getValue() as string)}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button id={`edit-customer-${row.original.id}`} onClick={() => { setEditing(row.original); setShowModal(true) }} className="btn btn-secondary btn-sm">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button id={`delete-customer-${row.original.id}`} onClick={() => setDeletingId(row.original.id)} className="btn btn-danger btn-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-text-secondary text-sm">{customers.length} registered customers</p>
        </div>
        <button id="add-customer" onClick={() => { setEditing(null); setShowModal(true) }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          id="customer-search"
          type="text"
          placeholder="Search customers..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="input pl-10"
        />
      </div>

      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        globalFilter={globalFilter}
        emptyMessage="No customers yet. Add your first customer!"
      />

      {showModal && (
        <CustomerModal customer={editing} onClose={() => setShowModal(false)} onSave={loadCustomers} />
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default CustomersPage
