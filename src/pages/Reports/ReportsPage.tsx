import React, { useState, useEffect } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { reportsApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useSettingsStore } from '@/store/settingsStore'
import type { ProductReport, RevenueReport, MonthlyReport } from '@/types'
import dayjs from 'dayjs'

const CHART_COLORS = ['#BEF949', '#16A34A', '#F59E0B', '#DC2626', '#8B5CF6', '#06B6D4']

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'products' | 'revenue'>('daily')
  const [dailyDate, setDailyDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [monthlyYear, setMonthlyYear] = useState(dayjs().year())
  const [monthlyMonth, setMonthlyMonth] = useState(dayjs().month() + 1)
  const [productData, setProductData] = useState<ProductReport[]>([])
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null)
  const [dailyData, setDailyData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { getSetting } = useSettingsStore()
  const currencySymbol = getSetting('currency_symbol') || '$'

  useEffect(() => { loadReport() }, [activeTab, dailyDate, monthlyYear, monthlyMonth])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'daily') {
        const res = await reportsApi.getDailyReport(dailyDate)
        if (res.success) setDailyData(res.data)
      } else if (activeTab === 'monthly') {
        const res = await reportsApi.getMonthlyReport(monthlyYear, monthlyMonth)
        if (res.success) setMonthlyData(res.data as MonthlyReport)
      } else if (activeTab === 'products') {
        const res = await reportsApi.getProductReport()
        if (res.success) setProductData(res.data as ProductReport[])
      } else if (activeTab === 'revenue') {
        const res = await reportsApi.getRevenueReport()
        if (res.success) setRevenueData(res.data as RevenueReport)
      }
    } catch (err) {
      console.error('[Reports] Load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportExcel = async () => {
    await reportsApi.exportExcel('sales')
    alert('Export complete!')
  }

  const tabs = [
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'products', label: 'Product Sales' },
    { key: 'revenue', label: 'Revenue' }
  ] as const

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-text-secondary text-sm">Business analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn btn-secondary">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`report-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* DAILY REPORT */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  id="daily-date"
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="input w-auto"
                />
              </div>
              {dailyData && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary">{dailyData.totalCount}</div>
                    <div className="text-text-muted text-sm mt-1">Total Sales</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-success">{formatCurrency(dailyData.totalRevenue, currencySymbol)}</div>
                    <div className="text-text-muted text-sm mt-1">Revenue</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-warning">{formatCurrency(dailyData.totalDiscount, currencySymbol)}</div>
                    <div className="text-text-muted text-sm mt-1">Total Discount</div>
                  </div>
                </div>
              )}
              {dailyData?.sales?.length > 0 && (
                <div className="card overflow-hidden p-0">
                  <table className="data-table">
                    <thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th></tr></thead>
                    <tbody>
                      {dailyData.sales.map((s: any) => (
                        <tr key={s.id}>
                          <td className="font-mono text-primary">{s.invoiceNo}</td>
                          <td>{s.customer?.name || 'Walk-in'}</td>
                          <td>{s.items?.length || 0}</td>
                          <td><span className="badge badge-gray">{s.paymentMethod}</span></td>
                          <td className="font-semibold text-success">{formatCurrency(s.grandTotal, currencySymbol)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MONTHLY REPORT */}
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  id="monthly-year"
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(parseInt(e.target.value))}
                  className="input w-auto"
                >
                  {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  id="monthly-month"
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(parseInt(e.target.value))}
                  className="input w-auto"
                >
                  {dayjs.months
                    ? dayjs.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)
                    : Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>{dayjs().month(i).format('MMMM')}</option>
                      ))
                  }
                </select>
              </div>
              {monthlyData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card text-center">
                      <div className="text-2xl font-bold text-primary">{monthlyData.totalSales}</div>
                      <div className="text-text-muted text-sm mt-1">Total Sales</div>
                    </div>
                    <div className="card text-center">
                      <div className="text-2xl font-bold text-success">{formatCurrency(monthlyData.totalRevenue, currencySymbol)}</div>
                      <div className="text-text-muted text-sm mt-1">Total Revenue</div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="font-semibold mb-4">Daily Revenue Breakdown</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyData.byDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip formatter={(v: number) => [formatCurrency(v, currencySymbol), 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="revenue" fill="#BEF949" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PRODUCT SALES REPORT */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {productData.length > 0 ? (
                <>
                  <div className="card overflow-hidden p-0">
                    <table className="data-table">
                      <thead><tr><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                      <tbody>
                        {productData.slice(0, 20).map((p) => (
                          <tr key={p.productId}>
                            <td>
                              <div className="font-medium">{p.productName}</div>
                              <div className="text-xs text-text-muted">{p.sku}</div>
                            </td>
                            <td>{p.category ? <span className="badge badge-info">{p.category}</span> : '—'}</td>
                            <td className="font-medium">{p.totalQuantity}</td>
                            <td className="font-semibold text-success">{formatCurrency(p.totalRevenue, currencySymbol)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-text-muted">No product sales data available.</div>
              )}
            </div>
          )}

          {/* REVENUE REPORT */}
          {activeTab === 'revenue' && revenueData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: formatCurrency(revenueData.totalRevenue, currencySymbol), color: 'text-primary' },
                  { label: 'Net Revenue', value: formatCurrency(revenueData.netRevenue, currencySymbol), color: 'text-success' },
                  { label: 'Total Discount', value: formatCurrency(revenueData.totalDiscount, currencySymbol), color: 'text-warning' },
                  { label: 'Total Tax', value: formatCurrency(revenueData.totalTax, currencySymbol), color: 'text-info' }
                ].map((stat) => (
                  <div key={stat.label} className="card text-center">
                    <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-text-muted text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
              {revenueData.byPaymentMethod.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold mb-4">Revenue by Payment Method</h3>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={revenueData.byPaymentMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={100} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                          {revenueData.byPaymentMethod.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v, currencySymbol)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ReportsPage
