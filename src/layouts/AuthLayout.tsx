import React from 'react'
import { Outlet } from 'react-router-dom'

/**
 * Centered layout for authentication pages (Login).
 */
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sidebar via-gray-800 to-primary-dark">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          {/* New logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <img
                src="/logo.png"
                alt="DevDoz POS"
                className="w-24 h-24 rounded-3xl object-cover shadow-2xl"
                style={{ boxShadow: '0 0 60px rgba(190,249,73,0.4)' }}
              />
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'transparent',
                  boxShadow: '0 0 0 1px rgba(190,249,73,0.3)',
                  borderRadius: '1.5rem'
                }}
              />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            DevDoz <span style={{ color: '#BEF949' }}>POS</span>
          </h1>
          <p className="text-gray-400 text-sm mb-2 font-medium tracking-widest uppercase">
            Inventory & Point of Sale
          </p>
          <p className="text-gray-300 text-base leading-relaxed mt-4">
            Complete Inventory &amp; Point of Sale solution for your small business.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 text-left">
            {[
              { label: 'Fast Checkout', icon: '⚡', desc: 'Process sales in seconds' },
              { label: 'Smart Inventory', icon: '📦', desc: 'Real-time stock tracking' },
              { label: 'Reports & Insights', icon: '📊', desc: 'Daily & monthly analytics' },
              { label: 'Works Offline', icon: '🔒', desc: 'No internet required' }
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/8 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/12 transition-colors"
              >
                <div className="text-xl mb-1.5">{f.icon}</div>
                <div className="font-semibold text-sm text-white">{f.label}</div>
                <div className="text-gray-400 text-xs mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Version badge */}
          <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Version 1.0.0 · Local & Offline
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
