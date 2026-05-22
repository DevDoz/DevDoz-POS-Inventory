# DevDoz POS

> **Production-ready Point of Sale & Inventory Management Desktop Application**

Built with **Electron + React + TypeScript + SQLite** for small businesses. Works 100% offline — no internet, no browser, no terminal needed by the end user.

---

## Features

- 🛒 **Full POS** — barcode scanning, cart management, discount/tax, receipt printing
- 📦 **Product Management** — CRUD, CSV import/export, low stock alerts
- 🏭 **Inventory Tracking** — stock adjustments, inventory log history
- 👥 **Customer Management** — customer profiles, purchase history
- 📊 **Reports** — daily/monthly/product/revenue reports with charts
- 👤 **User Management** — Admin/Manager/Cashier roles
- ⚙️ **Settings** — store info, tax rate, currency
- 💾 **Automatic Backups** — daily at midnight, manual backup/restore
- 🔒 **Session Persistence** — stays logged in across restarts

---

## Default Login

```
Username: admin
Password: admin123
```

---

## Dev Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install
```bash
npm install
npm run prisma:generate
```

### Run in Dev Mode
```bash
npm run dev
```

This opens the Electron window with hot-reload.

### Build

**macOS DMG:**
```bash
npm run build:mac
```

**Windows EXE (cross-compile or on Windows):**
```bash
npm run build:win
```

Output: `dist/DevDozPOSSetup.exe` (Windows) or `dist/DevDoz POS-1.0.0.dmg` (macOS)

---

## Project Structure

```
DevDoz-POS/
├── electron/               # Electron main process
│   ├── main.ts             # App entry, BrowserWindow, initialization
│   ├── preload.ts          # contextBridge API surface
│   ├── ipc/                # IPC handlers (one per domain)
│   └── services/           # Database, Backup, Printer
├── src/                    # React renderer
│   ├── pages/              # One folder per page/feature
│   ├── components/         # Shared UI components
│   ├── store/              # Zustand state management
│   ├── services/           # IPC API wrapper
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Formatters, helpers
│   ├── types/              # TypeScript types
│   └── layouts/            # Page layouts
├── prisma/                 # Prisma schema
└── assets/                 # Icons, images
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Desktop | Electron 28 |
| Renderer | React 18 + TypeScript |
| Bundler | electron-vite |
| Styling | TailwindCSS v3 + Inter font |
| Router | React Router v6 |
| Icons | Lucide React |
| State | Zustand |
| Database | SQLite via Prisma |
| Forms | React Hook Form + Zod |
| Dates | Day.js |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Session | electron-store (encrypted) |
| Packaging | electron-builder |
