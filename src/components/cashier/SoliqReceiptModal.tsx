import React, { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Printer, CheckCircle2 } from "lucide-react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import { getPrinterSettings, savePrinterSettings, type PrinterSettings } from "@/lib/thermalPrintService"
import type { Order } from "@/types"

interface SoliqReceiptModalProps {
  isOpen: boolean
  order: Order | null
  cashierName?: string
  printerSettings?: PrinterSettings
  onClose: () => void
  onUpdatePaperWidth?: (width: "80mm" | "58mm") => void
}

export const SoliqReceiptModal: React.FC<SoliqReceiptModalProps> = ({
  isOpen,
  order,
  cashierName = "Kassir",
  printerSettings,
  onClose,
  onUpdatePaperWidth,
}) => {
  const { triggerHaptic } = useTelegram()
  const receiptRef = useRef<HTMLDivElement>(null)
  const [selectedWidth, setSelectedWidth] = useState<"80mm" | "58mm">(() => {
    return printerSettings?.paperWidth || getPrinterSettings().paperWidth || "80mm"
  })
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")

  const is80mm = selectedWidth === "80mm"

  useEffect(() => {
    if (printerSettings?.paperWidth) {
      setSelectedWidth(printerSettings.paperWidth)
    }
  }, [printerSettings?.paperWidth])

  useEffect(() => {
    QRCode.toDataURL("https://t.me/fullfoodbot", {
      margin: 1,
      width: selectedWidth === "58mm" ? 95 : 125,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.warn("QR code gen error:", err))
  }, [selectedWidth])

  if (!isOpen || !order) return null

  const formattedDate = new Date(order.createdAt).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const formattedTime = new Date(order.createdAt).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const isDineIn = order.type === "DINE_IN"
  const isPickup = order.type === "ONLINE_PICKUP"
  const orderTypeLabel = isDineIn
    ? (order.tableNumber ? `ZALDA (STOL #${order.tableNumber})` : "ZALDA (POS)")
    : isPickup
    ? "OLIB KETISH (PICKUP)"
    : "YETKAZIB BERISH (DELIVERY)"

  const paymentMethodLabel =
    order.paymentMethod === "CARD_TRANSFER"
      ? "KARTA O'TKAZMASI"
      : order.paymentMethod === "CASH"
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

  const handleSelectPaper = (width: "80mm" | "58mm") => {
    setSelectedWidth(width)
    savePrinterSettings({ paperWidth: width })
    onUpdatePaperWidth?.(width)
  }

  // Native Print Handler for thermal receipt printer
  const handlePrint = () => {
    triggerHaptic("success")
    window.print()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
        {/* Backdrop click to close */}
        <div className="fixed inset-0 print:hidden" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`relative z-10 w-full ${is80mm ? "max-w-[360px]" : "max-w-[300px]"} my-auto bg-neutral-900/95 rounded-3xl shadow-2xl border border-neutral-800 p-3 sm:p-4 flex flex-col items-center print:m-0 print:p-0 print:border-none print:shadow-none print:w-auto print:max-w-none print:bg-white`}
        >
          {/* Top Actions Bar (Hidden on Print) */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-neutral-800 print:hidden">
            <div className="flex items-center gap-1.5 text-white">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Printer className="h-4 w-4" />
              </div>
              <span className="text-xs font-black tracking-tight">Kassa Cheki</span>
            </div>

            {/* Paper Width Switcher Pills */}
            <div className="flex items-center bg-neutral-800 p-0.5 rounded-xl border border-neutral-700">
              <button
                type="button"
                onClick={() => handleSelectPaper("80mm")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  is80mm
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="80mm keng qog'oz"
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaper("58mm")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                  !is80mm
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="58mm tor qog'oz"
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* THERMAL PAPER RECEIPT CONTAINER (80mm / 58mm printable width)            */}
          {/* ========================================================================= */}
          <div className="w-full max-h-[75vh] overflow-y-auto rounded-2xl shadow-inner scrollbar-none print:max-h-none print:overflow-visible flex justify-center">
            <div
              id="thermal-receipt"
              ref={receiptRef}
              className={`w-full bg-white text-black font-mono leading-[1.35] p-3 sm:p-3.5 rounded-xl shadow-lg border border-neutral-200 select-text print:border-none print:shadow-none print:rounded-none print:p-0 print:text-black ${
                is80mm ? "text-[11px] print:w-[72mm]" : "text-[9.5px] print:w-[48mm]"
              }`}
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                letterSpacing: "-0.2px",
              }}
            >
              {/* Header with Logo */}
              <div className="text-center space-y-0.5 pb-1.5">
                <img
                  src="/logo.jpg"
                  alt="FULL FOOD"
                  className={`${is80mm ? "h-11" : "h-9"} w-auto mx-auto object-contain block mb-1`}
                  style={{ filter: "grayscale(100%) contrast(170%)" }}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
                />
                <h1 className={`${is80mm ? "text-sm sm:text-base" : "text-xs"} font-black uppercase tracking-wider text-neutral-900`}>
                  FULL FOOD
                </h1>
                <p className={`${is80mm ? "text-[10px]" : "text-[8.5px]"} text-neutral-700 font-bold`}>
                  Sog'lom va parhez taomlar
                </p>
                <p className={`${is80mm ? "text-[10px]" : "text-[8px]"} text-neutral-800 font-semibold pt-0.5`}>
                  Tel: +998 71 200 00 20 / +998 33 888 60 60
                </p>
                <p className={`${is80mm ? "text-[9px]" : "text-[7.5px]"} text-neutral-600`}>
                  Telegram: @fullfoodbot
                </p>
              </div>

              {/* Dividing Double Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                {is80mm ? "================================" : "========================"}
              </div>

              {/* Order Metadata */}
              <div className={`space-y-0.5 ${is80mm ? "text-[10px]" : "text-[9px]"} py-0.5`}>
                <div className="flex justify-between font-black">
                  <span>CHEK №:</span>
                  <span>#{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>SANA / VAQT:</span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>KASSIR:</span>
                  <span>{cashierName}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-900">
                  <span>BUYURTMA TURI:</span>
                  <span>{orderTypeLabel}</span>
                </div>
                {order.customerName && order.customerName !== "Mijoz" && order.customerName !== "Mijoz (Zal)" && order.customerName !== "Zal Mijoz" && (
                  <div className="flex justify-between">
                    <span>MIJOZ:</span>
                    <span className="truncate max-w-[150px]">{order.customerName}</span>
                  </div>
                )}
                {order.customerPhone && order.customerPhone !== "+998 00 000 00 00" && order.customerPhone !== "+998 71 200 00 00" && !isDineIn && (
                  <div className="flex justify-between">
                    <span>MIJOZ TEL:</span>
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Dividing Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                {is80mm ? "--------------------------------" : "------------------------"}
              </div>

              {/* Items Column Header */}
              <div className={`flex justify-between font-black ${is80mm ? "text-[9.5px]" : "text-[8px]"} text-neutral-700 pb-0.5 uppercase`}>
                <span className="w-1/2">Taom / Mahsulot</span>
                <span className="w-1/4 text-center">Soni</span>
                <span className="w-1/4 text-right">Summa</span>
              </div>

              <div className="text-center text-neutral-400 select-none overflow-hidden pb-0.5">
                {is80mm ? "--------------------------------" : "------------------------"}
              </div>

              {/* Products List */}
              <div className="space-y-1 py-0.5">
                {order.items?.map((item, idx) => {
                  const qty = Number(item.quantity || 1)
                  const unitPrice = Number(item.unitPrice || 0)
                  const lineTotal = qty * unitPrice

                  return (
                    <div key={idx} className={is80mm ? "text-[10px]" : "text-[9px]"}>
                      <div className="font-bold text-black flex justify-between items-start">
                        <span className="flex-1 pr-1 break-words">
                          ${idx + 1}. ${item.name}
                        </span>
                        <span className="font-black whitespace-nowrap">
                          {lineTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className={`flex justify-between ${is80mm ? "text-[9px]" : "text-[8px]"} text-neutral-600 pl-2`}>
                        <span>{qty} {item.portionCount && item.portionCount > 1 ? `x ${item.portionCount} pors` : 'dona'} x {unitPrice.toLocaleString()} so'm</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dividing Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                {is80mm ? "--------------------------------" : "------------------------"}
              </div>

              {/* Totals Section */}
              <div className={`space-y-0.5 ${is80mm ? "text-[10px]" : "text-[9px]"} py-0.5`}>
                <div className="flex justify-between text-neutral-700">
                  <span>Oraliq jami (Taomlar):</span>
                  <span className="font-bold">{subtotal.toLocaleString()} so'm</span>
                </div>

                {packagingFee > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>Qadoqlash (Bokslar):</span>
                    <span className="font-bold">{packagingFee.toLocaleString()} so'm</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>Yetkazish xizmati:</span>
                    <span className="font-bold">{deliveryFee.toLocaleString()} so'm</span>
                  </div>
                )}

                <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                  {is80mm ? "--------------------------------" : "------------------------"}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline font-black pt-0.5">
                  <span className={is80mm ? "text-[11px]" : "text-[10px]"}>JAMI TO'LOV:</span>
                  <span className={`${is80mm ? "text-sm" : "text-xs"} font-black tracking-tight text-black`}>
                    {totalAmount.toLocaleString()} SO'M
                  </span>
                </div>

                <div className={`flex justify-between ${is80mm ? "text-[9.5px]" : "text-[8.5px]"} text-neutral-700 pt-0.5`}>
                  <span>TO'LOV USULI:</span>
                  <span className="font-black">{paymentMethodLabel}</span>
                </div>

                <div className={`flex justify-between ${is80mm ? "text-[9.5px]" : "text-[8.5px]"} text-emerald-800 font-bold`}>
                  <span>TO'LOV HOLATI:</span>
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 inline" /> [✓] TO'LANDI
                  </span>
                </div>
              </div>

              {/* QR-Code Section */}
              {qrCodeUrl && (
                <div className="text-center pt-2 pb-1">
                  <img
                    src={qrCodeUrl}
                    alt="QR"
                    className={`${is80mm ? "w-20 h-20" : "w-16 h-16"} mx-auto block object-contain`}
                  />
                  <p className={`${is80mm ? "text-[8.5px]" : "text-[7.5px]"} text-neutral-600 font-semibold pt-0.5`}>
                    Elektron menyu & Telegram bot
                  </p>
                </div>
              )}

              {/* Dividing Double Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                {is80mm ? "================================" : "========================"}
              </div>

              {/* Customer Greeting Footer */}
              <div className="text-center space-y-0.5 pt-0.5">
                <p className={`font-black ${is80mm ? "text-[10px]" : "text-[9px]"} text-neutral-900`}>
                  XARIDINGIZ UCHUN RAHMAT!
                </p>
                <p className={`${is80mm ? "text-[8.5px]" : "text-[7.5px]"} text-neutral-600 italic`}>
                  Salomatligingiz — bizning boyligimiz!
                </p>
                <p className={`${is80mm ? "text-[8px]" : "text-[7px]"} font-bold text-neutral-700`}>
                  www.fullfood.uz
                </p>
              </div>

              <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                {is80mm ? "================================" : "========================"}
              </div>
              <p className="text-center text-[7px] text-neutral-400 tracking-widest uppercase">
                *** CHEK OXIRI ***
              </p>
            </div>
          </div>

          {/* Bottom Action Buttons (Hidden on Print) */}
          <div className="w-full grid grid-cols-2 gap-2 pt-3 mt-2 border-t border-neutral-800 print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 text-xs font-bold rounded-2xl h-10 cursor-pointer"
            >
              Yopish
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 h-10 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Chop Etish ({selectedWidth})</span>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Embedded Print CSS to force selected width (80mm or 58mm) */}
      <style>{`
        @media print {
          @page {
            size: ${selectedWidth} auto;
            margin: 0mm !important;
          }
          html, body {
            width: ${selectedWidth} !important;
            min-width: ${selectedWidth} !important;
            max-width: ${selectedWidth} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${is80mm ? "72mm" : "48mm"} !important;
            max-width: ${is80mm ? "72mm" : "48mm"} !important;
            margin: 0 auto !important;
            padding: ${is80mm ? "2mm 1mm" : "1mm 0.5mm"} !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: block !important;
          }
        }
      `}</style>
    </AnimatePresence>
  )
}
