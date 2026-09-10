import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Printer,
  Zap,
  Check,
  Layers,
  Terminal,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  getPrinterSettings,
  savePrinterSettings,
  printTestReceipt,
  checkPrinterStatus,
  type PrinterSettings,
  type PrinterStatusInfo,
} from "@/lib/thermalPrintService"

interface PrinterSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChanged?: (settings: PrinterSettings) => void
  currentStatus?: PrinterStatusInfo
  onRefreshStatus?: () => void
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
  currentStatus,
  onRefreshStatus,
}) => {
  const [settings, setSettings] = useState<PrinterSettings>(getPrinterSettings())
  const [isTesting, setIsTesting] = useState(false)
  const [copiedKioskCmd, setCopiedKioskCmd] = useState(false)
  const [hwStatus, setHwStatus] = useState<PrinterStatusInfo>(
    currentStatus || {
      online: false,
      connected: false,
      printerName: "Xprinter XP-Q890K",
      source: "fallback",
      statusText: "Tekshirilmoqda...",
    }
  )
  const [isCheckingHw, setIsCheckingHw] = useState(false)

  const checkHw = useCallback(async () => {
    setIsCheckingHw(true)
    try {
      const st = await checkPrinterStatus()
      setHwStatus(st)
      onRefreshStatus?.()
    } finally {
      setIsCheckingHw(false)
    }
  }, [onRefreshStatus])

  useEffect(() => {
    if (isOpen) {
      setSettings(getPrinterSettings())
      checkHw()
    }
  }, [isOpen, checkHw])

  useEffect(() => {
    if (currentStatus) {
      setHwStatus(currentStatus)
    }
  }, [currentStatus])

  if (!isOpen) return null

  const handleToggleQuickPrint = () => {
    const updated = savePrinterSettings({ quickPrintEnabled: !settings.quickPrintEnabled })
    setSettings(updated)
    onSettingsChanged?.(updated)
    toast.success(
      updated.quickPrintEnabled
        ? "1-Bosishda tezkor chop etish yoqildi"
        : "Standart ko'rib chiqish rejimi tanlandi"
    )
  }

  const handleToggleAutoPos = () => {
    const updated = savePrinterSettings({ autoPrintPosOrder: !settings.autoPrintPosOrder })
    setSettings(updated)
    onSettingsChanged?.(updated)
    toast.success(
      updated.autoPrintPosOrder
        ? "POS buyurtmasida avtomat chek yoqildi"
        : "Avtomatik chek o'chirildi"
    )
  }

  const handleSelectPaper = (width: "80mm" | "58mm") => {
    const updated = savePrinterSettings({ paperWidth: width })
    setSettings(updated)
    onSettingsChanged?.(updated)
    toast.success(`Qog'oz o'lchami: ${width}`)
  }

  const handleTestPrint = async () => {
    setIsTesting(true)
    try {
      toast.info("Xprinter: Sinov cheki chop etilmoqda...")
      const ok = await printTestReceipt(settings)
      if (ok) {
        toast.success("Sinov cheki chop etishga yuborildi!")
      } else {
        toast.error("Chop etishda xatolik yuz berdi")
      }
    } catch (err: any) {
      toast.error("Xatolik: " + err.message)
    } finally {
      setIsTesting(false)
    }
  }

  const kioskCommand = `chrome.exe --kiosk-printing`

  const handleCopyKiosk = () => {
    navigator.clipboard.writeText(kioskCommand)
    setCopiedKioskCmd(true)
    toast.success("Nusxa olindi!")
    setTimeout(() => setCopiedKioskCmd(false), 2000)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 w-full max-w-lg my-auto bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-800 p-4 sm:p-6 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Chek Apparati Sozlamalari
                </h3>
                <p className="text-xs text-neutral-400">
                  Xprinter 80mm & 1-Bosishda Tezkor Chop Etish
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Live Hardware Status Banner */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                hwStatus.connected
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/20"
                  : "bg-rose-950/30 border-rose-600/50 shadow-md shadow-rose-950/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      hwStatus.connected ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {hwStatus.connected ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-wide text-white">
                        {hwStatus.connected ? "Xprinter: Ulangan (Faol)" : "Xprinter: Ulanmagan"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hwStatus.connected
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {hwStatus.connected ? "TAYYOR" : "KABELNI TEKSHIRING"}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {hwStatus.connected
                        ? `${hwStatus.printerName} (${hwStatus.statusText})`
                        : "USB kabel yoki printer quvvati yoqilmagan. Ulaganingizdan so'ng yangilang."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={checkHw}
                  disabled={isCheckingHw}
                  title="Qayta tekshirish"
                  className="h-8 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] font-bold border border-neutral-700 transition-all cursor-pointer flex-shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHw ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Tekshirish</span>
                </button>
              </div>

              {!hwStatus.connected && (
                <div className="mt-3 pt-2.5 border-t border-rose-900/40 text-[11px] text-rose-200/80 leading-relaxed flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                  <span>
                    Maslahat: Printerni USB portga ulang. To'g'ridan-to'g'ri 0.05s da chiqarish uchun <b>start_agent.bat</b> ni ishga tushirib qo'yishingiz mumkin.
                  </span>
                </div>
              )}
            </div>

            {/* Setting 1: 1-Click Quick Print */}
            <div
              onClick={handleToggleQuickPrint}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                settings.quickPrintEnabled
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-sm"
                  : "bg-neutral-800/60 border-neutral-700 hover:border-neutral-600"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap
                    className={`h-4 w-4 ${
                      settings.quickPrintEnabled ? "text-emerald-400" : "text-neutral-400"
                    }`}
                  />
                  <span className="text-sm font-black">
                    1-Bosishda Tezkor Chop Etish (Direct Print)
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Tugma bosilishi bilanoq hech qanday qo'shimcha oyna ochilmasdan Xprinterga yuboriladi.
                  Agar apparat o'chiq bo'lsa, zaxira ko'rib chiqish oynasiga o'tadi.
                </p>
              </div>

              <div
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center flex-shrink-0 ${
                  settings.quickPrintEnabled ? "bg-emerald-500 justify-end" : "bg-neutral-700 justify-start"
                }`}
              >
                <motion.div
                  layout
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                />
              </div>
            </div>

            {/* Setting 2: Auto Print on POS submit */}
            <div
              onClick={handleToggleAutoPos}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                settings.autoPrintPosOrder
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-sm"
                  : "bg-neutral-800/60 border-neutral-700 hover:border-neutral-600"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers
                    className={`h-4 w-4 ${
                      settings.autoPrintPosOrder ? "text-emerald-400" : "text-neutral-400"
                    }`}
                  />
                  <span className="text-sm font-black">
                    Zal POS Buyurtmasida Avtomat Chek
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Kassir Zal POS buyurtmasini qabul qilishi bilan avtomatik chek chop etiladi.
                </p>
              </div>

              <div
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center flex-shrink-0 ${
                  settings.autoPrintPosOrder ? "bg-emerald-500 justify-end" : "bg-neutral-700 justify-start"
                }`}
              >
                <motion.div
                  layout
                  className="w-5 h-5 rounded-full bg-white shadow-md"
                />
              </div>
            </div>

            {/* Setting 3: Paper Width */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-800/50 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-neutral-300">
                  Chek Qog'ozi Lenta Kengligi
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">
                  {settings.paperWidth === "80mm" ? "80 mm (Xprinter standart)" : "58 mm"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPaper("80mm")}
                  className={`py-2 px-3 rounded-xl font-black text-xs border flex items-center justify-center gap-1.5 transition-all ${
                    settings.paperWidth === "80mm"
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-md"
                      : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {settings.paperWidth === "80mm" && <Check className="h-3.5 w-3.5" />}
                  <span>80mm (Katta / Tavsiya)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPaper("58mm")}
                  className={`py-2 px-3 rounded-xl font-black text-xs border flex items-center justify-center gap-1.5 transition-all ${
                    settings.paperWidth === "58mm"
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-md"
                      : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {settings.paperWidth === "58mm" && <Check className="h-3.5 w-3.5" />}
                  <span>58mm (Kichik lenta)</span>
                </button>
              </div>
            </div>

            {/* Test Print Action */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-neutral-800/30 border border-neutral-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-white block">
                  Ulanishni Tekshirish (Sinov cheki)
                </span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  Xprinterga test chekini chiqarib ko'rish
                </span>
              </div>
              <Button
                type="button"
                onClick={handleTestPrint}
                disabled={isTesting}
                className="bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 rounded-xl text-xs font-black px-3.5 h-9 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{isTesting ? "Chiqarilmoqda..." : "Sinov Cheki"}</span>
              </Button>
            </div>

            {/* Kiosk Mode Tip Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-sky-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-sky-300">
                <Terminal className="h-4 w-4" />
                <span>Chrome-da oynasiz mutlaqo 0.1s da chiqarish (Kiosk Mode)</span>
              </div>
              <p className="text-[11px] text-sky-200/80 leading-relaxed">
                Windows-da Google Chrome yorlig'iga (shortcut) o'ng tugmani bosib <b>Xususiyatlar (Properties)</b> &rarr; <b>Obyekt (Target)</b> oxiriga quyidagini qo'shib qo'ysangiz, brauzer chek oynasini umuman ko'rsatmasdan to'g'ridan-to'g'ri chiqaradi:
              </p>
              <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg font-mono text-[11px] border border-sky-800/50">
                <span>--kiosk-printing</span>
                <button
                  onClick={handleCopyKiosk}
                  className="flex items-center gap-1 text-[10px] bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedKioskCmd ? "Ko'chirildi" : "Nusxa"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl px-5 h-10 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Tayyor (Saqlash)
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
