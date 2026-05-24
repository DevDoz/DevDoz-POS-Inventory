import React, { useState, useEffect } from 'react'
import { Save, HardDrive, RotateCcw, Plus, Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { settingsApi } from '@/services/api'
import { useSettingsStore } from '@/store/settingsStore'
import { formatFileSize, formatDateTime } from '@/utils/formatters'

interface SettingsForm {
  store_name: string
  store_address: string
  store_phone: string
  store_email: string
  currency_symbol: string
  tax_rate: string
  receipt_footer: string
  low_stock_default: string
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'store' | 'pos' | 'backup' | 'about'>('store')
  const [backups, setBackups] = useState<Array<{ filename: string; size: number; createdAt: string }>>([])
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const { loadSettings, getSetting } = useSettingsStore()

  const { register, handleSubmit, reset } = useForm<SettingsForm>()

  useEffect(() => {
    loadCurrentSettings()
    loadBackups()
    settingsApi.getAppVersion().then((res) => {
      if (res.success && res.data) setAppVersion(res.data)
    })
  }, [])

  const loadCurrentSettings = async () => {
    const res = await settingsApi.getAll()
    if (res.success && res.data) {
      reset(res.data as any)
      await loadSettings()
    }
  }

  const loadBackups = async () => {
    const res = await settingsApi.listBackups()
    if (res.success && res.data) setBackups(res.data)
  }

  const onSave = async (data: SettingsForm) => {
    setIsSaving(true)
    const strData: Record<string, string> = {}
    Object.entries(data).forEach(([k, v]) => { strData[k] = String(v || '') })
    const res = await settingsApi.setMultiple(strData)
    if (res.success) {
      await loadSettings()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    setIsSaving(false)
  }

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    const res = await settingsApi.createBackup()
    if (res.success) {
      await loadBackups()
      alert('Backup created successfully!')
    } else {
      alert(`Backup failed: ${res.error}`)
    }
    setIsCreatingBackup(false)
  }

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`Restore backup "${filename}"? The app will need to restart after restoring.`)) return
    setIsRestoring(true)
    const res = await settingsApi.restoreBackup(filename)
    if (res.success) {
      alert('Backup restored! Please restart the application.')
    } else {
      alert(`Restore failed: ${res.error}`)
    }
    setIsRestoring(false)
  }

  const tabs = [
    { key: 'store', label: 'Store Info' },
    { key: 'pos', label: 'POS Settings' },
    { key: 'backup', label: 'Backup & Restore' },
    { key: 'about', label: 'About' }
  ] as const

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`settings-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSave)} id="settings-form">
        {/* STORE INFO */}
        {activeTab === 'store' && (
          <div className="card max-w-2xl space-y-4">
            <h2 className="font-semibold text-text-primary mb-2">Store Information</h2>
            <div>
              <label className="label">Store Name *</label>
              <input id="store-name" className="input" {...register('store_name')} />
            </div>
            <div>
              <label className="label">Address</label>
              <input id="store-address" className="input" {...register('store_address')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input id="store-phone" className="input" {...register('store_phone')} />
              </div>
              <div>
                <label className="label">Email</label>
                <input id="store-email" type="email" className="input" {...register('store_email')} />
              </div>
            </div>
            <div>
              <label className="label">Receipt Footer Message</label>
              <input id="receipt-footer" className="input" placeholder="Thank You!" {...register('receipt_footer')} />
            </div>
          </div>
        )}

        {/* POS SETTINGS */}
        {activeTab === 'pos' && (
          <div className="card max-w-2xl space-y-4">
            <h2 className="font-semibold text-text-primary mb-2">Point of Sale Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Currency Symbol</label>
                <input id="currency-symbol" className="input" placeholder="$" {...register('currency_symbol')} />
              </div>
              <div>
                <label className="label">Default Tax Rate (%)</label>
                <input id="tax-rate" type="number" step="0.01" className="input" placeholder="10" {...register('tax_rate')} />
              </div>
            </div>
            <div>
              <label className="label">Global Low Stock Threshold</label>
              <input id="low-stock-default" type="number" className="input" placeholder="10" {...register('low_stock_default')} />
              <p className="text-xs text-text-muted mt-1">Alert when product quantity drops to or below this number</p>
            </div>
          </div>
        )}

        {/* Inline save for store/pos tabs */}
        {(activeTab === 'store' || activeTab === 'pos') && (
          <div className="flex items-center gap-3 mt-4">
            <button type="submit" id="save-settings" className="btn btn-primary" disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveSuccess && (
              <span className="text-success text-sm font-medium animate-fade-in">
                ✓ Settings saved successfully!
              </span>
            )}
          </div>
        )}
      </form>

      {/* BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-text-primary">Database Backups</h2>
                <p className="text-text-muted text-xs mt-1">
                  Automatic daily backups are created at midnight. Manual backups can be created any time.
                </p>
              </div>
              <button
                id="create-backup"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="btn btn-primary"
              >
                <HardDrive className="w-4 h-4" />
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-text-primary mb-4">Available Backups ({backups.length})</h3>
            {backups.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No backups yet. Create your first backup above.
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.filename}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium font-mono text-text-primary">
                        {backup.filename}
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatFileSize(backup.size)} · {formatDateTime(backup.createdAt)}
                      </div>
                    </div>
                    <button
                      id={`restore-${backup.filename}`}
                      onClick={() => handleRestoreBackup(backup.filename)}
                      disabled={isRestoring}
                      className="btn btn-secondary btn-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABOUT */}
      {activeTab === 'about' && (
        <div className="max-w-lg">
          <div className="card text-center space-y-4">
            <div className="flex justify-center">
              <img
                src="/logo.png"
                alt="DevDoz POS"
                className="w-20 h-20 rounded-2xl object-cover shadow-lg mx-auto"
                style={{ boxShadow: '0 8px 32px rgba(190,249,73,0.25)' }}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                DevDoz <span style={{ color: '#BEF949' }}>POS</span>
              </h2>
              <p className="text-text-muted text-sm">Version {appVersion || '1.0.0'}</p>
            </div>
            <p className="text-text-secondary text-sm">
              A complete offline Point of Sale and Inventory Management System for small businesses.
            </p>
            <div className="pt-4 border-t border-border text-xs text-text-muted space-y-1">
              <div>Built with Electron · React · TypeScript · SQLite</div>
              <div>© 2025 DevDoz. All rights reserved.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage
