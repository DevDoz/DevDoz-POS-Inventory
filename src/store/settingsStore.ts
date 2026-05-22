import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types'
import { settingsApi } from '@/services/api'

interface SettingsState {
  settings: AppSettings | null
  isLoaded: boolean

  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (data: Partial<AppSettings>) => Promise<boolean>
  getSetting: (key: keyof AppSettings) => string
}

const DEFAULT_SETTINGS: AppSettings = {
  store_name: 'DevDoz Store',
  store_address: '',
  store_phone: '',
  store_email: '',
  currency_symbol: '$',
  tax_rate: '10',
  receipt_footer: 'Thank You for Shopping With Us!',
  low_stock_default: '10',
  backup_enabled: 'true'
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoaded: false,

      loadSettings: async () => {
        try {
          const response = await settingsApi.getAll()
          if (response.success && response.data) {
            set({ settings: response.data as AppSettings, isLoaded: true })
          }
        } catch (err) {
          console.error('[SettingsStore] Failed to load settings:', err)
          set({ isLoaded: true })
        }
      },

      updateSettings: async (data: Partial<AppSettings>): Promise<boolean> => {
        try {
          const stringData: Record<string, string> = {}
          Object.entries(data).forEach(([k, v]) => {
            stringData[k] = String(v)
          })

          const response = await settingsApi.setMultiple(stringData)
          if (response.success) {
            set((state) => ({
              settings: { ...state.settings!, ...data }
            }))
            return true
          }
          return false
        } catch {
          return false
        }
      },

      getSetting: (key: keyof AppSettings): string => {
        const { settings } = get()
        return settings?.[key] ?? DEFAULT_SETTINGS[key] ?? ''
      }
    }),
    {
      name: 'devdoz-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
)
