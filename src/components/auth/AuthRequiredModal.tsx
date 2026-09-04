import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Smartphone,
  Send,
  Loader2,
  Sparkles,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import { toast } from "sonner"
import logoImg from "@/assets/logo2.jpg"

interface AuthRequiredModalProps {
  isOpen: boolean
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen }) => {
  const { isTelegram, requestPhoneContact, triggerHaptic } = useTelegram()
  const [isLoading, setIsLoading] = useState(false)

  // Native contact sharing in Telegram Mini App
  const handleNativeContactShare = async () => {
    triggerHaptic("medium")
    setIsLoading(true)
    try {
      const res = await requestPhoneContact()
      if (res.success && res.phone) {
        triggerHaptic("success")
        toast.success("Telefon raqamingiz muvaffaqiyatli tasdiqlandi! 🎉")
      } else if (res.error) {
        triggerHaptic("error")
        toast.error("Raqamni yuborish tasdiqlanmadi")
      }
    } catch (err) {
      triggerHaptic("error")
      toast.error("Raqamni yuborishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-500/20 text-neutral-900 dark:text-neutral-50 overflow-hidden"
        >
          {/* Decorative subtle emerald glow in background */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header with Logo */}
          <div className="relative flex flex-col items-center text-center mb-6">
            <div className="relative mb-3.5">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 border-2 border-emerald-500/30 p-0.5 bg-white">
                <img
                  src={logoImg}
                  alt="Full Food"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Xush kelibsiz! 🥗
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed">
              Taomlar menyusini ko'rish va buyurtma berish uchun telefon raqamingizni tasdiqlang
            </p>
          </div>

          {/* TELEGRAM MINI APP MODE: ONLY REQUEST CONTACT BUTTON */}
          {isTelegram ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Buyurtma berish va yetkazib berish xizmatidan foydalanish uchun telefon raqamingizni yuboring.
                </p>
              </div>

              <Button
                onClick={handleNativeContactShare}
                disabled={isLoading}
                className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Smartphone className="w-5 h-5 stroke-[2.5]" />
                    <span>Telefon raqamni yuborish</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* STANDALONE BROWSER MODE */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Full Food xizmati Telegram Mini App orqali ishlaydi. Iltimos, Telegram bot orqali kiring.
                </p>
              </div>

              <a
                href="https://t.me/fullfoodbot"
                target="_blank"
                rel="noreferrer"
                className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              >
                <Send className="w-5 h-5" />
                <span>Telegram Botni Ochish</span>
              </a>

              {/* Staff login shortcut */}
              <div className="text-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  <Lock className="w-3 h-3" />
                  <span>Xodimlar (Kassir / Admin) uchun kirish</span>
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
