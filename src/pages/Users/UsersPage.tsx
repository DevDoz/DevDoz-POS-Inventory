import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/Tables/DataTable'
import ConfirmModal from '@/components/Modals/ConfirmModal'
import { FormField, FormSelect } from '@/components/Forms/FormField'
import { authApi } from '@/services/api'
import { formatDate } from '@/utils/formatters'
import type { User, Role } from '@/types'

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER'])
})

const editSchema = userSchema.extend({ password: z.string().optional() })

type UserFormData = z.infer<typeof userSchema>

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'badge-danger',
  MANAGER: 'badge-warning',
  CASHIER: 'badge-info'
}

const UserModal: React.FC<{
  user: User | null
  onClose: () => void
  onSave: () => void
}> = ({ user, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(user ? editSchema : userSchema) as any,
    defaultValues: user
      ? { username: user.username, email: user.email || '', role: user.role, password: '' }
      : { role: 'CASHIER' }
  })

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    setError('')
    const payload = user
      ? { username: data.username, email: data.email || undefined, role: data.role }
      : data

    const response = user
      ? await authApi.updateUser(user.id, payload)
      : await authApi.createUser(data)

    if (response.success) { onSave(); onClose() }
    else setError(response.error || 'Failed to save user')
    setIsLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{user ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} id="user-form">
          <div className="p-6 space-y-4">
            <FormField id="username" label="Username" placeholder="username" registration={register('username')} error={errors.username} required />
            <FormField id="email" label="Email" type="email" placeholder="user@email.com" registration={register('email')} error={errors.email} />
            {!user && (
              <FormField id="password" label="Password" type="password" placeholder="Min 6 characters" registration={register('password')} error={errors.password} required />
            )}
            <FormSelect
              id="role"
              label="Role"
              registration={register('role')}
              options={[
                { value: 'ADMIN', label: 'Admin — Full Access' },
                { value: 'MANAGER', label: 'Manager — Reports & Inventory' },
                { value: 'CASHIER', label: 'Cashier — POS & Products' }
              ]}
              error={errors.role}
              required
            />
            {error && <div className="p-3 bg-danger-light text-danger rounded-lg text-sm">{error}</div>}
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" id="user-save" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : user ? 'Update User' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    const res = await authApi.getUsers()
    if (res.success && res.data) setUsers(res.data as User[])
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    await authApi.deleteUser(deletingId)
    setDeletingId(null)
    setIsDeleting(false)
    loadUsers()
  }

  const columns: ColumnDef<User, unknown>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">{row.original.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div className="font-medium">{row.original.username}</div>
            <div className="text-xs text-text-muted">{row.original.email || 'No email'}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as Role
        return (
          <span className={`badge ${ROLE_COLORS[role]}`}>
            <Shield className="w-3 h-3 mr-1" />
            {role}
          </span>
        )
      }
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className={`badge ${getValue() ? 'badge-success' : 'badge-danger'}`}>
          {getValue() ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => <span className="text-xs text-text-muted">{formatDate(getValue() as string)}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button id={`edit-user-${row.original.id}`} onClick={() => { setEditing(row.original); setShowModal(true) }} className="btn btn-secondary btn-sm">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button id={`delete-user-${row.original.id}`} onClick={() => setDeletingId(row.original.id)} className="btn btn-danger btn-sm">
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
          <h1 className="page-title">User Management</h1>
          <p className="text-text-secondary text-sm">{users.length} system users</p>
        </div>
        <button id="add-user" onClick={() => { setEditing(null); setShowModal(true) }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <DataTable data={users} columns={columns} isLoading={isLoading} emptyMessage="No users found." />

      {showModal && (
        <UserModal user={editing} onClose={() => setShowModal(false)} onSave={loadUsers} />
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        title="Deactivate User"
        message="This will deactivate the user account. They will no longer be able to log in."
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default UsersPage
