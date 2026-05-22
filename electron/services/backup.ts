import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as cron from 'node-cron'
import dayjs from 'dayjs'

const MAX_BACKUPS = 30 // Keep last 30 days of backups

/**
 * Returns the path to the live SQLite database file.
 */
function getDbPath(): string {
  return join(app.getPath('userData'), 'database', 'devdoz-pos.db')
}

/**
 * Returns the path to the backups directory.
 */
function getBackupsDir(): string {
  const backupsDir = join(app.getPath('userData'), 'backups')
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }
  return backupsDir
}

/**
 * Creates a backup of the SQLite database file.
 * Backup filename format: backup-YYYY-MM-DD.db
 *
 * @returns The path of the created backup file
 */
export async function createBackup(): Promise<string> {
  const dbPath = getDbPath()
  const backupsDir = getBackupsDir()

  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file not found. Cannot create backup.')
  }

  const filename = `backup-${dayjs().format('YYYY-MM-DD-HHmmss')}.db`
  const destPath = join(backupsDir, filename)

  // Copy the database file
  fs.copyFileSync(dbPath, destPath)
  console.log('[Backup] Created backup:', destPath)

  // Clean up old backups, keeping only MAX_BACKUPS
  await cleanupOldBackups(backupsDir)

  return destPath
}

/**
 * Lists all available backup files.
 */
export function listBackups(): Array<{ filename: string; size: number; createdAt: string }> {
  const backupsDir = getBackupsDir()

  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
    .sort()
    .reverse()

  return files.map((filename) => {
    const filepath = join(backupsDir, filename)
    const stat = fs.statSync(filepath)
    return {
      filename,
      size: stat.size,
      createdAt: stat.mtime.toISOString()
    }
  })
}

/**
 * Restores the database from a backup file.
 * IMPORTANT: App must be restarted after restore for changes to take effect.
 *
 * @param filename - The backup filename (not full path)
 */
export async function restoreBackup(filename: string): Promise<void> {
  const backupsDir = getBackupsDir()
  const dbPath = getDbPath()
  const backupPath = join(backupsDir, filename)

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${filename}`)
  }

  // Create a safety backup before restoring
  const safetyFilename = `pre-restore-${dayjs().format('YYYY-MM-DD-HHmmss')}.db`
  fs.copyFileSync(dbPath, join(backupsDir, safetyFilename))

  // Restore the backup
  fs.copyFileSync(backupPath, dbPath)
  console.log('[Backup] Restored from:', filename)
}

/**
 * Removes old backup files, keeping only the most recent MAX_BACKUPS.
 */
async function cleanupOldBackups(backupsDir: string): Promise<void> {
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
    .sort()

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(0, files.length - MAX_BACKUPS)
    toDelete.forEach((f) => {
      fs.unlinkSync(join(backupsDir, f))
      console.log('[Backup] Deleted old backup:', f)
    })
  }
}

/**
 * Starts the automated backup scheduler.
 * Runs daily at midnight (00:00).
 */
export function setupBackupService(): void {
  // Schedule backup at midnight every day
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Backup] Running scheduled daily backup...')
      const backupPath = await createBackup()
      console.log('[Backup] Scheduled backup complete:', backupPath)
    } catch (error) {
      console.error('[Backup] Scheduled backup failed:', error)
    }
  })

  console.log('[Backup] Backup scheduler started (daily at midnight)')
}
