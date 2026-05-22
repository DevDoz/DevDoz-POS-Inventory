import React, { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useCartStore } from '@/store/cartStore'
import Sidebar from '@/components/Sidebar/Sidebar'
import Navbar from '@/components/Navbar/Navbar'

/**
 * Main application layout — sidebar + navbar + page content.
 * Redirects to /login if not authenticated.
 */
const AppLayout: React.FC = () => {
  const { isLoggedIn, user, checkSession } = useAuthStore()
  const { loadSettings, getSetting } = useSettingsStore()
  const { taxRate, setTaxRate } = useCartStore()
  const navigate = useNavigate()

  // Check session on mount (handles app restart with remembered session)
  useEffect(() => {
    checkSession().then(() => {
      const { isLoggedIn } = useAuthStore.getState()
      if (!isLoggedIn) {
        navigate('/login', { replace: true })
      }
    })
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [isLoggedIn, navigate])

  // Load app settings and sync tax rate to cart
  useEffect(() => {
    if (isLoggedIn) {
      loadSettings()
    }
  }, [isLoggedIn])

  // Sync tax rate from settings to cart store
  useEffect(() => {
    const storedTaxRate = parseFloat(getSetting('tax_rate') || '10')
    if (!isNaN(storedTaxRate) && storedTaxRate !== taxRate) {
      setTaxRate(storedTaxRate)
    }
  }, [getSetting('tax_rate')])

  if (!isLoggedIn || !user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
