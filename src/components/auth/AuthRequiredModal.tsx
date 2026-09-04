import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Smartphone,
  Phone,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import { useAppStore } from "@/store/useAppStore"
import { apiClient } from "@/api/axios"
import { toast } from "sonner"
import logoImg from "@/assets/logo2.jpg"

interface AuthRequiredModalProps {
  isOpen: boolean
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen }) => {
  const { isTelegram, requestPhoneContact, triggerHaptic, tgUser } = useTelegram()
  const { user, setUser, setAuth } = useAppStore()

  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [fullName, setFullName] = useState("")
  const [showManualInput, setShowManualInput] = useState(false)

  // Web Telegram Auth session polling state
  const [webSessionToken, setWebSessionToken] = useState<string | null>(null)
  const [webSessionBotUrl, setWebSessionBotUrl] = useState<string | null>(null)
  const [isWaitingWebAuth, setIsWaitingWebAuth] = useState(false)

  // Format phone number cleanly as user types: +998 90 123 45 67
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "")
    if (!val.startsWith("998")) {
      val = "998" + val
    }
    if (val.length > 12) {
      val = val.slice(0, 12)
    }

    // Format with spaces
    let formatted = "+998"
    if (val.length > 3) formatted += " " + val.slice(3, 5)
    if (val.length > 5) formatted += " " + val.slice(5, 8)
    if (val.length > 8) formatted += " " + val.slice(8, 10)
    if (val.length > 10) formatted += " " + val.slice(10, 12)

    setPhoneNumber(formatted)
  }

  // 1-Tap native contact sharing in Telegram Mini App
  const handleNativeContactShare = async () => {
    triggerHaptic("light")
    setIsLoading(true)
    try {
      const res = await requestPhoneContact()
      if (res.success && res.phone) {
        triggerHaptic("success")
        toast.success("Telefon raqamingiz muvaffaqiyatli tasdiqlandi! 🎉")
      } else if (res.error) {
        setShowManualInput(true)
      }
    } catch (err) {
      setShowManualInput(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Submit manual phone in Telegram Mini App
  const handleTelegramManualPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phoneNumber.replace(/\s+/g, "")
    if (cleanPhone.length < 13) {
      toast.error("Iltimos, to'liq telefon raqamingizni kiriting")
      return
    }

    setIsLoading(true)
    triggerHaptic("medium")
    try {
      const tgId = tgUser?.id || user?.telegramId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      const res = await apiClient.post("/auth/telegram-sync", {
        telegramId: String(tgId),
        phone: cleanPhone,
        fullName: fullName.trim() || user?.fullName || `${tgUser?.first_name || ""} ${tgUser?.last_name || ""}`.trim() || "Mijoz",
        username: tgUser?.username || user?.username,
      })

      if (res.data?.user) {
        const verifiedUser = {
          ...res.data.user,
          isTelegramVerified: true,
        }
        if (res.data.accessToken) {
          setAuth(verifiedUser, res.data.accessToken, res.data.refreshToken)
        } else {
          setUser(verifiedUser)
        }
        triggerHaptic("success")
        toast.success("Raqamingiz muvaffaqiyatli saqlandi! 🎉")
      }
    } catch (err: any) {
      triggerHaptic("error")
      toast.error(err.response?.data?.message || "Raqamni saqlashda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  // Submit manual phone in regular web browser
  const handleWebPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phoneNumber.replace(/\s+/g, "")
    if (cleanPhone.length < 13) {
      toast.error("Iltimos, to'liq telefon raqamingizni kiriting")
      return
    }

    setIsLoading(true)
    try {
      const res = await apiClient.post("/auth/phone-login", {
        phone: cleanPhone,
        fullName: fullName.trim() || "Mijoz",
      })

      if (res.data?.user && res.data?.accessToken) {
        const verifiedUser = {
          ...res.data.user,
          isTelegramVerified: true,
        }
        setAuth(verifiedUser, res.data.accessToken, res.data.refreshToken)
        toast.success("Xush kelibsiz! Tizimga muvaffaqiyatli kirdingiz 🎉")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Kirishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  // Web Browser Telegram Bot verification link
  const handleStartWebTelegramAuth = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.post("/auth/create-web-session")
      setWebSessionToken(res.data.token)
      setWebSessionBotUrl(res.data.botUrl || `https://t.me/fullfoodbot?start=${res.data.token}`)
      setIsWaitingWebAuth(true)
    } catch (err) {
      toast.error("Telegram sessiya yaratishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for web session verification
  useEffect(() => {
    if (!webSessionToken || !isWaitingWebAuth) return

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/auth/web-session-status/${webSessionToken}`)
        if (res.data?.status === "COMPLETED" && res.data.user) {
          const verifiedUser = { ...res.data.user, isTelegramVerified: true }
          if (res.data.accessToken) {
            setAuth(verifiedUser, res.data.accessToken, res.data.refreshToken)
          } else {
            setUser(verifiedUser)
          }
          setIsWaitingWebAuth(false)
          toast.success("Telegram orqali muvaffaqiyatli tasdiqlandi! 🎉")
        }
      } catch (_) {}
    }, 2000)

    return () => clearInterval(interval)
  }, [webSessionToken, isWaitingWebAuth, setAuth, setUser])

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

          {/* TELEGRAM MINI APP MODE */}
          {isTelegram ? (
            <div className="space-y-4">
              {!showManualInput ? (
                <>
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                      Telegram orqali <b>1 ta bosishda</b> raqamingizni yuborib, darhol buyurtma berishni boshlashingiz mumkin.
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
                        <span>Telefon raqamni ulash (1-klik)</span>
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors py-1"
                  >
                    Raqamni qo'lda kiritish
                  </button>
                </>
              ) : (
                <form onSubmit={handleTelegramManualPhoneSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Telefon raqamingiz
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder="+998 90 123 45 67"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Ismingiz (ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={user?.fullName || tgUser?.first_name || "Mijoz"}
                      className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || phoneNumber.replace(/\s+/g, "").length < 13}
                    className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tasdiqlash va Boshlash</span>
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors py-1"
                  >
                    Ortga (1-klikda ulash)
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* STANDARD WEB BROWSER MODE */
            <div className="space-y-4">
              <form onSubmit={handleWebPhoneSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Telefon raqamingiz
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="+998 90 123 45 67"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-medium tracking-wide"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Ismingiz (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ismingizni kiriting"
                    className="w-full px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || phoneNumber.replace(/\s+/g, "").length < 13}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Davom etish</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Or Login via Telegram Bot */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-center">
                {!isWaitingWebAuth ? (
                  <button
                    type="button"
                    onClick={handleStartWebTelegramAuth}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline py-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram bot orqali 1-klikda kirish</span>
                  </button>
                ) : (
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Telegram botda tasdiqlash kutilmoqda...</span>
                    </div>
                    {webSessionBotUrl && (
                      <a
                        href={webSessionBotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Botni ochish</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Staff login shortcut */}
              <div className="text-center pt-1">
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
