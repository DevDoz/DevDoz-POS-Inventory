import React from 'react'
import { Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

/**
 * Centered layout for authentication pages (Login).
 */
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sidebar via-gray-800 to-primary-dark">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">DevDoz POS</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Complete Inventory & Point of Sale solution for your small business.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { label: 'Fast Checkout', icon: '⚡', desc: 'Process sales in seconds' },
              { label: 'Smart Inventory', icon: '📦', desc: 'Real-time stock tracking' },
              { label: 'Reports & Insights', icon: '📊', desc: 'Daily & monthly analytics' },
              { label: 'Works Offline', icon: '🔒', desc: 'No internet required' }
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-sm">{f.label}</div>
                <div className="text-gray-400 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
