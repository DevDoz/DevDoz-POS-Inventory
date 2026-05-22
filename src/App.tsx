import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import AppLayout from '@/layouts/AppLayout'
import AuthLayout from '@/layouts/AuthLayout'

// Pages
import LoginPage from '@/pages/Login/LoginPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import POSPage from '@/pages/POS/POSPage'
import ProductsPage from '@/pages/Products/ProductsPage'
import InventoryPage from '@/pages/Inventory/InventoryPage'
import CustomersPage from '@/pages/Customers/CustomersPage'
import SalesPage from '@/pages/Sales/SalesPage'
import ReportsPage from '@/pages/Reports/ReportsPage'
import UsersPage from '@/pages/Users/UsersPage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import CategoriesPage from '@/pages/Categories/CategoriesPage'

/**
 * Root application component.
 * Sets up React Router with auth-guarded and public routes.
 */
const App: React.FC = () => {
  const { checkSession } = useAuthStore()

  // Check persisted session on app startup
  useEffect(() => {
    checkSession()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (no sidebar) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected app routes (with sidebar + navbar) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
