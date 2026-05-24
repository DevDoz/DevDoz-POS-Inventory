import React, { useEffect, useState } from 'react'
import {
  Package, ShoppingCart, DollarSign, AlertTriangle,
  Users, TrendingUp, ArrowUpRight
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { reportsApi } from '@/services/api'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency, formatDateTime, getRelativeTime } from '@/utils/formatters'
import type { DashboardStats } from '@/types'

// =====================
// STAT CARD
// =====================

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  trend?: string
  trendUp?: boolean
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, bgColor, trend, trendUp }) => (
  <div className="stat-card animate-fade-in">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-text-secondary text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-success' : 'text-text-muted'}`}>
            {trendUp && <ArrowUpRight className="w-3 h-3" />}
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  </div>
)

// =====================
// DASHBOARD PAGE
// =====================

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthlySales, setMonthlySales] = useState<Array<{ month: string; totalSales: number; totalRevenue: number }>>([])
  const [weeklySales, setWeeklySales] = useState<Array<{ day: string; totalSales: number; totalRevenue: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setIsLoading(true)
    try {
      const [statsRes, monthlyRes, weeklyRes] = await Promise.all([
        reportsApi.getDashboardStats(),
        window.api.sales.getMonthlyStats(),
        window.api.sales.getWeeklyStats()
      ])

      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (monthlyRes.success && monthlyRes.data) setMonthlySales(monthlyRes.data)
      if (weeklyRes.success && weeklyRes.data) setWeeklySales(weeklyRes.data)
    } catch (err) {
      console.error('[Dashboard] Failed to load stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
      trend: 'Across all categories'
    },
    {
      title: "Today's Sales",
      value: stats?.todaySales ?? 0,
      icon: ShoppingCart,
      color: 'text-success',
      bgColor: 'bg-success-light',
      trend: `${formatCurrency(stats?.todayRevenue ?? 0, currencySymbol)} revenue`,
      trendUp: (stats?.todaySales ?? 0) > 0
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0, currencySymbol),
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
      trend: `From ${stats?.totalSales ?? 0} sales`
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockItems ?? 0,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
      trend: stats?.lowStockItems ? 'Needs restocking' : 'All good!'
    },
    {
      title: 'Customers',
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info-light',
      trend: 'Registered customers'
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales ?? 0,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-light',
      trend: 'All time'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Overview of your business performance
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="btn btn-secondary btn-sm"
          id="refresh-dashboard"
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="card">
          <h3 className="font-semibold text-text-primary mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value, currencySymbol), 'Revenue']}
                contentStyle={{
                  borderRadius: '8px', border: '1px solid #E5E7EB',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                stroke="#BEF949"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#BEF949' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Sales Chart */}
        <div className="card">
          <h3 className="font-semibold text-text-primary mb-4">Weekly Sales (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'totalRevenue' ? formatCurrency(value, currencySymbol) : value,
                  name === 'totalRevenue' ? 'Revenue' : 'Sales'
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
              />
              <Bar dataKey="totalRevenue" fill="#BEF949" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card">
          <h3 className="font-semibold text-text-primary mb-4">Recent Sales</h3>
          {stats?.recentSales && stats.recentSales.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">{sale.invoiceNo}</div>
                    <div className="text-xs text-text-muted">
                      {(sale as any).customer?.name || 'Walk-in'} · {getRelativeTime(sale.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-success">
                    {formatCurrency(sale.grandTotal, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted text-sm">
              No sales recorded yet. Start your first sale in POS!
            </div>
          )}
        </div>

        {/* Recent Inventory Changes */}
        <div className="card">
          <h3 className="font-semibold text-text-primary mb-4">Recent Inventory Changes</h3>
          {stats?.recentInventoryLogs && stats.recentInventoryLogs.length > 0 ? (
            <div className="space-y-3">
              {stats.recentInventoryLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {(log as any).product?.productName}
                    </div>
                    <div className="text-xs text-text-muted">
                      {log.type} · {getRelativeTime(log.createdAt)}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${log.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                    {log.quantity > 0 ? '+' : ''}{log.quantity}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted text-sm">
              No inventory changes recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
