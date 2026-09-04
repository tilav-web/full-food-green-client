import React, { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Printer, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import type { Order } from "@/types"

interface SoliqReceiptModalProps {
  isOpen: boolean
  order: Order | null
  cashierName?: string
  onClose: () => void
}

export const SoliqReceiptModal: React.FC<SoliqReceiptModalProps> = ({
  isOpen,
  order,
  cashierName = "Kassir #1",
  onClose,
}) => {
  const { triggerHaptic } = useTelegram()
  const receiptRef = useRef<HTMLDivElement>(null)

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
    ? "ZALDA ISTE'MOL (POS)"
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

  // Native Print Handler for 80mm POS Thermal Receipt Printer
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
          className="relative z-10 w-full max-w-[340px] my-auto bg-neutral-900/95 rounded-3xl shadow-2xl border border-neutral-800 p-3 sm:p-4 flex flex-col items-center print:m-0 print:p-0 print:border-none print:shadow-none print:w-auto print:max-w-none print:bg-white"
        >
          {/* Top Actions Bar (Hidden on Print) */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-neutral-800 print:hidden">
            <div className="flex items-center gap-1.5 text-white">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Printer className="h-4 w-4" />
              </div>
              <span className="text-xs font-black tracking-tight">Kassa Cheki (80mm)</span>
            </div>

            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* THERMAL PAPER RECEIPT CONTAINER (Strict 80mm / 74mm printable width)     */}
          {/* ========================================================================= */}
          <div className="w-full max-h-[75vh] overflow-y-auto rounded-2xl shadow-inner scrollbar-none print:max-h-none print:overflow-visible">
            <div
              id="thermal-receipt"
              ref={receiptRef}
              className="w-full bg-white text-black font-mono text-[11px] leading-[1.35] p-3.5 sm:p-4 rounded-xl shadow-lg border border-neutral-200 select-text print:border-none print:shadow-none print:rounded-none print:p-0 print:w-[74mm] print:text-black"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                letterSpacing: "-0.2px",
              }}
            >
              {/* Header */}
              <div className="text-center space-y-0.5 pb-2">
                <h1 className="font-black text-sm sm:text-base uppercase tracking-wide text-neutral-900">
                  «FULL FOOD» RESTORAN
                </h1>
                <p className="text-[10px] text-neutral-600 font-bold">
                  Sog'lom va parhez taomlar
                </p>
              </div>

              {/* Dividing Double Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-1">
                ================================
              </div>

              {/* Order Metadata */}
              <div className="space-y-0.5 text-[10px] py-1">
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
                {order.customerName && order.customerName !== "Mijoz" && (
                  <div className="flex justify-between">
                    <span>MIJOZ:</span>
                    <span className="truncate max-w-[150px]">{order.customerName}</span>
                  </div>
                )}
                {order.customerPhone && order.customerPhone !== "+998 00 000 00 00" && (
                  <div className="flex justify-between">
                    <span>TELEFON:</span>
                    <span>{order.customerPhone}</span>
                  </div>
                )}
                {!isDineIn && order.address && (
                  <div className="text-[9px] text-neutral-800 pt-0.5">
                    <span className="font-bold">MANZIL: </span>
                    <span>{order.address}</span>
                  </div>
                )}
              </div>

              {/* Dividing Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-1">
                --------------------------------
              </div>

              {/* Items Column Header */}
              <div className="flex justify-between font-black text-[9px] text-neutral-700 pb-1 uppercase">
                <span className="w-1/2">Taom / Mahsulot</span>
                <span className="w-1/4 text-center">Miqdor</span>
                <span className="w-1/4 text-right">Summa</span>
              </div>

              <div className="text-center text-neutral-400 select-none overflow-hidden pb-1">
                --------------------------------
              </div>

              {/* Products List */}
              <div className="space-y-1.5 py-0.5">
                {order.items?.map((item, idx) => {
                  const qty = Number(item.quantity || 1)
                  const unitPrice = Number(item.unitPrice || 0)
                  const lineTotal = qty * unitPrice

                  return (
                    <div key={idx} className="text-[10px]">
                      <div className="font-bold text-black flex justify-between items-start">
                        <span className="flex-1 pr-1 break-words">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-black whitespace-nowrap">
                          {lineTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-neutral-600 pl-2">
                        <span>{qty} dona x {unitPrice.toLocaleString()} so'm</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dividing Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-1">
                --------------------------------
              </div>

              {/* Totals Section */}
              <div className="space-y-1 text-[10px] py-1">
                <div className="flex justify-between text-neutral-700">
                  <span>ORALIQ JAMI (Taomlar):</span>
                  <span className="font-bold">{subtotal.toLocaleString()} so'm</span>
                </div>

                {packagingFee > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>QADOQLASH (Bokslar):</span>
                    <span className="font-bold">{packagingFee.toLocaleString()} so'm</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>YETKAZISH XIZMATI:</span>
                    <span className="font-bold">{deliveryFee.toLocaleString()} so'm</span>
                  </div>
                )}

                <div className="text-center text-neutral-400 select-none overflow-hidden my-0.5">
                  --------------------------------
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline font-black text-xs pt-0.5">
                  <span className="text-[11px]">JAMI TO'LOV:</span>
                  <span className="text-sm font-black tracking-tight text-black">
                    {totalAmount.toLocaleString()} SO'M
                  </span>
                </div>

                <div className="flex justify-between text-[9px] text-neutral-700 pt-0.5">
                  <span>TO'LOV USULI:</span>
                  <span className="font-black">{paymentMethodLabel}</span>
                </div>

                <div className="flex justify-between text-[9px] text-emerald-800 font-bold">
                  <span>TO'LOV HOLATI:</span>
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 inline" /> TO'LANDI
                  </span>
                </div>
              </div>

              {/* Dividing Double Dashed Line */}
              <div className="text-center text-neutral-400 select-none overflow-hidden my-1">
                ================================
              </div>

              {/* Customer Greeting Footer */}
              <div className="text-center space-y-1 pt-1">
                <p className="font-black text-[10px] text-neutral-900">
                  XARIDINGIZ UCHUN RAHMAT!
                </p>
                <p className="text-[8px] text-neutral-600 italic">
                  Salomatligingiz — bizning boyligimiz!
                </p>
                <p className="text-[8px] font-bold text-neutral-700">
                  www.fullfood.uz
                </p>
              </div>

              <div className="text-center text-neutral-400 select-none overflow-hidden my-1">
                ================================
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
              <span>Chop Etish (80mm)</span>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Embedded Print CSS to force 80mm width and suppress everything else */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          html, body {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
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
            width: 74mm !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            padding: 2mm 1mm !important;
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
