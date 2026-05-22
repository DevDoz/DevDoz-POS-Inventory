import { IpcMain, app } from 'electron'
import { prisma } from '../services/database'
import { createBackup, listBackups, restoreBackup } from '../services/backup'
import Store from 'electron-store'

/**
 * Registers all settings-related IPC handlers.
 */
export function registerSettingsHandlers(ipcMain: IpcMain, _appSettingsStore: Store): void {
  // ==================== GET SINGLE SETTING ====================
  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      const setting = await prisma.setting.findUnique({ where: { key } })
      return { success: true, data: setting?.value || null }
    } catch (error) {
      console.error('[IPC:settings:get] Error:', error)
      return { success: false, error: 'Failed to get setting' }
    }
  })

  // ==================== GET ALL SETTINGS ====================
  ipcMain.handle('settings:getAll', async () => {
    try {
      const settings = await prisma.setting.findMany()
      const settingsMap: Record<string, string> = {}
      settings.forEach((s) => {
        settingsMap[s.key] = s.value
      })
      return { success: true, data: settingsMap }
    } catch (error) {
      console.error('[IPC:settings:getAll] Error:', error)
      return { success: false, error: 'Failed to get settings' }
    }
  })

  // ==================== SET SINGLE SETTING ====================
  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
      return { success: true }
    } catch (error) {
      console.error('[IPC:settings:set] Error:', error)
      return { success: false, error: 'Failed to save setting' }
    }
  })

  // ==================== SET MULTIPLE SETTINGS ====================
  ipcMain.handle('settings:setMultiple', async (_event, data: Record<string, string>) => {
    try {
      const operations = Object.entries(data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
      await prisma.$transaction(operations)
      return { success: true }
    } catch (error) {
      console.error('[IPC:settings:setMultiple] Error:', error)
      return { success: false, error: 'Failed to save settings' }
    }
  })

  // ==================== CREATE BACKUP ====================
  ipcMain.handle('settings:createBackup', async () => {
    try {
      const backupPath = await createBackup()
      return { success: true, data: { path: backupPath } }
    } catch (error) {
      console.error('[IPC:settings:createBackup] Error:', error)
      return { success: false, error: 'Failed to create backup' }
    }
  })

  // ==================== LIST BACKUPS ====================
  ipcMain.handle('settings:listBackups', async () => {
    try {
      const backups = listBackups()
      return { success: true, data: backups }
    } catch (error) {
      console.error('[IPC:settings:listBackups] Error:', error)
      return { success: false, error: 'Failed to list backups' }
    }
  })

  // ==================== RESTORE BACKUP ====================
  ipcMain.handle('settings:restoreBackup', async (_event, filename: string) => {
    try {
      await restoreBackup(filename)
      return { success: true }
    } catch (error) {
      console.error('[IPC:settings:restoreBackup] Error:', error)
      return { success: false, error: 'Failed to restore backup' }
    }
  })

  // ==================== GET APP VERSION ====================
  ipcMain.handle('settings:getAppVersion', async () => {
    return { success: true, data: app.getVersion() }
  })
}
