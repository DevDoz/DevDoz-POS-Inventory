import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as bcrypt from 'bcryptjs'

// ============================================================
// Prisma Client Singleton
// ============================================================

let _prisma: PrismaClient | null = null

/**
 * Returns the singleton Prisma client instance.
 * Throws if database has not been initialized yet.
 */
export function getPrisma(): PrismaClient {
  if (!_prisma) {
    throw new Error('Database not initialized. Call setupDatabase() first.')
  }
  return _prisma
}

// Export as `prisma` for convenient imports
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrisma()[prop as keyof PrismaClient]
  }
})

// ============================================================
// Database Initialization
// ============================================================

/**
 * Sets up the SQLite database:
 * 1. Resolves DB path in app userData
 * 2. Sets DATABASE_URL environment variable for Prisma
 * 3. Initializes Prisma client
 * 4. Runs migrations (creates tables if needed)
 * 5. Seeds default admin user on first run
 */
export async function setupDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'database')
  const dbPath = join(dbDir, 'devdoz-pos.db')

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Set DATABASE_URL for Prisma
  const databaseUrl = `file:${dbPath}`
  process.env['DATABASE_URL'] = databaseUrl

  console.log('[Database] DB path:', dbPath)

  // Initialize Prisma client
  _prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    },
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error']
  })

  // Connect to the database
  await _prisma.$connect()
  console.log('[Database] Connected to SQLite')

  // Run database migrations / create tables
  await runMigrations(_prisma)

  // Seed default data on first run
  await seedDefaultData(_prisma)

  console.log('[Database] Setup complete')
}

// ============================================================
// Migration Runner (using raw SQL for reliability with SQLite)
// ============================================================

async function runMigrations(prisma: PrismaClient): Promise<void> {
  console.log('[Database] Running migrations...')

  // Create tables using Prisma's push approach via raw SQL
  // This ensures tables exist without needing migration files
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "username" TEXT NOT NULL UNIQUE,
      "email" TEXT UNIQUE,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'CASHIER',
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL UNIQUE,
      "barcode" TEXT UNIQUE,
      "category" TEXT,
      "purchasePrice" REAL NOT NULL DEFAULT 0,
      "sellingPrice" REAL NOT NULL DEFAULT 0,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "lowStockLimit" INTEGER NOT NULL DEFAULT 10,
      "image" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "phone" TEXT,
      "email" TEXT UNIQUE,
      "address" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Sales" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "invoiceNo" TEXT NOT NULL UNIQUE,
      "customerId" INTEGER,
      "userId" INTEGER NOT NULL,
      "subtotal" REAL NOT NULL DEFAULT 0,
      "discount" REAL NOT NULL DEFAULT 0,
      "tax" REAL NOT NULL DEFAULT 0,
      "grandTotal" REAL NOT NULL DEFAULT 0,
      "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
      FOREIGN KEY ("userId") REFERENCES "User"("id")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SaleItem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "saleId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" REAL NOT NULL,
      "subtotal" REAL NOT NULL,
      FOREIGN KEY ("saleId") REFERENCES "Sales"("id") ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InventoryLog" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Category" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "color" TEXT DEFAULT '#27AAE1',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('[Database] Migrations complete')
}

// ============================================================
// Seed Default Data
// ============================================================

async function seedDefaultData(prisma: PrismaClient): Promise<void> {
  // Check if admin user already exists
  const adminExists = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!adminExists) {
    console.log('[Database] Seeding default admin user...')

    // Hash the default password
    const hashedPassword = await bcrypt.hash('admin123', 12)

    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@devdoz.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    })

    console.log('[Database] Default admin created: admin / admin123')
  }

  // Seed default settings if not present
  const defaultSettings = [
    { key: 'store_name', value: 'DevDoz Store' },
    { key: 'store_address', value: '' },
    { key: 'store_phone', value: '' },
    { key: 'store_email', value: '' },
    { key: 'currency_symbol', value: '$' },
    { key: 'tax_rate', value: '10' },
    { key: 'receipt_footer', value: 'Thank You for Shopping With Us!' },
    { key: 'low_stock_default', value: '10' },
    { key: 'backup_enabled', value: 'true' }
  ]

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    })
  }
}
