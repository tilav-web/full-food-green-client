import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Car,
  CreditCard,
  Copy,
  Check,
  Upload,
  ArrowRight,
  ChevronRight,
  Home,
  Briefcase,
  Bookmark,
  ShieldCheck,
  Smartphone,
  Send,
  Loader2,
  X,
  Package,
  Wallet,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore, SavedLocationItem } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { LocationPickerModal } from "./LocationPickerModal"
import { getImageUrl } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"

interface CartPageProps {
  onGoToMenu: () => void
  onGoToOrders: () => void
}

export const CartPage: React.FC<CartPageProps> = ({ onGoToMenu, onGoToOrders }) => {
  const { t } = useTranslation()
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    user,
    setUser,
    setAuth,
    setCurrentActiveOrder,
    savedLocations,
    removeSavedLocation,
  } = useAppStore()
  const { isTelegram, triggerHaptic, requestPhoneContact } = useTelegram()

  // Steps: 'CART' | 'LOCATION' | 'PAYMENT' | 'SUCCESS'
  const [step, setStep] = useState<"CART" | "LOCATION" | "PAYMENT" | "SUCCESS">("CART")
  const [showManualPhoneInput, setShowManualPhoneInput] = useState(false)
  const [manualPhone, setManualPhone] = useState("+998")
  const [isSavingManualPhone, setIsSavingManualPhone] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<SavedLocationItem | null>(null)



  // Verification status
  const isUserVerified = !!(user?.phone && (user?.telegramId || user?.isTelegramVerified))

  // Auto-sync Telegram user phone if opened inside Telegram and phone is missing from local state
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const tgUser = tg?.initDataUnsafe?.user
    const tgId = tgUser?.id || user?.telegramId
    if (tgId && !user?.phone) {
      apiClient
        .post("/auth/telegram-sync", {
          telegramId: String(tgId),
          username: tgUser?.username || user?.username,
          fullName:
            `${tgUser?.first_name || ""} ${tgUser?.last_name || ""}`.trim() ||
            user?.fullName ||
            "Mijoz",
          initData: tg?.initData,
        })
        .then((res) => {
          if (res.data?.user) {
            const verified = {
              ...res.data.user,
              isTelegramVerified: !!(res.data.user.phone && res.data.user.telegramId),
            }
            if (res.data.accessToken) {
              setAuth(verified, res.data.accessToken, res.data.refreshToken)
            } else {
              setUser(verified)
            }
          }
        })
        .catch(console.warn)
    }
  }, [user?.phone, user?.telegramId, setAuth, setUser])

  // Bot Verification Modal for web / unverified users
  const [showBotAuthModal, setShowBotAuthModal] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionBotUrl, setSessionBotUrl] = useState<string | null>(null)
  const [isWaitingAuth, setIsWaitingAuth] = useState(false)

  // Customer & Location state
  const defaultSaved = savedLocations[0]
  const [deliveryAddress, setDeliveryAddress] = useState(
    defaultSaved ? defaultSaved.address : "Qarshi sh., Mustaqillik shoh ko'chasi"
  )
  const [distanceKm, setDistanceKm] = useState(defaultSaved ? defaultSaved.distanceKm : 1.5)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultSaved ? defaultSaved.lat : 38.83825,
    lng: defaultSaved ? defaultSaved.lng : 65.792222,
  })

  const [orderType, setOrderType] = useState<"ONLINE_DELIVERY" | "ONLINE_PICKUP">("ONLINE_DELIVERY")
  const [building, setBuilding] = useState("")
  const [floor, setFloor] = useState("")
  const [apartment, setApartment] = useState("")
  const [notes, setNotes] = useState("")

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Payment & Receipt
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"CARD_TRANSFER" | "BALANCE">("CARD_TRANSFER")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedCard, setCopiedCard] = useState(false)
  const { data: settings } = useQuery<Record<string, string> | any[]>({
    queryKey: ["publicSettings"],
    queryFn: async () => (await apiClient.get("/settings")).data,
  })

  const getSetting = (key: string, fallback: string) => {
    if (!settings) return fallback
    if (Array.isArray(settings)) {
      return settings.find((s: any) => s.key === key)?.value || fallback
    }
    return (settings as Record<string, string>)[key] || fallback
  }

  const rawPackagingPrice = getSetting("container_price", "2000")
  const packagingPrice = Number(rawPackagingPrice) >= 0 ? Number(rawPackagingPrice) : 2000
  // Buyurtmada qadoqlash narxi: Agar savatchada taomlar bo'lsa va narx > 0 bo'lsa hisoblanadi
  const packagingFee = cart.length > 0 ? packagingPrice : 0

  const cardNumber = getSetting("card_number", "9860 1001 2517 4530")
  const cardHolder = getSetting("card_holder", "SHAHRIZOD XALIMOV")

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // Delivery fee is estimated and paid directly to taxi driver by customer
  const totalAmount = subtotal + packagingFee

  // Start Telegram Bot Phone Verification
  const handleStartTelegramAuth = async () => {
    try {
      triggerHaptic("light")

      if (isTelegram && window.Telegram?.WebApp) {
        // 1-Tap native contact request directly inside Mini App
        if (typeof window.Telegram.WebApp.requestContact === "function") {
          const res = await requestPhoneContact()
          if (res.success) {
            triggerHaptic("success")
            return
          }
        }

        // Fallback to bot link if requestContact cancelled or unsupported
        if (typeof window.Telegram.WebApp.openTelegramLink === "function") {
          window.Telegram.WebApp.openTelegramLink("https://t.me/fullfoodbot?start=auth_verify")
          return
        }
      }

      // If outside Telegram on regular browser, use web session QR/link
      const res = await apiClient.post("/auth/create-web-session")
      setSessionToken(res.data.token)
      setSessionBotUrl(res.data.botUrl || "https://t.me/fullfoodbot?start=" + res.data.token)
      setShowBotAuthModal(true)
      setIsWaitingAuth(true)
    } catch (err) {
      console.error(err)
      toast.error("Telegram orqali tasdiqlashni ochishda xatolik")
    }
  }

  // Poll for auth completion
  useEffect(() => {
    if (!showBotAuthModal || !sessionToken || !isWaitingAuth) return

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/auth/web-session-status/${sessionToken}`)
        if (res.data?.status === "COMPLETED" && res.data.user) {
          setUser({ ...res.data.user, isTelegramVerified: true })
          setIsWaitingAuth(false)
          setShowBotAuthModal(false)
          triggerHaptic("success")
        }
      } catch (err) {
        // quiet poll
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [showBotAuthModal, sessionToken, isWaitingAuth, setUser])

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""))
    setCopiedCard(true)
    triggerHaptic("success")
    setTimeout(() => setCopiedCard(false), 2000)
  }

  const handleLocationConfirm = (
    newAddress: string,
    newDistance: number,
    _newFee: number,
    lat?: number,
    lng?: number
  ) => {
    setDeliveryAddress(newAddress)
    setDistanceKm(newDistance)
    if (lat && lng) {
      setCoords({ lat, lng })
    }
  }

  const handleSelectQuickSavedLocation = (loc: SavedLocationItem) => {
    triggerHaptic("light")
    setDeliveryAddress(loc.address)
    setDistanceKm(loc.distanceKm)
    setCoords({ lat: loc.lat, lng: loc.lng })
  }

  const handleCreateOrder = async () => {
    if (!isUserVerified || !user?.phone) {
      toast.warning("Buyurtma berish uchun avval Telegram orqali telefon raqamingizni tasdiqlang!")
      handleStartTelegramAuth()
      return
    }

    try {
      setIsSubmitting(true)
      triggerHaptic("medium")

      const itemsPayload = cart.map((item) => ({
        productId: item.productId,
        comboId: item.comboId,
        name: item.name,
        quantity: item.quantity,
        portionCount: item.portionCount || 1,
        unitPrice: item.price,
        customPlateJson: item.customPlate ? JSON.stringify(item.customPlate) : undefined,
      }))

      const res = await apiClient.post("/orders", {
        userId: user?.id,
        customerName: user.fullName || "Telegram Mijoz",
        customerPhone: user.phone,
        building: building || undefined,
        floor: floor || undefined,
        apartment: apartment || undefined,
        type: orderType,
        paymentMethod: selectedPaymentMethod,
        address: orderType === "ONLINE_DELIVERY" ? deliveryAddress : "Restorandan olib ketish",
        distanceKm,
        deliveryFee: 0,
        packagingFee,
        latitude: coords.lat,
        longitude: coords.lng,
        notes: notes || undefined,
        items: itemsPayload,
      })

      setCreatedOrder(res.data)
      setCurrentActiveOrder(res.data)
      clearCart()
      toast.success("Buyurtmangiz muvaffaqiyatli qabul qilindi!")
      if (selectedPaymentMethod === "BALANCE") {
        setStep("SUCCESS")
      } else {
        setStep("PAYMENT")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Buyurtma yaratishda xatolik yuz berdi: " + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !createdOrder) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await apiClient.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const uploadedUrl = uploadRes.data.url

      await apiClient.post(`/orders/${createdOrder.id}/upload-receipt`, {
        receiptImageUrl: uploadedUrl,
      })

      triggerHaptic("success")
      toast.success("To'lov cheki muvaffaqiyatli yuklandi!")
      setStep("SUCCESS")
    } catch (err) {
      console.error(err)
      toast.error("Chekni yuklashda xatolik yuz berdi")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            {step === "CART" && t.cartTitle}
            {step === "LOCATION" && (t.locationStepTitle || "Yetkazish Manzili & Mijoz")}
            {step === "PAYMENT" && (t.paymentTitle || "Karta orqali to'lov")}
            {step === "SUCCESS" && (t.orderSuccessTitle || "Qabul Qilindi!")}
          </h2>
          <p className="text-xs text-neutral-500">
            {step === "CART" && `${cart.length} ${t.selectedDishesCount || "xil taom tanlangan"}`}
            {step === "LOCATION" && (t.verifiedOrder || "Telegram orqali tasdiqlangan buyurtma")}
            {step === "PAYMENT" && (t.paymentDesc || "Karta to'lovi va chek yuklash")}
            {step === "SUCCESS" && (t.checkingReceipt || "Kassir chekingizni tekshirmoqda")}
          </p>
        </div>

        {step === "CART" && cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              triggerHaptic("medium")
              clearCart()
            }}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs rounded-xl h-8 font-bold gap-1 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            {t.clearCart || "Tozalash"}
          </Button>
        )}
      </div>

      {/* STEP 1: CART ITEMS */}
      {step === "CART" && (
        <>
          {cart.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 space-y-4 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-8">
              <ShoppingBag className="h-16 w-16 mx-auto opacity-30 text-emerald-600" />
              <div>
                <p className="font-bold text-base text-neutral-800 dark:text-neutral-200">
                  {t.emptyCartTitle}
                </p>
                <p className="text-xs text-neutral-500 mt-1">{t.emptyCartDesc}</p>
              </div>
              <Button
                onClick={onGoToMenu}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-2.5 font-bold text-xs shadow-md"
              >
                Menyuni ko'rish
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. DISHES LIST */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.name}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                        }}
                        className="h-13 w-13 rounded-2xl object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </h4>

                        {item.customPlate && (
                          <div className="mt-1 space-y-0.5">
                            {item.customPlate.portions.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-block text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-md mr-1 font-medium border border-emerald-200/40"
                              >
                                {p.name} ({p.portions} pors)
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                            {(item.price * item.quantity).toLocaleString()} {t.currency || "so'm"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Stepper buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="h-7 w-7 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 dark:text-neutral-300 text-xs active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs active:scale-95 shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-400 hover:text-red-500 p-1 ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* 2. SUMMARY & CHECKOUT ACTION */}
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.dishesSum || "Taomlar summasi"}:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {subtotal.toLocaleString()} {t.currency || "so'm"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                    {t.packagingFee || "Qadoqlash narxi"}:
                  </span>
                  <span className={`font-bold ${packagingFee > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500"}`}>
                    {packagingFee > 0 ? `+${packagingFee.toLocaleString()} ${t.currency || "so'm"}` : `0 ${t.currency || "so'm"} (Bepul)`}
                  </span>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-base font-black">
                  <span className="text-neutral-900 dark:text-white">{t.restaurantTotal || "Restoranga to'lov"}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {(subtotal + packagingFee).toLocaleString()} {t.currency || "so'm"}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    triggerHaptic("medium")
                    setStep("LOCATION")
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold py-3 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
                >
                  {t.proceedToLocation} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 2: LOCATION & STRICT TELEGRAM AUTH GATE */}
      {step === "LOCATION" && (
        <div className="space-y-4">
          {/* ========================================================================= */}
          {/* GATE: IF NOT VERIFIED VIA TELEGRAM BOT */}
          {/* ========================================================================= */}
          {!isUserVerified ? (
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-center space-y-4 shadow-sm">
              <div className="h-16 w-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                {isTelegram ? (
                  <Smartphone className="h-9 w-9 stroke-[2.5]" />
                ) : (
                  <ShieldCheck className="h-9 w-9 stroke-[2.5]" />
                )}
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h3 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                  {isTelegram ? t.shareContactTitle : t.telegramAuthRequired}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {isTelegram ? t.shareContactDesc : t.telegramAuthDesc}
                </p>
              </div>

              {!showManualPhoneInput ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleStartTelegramAuth}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isTelegram ? <Smartphone className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    <span>{isTelegram ? t.shareContactBtn : t.openTelegramBot}</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowManualPhoneInput(true)}
                    className="text-[11px] text-neutral-500 hover:text-emerald-600 font-bold underline block mx-auto pt-1"
                  >
                    Telefon raqamni qo'lda kiritish
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2 text-left">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                    Telefon raqamingiz:
                  </label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-wider"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowManualPhoneInput(false)}
                      className="w-1/3 rounded-xl text-xs font-bold"
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      type="button"
                      disabled={isSavingManualPhone}
                      onClick={async () => {
                        const clean = manualPhone.trim()
                        if (clean.replace(/\D/g, "").length < 9) {
                          toast.warning("Iltimos, to'liq telefon raqamingizni kiriting")
                          return
                        }
                        try {
                          setIsSavingManualPhone(true)
                          const formatted = clean.startsWith("+") ? clean : `+${clean}`
                          const res = await apiClient.post("/auth/attach-phone", {
                            userId: user?.id,
                            phone: formatted,
                          })
                          if (res.data) {
                            const updatedUser = {
                              ...(res.data.user || res.data),
                              phone: formatted,
                              isTelegramVerified: true,
                            }
                            if (res.data.accessToken) {
                              setAuth(updatedUser, res.data.accessToken, res.data.refreshToken)
                            } else {
                              setUser(updatedUser)
                            }
                            toast.success("Telefon raqamingiz muvaffaqiyatli saqlandi!")
                          }
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || "Raqamni saqlashda xatolik")
                        } finally {
                          setIsSavingManualPhone(false)
                        }
                      }}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      {isSavingManualPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Saqlash va Davom etish"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* VERIFIED CUSTOMER DETAILS & LOCATION FORM */
            /* ========================================================================= */
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4 shadow-xs">
              {/* Verified Customer Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {user?.fullName ? user.fullName[0].toUpperCase() : "M"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-neutral-900 dark:text-white">
                        {user?.fullName || "Telegram Mijoz"}
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[9px] border-0">
                        {t.verifiedBadge}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {user?.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {t.orderType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderType("ONLINE_DELIVERY")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${orderType === "ONLINE_DELIVERY"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
                      }`}
                  >
                    <Car className="h-4 w-4 text-emerald-600" />
                    {t.deliveryYandex}
                  </button>
                  <button
                    onClick={() => setOrderType("ONLINE_PICKUP")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${orderType === "ONLINE_PICKUP"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
                      }`}
                  >
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {t.pickup}
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                {orderType === "ONLINE_DELIVERY" && (
                  <>
                    {/* SAVED LOCATIONS QUICK PICKER */}
                    {savedLocations.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Bookmark className="h-3.5 w-3.5 text-emerald-600" />
                            {t.savedLocations}:
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLocationModalOpen(true)}
                            className="text-[11px] text-emerald-600 font-bold hover:underline"
                          >
                            {t.pickNewOnMap}
                          </button>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          {savedLocations.map((loc) => {
                            const isSelected = deliveryAddress === loc.address
                            return (
                              <div
                                key={loc.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelectQuickSavedLocation(loc)}
                                className={`p-2.5 rounded-2xl border text-left flex items-start justify-between gap-1.5 transition-all cursor-pointer select-none relative group ${isSelected
                                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs"
                                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700"
                                  }`}
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <div
                                    className={`h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected
                                      ? "bg-emerald-600 text-white"
                                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                                      }`}
                                  >
                                    {loc.label === "Uy" ? (
                                      <Home className="h-3.5 w-3.5" />
                                    ) : loc.label === "Ishxona" ? (
                                      <Briefcase className="h-3.5 w-3.5" />
                                    ) : (
                                      <MapPin className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={`font-black text-xs block truncate ${isSelected
                                        ? "text-emerald-800 dark:text-emerald-300"
                                        : "text-neutral-900 dark:text-white"
                                        }`}
                                    >
                                      {loc.label}
                                    </span>
                                    <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                                      {loc.address}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    triggerHaptic("medium")
                                    setLocationToDelete(loc)
                                  }}
                                  className="h-6 w-6 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer -mr-1 -mt-1"
                                  title="Manzilni o'chirish"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ACTIVE ADDRESS CARD (Click to open Yandex Map Picker) */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {t.deliveryAddress}:
                      </label>
                      <div
                        onClick={() => setIsLocationModalOpen(true)}
                        className="p-3.5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                              {deliveryAddress}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      </div>

                      {/* Direct Map Pin Preview Links (Yandex & Google) during checkout */}
                      {coords && (
                        <div className="flex items-center justify-between px-1.5 pt-0.5 text-[11px]">
                          <span className="text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            Xaritada tekshirish (Pin):
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://yandex.uz/maps/?pt=${coords.lng},${coords.lat}&z=17&l=map`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Yandex
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            <span className="text-neutral-400 dark:text-neutral-600">•</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Google
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optional address details: Building / Floor / Apartment */}
                    <div className="space-y-2.5 pt-1">
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {t.addressDetails}:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input
                            type="text"
                            value={building}
                            placeholder={t.building}
                            onChange={(e) => setBuilding(e.target.value)}
                            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={floor}
                            placeholder={t.floor}
                            onChange={(e) => setFloor(e.target.value)}
                            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={apartment}
                            placeholder={t.apartment}
                            onChange={(e) => setApartment(e.target.value)}
                            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    {t.notes}:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    placeholder={t.notesPlaceholder}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2.5 shadow-xs">
            <label className="text-xs font-black text-neutral-900 dark:text-white flex items-center justify-between">
              <span>To'lov usuli:</span>
              {user && (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  Balans: {Number(user.balance || 0).toLocaleString()} {t.currency}
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. Pay with Personal Balance */}
              <button
                type="button"
                disabled={Number(user?.balance || 0) < totalAmount}
                onClick={() => {
                  triggerHaptic("light")
                  setSelectedPaymentMethod("BALANCE")
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedPaymentMethod === "BALANCE"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-600"
                    : Number(user?.balance || 0) < totalAmount
                    ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 opacity-50 cursor-not-allowed"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedPaymentMethod === "BALANCE" ? "bg-emerald-600 text-white" : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-xs block text-neutral-900 dark:text-white">
                    Hisobimdan to'lash
                  </span>
                  <span className="text-[10px] text-neutral-400 block">
                    {Number(user?.balance || 0) >= totalAmount
                      ? "Balans yetarli — to'g'ridan-to'g'ri yechiladi"
                      : "Balansda mablag' yetarli emas"}
                  </span>
                </div>
              </button>

              {/* 2. Pay with Card & Receipt */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light")
                  setSelectedPaymentMethod("CARD_TRANSFER")
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                  selectedPaymentMethod === "CARD_TRANSFER"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-600"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selectedPaymentMethod === "CARD_TRANSFER" ? "bg-emerald-600 text-white" : "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-xs block text-neutral-900 dark:text-white">
                    Karta orqali to'lov
                  </span>
                  <span className="text-[10px] text-neutral-400 block">
                    Kartaga o'tkazib chek yuklanadi
                  </span>
                </div>
              </button>
            </div>

            {selectedPaymentMethod === "BALANCE" && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                💡 <b>Balans to'lovi:</b> Chek yuklash talab qilinmaydi. Kassir buyurtmangizni tasdiqlashi bilan hisobingizdan <b>{totalAmount.toLocaleString()} {t.currency}</b> yechiladi.
              </div>
            )}
          </div>

          {/* Checkout Totals & Submit */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
            <div className="space-y-1.5 pb-1 text-xs">
              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400 font-semibold">
                <span>{t.dishesSum || "Taomlar summasi"}:</span>
                <span className="text-neutral-900 dark:text-white font-bold">
                  {subtotal.toLocaleString()} {t.currency}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald-600" />
                  {t.packagingFee || "Qadoqlash narxi"}:
                </span>
                <span className={`font-bold ${packagingFee > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500"}`}>
                  {packagingFee > 0 ? `+${packagingFee.toLocaleString()} ${t.currency || "so'm"}` : `0 ${t.currency || "so'm"} (Bepul)`}
                </span>
              </div>

              {orderType === "ONLINE_DELIVERY" && (
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400 font-medium text-xs">
                  <span className="flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-neutral-500" />
                    Yetkazib berish:
                  </span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Alohida to'lanadi
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-neutral-900 dark:text-white font-black">{t.restaurantTotal || "Restoranga to'lov"}:</span>
              <strong className="font-black text-emerald-700 dark:text-emerald-400 text-base">
                {totalAmount.toLocaleString()} {t.currency}
              </strong>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("CART")}
                className="w-1/3 rounded-2xl text-xs font-semibold"
              >
                {t.back}
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isSubmitting || !isUserVerified}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/20 active:scale-98"
              >
                {isSubmitting ? t.loading : selectedPaymentMethod === "BALANCE" ? "Buyurtmani Tasdiqlash" : t.proceedToPayment}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PAYMENT WITH RECEIPT UPLOAD */}
      {step === "PAYMENT" && createdOrder && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-3xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
            <Badge className="bg-emerald-600 text-white font-bold">
              #{createdOrder.orderNumber}
            </Badge>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              {t.restaurantTotal || "Restoranga to'lov"}:
            </p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {Number(createdOrder.totalAmount || createdOrder.totalPrice || totalAmount).toLocaleString()} {t.currency}
            </p>
            {createdOrder.type === "ONLINE_DELIVERY" && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium pt-1">
                🚗 Yetkazish alohida to'lanadi
              </p>
            )}
          </div>

          {/* Bank Card */}
          <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                {t.restaurantCard}
              </span>
              <Badge className="bg-white/10 text-emerald-300 border-0 text-[10px]">
                UZCARD / HUMO
              </Badge>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-neutral-400">{t.restaurantCard}:</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-emerald-300">
                  {cardNumber}
                </span>
                <button
                  onClick={handleCopyCard}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {copiedCard ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
              <span>{t.cardHolder}:</span>
              <span className="font-semibold text-white">{cardHolder}</span>
            </div>
          </div>

          {/* Receipt Upload Prompt */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-xs">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                {t.uploadReceipt}
              </h4>
              <p className="text-xs text-neutral-500">{t.uploadReceiptHint}</p>
            </div>

            <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50 dark:bg-neutral-800/50">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-emerald-600 mb-2" />
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {isUploading ? t.uploadingReceipt : t.selectReceiptFile}
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG, PDF (Maks. 5MB)</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === "SUCCESS" && createdOrder && (
        <div className="py-12 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xl">
            <Check className="h-10 w-10 stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              {t.orderSuccessTitle}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {t.orderSuccessDesc}
            </p>
          </div>

          {/* Payment & Order Summary Card */}
          <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5 max-w-sm mx-auto shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-500">Buyurtma raqami:</span>
              <Badge className="bg-emerald-600 text-white font-bold">
                #{createdOrder.orderNumber}
              </Badge>
            </div>
            {createdOrder.paymentMethod === "BALANCE" ? (
              <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
                <p className="font-black flex items-center justify-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  Shaxsiy balans orqali to'lov ({Number(createdOrder.totalAmount || totalAmount).toLocaleString()} {t.currency})
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Kassir tasdiqlashi bilan hisobingizdan yechiladi va taom tayyorlanadi.
                </p>
              </div>
            ) : (
              <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 text-neutral-600 dark:text-neutral-400">
                <p className="font-semibold">To'lov cheki qabul qilindi.</p>
                <p className="text-[11px] text-neutral-400">Kassir tekshirgach buyurtma tayyorlashga o'tadi.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center pt-4">
            <Button
              onClick={onGoToOrders}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-6 py-2.5 font-bold text-xs shadow-md"
            >
              {t.viewMyOrders}
            </Button>
            <Button
              variant="outline"
              onClick={onGoToMenu}
              className="rounded-2xl px-6 py-2.5 font-bold text-xs"
            >
              {t.viewMenu}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TELEGRAM BOT CONTACT VERIFICATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBotAuthModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
            <div className="absolute inset-0" onClick={() => setShowBotAuthModal(false)} />

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
                    @fullfoodbot orqali Tasdiqlash
                  </h3>
                </div>
                <button
                  onClick={() => setShowBotAuthModal(false)}
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
                    Botda raqamingizni tasdiqlang
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    Pastdagi tugmani bosing, Telegram botimizda <b>Start</b> tugmasini bosib raqamingizni yuboring.
                  </p>
                </div>

                {sessionBotUrl && (
                  <a
                    href={sessionBotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/25 active:scale-98 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    <span>Telegram Botga O'tish</span>
                  </a>
                )}

                <p className="text-[11px] text-neutral-400">
                  Botda raqamingiz yuborilgach, buyurtma avtomatik ochiladi...
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SAVED LOCATION CONFIRMATION DIALOG */}
      <AnimatePresence>
        {locationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="absolute inset-0" onClick={() => setLocationToDelete(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Manzilni o'chirish
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Haqiqatan ham bu manzilni o'chirmoqchimisiz?
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
                <p className="font-black text-xs text-neutral-900 dark:text-white">
                  {locationToDelete.label}
                </p>
                <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                  {locationToDelete.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocationToDelete(null)}
                  className="rounded-2xl border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs h-11"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    triggerHaptic("warning")
                    const targetId = locationToDelete.id
                    const targetAddr = locationToDelete.address
                    removeSavedLocation(targetId)
                    if (deliveryAddress === targetAddr) {
                      const remaining = savedLocations.filter((l) => l.id !== targetId)
                      if (remaining.length > 0) {
                        handleSelectQuickSavedLocation(remaining[0])
                      } else {
                        setDeliveryAddress("")
                      }
                    }
                    toast.success("Manzil o'chirildi")
                    setLocationToDelete(null)
                  }}
                  className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-11 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  Ha, o'chirish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Picker Modal */}
      {isLocationModalOpen && (
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          currentAddress={deliveryAddress}
          currentDistance={distanceKm}
          currentLat={coords.lat}
          currentLng={coords.lng}
          onConfirm={handleLocationConfirm}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}
    </div>
  )
}
