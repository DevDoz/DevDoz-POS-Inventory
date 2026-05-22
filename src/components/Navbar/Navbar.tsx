import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { productsApi } from '@/services/api'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/sales': 'Sales History',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings'
}

const Navbar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const [lowStockCount, setLowStockCount] = useState(0)
  const [showAlert, setShowAlert] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] || 'DevDoz POS'

  // Check low stock count periodically
  useEffect(() => {
    const checkLowStock = async () => {
      try {
        const response = await productsApi.getLowStock()
        if (response.success && response.data) {
          setLowStockCount(response.data.length)
        }
      } catch {
        // Silent fail
      }
    }

    checkLowStock()
    const interval = setInterval(checkLowStock, 5 * 60 * 1000) // Every 5 minutes
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">DevDoz POS</span>
        <ChevronRight className="w-3 h-3 text-text-muted" />
        <span className="text-text-primary font-semibold">{pageTitle}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Low stock notification bell */}
        <div className="relative">
          <button
            id="notification-bell"
            onClick={() => setShowAlert(!showAlert)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg
                       text-text-secondary hover:bg-gray-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 w-5 h-5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger
                               text-white text-[10px] font-bold rounded-full flex items-center
                               justify-center px-1 animate-pulse-soft">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
          </button>

          {/* Alert dropdown */}
          {showAlert && lowStockCount > 0 && (
            <div className="absolute right-0 top-11 w-72 bg-white rounded-xl shadow-modal border border-border
                            z-50 animate-slide-in p-4">
              <div className="font-semibold text-sm text-text-primary mb-2">
                ⚠️ {lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}
              </div>
              <p className="text-xs text-text-secondary">
                Some products are running low on stock. Visit the Products or Inventory page to restock.
              </p>
              <button
                className="mt-3 text-xs text-primary font-medium hover:underline"
                onClick={() => setShowAlert(false)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-text-primary">{user?.username}</div>
            <div className="text-xs text-text-muted">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
