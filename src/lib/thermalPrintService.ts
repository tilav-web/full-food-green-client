import type { Order } from "@/types"

export interface PrinterSettings {
  quickPrintEnabled: boolean // 1-bosishda tezkor chop etish
  autoPrintPosOrder: boolean // POS buyurtma yaratilganda avtomatik chek chiqarish
  paperWidth: "80mm" | "58mm" // Lenta o'lchami
  restaurantName: string
  restaurantPhone: string
  restaurantAddress: string
  footerNote: string
}

export interface PrinterStatusInfo {
  online: boolean
  connected: boolean
  printerName: string
  port?: string
  source: "agent" | "webusb" | "fallback"
  statusText: string
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  quickPrintEnabled: true,
  autoPrintPosOrder: true, // Sukut bo'yicha Zaldan buyurtmada avtomatik chek chiqadi!
  paperWidth: "80mm",
  restaurantName: "«FULL FOOD» RESTORAN",
  restaurantPhone: "+998 71 200 00 00",
  restaurantAddress: "Toshkent sh., Markaz",
  footerNote: "Salomatligingiz — bizning boyligimiz!",
}

const STORAGE_KEY = "fullfood_pos_printer_settings"
const LOCAL_AGENT_URL = "http://127.0.0.1:18181"

export function getPrinterSettings(): PrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { 
        ...DEFAULT_PRINTER_SETTINGS, 
        ...parsed,
        // Ensure autoPrintPosOrder defaults to true if not explicitly false by user
        autoPrintPosOrder: parsed.autoPrintPosOrder !== undefined ? parsed.autoPrintPosOrder : true
      }
    }
  } catch (e) {
    console.warn("Failed to read printer settings from localStorage", e)
  }
  return DEFAULT_PRINTER_SETTINGS
}

export function savePrinterSettings(settings: Partial<PrinterSettings>): PrinterSettings {
  const current = getPrinterSettings()
  const updated = { ...current, ...settings }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn("Failed to save printer settings to localStorage", e)
  }
  return updated
}

/**
 * Format date & time in local Tashkent format
 */
function formatDateTime(dateStr?: string | Date) {
  const date = dateStr ? new Date(dateStr) : new Date()
  const d = date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const t = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  return { date: d, time: t }
}

/**
 * Generates clean, printer-optimized HTML for 80mm (or 58mm) thermal receipt paper
 */
export function generateReceiptHtml(order: Order, settings: PrinterSettings): string {
  const { date, time } = formatDateTime(order.createdAt)
  const is80mm = settings.paperWidth === "80mm"
  const printableWidth = is80mm ? "72mm" : "48mm"
  const fontSize = is80mm ? "11px" : "9.5px"
  const lineCharLength = is80mm ? 36 : 28
  const separator = "-".repeat(lineCharLength)
  const doubleSeparator = "=".repeat(lineCharLength)

  const orderType =
    order.type === "DINE_IN"
      ? "ZALDA / ICHKARIDA"
      : order.type === "ONLINE_PICKUP"
      ? "OLIB KETISH (PICKUP)"
      : "YETKAZIB BERISH (DELIVERY)"

  const paymentMethod =
    order.paymentMethod === "CASH"
      ? "NAQD PUL"
      : order.paymentMethod === "TERMINAL"
      ? "BANK TERMINALI"
      : order.paymentMethod === "BALANCE"
      ? "MIJOZ BALANSI"
      : order.paymentMethod || "KARTA"

  const totalAmount = Number(order.totalAmount || 0)
  const subtotal = Number(order.subtotal || totalAmount)
  const packagingFee = Number(order.packagingFee || 0)
  const deliveryFee = Number(order.deliveryFee || 0)

  const itemsHtml = (order.items || [])
    .map((item, idx) => {
      const qty = Number(item.quantity || 1)
      const unitPrice = Number(item.unitPrice || 0)
      const lineTotal = qty * unitPrice
      return `
        <div style="margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span style="flex: 1; padding-right: 4px; word-break: break-word;">${idx + 1}. ${item.name}</span>
            <span style="white-space: nowrap;">${lineTotal.toLocaleString()}</span>
          </div>
          <div style="color: #444; font-size: ${is80mm ? "10px" : "8.5px"}; padding-left: 8px;">
            ${qty} dona x ${unitPrice.toLocaleString()} so'm
          </div>
        </div>
      `
    })
    .join("")

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Chek #${order.orderNumber}</title>
  <style>
    @page {
      size: ${settings.paperWidth} auto;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${settings.paperWidth};
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      letter-spacing: -0.2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: ${printableWidth};
      margin: 0 auto;
      padding: 3mm 1mm;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 1.5px 0;
    }
    .separator {
      text-align: center;
      overflow: hidden;
      margin: 3px 0;
      white-space: nowrap;
      color: #333;
    }
    @media screen {
      body {
        padding: 20px;
        background: #f0f0f0;
        display: flex;
        justify-content: center;
      }
      .receipt-container {
        background: #fff;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- RESTAURANT HEADER -->
    <div class="text-center" style="margin-bottom: 4px;">
      <div style="font-size: ${is80mm ? "14px" : "12px"}; font-weight: 900; text-transform: uppercase;">
        ${settings.restaurantName}
      </div>
      <div style="font-size: ${is80mm ? "10px" : "8.5px"}; color: #333;">
        Sog'lom va parhez taomlar
      </div>
      ${settings.restaurantPhone ? `<div style="font-size: 9px; color: #444;">Tel: ${settings.restaurantPhone}</div>` : ""}
    </div>

    <div class="separator">${doubleSeparator}</div>

    <!-- ORDER METADATA -->
    <div>
      <div class="row font-black">
        <span>CHEK №:</span>
        <span style="font-size: ${is80mm ? "13px" : "11px"};">#${order.orderNumber}</span>
      </div>
      <div class="row">
        <span>SANA / VAQT:</span>
        <span>${date} ${time}</span>
      </div>
      <div class="row font-bold">
        <span>BUYURTMA TURI:</span>
        <span>${orderType}</span>
      </div>
      ${order.customerName && order.customerName !== "Mijoz" ? `
      <div class="row">
        <span>MIJOZ:</span>
        <span>${order.customerName}</span>
      </div>` : ""}
      ${order.customerPhone && order.customerPhone !== "+998 00 000 00 00" ? `
      <div class="row">
        <span>TELEFON:</span>
        <span>${order.customerPhone}</span>
      </div>` : ""}
      ${order.address && order.type !== "DINE_IN" ? `
      <div style="font-size: ${is80mm ? "9.5px" : "8.5px"}; margin-top: 2px;">
        <span class="font-bold">MANZIL:</span> ${order.address}
      </div>` : ""}
    </div>

    <div class="separator">${separator}</div>

    <!-- ITEMS TABLE HEADER -->
    <div class="row font-black" style="font-size: ${is80mm ? "10px" : "8.5px"}; text-transform: uppercase;">
      <span style="width: 50%;">Nomi</span>
      <span style="width: 25%; text-align: center;">Soni</span>
      <span style="width: 25%; text-align: right;">Summa</span>
    </div>

    <div class="separator">${separator}</div>

    <!-- ITEMS LIST -->
    <div>
      ${itemsHtml}
    </div>

    <div class="separator">${separator}</div>

    <!-- TOTALS -->
    <div>
      <div class="row">
        <span>Oraliq jami:</span>
        <span class="font-bold">${subtotal.toLocaleString()} so'm</span>
      </div>
      ${packagingFee > 0 ? `
      <div class="row">
        <span>Qadoqlash (Bokslar):</span>
        <span class="font-bold">${packagingFee.toLocaleString()} so'm</span>
      </div>` : ""}
      ${deliveryFee > 0 ? `
      <div class="row">
        <span>Yetkazib berish:</span>
        <span class="font-bold">${deliveryFee.toLocaleString()} so'm</span>
      </div>` : ""}

      <div class="separator">${separator}</div>

      <!-- GRAND TOTAL -->
      <div class="row font-black" style="font-size: ${is80mm ? "13px" : "11px"}; margin: 4px 0;">
        <span>JAMI TO'LOV:</span>
        <span>${totalAmount.toLocaleString()} SO'M</span>
      </div>

      <div class="row" style="font-size: ${is80mm ? "10px" : "8.5px"};">
        <span>TO'LOV USULI:</span>
        <span class="font-bold">${paymentMethod}</span>
      </div>
      <div class="row font-bold" style="font-size: ${is80mm ? "10px" : "8.5px"};">
        <span>TO'LOV HOLATI:</span>
        <span>[V] TO'LANDI</span>
      </div>
    </div>

    <div class="separator">${doubleSeparator}</div>

    <!-- FOOTER -->
    <div class="text-center" style="margin-top: 4px;">
      <div class="font-black" style="font-size: ${is80mm ? "11px" : "9.5px"};">
        XARIDINGIZ UCHUN RAHMAT!
      </div>
      <div style="font-size: ${is80mm ? "9px" : "8px"}; font-style: italic; margin-top: 1px;">
        ${settings.footerNote}
      </div>
      <div style="font-size: 8px; font-weight: bold; margin-top: 2px;">
        www.fullfood.uz
      </div>
    </div>

    <div class="separator">${doubleSeparator}</div>
    <div class="text-center" style="font-size: 8px; color: #777; margin-top: 2px;">
      *** CHEK OXIRI ***
    </div>
    <div style="height: 12mm;"></div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Creates sample dummy order for test printing
 */
export function createTestOrder(): Order {
  return ({
    id: "test-order-001",
    orderNumber: "TEST-01",
    status: "COMPLETED",
    type: "DINE_IN",
    paymentMethod: "CASH",
    customerName: "Sinov Mijoz",
    customerPhone: "+998 90 123 45 67",
    paymentStatus: "PAID",
    isYandexTaxiCalled: false,
    totalAmount: 95000,
    subtotal: 90000,
    packagingFee: 5000,
    deliveryFee: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "t-1",
        productId: "p-1",
        name: "Grechka + Tovuq filesi (Diet)",
        quantity: 2,
        unitPrice: 35000,
      },
      {
        id: "t-2",
        productId: "p-2",
        name: "Yashil vitamin salat",
        quantity: 1,
        unitPrice: 20000,
      },
    ],
  } as unknown as Order)
}

/**
 * Generates clean plain text formatted for 80mm thermal receipt printer (Out-Printer / raw spooler)
 */
export function generateReceiptPlainText(order: Order, settings: PrinterSettings): string {
  const { date, time } = formatDateTime(order.createdAt)
  const is80mm = settings.paperWidth === "80mm"
  const width = is80mm ? 44 : 32
  const separator = "-".repeat(width)
  const doubleSep = "=".repeat(width)

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2))
    return " ".repeat(pad) + text
  }

  const row = (left: string, right: string) => {
    const space = Math.max(1, width - left.length - right.length)
    return left + " ".repeat(space) + right
  }

  let out = "\n"
  out += center(settings.restaurantName) + "\n"
  out += center(settings.restaurantAddress) + "\n"
  out += center(settings.restaurantPhone) + "\n"
  out += doubleSep + "\n"
  out += center(`CHEK #${order.orderNumber}`) + "\n"
  out += center(`${date}  ${time}`) + "\n"
  out += separator + "\n"
  out += row("Buyurtma turi:", order.type === "DINE_IN" ? "ZALDA (POS)" : order.type === "ONLINE_PICKUP" ? "OLIB KETISH" : "YETKAZIB BERISH") + "\n"
  if (order.tableNumber) {
    out += row("Stol raqami:", `#${order.tableNumber}`) + "\n"
  }
  if (order.customerName) {
    out += row("Mijoz:", order.customerName) + "\n"
  }
  out += separator + "\n"
  out += "MAHSULOTLAR:\n"

  const items = order.items || []
  items.forEach((item, idx) => {
    const qty = Number(item.quantity || 1)
    const unitPrice = Number(item.unitPrice || 0)
    const lineTotal = qty * unitPrice
    out += `${idx + 1}. ${item.name}\n`
    out += row(`  ${qty} x ${unitPrice.toLocaleString()}`, `${lineTotal.toLocaleString()} so'm`) + "\n"
  })

  out += separator + "\n"
  out += row("JAMI TO'LOV:", `${Number(order.totalAmount || 0).toLocaleString()} SO'M`) + "\n"
  out += row("To'lov usuli:", order.paymentMethod === "CASH" ? "NAQD PUL" : order.paymentMethod === "TERMINAL" ? "TERMINAL" : order.paymentMethod === "BALANCE" ? "MIJOZ BALANSI" : "KARTA") + "\n"
  out += doubleSep + "\n"
  out += center(settings.footerNote) + "\n"
  out += center("*** RAHMAT! ***") + "\n"
  return out
}

/**
 * Checks physical printer connection via local agent (127.0.0.1:18181) or WebUSB.
 */
export async function checkPrinterStatus(): Promise<PrinterStatusInfo> {
  // 1. Check local hardware agent on Windows (127.0.0.1:18181)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(`${LOCAL_AGENT_URL}/status`, {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return {
        online: !!data.online && !!data.connected,
        connected: !!data.connected,
        printerName: data.printerName || "Xprinter XP-Q890K",
        port: data.port || "USB001",
        source: "agent",
        statusText: data.statusText || (data.connected ? "Tayyor (Normal)" : "Ulanmagan"),
      }
    }
  } catch {
    // Agent is not running, proceed to fallback
  }

  // 2. Check WebUSB API in browser if available
  try {
    if (typeof navigator !== "undefined" && "usb" in (navigator as any)) {
      const devices = await (navigator as any).usb.getDevices()
      if (devices && devices.length > 0) {
        const dev = devices[0]
        const name = dev.productName || "Xprinter USB"
        return {
          online: true,
          connected: true,
          printerName: name,
          port: "USB",
          source: "webusb",
          statusText: "USB orqali ulangan",
        }
      }
    }
  } catch {
    // Ignore WebUSB errors
  }

  // 3. Fallback: Agent not active
  return {
    online: false,
    connected: false,
    printerName: "Xprinter XP-Q890K",
    source: "fallback",
    statusText: "Agent yoki USB aniqlanmadi",
  }
}

/**
 * Triggers 1-click silent/direct print.
 * 1) If local print agent is running, prints directly in 0.05s without any dialog.
 * 2) Fallback: Uses invisible iframe (instant with Chrome --kiosk-printing or standard dialog).
 */
export async function quickPrintOrder(
  order: Order,
  customSettings?: Partial<PrinterSettings>
): Promise<boolean> {
  const settings = { ...getPrinterSettings(), ...customSettings }

  // Primary: Try direct silent print via local Windows agent
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const plainText = generateReceiptPlainText(order, settings)
    const agentRes = await fetch(`${LOCAL_AGENT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: plainText }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (agentRes.ok) {
      const data = await agentRes.json()
      if (data.success) {
        return true
      }
    }
  } catch {
    // Agent offline or timeout: gracefully continue to iframe printing
  }

  // Fallback: Invisible iframe printing (compatible with Chrome --kiosk-printing)
  return new Promise((resolve) => {
    try {
      const html = generateReceiptHtml(order, settings)

      let iframe = document.getElementById("thermal-print-iframe") as HTMLIFrameElement | null
      if (!iframe) {
        iframe = document.createElement("iframe")
        iframe.id = "thermal-print-iframe"
        iframe.style.position = "fixed"
        iframe.style.right = "0"
        iframe.style.bottom = "0"
        iframe.style.width = "0"
        iframe.style.height = "0"
        iframe.style.border = "0"
        iframe.style.visibility = "hidden"
        document.body.appendChild(iframe)
      }

      const doc = iframe.contentWindow?.document
      if (!doc) {
        console.error("Iframe document not available for thermal printing")
        resolve(false)
        return
      }

      doc.open()
      doc.write(html)
      doc.close()

      // Allow DOM & styles to render before triggering print
      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus()
          iframe?.contentWindow?.print()
          resolve(true)
        } catch (printErr) {
          console.error("Print execution failed:", printErr)
          resolve(false)
        }
      }, 250)
    } catch (err) {
      console.error("Quick print setup error:", err)
      resolve(false)
    }
  })
}

/**
 * Prints a test receipt to verify Xprinter connection and paper width
 */
export function printTestReceipt(customSettings?: Partial<PrinterSettings>): Promise<boolean> {
  const testOrder = createTestOrder()
  return quickPrintOrder(testOrder, customSettings)
}
