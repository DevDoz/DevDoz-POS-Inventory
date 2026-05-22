import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'
import { ROLE_PERMISSIONS } from '@/types'

/**
 * Hook to check if the current user has permission to access a module.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  const role = user?.role as Role | undefined

  const hasPermission = (module: string): boolean => {
    if (!role) return false
    return ROLE_PERMISSIONS[role]?.includes(module) ?? false
  }

  const isAdmin = role === 'ADMIN'
  const isManager = role === 'MANAGER'
  const isCashier = role === 'CASHIER'

  const canAccess = (modules: string[]): boolean => {
    return modules.some((m) => hasPermission(m))
  }

  return { hasPermission, canAccess, isAdmin, isManager, isCashier, role }
}
