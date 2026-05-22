import { IpcMain } from 'electron'
import { prisma } from '../services/database'
import * as bcrypt from 'bcryptjs'
import Store from 'electron-store'

interface LoginPayload {
  username: string
  password: string
}

interface CreateUserPayload {
  username: string
  email?: string
  password: string
  role: 'ADMIN' | 'MANAGER' | 'CASHIER'
}

interface UpdateUserPayload {
  username?: string
  email?: string
  role?: 'ADMIN' | 'MANAGER' | 'CASHIER'
  isActive?: boolean
}

/**
 * Registers all authentication-related IPC handlers.
 */
export function registerAuthHandlers(ipcMain: IpcMain, sessionStore: Store): void {
  // ==================== LOGIN ====================
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    try {
      const user = await prisma.user.findFirst({
        where: { username, isActive: true }
      })

      if (!user) {
        return { success: false, error: 'Invalid username or password' }
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return { success: false, error: 'Invalid username or password' }
      }

      // Store session
      const session = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isLoggedIn: true,
        loginAt: new Date().toISOString()
      }
      sessionStore.set('session', session)

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    } catch (error) {
      console.error('[IPC:auth:login] Error:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  })

  // ==================== LOGOUT ====================
  ipcMain.handle('auth:logout', async () => {
    try {
      sessionStore.delete('session')
      return { success: true }
    } catch (error) {
      console.error('[IPC:auth:logout] Error:', error)
      return { success: false, error: 'Logout failed' }
    }
  })

  // ==================== GET SESSION ====================
  ipcMain.handle('auth:getSession', async () => {
    try {
      const session = sessionStore.get('session') as Record<string, unknown> | undefined
      if (session && session['isLoggedIn']) {
        // Verify user still exists and is active
        const user = await prisma.user.findFirst({
          where: {
            id: session['userId'] as number,
            isActive: true
          }
        })

        if (user) {
          return {
            success: true,
            session: {
              userId: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              isLoggedIn: true
            }
          }
        }
      }
      return { success: true, session: null }
    } catch (error) {
      console.error('[IPC:auth:getSession] Error:', error)
      return { success: true, session: null }
    }
  })

  // ==================== GET ALL USERS ====================
  ipcMain.handle('auth:getUsers', async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
      return { success: true, data: users }
    } catch (error) {
      console.error('[IPC:auth:getUsers] Error:', error)
      return { success: false, error: 'Failed to fetch users' }
    }
  })

  // ==================== CREATE USER ====================
  ipcMain.handle('auth:createUser', async (_event, data: CreateUserPayload) => {
    try {
      // Check if username already exists
      const existing = await prisma.user.findFirst({
        where: { username: data.username }
      })
      if (existing) {
        return { success: false, error: 'Username already exists' }
      }

      const hashedPassword = await bcrypt.hash(data.password, 12)
      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email || null,
          password: hashedPassword,
          role: data.role
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
      return { success: true, data: user }
    } catch (error) {
      console.error('[IPC:auth:createUser] Error:', error)
      return { success: false, error: 'Failed to create user' }
    }
  })

  // ==================== UPDATE USER ====================
  ipcMain.handle('auth:updateUser', async (_event, id: number, data: UpdateUserPayload) => {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true
        }
      })
      return { success: true, data: user }
    } catch (error) {
      console.error('[IPC:auth:updateUser] Error:', error)
      return { success: false, error: 'Failed to update user' }
    }
  })

  // ==================== DELETE USER ====================
  ipcMain.handle('auth:deleteUser', async (_event, id: number) => {
    try {
      // Soft delete by deactivating
      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      })
      return { success: true }
    } catch (error) {
      console.error('[IPC:auth:deleteUser] Error:', error)
      return { success: false, error: 'Failed to delete user' }
    }
  })

  // ==================== CHANGE PASSWORD ====================
  ipcMain.handle(
    'auth:changePassword',
    async (_event, id: number, oldPassword: string, newPassword: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } })
        if (!user) return { success: false, error: 'User not found' }

        const isValid = await bcrypt.compare(oldPassword, user.password)
        if (!isValid) return { success: false, error: 'Current password is incorrect' }

        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await prisma.user.update({
          where: { id },
          data: { password: hashedPassword }
        })
        return { success: true }
      } catch (error) {
        console.error('[IPC:auth:changePassword] Error:', error)
        return { success: false, error: 'Failed to change password' }
      }
    }
  )
}
