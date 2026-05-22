import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, Role } from '@/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: Session | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(username, password)
          if (response.success && response.data) {
            const session: Session = {
              userId: response.data.id,
              username: response.data.username,
              email: response.data.email,
              role: response.data.role as Role,
              isLoggedIn: true
            }
            set({ user: session, isLoggedIn: true, isLoading: false })
            return true
          } else {
            set({ error: response.error || 'Login failed', isLoading: false })
            return false
          }
        } catch (err) {
          set({ error: 'Connection error. Please try again.', isLoading: false })
          return false
        }
      },

      logout: async (): Promise<void> => {
        await authApi.logout()
        set({ user: null, isLoggedIn: false, error: null })
      },

      checkSession: async (): Promise<void> => {
        set({ isLoading: true })
        try {
          const response = await authApi.getSession()
          if (response.success && response.data) {
            set({ user: response.data, isLoggedIn: true, isLoading: false })
          } else {
            set({ user: null, isLoggedIn: false, isLoading: false })
          }
        } catch {
          set({ user: null, isLoggedIn: false, isLoading: false })
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'devdoz-auth',
      // Only persist user info, not loading states
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
)
