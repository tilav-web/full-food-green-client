import React, { useState } from "react"
import { Megaphone, X, CheckCircle2, Loader2, Send, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageUploadField } from "@/components/common/ImageUploadField"
import { apiClient } from "@/api/axios"
import { useTelegram } from "@/hooks/useTelegram"

interface BroadcastModalProps {
  isOpen: boolean
  onClose: () => void
  activeBotCount: number
  selectedUserIds: string[]
  onSuccess?: () => void
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  activeBotCount,
  selectedUserIds,
  onSuccess,
}) => {
  const { triggerHaptic } = useTelegram()
  const [broadcastTarget, setBroadcastTarget] = useState<"ALL" | "SELECTED">(
    selectedUserIds.length > 0 ? "SELECTED" : "ALL"
  )
  const [message, setMessage] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [buttonText, setButtonText] = useState("")
  const [buttonUrl, setButtonUrl] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{
    total: number
    sent: number
    blocked: number
    failed: number
  } | null>(null)

  if (!isOpen) return null

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Iltimos, xabar matnini kiriting!")
      return
    }
    if (broadcastTarget === "SELECTED" && selectedUserIds.length === 0) {
      alert("Iltimos, avval ro'yxatdan mijozlarni tanlang!")
      return
    }

    try {
      setIsSending(true)
      setResult(null)
      triggerHaptic("medium")

      const payload = {
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        buttonText: buttonText.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
        targetType: broadcastTarget,
        userIds: broadcastTarget === "SELECTED" ? selectedUserIds : undefined,
      }

      const res = await apiClient.post("/bot/broadcast", payload)
      setResult(res.data)
      triggerHaptic("success")
      if (onSuccess) onSuccess()
    } catch (err: any) {
      alert("Xabar yuborishda xatolik yuz berdi: " + (err.response?.data?.message || err.message))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Telegram Xabar / Reklama Yuborish
              </h3>
              <p className="text-[11px] text-neutral-400">
                Bot orqali to'g'ridan-to'g'ri xabar va aksiyalar tarqatish
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Result Banner if completed */}
          {result && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black">
                <CheckCircle2 className="h-4 w-4" />
                <span>Xabarnoma muvaffaqiyatli yakunlandi!</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-neutral-900/60">
                  <span className="text-[10px] text-neutral-400 block font-semibold">Jami</span>
                  <b className="text-xs font-black text-neutral-900 dark:text-white">{result.total}</b>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-neutral-900/60">
                  <span className="text-[10px] text-emerald-600 block font-semibold">Yetkazildi</span>
                  <b className="text-xs font-black text-emerald-600">{result.sent}</b>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-neutral-900/60">
                  <span className="text-[10px] text-rose-600 block font-semibold">Bloklagan</span>
                  <b className="text-xs font-black text-rose-600">{result.blocked}</b>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-neutral-900/60">
                  <span className="text-[10px] text-amber-600 block font-semibold">Xatolik</span>
                  <b className="text-xs font-black text-amber-600">{result.failed}</b>
                </div>
              </div>
            </div>
          )}

          {/* Audience selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-300">
              Kimlarga yuboriladi?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBroadcastTarget("ALL")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  broadcastTarget === "ALL"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  👥 Barcha faol mijozlar
                </span>
                <span className="text-[10px] text-neutral-400">
                  {activeBotCount} ta botda faol foydalanuvchi
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBroadcastTarget("SELECTED")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${
                  broadcastTarget === "SELECTED"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  🎯 Tanlangan foydalanuvchilar
                </span>
                <span className="text-[10px] text-neutral-400">
                  {selectedUserIds.length} ta tanlangan
                </span>
              </button>
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
              <span>Xabar matni (majburiy)</span>
              <span className="text-[10px] text-neutral-400 font-normal">HTML qo'llab-quvvatlanadi</span>
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Assalomu alaykum!\nBugun maxsus <b>20% chegirma</b> e'lon qilamiz! 🥗\n\nMenyuni ochib sevimli taomingizga buyurtma bering.`}
              className="w-full p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono resize-y"
            />
            <p className="text-[10px] text-neutral-400">
              Maslahat: <code>&lt;b&gt;qalin&lt;/b&gt;</code>, <code>&lt;i&gt;kursiv&lt;/i&gt;</code>, <code>&lt;a href="https://..."&gt;havola&lt;/a&gt;</code> teglari ishlaydi.
            </p>
          </div>

          {/* Optional Image Banner */}
          <div className="space-y-1.5">
            <ImageUploadField
              label="Reklama rasmi (ixtiyoriy banner)"
              value={imageUrl}
              onChange={setImageUrl}
              aspectRatio="wide"
            />
          </div>

          {/* Optional Inline Button */}
          <div className="space-y-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800">
            <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              Qo'shimcha havola / Tugma (ixtiyoriy)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">
                  Tugma matni
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Masalan: 🍽 Menuni ochish"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">
                  Tugma havolasi (URL)
                </label>
                <input
                  type="text"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://fullfood.vercel.app"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Yopish
          </button>

          <Button
            disabled={isSending || !message.trim() || (broadcastTarget === "SELECTED" && selectedUserIds.length === 0)}
            onClick={handleSend}
            className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Yuborilmoqda...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Xabarni Yuborish</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
