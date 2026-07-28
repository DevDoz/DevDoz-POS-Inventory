# DevDoz POS Case Study and Data Generation Brief

## Project Overview

DevDoz POS is a production-ready desktop Point of Sale and inventory management application designed for small retail businesses that need a reliable offline system. The application helps shop owners, managers, and cashiers manage daily sales, product stock, customers, invoices, reports, backups, and store settings from a single desktop app.

The system is built as an Electron desktop application with a React and TypeScript user interface. It uses SQLite through Prisma for local data storage, so the business can continue selling products, updating stock, and viewing reports without internet access. The app is intended for real retail environments such as grocery stores, mini marts, cosmetics shops, clothing stores, electronics shops, pharmacies, stationery stores, and general stores.

## Problem Statement

Many small businesses still rely on notebooks, spreadsheets, or cloud POS tools that require stable internet. This creates several problems:

- Sales records are hard to track accurately.
- Stock counts become outdated after busy selling hours.
- Cashiers may oversell products because available quantity is not checked automatically.
- Owners cannot easily see daily revenue, low-stock products, best-selling items, or customer purchase history.
- Manual receipt writing takes time and increases mistakes.
- Data can be lost if records are not backed up regularly.

DevDoz POS solves these problems by providing an offline-first desktop system with real-time stock deduction, invoice generation, customer records, role-based access, business reports, and automatic backups.

## Target Users

The main users are small business owners, store managers, and cashiers.

The owner or admin needs full control over users, settings, inventory, reports, backups, products, and sales. The manager needs visibility into products, customers, sales, inventory, and reporting. The cashier needs a fast POS screen for scanning products, building carts, applying discounts, selecting payment methods, and printing receipts.

## Core Goals

The project is designed around the following goals:

- Provide a fast checkout experience for cashiers.
- Keep product stock accurate after every sale.
- Work fully offline on a desktop computer.
- Store all business data locally in SQLite.
- Support barcode scanning, product search, and cart management.
- Track customers and their purchase history.
- Give business owners useful dashboards and reports.
- Allow safe manual inventory adjustments with history logs.
- Support role-based access for Admin, Manager, and Cashier users.
- Protect business data with manual and scheduled backups.

## Main Features

### 1. Authentication and User Roles

The app includes login, logout, session persistence, password hashing, and user management. Roles include ADMIN, MANAGER, and CASHIER.

ADMIN users can access every module: dashboard, POS, products, categories, inventory, customers, sales, reports, users, and settings. MANAGER users can manage operational areas such as reports, inventory, sales, products, and customers. CASHIER users can access the checkout-related workflow such as dashboard, POS, products, and customers.

### 2. Dashboard

The dashboard gives a high-level view of the business. It shows total products, total customers, total sales, total revenue, today's sales, today's revenue, low-stock item count, recent sales, and recent inventory activity.

It also includes charts for monthly revenue and weekly sales, allowing the owner or manager to quickly understand store performance without opening separate reports.

### 3. POS Checkout

The POS screen is the main selling interface. It is designed for speed and repeated daily use. Cashiers can search products by name, SKU, or barcode. If a barcode matches a product, the item can be added directly to the cart.

The cart supports quantity changes, item removal, customer selection, discount, tax calculation, payment method selection, and sale completion. When the sale is completed, the app creates an invoice, saves sale items, deducts product stock, creates inventory log entries, and opens a receipt modal for printing.

Payment methods supported by the data model are CASH, CARD, TRANSFER, and OTHER.

### 4. Product Management

The product module supports product creation, editing, soft deletion, search, filtering, category assignment, SKU, barcode, purchase price, selling price, quantity, low-stock limit, and product image upload.

Products include:

- Product name
- SKU
- Optional barcode
- Optional category
- Purchase price
- Selling price
- Current quantity
- Low stock limit
- Optional image
- Active/inactive status

The module also supports CSV import/export and low-stock detection.

### 5. Category Management

The category module lets users create, edit, and delete product categories. Each category includes a name, optional description, and display color. Categories are used in product filtering and product cards/badges.

Examples include Groceries, Beverages, Snacks, Household, Personal Care, Electronics, Clothing, Stationery, Pharmacy, and Accessories.

### 6. Inventory Management

Inventory is tracked through stock quantities and inventory logs. When products are created with initial quantity, an INITIAL log is created. When product quantity is manually changed, an ADJUSTMENT log is created. When a sale is completed, SALE logs are created with negative quantities.

Manual adjustment types include ADD, REMOVE, and ADJUSTMENT. Each inventory log stores product ID, adjustment type, quantity, notes, and timestamp. This gives the owner a clear audit trail of how stock changed over time.

### 7. Customer Management

The customer module stores customer profile information such as name, phone, email, and address. Customers can be attached to sales, which allows the app to show purchase history for individual customers.

The app also supports walk-in sales where no customer is selected.

### 8. Sales and Invoices

Each completed checkout creates a sale record with a unique invoice number in the format INV-00001, INV-00002, and so on. A sale stores customer, cashier/user, subtotal, discount, tax, grand total, payment method, notes, creation date, and sale items.

Each sale item stores the sold product, quantity, unit price at the time of sale, and subtotal. This preserves historical sales accuracy even if product prices change later.

### 9. Reports

The reporting module provides daily reports, monthly reports, product sales reports, and revenue reports.

Daily reports show sales for a selected date, total revenue, total discount, total tax, and sale count. Monthly reports show total sales, revenue, and revenue grouped by day. Product reports show product-level units sold and revenue. Revenue reports summarize total revenue, discounts, tax, net revenue, total sales, and revenue by payment method.

Reports can be exported to Excel, and the interface supports printing/exporting to PDF through browser print behavior.

### 10. Settings and Backups

Settings include store name, store address, store phone, store email, currency symbol, tax rate, receipt footer, default low-stock value, and backup preferences.

The backup service can create manual backups and scheduled daily backups. Backup files are SQLite database copies stored locally. The app keeps recent backups and supports restoring from a backup file.

## Technical Architecture

The project uses Electron for the desktop shell, React with TypeScript for the renderer UI, Tailwind CSS for styling, React Router for navigation, Zustand for state management, Prisma with SQLite for local persistence, Recharts for analytics charts, TanStack Table for data tables, React Hook Form and Zod for forms and validation, bcryptjs for password hashing, electron-store for persisted sessions, node-cron for scheduled backups, and electron-builder for packaging.

The renderer process does not directly access Node.js or Electron APIs. Instead, the preload script exposes a typed `window.api` surface through Electron `contextBridge`. The renderer calls domain-specific APIs for auth, products, sales, inventory, customers, reports, settings, and categories. The Electron main process handles these requests through IPC handlers and performs database operations.

## Main Data Entities

### User

Represents a staff account.

Fields:

- id
- username
- email
- password hash
- role: ADMIN, MANAGER, or CASHIER
- isActive
- createdAt
- updatedAt

### Product

Represents sellable inventory.

Fields:

- id
- productName
- sku
- barcode
- category
- purchasePrice
- sellingPrice
- quantity
- lowStockLimit
- image
- isActive
- createdAt
- updatedAt

### Category

Represents a product grouping used by the UI.

Fields:

- id
- name
- description
- color
- createdAt

### Customer

Represents a customer profile.

Fields:

- id
- name
- phone
- email
- address
- createdAt
- updatedAt

### Sale

Represents an invoice or completed checkout.

Fields:

- id
- invoiceNo
- customerId
- userId
- subtotal
- discount
- tax
- grandTotal
- paymentMethod
- notes
- createdAt

### SaleItem

Represents one product line inside a sale.

Fields:

- id
- saleId
- productId
- quantity
- price
- subtotal

### InventoryLog

Represents a stock movement event.

Fields:

- id
- productId
- type: ADD, REMOVE, ADJUSTMENT, SALE, or INITIAL
- quantity
- notes
- createdAt

### Setting

Represents configurable store values.

Fields:

- id
- key
- value
- updatedAt

## Typical User Flow

1. The admin logs in with a secure account.
2. The admin configures store settings such as name, address, phone, currency symbol, tax rate, and receipt footer.
3. The admin creates product categories.
4. The admin or manager imports or creates products with SKU, barcode, prices, stock quantity, and low-stock limits.
5. A cashier opens the POS screen.
6. The cashier scans a barcode or searches for a product.
7. Products are added to the cart.
8. The cashier adjusts quantities, applies discount if needed, selects a customer if applicable, and chooses payment method.
9. The cashier completes the sale.
10. The app creates an invoice, records sale items, deducts stock, logs inventory changes, and shows the receipt.
11. The owner or manager reviews dashboard metrics and reports.
12. The backup service protects the local database with manual or scheduled backups.

## AI Data Generation Brief

Use this section as a prompt for an AI tool that needs to generate realistic demo, seed, or sample data for DevDoz POS.

Generate realistic sample data for an offline desktop Point of Sale and inventory management app called DevDoz POS. The app is used by small retail businesses. The generated data must be internally consistent and suitable for dashboards, reports, product lists, inventory logs, customer history, invoices, and POS testing.

Create data for the following entities:

- Users
- Categories
- Products
- Customers
- Sales
- SaleItems
- InventoryLogs
- Settings

Use realistic values for a small retail store. Products should have understandable names, SKUs, optional barcodes, categories, purchase prices, selling prices, quantities, low stock limits, and active status. Selling price must be greater than purchase price. Some products should be low stock, some should be out of stock, and most should have normal stock.

Use these user roles:

- ADMIN
- MANAGER
- CASHIER

Use these payment methods:

- CASH
- CARD
- TRANSFER
- OTHER

Use these inventory log types:

- INITIAL
- ADD
- REMOVE
- ADJUSTMENT
- SALE

Use invoice numbers in this format:

- INV-00001
- INV-00002
- INV-00003

Important consistency rules:

- Every sale must reference an existing user.
- A sale may reference an existing customer or may be a walk-in sale with no customer.
- Every sale item must reference an existing sale and product.
- Sale item subtotal must equal quantity multiplied by unit price.
- Sale subtotal must equal the sum of sale item subtotals.
- Sale grand total must equal subtotal minus discount plus tax.
- Tax should be calculated from the discounted subtotal.
- Inventory SALE logs must use negative quantities.
- Initial stock logs should match original product stock before sales and adjustments.
- Product stock quantities should be plausible after subtracting sold quantities and applying inventory adjustments.
- Product SKU values must be unique.
- Barcode values should be unique when present.
- Customer emails should be unique when present.
- Product categories should match the category names exactly.

Recommended demo data volume:

- 3 to 6 users
- 8 to 12 categories
- 60 to 150 products
- 25 to 80 customers
- 150 to 500 sales across the last 6 to 12 months
- 1 to 6 sale items per sale
- Inventory logs for initial stock, sales, and selected manual adjustments
- Settings for store name, address, phone, email, currency symbol, tax rate, receipt footer, low stock default, and backup enabled

Suggested category set:

- Groceries
- Beverages
- Snacks
- Household
- Personal Care
- Electronics
- Stationery
- Clothing
- Pharmacy
- Accessories

Suggested store profile:

- Store name: DevDoz Mart
- Store type: neighborhood retail and convenience store
- Currency symbol: $
- Tax rate: 10
- Receipt footer: Thank you for shopping with us!
- Low stock default: 10
- Backup enabled: true

Generate enough recent sales for today's dashboard, weekly chart, monthly chart, recent sales list, product sales report, and revenue report to look meaningful. Include a mix of high-selling items, slow-moving products, low-stock products, and repeat customers.

## Example Output Shape

The generated result can be returned as structured JSON with these top-level arrays:

```json
{
  "users": [],
  "categories": [],
  "products": [],
  "customers": [],
  "sales": [],
  "saleItems": [],
  "inventoryLogs": [],
  "settings": []
}
```

Each array should follow the fields listed in the Main Data Entities section. Dates should be ISO strings. Prices and totals should be numbers. IDs should be stable integers and relations should use those IDs.

## Success Criteria

The generated data is successful if the POS app can use it to demonstrate:

- Login and role-based access
- Product browsing, filtering, and barcode search
- Cart creation and checkout
- Receipt/invoice display
- Stock deduction after sale
- Low-stock alerts
- Customer purchase history
- Daily, weekly, monthly, product, and revenue reporting
- Realistic dashboard KPIs
- Inventory audit history
- Store settings and receipt information

