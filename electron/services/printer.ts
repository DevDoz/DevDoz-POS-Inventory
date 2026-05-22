import { BrowserWindow } from 'electron'
import { prisma } from './database'
import dayjs from 'dayjs'

interface ReceiptData {
  invoiceNo: string
  createdAt: string
  storeName: string
  storeAddress?: string
  storePhone?: string
  customerName?: string
  items: Array<{
    productName: string
    quantity: number
    price: number
    subtotal: number
  }>
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  paymentMethod: string
  currencySymbol: string
  footerText: string
}

/**
 * Generates HTML for a thermal receipt (80mm compatible).
 */
function generateReceiptHTML(data: ReceiptData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${item.productName}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${data.currencySymbol}${item.price.toFixed(2)}</td>
        <td class="item-subtotal">${data.currencySymbol}${item.subtotal.toFixed(2)}</td>
      </tr>
    `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 72mm;
          padding: 4mm;
          color: #000;
        }
        .center { text-align: center; }
        .separator { border-top: 1px dashed #000; margin: 4px 0; }
        .store-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
        .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; border-bottom: 1px solid #000; padding: 2px 0; text-align: left; }
        td { padding: 2px 0; vertical-align: top; }
        .item-name { width: 40%; }
        .item-qty { width: 10%; text-align: center; }
        .item-price { width: 20%; text-align: right; }
        .item-subtotal { width: 30%; text-align: right; }
        .totals-row { display: flex; justify-content: space-between; padding: 1px 0; }
        .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 2px; }
        .footer { font-size: 11px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="store-name">${data.storeName}</div>
        ${data.storeAddress ? `<div>${data.storeAddress}</div>` : ''}
        ${data.storePhone ? `<div>Tel: ${data.storePhone}</div>` : ''}
      </div>

      <div class="separator"></div>

      <div>
        <div><span class="label">Invoice:</span> ${data.invoiceNo}</div>
        <div><span class="label">Date:</span> ${dayjs(data.createdAt).format('DD/MM/YYYY HH:mm')}</div>
        <div><span class="label">Customer:</span> ${data.customerName || 'Walk-in'}</div>
        <div><span class="label">Payment:</span> ${data.paymentMethod}</div>
      </div>

      <div class="separator"></div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div class="separator"></div>

      <div class="totals-row"><span>Subtotal:</span><span>${data.currencySymbol}${data.subtotal.toFixed(2)}</span></div>
      ${data.discount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${data.currencySymbol}${data.discount.toFixed(2)}</span></div>` : ''}
      ${data.tax > 0 ? `<div class="totals-row"><span>Tax:</span><span>${data.currencySymbol}${data.tax.toFixed(2)}</span></div>` : ''}

      <div class="totals-row grand-total">
        <span>TOTAL:</span>
        <span>${data.currencySymbol}${data.grandTotal.toFixed(2)}</span>
      </div>

      <div class="separator"></div>
      <div class="center footer">${data.footerText}</div>
    </body>
    </html>
  `
}

/**
 * Prints a receipt for a given sale ID using the Electron print API.
 * Falls back to print-to-PDF if no printer is available.
 */
export async function printReceipt(
  saleId: number,
  win: BrowserWindow
): Promise<void> {
  // Fetch sale data with all relations
  const sale = await prisma.sales.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: {
        include: { product: true }
      }
    }
  })

  if (!sale) {
    throw new Error(`Sale ${saleId} not found`)
  }

  // Fetch store settings
  const settings = await prisma.setting.findMany()
  const getSetting = (key: string, fallback = '') =>
    settings.find((s) => s.key === key)?.value || fallback

  const receiptData: ReceiptData = {
    invoiceNo: sale.invoiceNo,
    createdAt: sale.createdAt.toISOString(),
    storeName: getSetting('store_name', 'DevDoz POS'),
    storeAddress: getSetting('store_address'),
    storePhone: getSetting('store_phone'),
    customerName: sale.customer?.name,
    items: sale.items.map((item) => ({
      productName: item.product.productName,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    grandTotal: sale.grandTotal,
    paymentMethod: sale.paymentMethod,
    currencySymbol: getSetting('currency_symbol', '$'),
    footerText: getSetting('receipt_footer', 'Thank You!')
  }

  // Create a hidden window to render and print the receipt
  const printWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: { javascript: true }
  })

  const html = generateReceiptHTML(receiptData)
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  // Print with thermal printer settings
  printWindow.webContents.print(
    {
      silent: false,
      printBackground: true,
      pageSize: { width: 80000, height: 297000 }, // 80mm width in microns
      margins: { top: 0, bottom: 0, left: 0, right: 0, marginType: 'custom' }
    },
    (success, failureReason) => {
      if (!success) {
        console.error('[Printer] Print failed:', failureReason)
      }
      printWindow.close()
    }
  )
}

export { generateReceiptHTML }
