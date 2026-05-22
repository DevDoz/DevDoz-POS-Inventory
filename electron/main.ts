import { app, BrowserWindow, ipcMain, shell, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupDatabase } from './services/database'
import { setupBackupService } from './services/backup'
import { registerAuthHandlers } from './ipc/auth'
import { registerProductHandlers } from './ipc/products'
import { registerSalesHandlers } from './ipc/sales'
import { registerInventoryHandlers } from './ipc/inventory'
import { registerCustomerHandlers } from './ipc/customers'
import { registerReportHandlers } from './ipc/reports'
import { registerSettingsHandlers } from './ipc/settings'
import Store from 'electron-store'
import * as path from 'path'
import * as fs from 'fs'

// Electron Store for session persistence
export const sessionStore = new Store({
  name: 'devdoz-session',
  encryptionKey: 'devdoz-pos-secure-key-2024'
})

// App settings store
export const appSettingsStore = new Store({
  name: 'devdoz-settings'
})

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'DevDoz POS — Inventory & Point of Sale',
    backgroundColor: '#F7F9FC',
    icon: join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Initialize the application:
 * 1. Set up the SQLite database
 * 2. Register all IPC handlers
 * 3. Create the main window
 * 4. Start the backup scheduler
 */
async function initialize(): Promise<void> {
  try {
    // Ensure required directories exist
    const userDataPath = app.getPath('userData')
    const backupsDir = join(userDataPath, 'backups')
    const databaseDir = join(userDataPath, 'database')

    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })
    if (!fs.existsSync(databaseDir)) fs.mkdirSync(databaseDir, { recursive: true })

    // Initialize SQLite database with Prisma
    await setupDatabase()

    // Register all IPC handlers
    registerAuthHandlers(ipcMain, sessionStore)
    registerProductHandlers(ipcMain)
    registerSalesHandlers(ipcMain)
    registerInventoryHandlers(ipcMain)
    registerCustomerHandlers(ipcMain)
    registerReportHandlers(ipcMain)
    registerSettingsHandlers(ipcMain, appSettingsStore)

    // Start the automated backup scheduler
    setupBackupService()

    console.log('[Main] Application initialized successfully')
  } catch (error) {
    console.error('[Main] Initialization failed:', error)
    dialog.showErrorBox(
      'Startup Error',
      `DevDoz POS failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    app.quit()
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Set app user model id for Windows taskbar
  electronApp.setAppUserModelId('com.devdoz.pos')

  // Register local-file:// protocol to serve local images without URL-encoding issues
  // This avoids the "Application Support" space problem with file:// URLs
  protocol.handle('local-file', (request) => {
    const filePath = request.url.replace('local-file://', '')
    return net.fetch(`file://${encodeURI(filePath)}`)
  })

  // Optimize app for development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initialize()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app ready to quit — close DB connection
app.on('before-quit', async () => {
  const { prisma } = await import('./services/database')
  await prisma.$disconnect()
})

export { mainWindow }
