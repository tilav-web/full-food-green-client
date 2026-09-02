import React, { useState, useEffect, useMemo } from "react"
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
  PackagePlus,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore, SavedLocationItem } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { LocationPickerModal } from "./LocationPickerModal"
import { getImageUrl } from "@/lib/utils"
import type { OrderContainer, OrderContainerItem, Product } from "@/types"
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
    setCurrentActiveOrder,
    savedLocations,
    containers,
    setContainers,
  } = useAppStore()
  const { isTelegram, triggerHaptic, requestPhoneContact } = useTelegram()

  // Steps: 'CART' | 'LOCATION' | 'PAYMENT' | 'SUCCESS'
  const [step, setStep] = useState<"CART" | "LOCATION" | "PAYMENT" | "SUCCESS">("CART")

  const CONTAINER_CAPACITY = 5 // Har bir standart idish sig'imi: 5 ball

  // Fetch all products for packagingLevel lookup
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["publicProducts"],
    queryFn: async () => (await apiClient.get("/products")).data,
  })

  // Helper: Get dish packaging level (0-5). Drinks and beverages are strictly 0.
  const getItemPackagingLevel = (item: {
    id?: string
    name?: string
    cartItemId?: string
    productId?: string
    packagingLevel?: number
  }): number => {
    if (item.packagingLevel !== undefined && item.packagingLevel !== null) {
      return Number(item.packagingLevel)
    }
    const pId = item.productId || item.cartItemId || item.id
    if (pId) {
      const p = allProducts.find((prod) => prod.id === pId)
      if (p) {
        if (p.packagingLevel !== undefined && p.packagingLevel !== null) {
          return Number(p.packagingLevel)
        }
        const catName = p.category?.name?.toLowerCase() || ""
        const catSlug = p.category?.slug?.toLowerCase() || ""
        if (catName.includes("ichimlik") || catSlug.includes("ichimlik") || p.categoryId === "drinks") {
          return 0
        }
      }
    }
    // Check item name for drink keywords
    const lowerName = ((item as any).name || "").toLowerCase()
    if (
      lowerName.includes("cappuccino") ||
      lowerName.includes("latte") ||
      lowerName.includes("americano") ||
      lowerName.includes("espresso") ||
      lowerName.includes("fanta") ||
      lowerName.includes("cola") ||
      lowerName.includes("sprite") ||
      lowerName.includes("adrenalin") ||
      lowerName.includes("flash") ||
      lowerName.includes("red bull") ||
      lowerName.includes("suv") ||
      lowerName.includes("choy") ||
      lowerName.includes("sharbat") ||
      lowerName.includes("sok") ||
      lowerName.includes("fuse tea") ||
      lowerName.includes("ayron") ||
      lowerName.includes("mojito") ||
      lowerName.includes("pepsi") ||
      lowerName.includes("kampot") ||
      lowerName.includes("kefir")
    ) {
      return 0
    }
    return 2 // default 2 ball
  }

  // Boolean helper: does cart contain any dishes that need containers?
  const hasPackableDishes = useMemo(() => {
    return cart.some((item) => getItemPackagingLevel(item) > 0)
  }, [cart, allProducts])

  // Helper: Calculate unallocated portions for a cart item
  const getUnallocatedCount = (cartItemId: string, totalCartQty: number): number => {
    const allocated = containers.reduce((sum, c) => {
      const found = c.items.find((i) => i.cartItemId === cartItemId)
      return sum + (found ? found.quantity : 0)
    }, 0)
    return Math.max(0, totalCartQty - allocated)
  }

  // Active Container selection state
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null)
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null)
  const [showFullContainerModal, setShowFullContainerModal] = useState(false)
  const [showUnallocatedModal, setShowUnallocatedModal] = useState(false)

  // Keep activeContainerId in sync with containers
  useEffect(() => {
    if (containers.length > 0 && (!activeContainerId || !containers.some((c) => c.id === activeContainerId))) {
      setActiveContainerId(containers[0].id)
    }
  }, [containers, activeContainerId])

  // Safe sync: Only sanitize items from containers if their corresponding cart item was deleted
  useEffect(() => {
    if (cart.length === 0) {
      if (containers.length > 0) setContainers([])
      return
    }

    setContainers((prev) => {
      let changed = false
      const updated = prev.map((c) => {
        const validItems = c.items
          .map((it) => {
            const ci = cart.find((item) => item.id === it.cartItemId)
            if (!ci) {
              changed = true
              return null
            }
            if (it.quantity > ci.quantity) {
              changed = true
              return { ...it, quantity: ci.quantity }
            }
            return it
          })
          .filter(Boolean) as OrderContainerItem[]
        return { ...c, items: validItems }
      })
      return changed ? updated : prev
    })
  }, [cart, setContainers])

  // Add a new package / container (automatically becomes active)
  const handleAddNewContainer = () => {
    triggerHaptic("medium")
    const nextIdx = containers.length + 1
    const newBoxId = `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newBoxName = `${nextIdx}-${t.personPack || "Qadoq"}`

    const newBox: OrderContainer = {
      id: newBoxId,
      name: newBoxName,
      label: "",
      items: [],
    }

    setContainers((prev) => [...prev, newBox])
    setActiveContainerId(newBoxId)
    return newBoxId
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
      if (activeContainerId === boxId) {
        setActiveContainerId(filtered.length > 0 ? filtered[filtered.length - 1].id : null)
      }
      return filtered
    })
  }

  // Add 1 portion of cartItem into the active container (with background 5-point capacity check)
  const handleAddPortionToActiveContainer = (cartItem: any) => {
    let targetBox = containers.find((c) => c.id === activeContainerId)
    if (!targetBox) {
      if (containers.length === 0) {
        const nextIdx = 1
        const newBoxId = `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const newBoxName = `${nextIdx}-${t.personPack || "Qadoq"}`
        const dishLevel = getItemPackagingLevel(cartItem)
        const newBox: OrderContainer = {
          id: newBoxId,
          name: newBoxName,
          label: "",
          items: [
            {
              cartItemId: cartItem.id,
              name: cartItem.name,
              quantity: 1,
              packagingLevel: dishLevel,
              unitName: cartItem.unitName,
              imageUrl: cartItem.imageUrl,
            },
          ],
        }
        setContainers([newBox])
        setActiveContainerId(newBoxId)
        triggerHaptic("light")
        setAnimatingItemId(cartItem.id)
        setTimeout(() => setAnimatingItemId((prev) => (prev === cartItem.id ? null : prev)), 500)
        return
      } else {
        targetBox = containers[containers.length - 1]
        setActiveContainerId(targetBox.id)
      }
    }

    const unallocated = getUnallocatedCount(cartItem.id, cartItem.quantity)
    if (unallocated <= 0) {
      triggerHaptic("error")
      return
    }

    // Capacity check in background (5 points max, invisible to user)
    const currentPoints = targetBox.items.reduce((sum, it) => {
      const lvl = getItemPackagingLevel(it)
      return sum + lvl * it.quantity
    }, 0)
    const dishLevel = getItemPackagingLevel(cartItem)

    if (currentPoints + dishLevel > CONTAINER_CAPACITY) {
      triggerHaptic("warning")
      setShowFullContainerModal(true)
      return
    }

    triggerHaptic("light")
    setAnimatingItemId(cartItem.id)
    setTimeout(() => setAnimatingItemId((prev) => (prev === cartItem.id ? null : prev)), 500)

    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== targetBox!.id) return c
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
                packagingLevel: dishLevel,
                unitName: cartItem.unitName,
                imageUrl: cartItem.imageUrl,
              },
            ],
          }
        }
      })
    )
  }

  // Remove 1 portion of cartItem from a specific container
  const handleRemovePortionFromContainer = (containerId: string, cartItemId: string) => {
    triggerHaptic("light")
    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== containerId) return c
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

  // Reset containers
  const handleResetPackaging = () => {
    triggerHaptic("light")
    setContainers([])
    setActiveContainerId(null)
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
    defaultSaved ? defaultSaved.address : "Qarshi sh., Mustaqillik shoh ko'chasi"
  )
  const [distanceKm, setDistanceKm] = useState(defaultSaved ? defaultSaved.distanceKm : 1.5)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultSaved ? defaultSaved.lat : 38.83825,
    lng: defaultSaved ? defaultSaved.lng : 65.792222,
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

  const containerPrice = Number(getSetting("container_price", "2000")) || 2000
  // Single fixed container price rule: if order has ANY dish with level > 0, charge exactly 1 container fee
  const packagingFee = hasPackableDishes ? containerPrice : 0

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
        extraPhone: extraPhone || undefined,
        building: building || undefined,
        floor: floor || undefined,
        apartment: apartment || undefined,
        type: orderType,
        paymentMethod: selectedPaymentMethod,
        address: orderType === "ONLINE_DELIVERY" ? deliveryAddress : "Restorandan olib ketish",
        distanceKm,
        deliveryFee: orderType === "ONLINE_DELIVERY" ? deliveryFee : 0,
        packagingFee,
        latitude: coords.lat,
        longitude: coords.lng,
        notes: notes || undefined,
        containersJson:
          containers.some((c) => c.items.length > 0)
            ? JSON.stringify(containers.filter((c) => c.items.length > 0))
            : undefined,
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
              setContainers([])
              setActiveContainerId(null)
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
              {/* 1. TOP DISHES LIST */}
              {containers.length === 0 ? (
                /* Standard Cart Mode: Normal Steppers before packaging is initiated */
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
              ) : (
                /* Packaging Mode: Unallocated dishes with [+] button to pack into active container */
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {cart
                      .filter((item) => {
                        const lvl = getItemPackagingLevel(item)
                        return lvl > 0 && getUnallocatedCount(item.id, item.quantity) > 0
                      })
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
                            {/* Floating +1 transfer badge */}
                            <AnimatePresence>
                              {isItemAnimating && (
                                <motion.span
                                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                  animate={{ opacity: 0, y: -22, scale: 1.2 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.45, ease: "easeOut" }}
                                  className="absolute top-2 right-14 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-20 pointer-events-none"
                                >
                                  +1 {activeBox?.name || (t.personPack ? `${t.personPack}ga` : "Qadoqqa")}
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

                                <div className="flex items-center gap-2 mt-1">
                                  <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                    {(item.price * item.quantity).toLocaleString()} {t.currency || "so'm"}
                                  </strong>

                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[10px] font-black px-2 py-0.5"
                                  >
                                    {t.remainingCount || "Qolgan"}: {unallocated} {t.dishesCount || "ta"}
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
                                title={t.addDishToContainer || "Qadoqqa solish"}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                  </AnimatePresence>

                  {/* If all food items with packagingLevel > 0 are packed */}
                  {cart.filter((item) => getItemPackagingLevel(item) > 0 && getUnallocatedCount(item.id, item.quantity) > 0).length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>{t.allDishesPacked || "Barcha taomlar qadoqlarga joylashtirildi"}</span>
                    </motion.div>
                  )}

                  {/* Drinks / 0-level items: shown separately with info */}
                  {cart.some((item) => getItemPackagingLevel(item) === 0) && (
                    <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          🥤 {t.noContainerNeeded || "Ichimliklar & Qadoqsiz mahsulotlar"}
                        </span>
                        <span className="text-[10px] font-normal text-neutral-400">
                          {t.noContainerNeededDesc || "Qadoq talab qilinmaydi"}
                        </span>
                      </div>

                      {cart
                        .filter((item) => getItemPackagingLevel(item) === 0)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-xs shadow-2xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-bold text-neutral-900 dark:text-white truncate block">
                                {item.name}
                              </span>
                              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                {(item.price * item.quantity).toLocaleString()} {t.currency || "so'm"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.id, -1)}
                                className="h-6 w-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 dark:text-neutral-300 text-xs active:scale-95"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.id, 1)}
                                className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs active:scale-95 shadow-2xs"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="text-neutral-400 hover:text-red-500 p-1 ml-0.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. QADOQLASHTIRISH TRIGGER CARD (Faqat darajaga ega taomlar bo'lganda ko'rinadi) */}
              {hasPackableDishes && (
                <div className="rounded-3xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <PackagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                        {t.packagingTitle || "Taomlarni Qadoqlash (Majburiy)"}
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        {t.packagingSubtitle || "Har bir qadoqqa 2-3 xil taom sig'ishi mumkin. Taomlarni qadoqlarga taqsimlang."}
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
                        {t.cancelPackaging || "Qayta boshlash"}
                      </button>
                    )}

                    <Button
                      type="button"
                      onClick={handleAddNewContainer}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs px-4 py-2.5 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <Plus className="h-4 w-4" />{" "}
                      {containers.length === 0
                        ? (t.createContainer || "+ Yangi qadoq ochish")
                        : (t.createNewContainer || "Yana qadoq qo'shish")}
                    </Button>
                  </div>
                </div>
              )}

              {/* 3. CREATED CONTAINERS LIST (NO POINTS / CAPACITY NUMBERS SHOWN!) */}
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
                          {/* Container Header */}
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
                                {container.name || `${idx + 1}-${t.personPack || "Qadoq"}`}
                              </span>
                              {totalPortionsInBox > 0 && (
                                <span className="text-[10px] font-semibold text-neutral-400">
                                  ({totalPortionsInBox} {t.dishesCount || "ta taom"})
                                </span>
                              )}
                              {isActive && (
                                <Badge className="bg-emerald-600 text-white text-[9px] font-bold py-0 h-4 border-0">
                                  {t.activeContainerSelected || "Tanlangan"}
                                </Badge>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveContainer(container.id, e)}
                              className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-colors"
                              title={t.deleteContainer || "Qadoqni o'chirish"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Items inside this container */}
                          <div>
                            {container.items.length === 0 ? (
                              <p className="text-[11px] text-neutral-400 italic">
                                {isActive
                                  ? (t.activeContainerHint || "👈 Tanlangan qadoq. Yuqoridagi taomlardan [+] bosing")
                                  : (t.emptyContainerHint || "Qadoq bo'sh — tanlash uchun bosing")}
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
                                          src={getImageUrl(it.imageUrl)}
                                          alt={it.name}
                                          onError={(e) => {
                                            ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                                          }}
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
                                          handleRemovePortionFromContainer(container.id, it.cartItemId)
                                        }}
                                        className="h-4 w-4 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[10px] ml-0.5 text-neutral-400"
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

              {/* 4. SUMMARY & CHECKOUT ACTION */}
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.dishesSum || "Taomlar summasi"}:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {subtotal.toLocaleString()} {t.currency || "so'm"}
                  </span>
                </div>

                {hasPackableDishes ? (
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Qadoqlash narxi:
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      +{packagingFee.toLocaleString()} {t.currency || "so'm"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-neutral-400" />
                      Qadoqlash narxi:
                    </span>
                    <span className="font-bold text-emerald-600">0 {t.currency || "so'm"} (Qadoqsiz)</span>
                  </div>
                )}

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
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => handleSelectQuickSavedLocation(loc)}
                                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2 transition-all ${isSelected
                                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs"
                                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60"
                                  }`}
                              >
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
                                    className={`font-black text-xs block ${isSelected
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
                              {distanceKm} km (~{deliveryFee.toLocaleString()} {t.currency})
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-purple-600" />
                          <span className="text-purple-950 dark:text-purple-200 font-bold">
                            {t.deliveryYandex || "Yetkazib berish (Yandex Taxi)"}
                          </span>
                        </div>
                        <span className="font-black text-purple-700 dark:text-purple-300">
                          ~{deliveryFee.toLocaleString()} {t.currency} (~25 daq)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-purple-900/30 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200 font-medium leading-relaxed">
                        💡 {t.deliveryFeeNotice || "Yetkazib berish narxi taxminiy bo'lib, to'lov to'g'ridan-to'g'ri taksi haydovchisiga to'lanadi. Siz restoranga faqat ovqat va qadoqlash uchun to'laysiz."}
                      </div>
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

              {hasPackableDishes ? (
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    Qadoqlash narxi:
                  </span>
                  <span className="font-bold">+{packagingFee.toLocaleString()} {t.currency}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-neutral-400 font-medium text-xs">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    Qadoqlash narxi:
                  </span>
                  <span className="text-emerald-600 font-semibold">0 {t.currency} (Qadoqsiz)</span>
                </div>
              )}

              {orderType === "ONLINE_DELIVERY" && (
                <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" />
                    {t.deliveryFeeEstimated || "Yetkazish (Taksiga)"}:
                  </span>
                  <span className="font-bold">
                    ~{deliveryFee.toLocaleString()} {t.currency} ({t.paidToTaxi || "taksiga to'lanadi"})
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
            {createdOrder.type === "ONLINE_DELIVERY" && Number(createdOrder.deliveryFee || 0) > 0 && (
              <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold pt-1">
                🚗 {t.deliveryFeeEstimated || "Yetkazish (Taksiga)"}: ~{Number(createdOrder.deliveryFee).toLocaleString()} {t.currency} ({t.paidToTaxi || "taksiga to'lanadi"})
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

      {/* ========================================================================= */}
      {/* MODAL: CONTAINER FULL (PROMPT USER TO OPEN NEW CONTAINER) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFullContainerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="absolute inset-0" onClick={() => setShowFullContainerModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-5 space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Package className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                  {t.containerFullTitle || "Ushbu qadoq to'ldi!"}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed px-2">
                  {t.containerFullPrompt ||
                    "Ushbu qadoqqa boshqa taom sig'maydi. Iltimos, yangi qadoq oching yoki boshqa qadoqni tanlang."}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => {
                    setShowFullContainerModal(false)
                    handleAddNewContainer()
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold py-3 text-xs shadow-md shadow-emerald-600/20 active:scale-98"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t.createNewContainerBtn || "Yangi qadoq ochish"}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setShowFullContainerModal(false)}
                  className="w-full rounded-2xl font-bold text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  {t.gotIt || "Tushundim"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: MANDATORY PACKAGING UNALLOCATED WARNING */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showUnallocatedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="absolute inset-0" onClick={() => setShowUnallocatedModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl p-5 space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-950/70 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                  {t.unallocatedWarningTitle || "Qadoqlash majburiy!"}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed px-2">
                  {t.unallocatedWarningDesc ||
                    "Buyurtmani davom ettirish uchun barcha taomlarni qadoqlarga taqsimlang! (Ichimliklar uchun qadoq talab qilinmaydi)"}
                </p>
              </div>

              <div className="pt-1">
                <Button
                  onClick={() => {
                    setShowUnallocatedModal(false)
                    if (containers.length === 0) {
                      handleAddNewContainer()
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold py-3 text-xs shadow-md shadow-emerald-600/20 active:scale-98"
                >
                  {containers.length === 0
                    ? (t.createContainer || "Qadoq ochish")
                    : (t.gotIt || "Tushundim")}
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
