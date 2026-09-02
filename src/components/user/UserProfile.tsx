import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Phone,
  MapPin,
  Moon,
  Sun,
  Globe,
  Headphones,
  Smartphone,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Home,
  Briefcase,
  CheckCircle2,
  X,
  Clock,
  Send,
  Loader2,
  LogOut,
  ShieldCheck,
  Lock,
  Users,
  UserCheck,
  Layers,
  BarChart3,
  UtensilsCrossed,
  CreditCard,
  Store,
  PackagePlus,
  Receipt,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { LocationPickerModal } from "./LocationPickerModal"

export const UserProfile: React.FC = () => {
  const { t } = useTranslation()
  const {
    user,
    setUser,
    theme,
    setTheme,
    lang,
    setLang,
    savedLocations,
    removeSavedLocation,
    logout,
  } = useAppStore()
  const { isTelegram, triggerHaptic, requestPhoneContact } = useTelegram()
  const navigate = useNavigate()

  // Sub-page state: 'HUB' | 'LOCATIONS'
  const [profileView, setProfileView] = useState<"HUB" | "LOCATIONS">("HUB")

  // Bottom Sheets & Modals State
  const [showLangSheet, setShowLangSheet] = useState(false)
  const [showThemeSheet, setShowThemeSheet] = useState(false)
  const [showSupportSheet, setShowSupportSheet] = useState(false)
  const [showCardSheet, setShowCardSheet] = useState(false)

  // Card Settings State for Admin
  const [editCardNumber, setEditCardNumber] = useState("")
  const [editCardHolder, setEditCardHolder] = useState("")
  const [editCardBank, setEditCardBank] = useState("")
  const [isSavingCard, setIsSavingCard] = useState(false)

  // Fetch Settings for Admin Profile
  const { data: settings = {}, refetch: refetchSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => (await apiClient.get("/settings")).data,
    enabled: user?.role === "ADMIN",
  })

  // Fetch latest user details to sync balance
  useQuery({
    queryKey: ["userProfileLatest", user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const res = await apiClient.get(`/users/${user.id}`)
      if (res.data) {
        setUser({ ...user, ...res.data })
      }
      return res.data
    },
    enabled: !!user?.id,
  })

  // Handle Save Payment Card
  const handleSaveCardSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      setIsSavingCard(true)
      await apiClient.post("/settings", {
        card_number: editCardNumber.trim(),
        card_holder: editCardHolder.trim(),
        card_bank: editCardBank.trim(),
      })
      await refetchSettings()
      triggerHaptic("success")
      setShowCardSheet(false)
      alert("To'lov kartasi ma'lumotlari muvaffaqiyatli saqlandi!")
    } catch (err) {
      triggerHaptic("error")
      alert("Sozlamalarni saqlashda xatolik yuz berdi")
    } finally {
      setIsSavingCard(false)
    }
  }

  // Telegram Bot Auth State (Web session polling)
  const [showWebAuthModal, setShowWebAuthModal] = useState(false)
  const [webSessionToken, setWebSessionToken] = useState<string | null>(null)
  const [webSessionBotUrl, setWebSessionBotUrl] = useState<string | null>(null)
  const [isWaitingWebAuth, setIsWaitingWebAuth] = useState(false)

  // Location Picker Modal for adding new location
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  const isUserVerified = !!(user?.phone && (user?.telegramId || user?.isTelegramVerified))

  // Handler: Start Telegram Bot Auth
  const handleStartTelegramAuth = async () => {
    try {
      triggerHaptic("light")

      if (isTelegram && window.Telegram?.WebApp) {
        if (typeof window.Telegram.WebApp.requestContact === "function") {
          const res = await requestPhoneContact()
          if (res.success) {
            triggerHaptic("success")
            return
          }
        }

        if (typeof window.Telegram.WebApp.openTelegramLink === "function") {
          window.Telegram.WebApp.openTelegramLink("https://t.me/fullfoodbot?start=auth_verify")
          return
        }
      }

      const res = await apiClient.post("/auth/create-web-session")
      setWebSessionToken(res.data.token)
      setWebSessionBotUrl(res.data.botUrl || `https://t.me/fullfoodbot?start=${res.data.token}`)
      setShowWebAuthModal(true)
      setIsWaitingWebAuth(true)
    } catch (err) {
      console.error(err)
      alert("Telegram orqali kirishni boshlashda xatolik yuz berdi")
    }
  }

  // Polling for Web Auth Session Completion
  useEffect(() => {
    if (!showWebAuthModal || !webSessionToken || !isWaitingWebAuth) return

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/auth/web-session-status/${webSessionToken}`)
        if (res.data?.status === "COMPLETED" && res.data.user) {
          setUser({ ...res.data.user, isTelegramVerified: true })
          setIsWaitingWebAuth(false)
          setShowWebAuthModal(false)
          triggerHaptic("success")
        }
      } catch (err) {
        // quiet error
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [showWebAuthModal, webSessionToken, isWaitingWebAuth, setUser, triggerHaptic])

  const handleLogout = () => {
    triggerHaptic("medium")
    logout()
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-12">
      {/* ========================================================================= */}
      {/* SUB-PAGE 1: MAIN PROFILE HUB */}
      {/* ========================================================================= */}
      {profileView === "HUB" && (
        <div className="space-y-4">
          {/* PROFILE HEADER: VERIFIED OR UNVERIFIED */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-xl relative overflow-hidden"
            >
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-black text-2xl shadow-md flex-shrink-0">
                    {user.fullName ? user.fullName[0].toUpperCase() : "M"}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black tracking-tight truncate">
                        {user.fullName || "Telegram Mijoz"}
                      </h3>
                      {user.role === "ADMIN" && (
                        <Badge className="bg-purple-600 text-white text-[10px] border-0 font-black">
                          Super Admin
                        </Badge>
                      )}
                      {user.role === "CASHIER" && (
                        <Badge className="bg-blue-600 text-white text-[10px] border-0 font-black">
                          Kassir POS
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/90 flex items-center gap-1 font-mono font-bold truncate">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      {user.phone || "Telefon raqam biriktirilmagan"}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-emerald-400 text-emerald-950 text-[9px] border-0 font-black">
                        ✓ {user.isTelegramVerified || user.telegramId ? "Telegram Tasdiqlangan" : "Tizimga Kirilgan"}
                      </Badge>
                      {user.username && (
                        <span className="text-[10px] text-white/75 font-semibold">
                          @{user.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Chiqish"
                  className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex-shrink-0 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* UNVERIFIED / GUEST STATE: PROMINENT TELEGRAM BOT LOGIN */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-6 text-center space-y-4 shadow-sm"
            >
              <div className="h-16 w-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                {isTelegram ? (
                  <Smartphone className="h-9 w-9 stroke-[2.5]" />
                ) : (
                  <ShieldCheck className="h-9 w-9 stroke-[2.5]" />
                )}
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h3 className="font-black text-base text-neutral-900 dark:text-white">
                  {isTelegram ? t.shareContactTitle : t.telegramAuthTitle}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {isTelegram ? t.shareContactDesc : t.telegramAuthDesc}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleStartTelegramAuth}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                {isTelegram ? <Smartphone className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                <span>{isTelegram ? t.shareContactBtn : t.loginViaBotBtn}</span>
              </Button>
            </motion.div>
          )}

          {/* User Pre-paid Deposit Balance Card */}
          {user && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs backdrop-blur-xs">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                      Mening Balansim (Depozit)
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {Number(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-100">so'm</span>
                    </h3>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border border-white/30 text-[10px] font-bold backdrop-blur-xs">
                  {Number(user.balance || 0) > 0 ? "Mablag' bor" : "0 so'm"}
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-2.5 pt-2 border-t border-white/15">
                Oldindan to'langan depozit hisobingiz. Buyurtma berishda to'lovni balansingizdan yechish imkoni mavjud.
              </p>
            </div>
          )}

          {/* Section 1: User Data & Locations Management (ONLY FOR REGULAR CUSTOMERS) */}
          {(!user || user.role === "USER") && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider px-2">
                {t.personalInfo || "Mening Ma'lumotlarim"}
              </span>

              <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                {/* Telegram Auth Status item */}
                <div
                  onClick={!isUserVerified ? handleStartTelegramAuth : undefined}
                  className={`p-3.5 flex items-center justify-between transition-colors ${
                    !isUserVerified ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      {isTelegram ? <Smartphone className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        {t.telegramAuthStatus}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {isUserVerified && user?.phone
                          ? `${user.phone} (${t.verifiedBadge})`
                          : t.unverifiedClickToAuth}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isUserVerified ? "secondary" : "outline"}
                      className={`text-[10px] font-bold ${
                        isUserVerified
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "text-amber-600 border-amber-300"
                      }`}
                    >
                      {isUserVerified ? t.verifiedBadge : t.needAuthBadge}
                    </Badge>
                    {!isUserVerified && <ChevronRight className="h-4 w-4 text-neutral-400" />}
                  </div>
                </div>

                {/* Saqlangan Manzillar Sub-Page Link */}
                <div
                  onClick={() => {
                    triggerHaptic("light")
                    setProfileView("LOCATIONS")
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        Saqlangan Manzillarim
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {savedLocations.length > 0
                          ? `${savedLocations.length} ta manzil (Uy, Ishxona...)`
                          : "Hozircha saqlangan manzil yo'q"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {savedLocations.length} ta
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUPER ADMIN MANAGEMENT HUB - CATEGORIZED SECTIONS */}
          {user && user.role === "ADMIN" && (
            <div className="space-y-4">
              {/* GROUP 1: KASSA VA SAVDO NAZORATI */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  {t.groupCashierSales}
                </span>

                <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Buyurtmalar & Cheklar */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/cashier?tab=ORDERS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.ordersAndReceipts}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.ordersAndReceiptsDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* Zal POS */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/cashier?tab=POS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.hallPosMode}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.hallPosModeDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* Kirim Qabul */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/cashier?tab=KIRIM")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                        <PackagePlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.kirimStock}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.kirimStockDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>

              {/* GROUP 2: MAHSULOTLAR VA KATALOG */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  {t.groupProductsCatalog}
                </span>

                <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Taomlar Menyu */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=PRODUCTS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                        <UtensilsCrossed className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageDishes}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageDishesDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* Toifalar */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=CATALOG&sub=CATEGORIES")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageCategories}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageCategoriesDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* O'lchov birliklari */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=CATALOG&sub=UNITS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageUnits}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageUnitsDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* Promo Bannerlar */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=CATALOG&sub=BANNERS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageBanners}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageBannersDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>

              {/* GROUP 3: XODIMLAR VA MIJOZLAR */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {t.groupStaffUsers}
                </span>

                <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Xodimlar */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=STAFF")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageStaff}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageStaffDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* Mijozlar */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=USERS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageUsers}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageUsersDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>

              {/* GROUP 4: MOLIYA VA TO'LOV SOZLAMALARI */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t.groupFinanceSettings}
                </span>

                <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Statistika */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      navigate("/admin?tab=STATS")
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageStats}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          {t.manageStatsDesc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>

                  {/* To'lov Rekvizitlari (Bottom Sheet) */}
                  <div
                    onClick={() => {
                      triggerHaptic("light")
                      setEditCardNumber(settings["card_number"] || "")
                      setEditCardHolder(settings["card_holder"] || "")
                      setEditCardBank(settings["card_bank"] || "")
                      setShowCardSheet(true)
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                          {t.manageCardSettings || "To'lov Rekvizitlari (Karta)"}
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {settings["card_number"] || t.manageCardSettingsDesc || "Karta raqami va egasini sozlash"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASHIER QUICK ACCESS (Kassir uchun qismlar) */}
          {user && user.role === "CASHIER" && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />
                {t.cashierWorkspaces}
              </span>

              <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                <div
                  onClick={() => {
                    triggerHaptic("light")
                    navigate("/cashier?tab=ORDERS")
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        {t.ordersAndReceipts}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {t.ordersAndReceiptsDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>

                <div
                  onClick={() => {
                    triggerHaptic("light")
                    navigate("/cashier?tab=POS")
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        {t.hallPosMode}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {t.hallPosModeDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>

                <div
                  onClick={() => {
                    triggerHaptic("light")
                    navigate("/cashier?tab=KIRIM")
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                      <PackagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        {t.kirimStock}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {t.kirimStockDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: App Settings (Bottom Sheets) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider px-2">
              {t.appSettings}
            </span>

            <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
              {/* Language Sheet */}
              <div
                onClick={() => {
                  triggerHaptic("light")
                  setShowLangSheet(true)
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      {t.language}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {lang === "uz" ? "O'zbek tili (UZ)" : "Русский язык (RU)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {lang.toUpperCase()}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              </div>

              {/* Theme Sheet */}
              <div
                onClick={() => {
                  triggerHaptic("light")
                  setShowThemeSheet(true)
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                      {t.theme}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {theme === "dark" ? "Tungi rejim (Dark)" : "Kunduzgi rejim (Light)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {theme === "dark" ? "Dark" : "Light"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              </div>

              {/* Support & Contact Sheet (ONLY FOR REGULAR CUSTOMERS) */}
              {(!user || user.role === "USER") && (
                <div
                  onClick={() => {
                    triggerHaptic("light")
                    setShowSupportSheet(true)
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                      <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        Qo'llab-quvvatlash va Aloqa
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Restoran bilan bog'lanish va savollar
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              )}

              {/* If guest on web, show Staff Login Link */}
              {!user && (
                <div
                  onClick={() => navigate("/login")}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white">
                        Xodimlar / Admin Kirishi
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        Login va parol orqali kirish
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 2: DEDICATED SAVED LOCATIONS MANAGEMENT */}
      {/* ========================================================================= */}
      {profileView === "LOCATIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                triggerHaptic("light")
                setProfileView("HUB")
              }}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Ortga (Profil)
            </button>

            <Button
              size="sm"
              onClick={() => setIsLocationModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md h-8 px-3"
            >
              <Plus className="h-4 w-4" /> Yangi Manzil
            </Button>
          </div>

          <div className="space-y-2.5">
            {savedLocations.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 space-y-3 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-6">
                <MapPin className="h-12 w-12 mx-auto opacity-30 text-emerald-600" />
                <p className="font-bold text-xs text-neutral-700 dark:text-neutral-300">
                  Hozircha saqlangan manzillar yo'q
                </p>
                <Button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Xaritadan manzil qo'shish
                </Button>
              </div>
            ) : (
              savedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-start justify-between shadow-xs gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {loc.label === "Uy" ? (
                        <Home className="h-4 w-4" />
                      ) : loc.label === "Ishxona" ? (
                        <Briefcase className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-neutral-900 dark:text-white">
                          {loc.label}
                        </h4>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          ~{loc.distanceKm} km
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug break-words">
                        {loc.address}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerHaptic("medium")
                      removeSavedLocation(loc.id)
                    }}
                    className="h-8 w-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/60 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WEB AUTH VIA TELEGRAM BOT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showWebAuthModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
            <div className="absolute inset-0" onClick={() => setShowWebAuthModal(false)} />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center"
            >
              <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800 text-left">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                    <Send className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    @fullfoodbot orqali Kirish
                  </h3>
                </div>
                <button
                  onClick={() => setShowWebAuthModal(false)}
                  className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="py-2 space-y-3">
                <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                    Botda raqamingizni yuboring
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    Quyidagi tugmani bosing, Telegram botimizda <b>Start</b> tugmasini bosib telefon raqamingizni yuboring.
                  </p>
                </div>

                {webSessionBotUrl && (
                  <a
                    href={webSessionBotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/25 active:scale-98 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    <span>Telegram Botga O'tish</span>
                  </a>
                )}

                <p className="text-[11px] text-neutral-400">
                  Botda tasdiqlangach, profilingiz avtomatik ochiladi...
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET 1: LANGUAGE SELECTION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showLangSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 max-w-md w-full space-y-4 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl safe-area-bottom"
            >
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                  Ilova Tilini Tanlang
                </h3>
                <button
                  onClick={() => setShowLangSheet(false)}
                  className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    triggerHaptic("light")
                    setLang("uz")
                    setShowLangSheet(false)
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                    lang === "uz"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <span>🇺🇿 O'zbek tili (UZ)</span>
                  {lang === "uz" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic("light")
                    setLang("ru")
                    setShowLangSheet(false)
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                    lang === "ru"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <span>🇷🇺 Русский язык (RU)</span>
                  {lang === "ru" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET 2: THEME SELECTION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showThemeSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 max-w-md w-full space-y-4 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl safe-area-bottom"
            >
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                  Mavzuni Tanlang
                </h3>
                <button
                  onClick={() => setShowThemeSheet(false)}
                  className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    triggerHaptic("light")
                    setTheme("light")
                    setShowThemeSheet(false)
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                    theme === "light"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Kunduzgi rejim (Light)</span>
                  </div>
                  {theme === "light" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic("light")
                    setTheme("dark")
                    setShowThemeSheet(false)
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                    theme === "dark"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Moon className="h-4 w-4 text-emerald-400" />
                    <span>Tungi rejim (Dark)</span>
                  </div>
                  {theme === "dark" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET 3: SUPPORT & CONTACT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSupportSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 max-w-md w-full space-y-4 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl safe-area-bottom"
            >
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                    Qo'llab-quvvatlash va Aloqa
                  </h3>
                </div>
                <button
                  onClick={() => setShowSupportSheet(false)}
                  className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                    Telefon raqamimiz:
                  </span>
                  <a
                    href="tel:+998712000000"
                    className="font-bold text-sm text-emerald-600 block hover:underline"
                  >
                    +998 (71) 200-00-00
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                    Telegram Support Bot:
                  </span>
                  <a
                    href="https://t.me/fullfoodbot"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-xs text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    <Send className="h-3.5 w-3.5" /> @fullfoodbot
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 font-bold block uppercase">
                    Ish vaqti:
                  </span>
                  <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Har kuni: 09:00 — 23:00
                  </p>
                </div>

                <Button
                  onClick={() => setShowSupportSheet(false)}
                  className="w-full bg-emerald-600 text-white rounded-xl font-bold text-xs py-2.5 mt-2"
                >
                  Yopish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ========================================================================= */}
      {/* BOTTOM SHEET 4: PAYMENT CARD REQUISITES (ADMIN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCardSheet && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCardSheet(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 max-w-md w-full space-y-4 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl safe-area-bottom"
            >
              <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                    To'lov Rekvizitlari (Karta)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCardSheet(false)}
                  className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCardSettings} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Karta Raqami (Mijoz to'lovlari uchun):
                  </label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    placeholder="8600 0000 0000 0000"
                    required
                    className="w-full font-mono font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-xs shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Karta Egasi (F.I.SH / Tashkilot nomi):
                  </label>
                  <input
                    type="text"
                    value={editCardHolder}
                    onChange={(e) => setEditCardHolder(e.target.value)}
                    placeholder="Masalan: FULL FOOD MCHJ"
                    required
                    className="w-full font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-xs shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Bank Nomi (Ixtiyoriy):
                  </label>
                  <input
                    type="text"
                    value={editCardBank}
                    onChange={(e) => setEditCardBank(e.target.value)}
                    placeholder="Masalan: Kapitalbank / TBC"
                    className="w-full font-semibold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-xs shadow-xs"
                  />
                </div>

                <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
                  💡 Ushbu karta ma'lumotlari mijoz buyurtma berib chek yuklaganida to'lov qilish uchun ko'rsatiladi.
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCardSheet(false)}
                    className="w-1/3 rounded-xl text-xs"
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingCard}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                  >
                    {isSavingCard ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saqlanmoqda...</span>
                      </>
                    ) : (
                      <span>Kartani Saqlash</span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Picker Modal for adding new location */}
      {isLocationModalOpen && (
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          currentAddress="Toshkent sh."
          currentDistance={3.5}
          onConfirm={() => {
            // Location is automatically saved inside the modal
          }}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </div>
  )
}
