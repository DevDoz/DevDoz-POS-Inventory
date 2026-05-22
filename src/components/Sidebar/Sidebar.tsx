import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  BarChart3,
  Receipt,
  UserCog,
  Settings,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/hooks/usePermissions'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  module: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { label: 'POS', path: '/pos', icon: ShoppingCart, module: 'pos' },
  { label: 'Products', path: '/products', icon: Package, module: 'products' },
  { label: 'Inventory', path: '/inventory', icon: Warehouse, module: 'inventory' },
  { label: 'Customers', path: '/customers', icon: Users, module: 'customers' },
  { label: 'Sales', path: '/sales', icon: Receipt, module: 'sales' },
  { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },
  { label: 'Users', path: '/users', icon: UserCog, module: 'users' },
  { label: 'Settings', path: '/settings', icon: Settings, module: 'settings' }
]

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.module))

  return (
    <aside
      className={`
        flex flex-col h-full bg-sidebar
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-60'}
        flex-shrink-0 relative
      `}
    >
      {/* Header / Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base leading-tight">DevDoz POS</div>
            <div className="text-gray-400 text-xs">v1.0.0</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-150 cursor-pointer no-underline
               ${isActive
                 ? 'bg-primary/20 text-primary'
                 : 'text-gray-400 hover:text-white hover:bg-white/10'
               }
               ${collapsed ? 'justify-center' : ''}
              `
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile + logout */}
      <div className="p-3 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.username}</div>
              <div className="text-gray-400 text-xs">{user?.role}</div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Logout"
          className={`
            flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400
            hover:text-white hover:bg-white/10 transition-all duration-150
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-sidebar border border-white/20
                   rounded-full flex items-center justify-center text-gray-400 hover:text-white
                   hover:bg-sidebar-hover transition-all duration-150 z-10"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}

export default Sidebar
