import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Lock,
  User as UserIcon,
  Leaf,
  Send,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import logoImg from "@/assets/logo2.jpg"

export const LoginPage: React.FC = () => {
  const { setAuth, user } = useAppStore()
  const { isTelegram, triggerHaptic, requestPhoneContact } = useTelegram()
  const navigate = useNavigate()
  const location = useLocation()

  const fromPath = (location.state as any)?.from?.pathname || "/"

  // Staff Credentials form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Web Telegram Auth state (for customers on desktop browser)
  const [webSessionToken, setWebSessionToken] = useState<string | null>(null)
  const [webSessionBotUrl, setWebSessionBotUrl] = useState<string | null>(null)
  const [isWaitingWebAuth, setIsWaitingWebAuth] = useState(false)

  // Redirect if already logged in with appropriate role
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true })
      } else if (user.role === "CASHIER") {
        navigate("/cashier", { replace: true })
      } else if (fromPath && fromPath !== "/login") {
        navigate(fromPath, { replace: true })
      } else {
        navigate("/menu", { replace: true })
      }
    }
  }, [user, navigate, fromPath])

  // Handle Staff Username/Password Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Login va parolni kiriting")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    triggerHaptic("medium")

    try {
      const res = await apiClient.post("/auth/login", {
        username: username.trim(),
        pass: password.trim(),
      })

      const { accessToken, refreshToken, user: authUser } = res.data

      setAuth(authUser, accessToken, refreshToken)
      triggerHaptic("success")

      if (authUser.role === "ADMIN") {
        navigate("/admin", { replace: true })
      } else if (authUser.role === "CASHIER") {
        navigate("/cashier", { replace: true })
      } else {
        navigate(fromPath || "/menu", { replace: true })
      }
    } catch (err: any) {
      triggerHaptic("error")
      setErrorMessage(
        err.response?.data?.message || "Login yoki parol noto'g'ri kiritildi"
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Telegram Bot Web Auth for Customers
  const handleStartWebAuth = async () => {
    try {
      triggerHaptic("light")
      if (isTelegram && window.Telegram?.WebApp) {
        if (typeof window.Telegram.WebApp.requestContact === "function") {
          const res = await requestPhoneContact()
          if (res.success) {
            navigate(fromPath || "/menu", { replace: true })
            return
          }
        }
        window.Telegram.WebApp.openTelegramLink("https://t.me/fullfoodbot?start=auth_verify")
        return
      }

      setIsLoading(true)
      const res = await apiClient.post("/auth/create-web-session")
      setWebSessionToken(res.data.token)
      setWebSessionBotUrl(res.data.botUrl || `https://t.me/fullfoodbot?start=${res.data.token}`)
      setIsWaitingWebAuth(true)
    } catch (err) {
      setErrorMessage("Telegram orqali sessiya yaratishda xatolik")
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for web session completion
  useEffect(() => {
    if (!webSessionToken || !isWaitingWebAuth) return

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/auth/web-session-status/${webSessionToken}`)
        if (res.data?.status === "COMPLETED" && res.data.user) {
          const { user: syncUser, accessToken, refreshToken } = res.data
          setAuth(syncUser, accessToken, refreshToken)
          setIsWaitingWebAuth(false)
          triggerHaptic("success")
          navigate(fromPath || "/menu", { replace: true })
        }
      } catch (err) {
        // quiet poll
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [webSessionToken, isWaitingWebAuth, setAuth, triggerHaptic, navigate, fromPath])

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 mx-auto rounded-3xl overflow-hidden shadow-lg ring-4 ring-emerald-500/20 flex items-center justify-center bg-white">
            <img src={logoImg} alt="Full Food" className="h-full w-full object-cover" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 font-black text-2xl tracking-tight text-neutral-900 dark:text-white">
              <span>Full</span>
              <span className="text-emerald-600 dark:text-emerald-400">Food</span>
              <Leaf className="h-5 w-5 text-emerald-500 fill-emerald-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Xodimlar va Admin panelga xavfsiz kirish
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2.5 text-xs font-bold text-red-700 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staff Credentials Form */}
        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Login (Foydalanuvchi nomi):
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin yoki kassir1"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Parol:
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Tizimga Kirish</span>
              </>
            )}
          </Button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
          <span className="bg-white dark:bg-neutral-900 px-3 text-[11px] font-bold text-neutral-400 uppercase">
            yoki
          </span>
        </div>

        {/* Telegram Customer Login Section */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleStartWebAuth}
            disabled={isLoading || isWaitingWebAuth}
            className="w-full border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-98"
          >
            <Send className="h-4 w-4 text-blue-500" />
            <span>@fullfoodbot orqali Mijoz sifatida Kirish</span>
          </Button>

          {/* Web Session QR / URL Waiting Modal */}
          {isWaitingWebAuth && webSessionBotUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center space-y-3"
            >
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Telegram botimizda <b>Start</b> tugmasini bosing:
              </p>
              <a
                href={webSessionBotUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Telegram Botni Ochish</span>
              </a>
            </motion.div>
          )}

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/menu")}
              className="text-xs font-bold text-neutral-500 hover:text-emerald-600 flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Taomlar menyusiga qaytish
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
