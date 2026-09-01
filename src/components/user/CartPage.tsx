import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  PackagePlus,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore, SavedLocationItem } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { LocationPickerModal } from "./LocationPickerModal"
import type { OrderContainer } from "@/types"

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
    setCurrentActiveOrder,
    savedLocations,
  } = useAppStore()
  const { isTelegram, triggerHaptic, requestPhoneContact } = useTelegram()

  // Steps: 'CART' | 'LOCATION' | 'PAYMENT' | 'SUCCESS'
  const [step, setStep] = useState<"CART" | "LOCATION" | "PAYMENT" | "SUCCESS">("CART")

  // Packaging / Container distribution state
  const [packagingMode, setPackagingMode] = useState<"STANDARD" | "CONTAINERS">("STANDARD")
  const [containers, setContainers] = useState<OrderContainer[]>([])
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null)
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null)

  // Calculate unallocated count for a cart item across all containers
  const getUnallocatedCount = (cartItemId: string, totalCartQty: number) => {
    const allocated = containers.reduce((sum, c) => {
      const found = c.items.find((i) => i.cartItemId === cartItemId)
      return sum + (found ? found.quantity : 0)
    }, 0)
    return Math.max(0, totalCartQty - allocated)
  }


  // Add a new package / container (automatically becomes active)
  const handleAddNewContainer = () => {
    triggerHaptic("medium")
    setPackagingMode("CONTAINERS")
    const nextIdx = containers.length + 1
    const newBoxId = `box_${Date.now()}`
    const newBoxName = `${nextIdx}-Qadoq`

    const newBox: OrderContainer = {
      id: newBoxId,
      name: newBoxName,
      label: "",
      items: [],
    }

    setContainers((prev) => [...prev, newBox])
    setActiveContainerId(newBoxId)
  }

  // Select / activate an existing container
  const handleSelectContainer = (boxId: string) => {
    triggerHaptic("light")
    setActiveContainerId(boxId)
  }

  // Remove a container box
  const handleRemoveContainer = (boxId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    triggerHaptic("medium")
    setContainers((prev) => {
      const filtered = prev.filter((c) => c.id !== boxId)
      if (filtered.length === 0) {
        setPackagingMode("STANDARD")
        setActiveContainerId(null)
      } else if (activeContainerId === boxId) {
        setActiveContainerId(filtered[filtered.length - 1].id)
      }
      return filtered
    })
  }


  // Reset to standard packaging
  const handleResetPackaging = () => {
    triggerHaptic("light")
    setContainers([])
    setActiveContainerId(null)
    setPackagingMode("STANDARD")
  }

  // Add 1 portion of cartItem into the active container
  const handleAddPortionToActiveContainer = (cartItem: any) => {
    let targetBoxId = activeContainerId
    if (!targetBoxId) {
      handleAddNewContainer()
      return
    }
    const unallocated = getUnallocatedCount(cartItem.id, cartItem.quantity)
    if (unallocated <= 0) {
      triggerHaptic("error")
      return
    }
    triggerHaptic("light")
    setAnimatingItemId(cartItem.id)
    setTimeout(() => setAnimatingItemId((prev) => (prev === cartItem.id ? null : prev)), 500)
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== targetBoxId) return c
        const existingIdx = c.items.findIndex((i) => i.cartItemId === cartItem.id)
        if (existingIdx >= 0) {
          const updated = [...c.items]
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          }
          return { ...c, items: updated }
        } else {
          return {
            ...c,
            items: [
              ...c.items,
              {
                cartItemId: cartItem.id,
                name: cartItem.name,
                quantity: 1,
                unitName: cartItem.unitName,
                imageUrl: cartItem.imageUrl,
              },
            ],
          }
        }
      })
    )
  }

  // Remove 1 portion of cartItem from active container
  const handleRemovePortionFromActiveContainer = (cartItemId: string) => {
    if (!activeContainerId) return
    triggerHaptic("light")
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== activeContainerId) return c
        const existing = c.items.find((i) => i.cartItemId === cartItemId)
        if (!existing) return c
        if (existing.quantity > 1) {
          return {
            ...c,
            items: c.items.map((i) =>
              i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          }
        } else {
          return {
            ...c,
            items: c.items.filter((i) => i.cartItemId !== cartItemId),
          }
        }
      })
    )
  }

  const activeBox = containers.find((c) => c.id === activeContainerId)

  // Verification status
  const isUserVerified = !!(user?.phone && (user?.telegramId || user?.isTelegramVerified))

  // Bot Verification Modal for web / unverified users
  const [showBotAuthModal, setShowBotAuthModal] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionBotUrl, setSessionBotUrl] = useState<string | null>(null)
  const [isWaitingAuth, setIsWaitingAuth] = useState(false)

  // Customer & Location state
  const defaultSaved = savedLocations[0]
  const [deliveryAddress, setDeliveryAddress] = useState(
    defaultSaved ? defaultSaved.address : "Toshkent sh., Yunusobod 4-mavze, 12-uy"
  )
  const [distanceKm, setDistanceKm] = useState(defaultSaved ? defaultSaved.distanceKm : 3.5)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultSaved ? defaultSaved.lat : 41.3645,
    lng: defaultSaved ? defaultSaved.lng : 69.2882,
  })

  const calculateFee = (km: number) => {
    let fee = 10000
    if (km > 2) {
      fee += Math.round((km - 2) * 3000)
    }
    return Math.ceil(fee / 500) * 500
  }

  const [deliveryFee, setDeliveryFee] = useState(calculateFee(distanceKm))
  const [orderType, setOrderType] = useState<"ONLINE_DELIVERY" | "ONLINE_PICKUP">("ONLINE_DELIVERY")
  const [extraPhone, setExtraPhone] = useState("")
  const [building, setBuilding] = useState("")
  const [floor, setFloor] = useState("")
  const [apartment, setApartment] = useState("")
  const [notes, setNotes] = useState("")

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Payment & Receipt
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedCard, setCopiedCard] = useState(false)

  const cardNumber = "8600 4912 3456 7890"
  const cardHolder = "FULL FOOD MCHJ (Kapitalbank)"

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalAmount = subtotal + (orderType === "ONLINE_DELIVERY" ? deliveryFee : 0)

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
      alert("Telegram orqali tasdiqlashni ochishda xatolik")
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
    newFee: number,
    lat?: number,
    lng?: number
  ) => {
    setDeliveryAddress(newAddress)
    setDistanceKm(newDistance)
    setDeliveryFee(newFee)
    if (lat && lng) {
      setCoords({ lat, lng })
    }
  }

  const handleSelectQuickSavedLocation = (loc: SavedLocationItem) => {
    triggerHaptic("light")
    setDeliveryAddress(loc.address)
    setDistanceKm(loc.distanceKm)
    setDeliveryFee(calculateFee(loc.distanceKm))
    setCoords({ lat: loc.lat, lng: loc.lng })
  }

  const handleCreateOrder = async () => {
    if (!isUserVerified || !user?.phone) {
      alert("Buyurtma berish uchun avval Telegram orqali telefon raqamingizni tasdiqlang!")
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
        extraPhone: extraPhone || undefined,
        building: building || undefined,
        floor: floor || undefined,
        apartment: apartment || undefined,
        type: orderType,
        paymentMethod: "CARD_TRANSFER",
        address: orderType === "ONLINE_DELIVERY" ? deliveryAddress : "Restorandan olib ketish",
        distanceKm,
        deliveryFee: orderType === "ONLINE_DELIVERY" ? deliveryFee : 0,
        latitude: coords.lat,
        longitude: coords.lng,
        notes: notes || undefined,
        containersJson:
          packagingMode === "CONTAINERS" && containers.some((c) => c.items.length > 0)
            ? JSON.stringify(containers)
            : undefined,
        items: itemsPayload,
      })

      setCreatedOrder(res.data)
      setCurrentActiveOrder(res.data)
      clearCart()
      setStep("PAYMENT")
    } catch (err) {
      console.error(err)
      alert("Buyurtma yaratishda xatolik yuz berdi")
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
      setStep("SUCCESS")
    } catch (err) {
      console.error(err)
      alert("Chekni yuklashda xatolik yuz berdi")
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
            {step === "LOCATION" && "Yetkazish Manzili & Mijoz"}
            {step === "PAYMENT" && (t.paymentTitle || "Karta orqali to'lov")}
            {step === "SUCCESS" && (t.orderSuccessTitle || "Qabul Qilindi!")}
          </h2>
          <p className="text-xs text-neutral-500">
            {step === "CART" && `${cart.length} xil taom tanlangan`}
            {step === "LOCATION" && "Telegram orqali tasdiqlangan buyurtma"}
            {step === "PAYMENT" && (t.paymentDesc || "Karta to'lovi va chek yuklash")}
            {step === "SUCCESS" && "Kassir chekingizni tekshirmoqda"}
          </p>
        </div>

        {step === "CART" && cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              triggerHaptic("medium")
              clearCart()
              setContainers([])
              setActiveContainerId(null)
              setPackagingMode("STANDARD")
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
            <div className="space-y-3.5">
              {/* TOP DISHES LIST */}
              {containers.length === 0 ? (
                /* Standard Cart Mode: Normal Steppers */
                <div className="space-y-3">
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=60"
                          }
                          alt={item.name}
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
                              {(item.price * item.quantity).toLocaleString()} so'm
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Stepper buttons */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="h-7 w-7 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 dark:text-neutral-300 text-xs active:scale-95"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs active:scale-95 shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-neutral-400 hover:text-red-500 p-1 ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* Container Mode: Only show unallocated dishes waiting to be packed */
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {cart
                      .filter((item) => getUnallocatedCount(item.id, item.quantity) > 0)
                      .map((item) => {
                        const unallocated = getUnallocatedCount(item.id, item.quantity)
                        const isItemAnimating = animatingItemId === item.id

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95, height: "auto" }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                              opacity: 0,
                              scale: 0.85,
                              height: 0,
                              marginBottom: 0,
                              paddingTop: 0,
                              paddingBottom: 0,
                              overflow: "hidden",
                              transition: { duration: 0.3 },
                            }}
                            className="relative flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs"
                          >
                            {/* Floating +1 transfer animation */}
                            <AnimatePresence>
                              {isItemAnimating && (
                                <motion.span
                                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                  animate={{ opacity: 0, y: -22, scale: 1.2 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.45, ease: "easeOut" }}
                                  className="absolute top-2 right-14 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-20 pointer-events-none"
                                >
                                  +1 {activeBox?.name || (t.personPack ? `${t.personPack}qa` : "Qadoqqa")}
                                </motion.span>
                              )}
                            </AnimatePresence>

                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <motion.img
                                animate={
                                  isItemAnimating
                                    ? { scale: [1, 0.88, 1.1, 1], rotate: [0, -3, 3, 0] }
                                    : { scale: 1, rotate: 0 }
                                }
                                transition={{ duration: 0.35 }}
                                src={
                                  item.imageUrl ||
                                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=60"
                                }
                                alt={item.name}
                                className="h-13 w-13 rounded-2xl object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                                  {item.name}
                                </h4>

                                <div className="flex items-center gap-2 mt-1">
                                  <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                    {(item.price * item.quantity).toLocaleString()} {t.currency}
                                  </strong>

                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0 h-4"
                                  >
                                    {t.remainingCount}: {unallocated} {t.dishesCount}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Add to active container button */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddPortionToActiveContainer(item)}
                                className="h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-xs active:scale-90 shadow-md transition-all cursor-pointer"
                                title={t.addToCart}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                  </AnimatePresence>

                  {/* If all items are packed into containers */}
                  {cart.filter((item) => getUnallocatedCount(item.id, item.quantity) > 0).length ===
                    0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{t.allDishesPacked}</span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ALOHIDA QADOQLASH TRIGGER CARD */}
              <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <PackagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                      {t.splitToContainers}
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      {t.splitToContainersDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {containers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPackaging}
                      className="text-[11px] font-bold text-neutral-400 hover:text-red-500 px-2 py-1 transition-colors"
                    >
                      {t.cancelPackaging}
                    </button>
                  )}

                  <Button
                    type="button"
                    onClick={handleAddNewContainer}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs px-4 py-2.5 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Plus className="h-4 w-4" />{" "}
                    {containers.length === 0 ? t.createContainer : t.createNewContainer}
                  </Button>
                </div>
              </div>

              {/* CREATED CONTAINERS APPEAR DIRECTLY BENEATH THE TRIGGER BUTTON */}
              {containers.length > 0 && (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {containers.map((container, idx) => {
                      const isActive = container.id === activeContainerId
                      const totalPortionsInBox = container.items.reduce(
                        (s, i) => s + i.quantity,
                        0
                      )

                      return (
                        <motion.div
                          key={container.id}
                          layout
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, height: 0 }}
                          onClick={() => handleSelectContainer(container.id)}
                          className={`p-3.5 rounded-2xl transition-all cursor-pointer space-y-2.5 ${
                            isActive
                              ? "border-2 border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm"
                              : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs"
                          }`}
                        >
                          {/* Container Card Header: Clean Icon & Index only */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black shadow-2xs ${
                                  isActive
                                    ? "bg-emerald-600 text-white"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                }`}
                              >
                                📦
                              </div>
                              <span className="text-xs font-black text-neutral-900 dark:text-white">
                                {container.name || `${idx + 1}-Qadoq`}
                              </span>
                              {totalPortionsInBox > 0 && (
                                <span className="text-[10px] font-semibold text-neutral-400">
                                  ({totalPortionsInBox} {t.dishesCount})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveContainer(container.id, e)}
                              className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-colors"
                              title={t.deleteContainer}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Items inside this container */}
                          <div className="pl-0.5">
                            {container.items.length === 0 ? (
                              <p className="text-[11px] text-neutral-400 italic">
                                {isActive
                                  ? t.activeContainerHint
                                  : t.emptyContainerHint}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <AnimatePresence>
                                  {container.items.map((it) => (
                                    <motion.div
                                      key={it.cartItemId}
                                      layout
                                      initial={{ scale: 0.7, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.7, opacity: 0 }}
                                      className="flex items-center gap-1.5 p-1 pr-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 text-[11px] font-semibold shadow-2xs"
                                    >
                                      {it.imageUrl && (
                                        <img
                                          src={it.imageUrl}
                                          alt={it.name}
                                          className="h-5 w-5 rounded-md object-cover"
                                        />
                                      )}
                                      <span className="font-black text-emerald-700 dark:text-emerald-400">
                                        {it.quantity}x
                                      </span>
                                      <span className="text-neutral-800 dark:text-neutral-200 truncate max-w-[120px]">
                                        {it.name}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemovePortionFromActiveContainer(it.cartItemId)
                                        }}
                                        className="h-4 w-4 rounded-full bg-neutral-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[10px] ml-0.5 text-neutral-400"
                                        title="Olib tashlash"
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </button>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Summary & Checkout Action */}
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.dishesSum}:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {subtotal.toLocaleString()} so'm
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

              <Button
                type="button"
                onClick={handleStartTelegramAuth}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                {isTelegram ? <Smartphone className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                <span>{isTelegram ? t.shareContactBtn : t.openTelegramBot}</span>
              </Button>
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
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      orderType === "ONLINE_DELIVERY"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600"
                    }`}
                  >
                    <Car className="h-4 w-4 text-emerald-600" />
                    {t.deliveryYandex}
                  </button>
                  <button
                    onClick={() => setOrderType("ONLINE_PICKUP")}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      orderType === "ONLINE_PICKUP"
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
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => handleSelectQuickSavedLocation(loc)}
                                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs"
                                    : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60"
                                }`}
                              >
                                <div
                                  className={`h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    isSelected
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
                                    className={`font-black text-xs block ${
                                      isSelected
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
                              </button>
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
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              {distanceKm} km ({deliveryFee.toLocaleString()} {t.currency})
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-950 dark:text-purple-200 font-bold">
                          {t.deliveryYandex}
                        </span>
                      </div>
                      <span className="font-black text-purple-700 dark:text-purple-300">
                        {deliveryFee.toLocaleString()} {t.currency} (~25 daq)
                      </span>
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

                    {/* Optional Extra Contact Phone */}
                    <div>
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {t.extraPhone} ({t.optional}):
                      </label>
                      <input
                        type="tel"
                        value={extraPhone}
                        placeholder="+998 90 123 45 67"
                        onChange={(e) => setExtraPhone(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
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

          {/* Checkout Totals & Submit */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-neutral-500">{t.totalSum}:</span>
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
                {isSubmitting ? t.loading : t.proceedToPayment}
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
              {t.totalSum}:
            </p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {createdOrder.totalPrice ? Number(createdOrder.totalPrice).toLocaleString() : totalAmount.toLocaleString()} {t.currency}
            </p>
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
