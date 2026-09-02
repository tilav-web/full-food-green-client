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
  Package,
  AlertCircle,
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

  // Helper: Get dish packaging level (0-5)
  const getItemPackagingLevel = (item: { id: string; productId?: string; packagingLevel?: number }): number => {
    if (item.packagingLevel !== undefined && item.packagingLevel !== null) return item.packagingLevel
    if (item.productId) {
      const p = allProducts.find((prod) => prod.id === item.productId)
      if (p && p.packagingLevel !== undefined && p.packagingLevel !== null) return p.packagingLevel
    }
    return 2 // default 2 ball
  }

  // Helper: Get points filled in a container
  const getContainerPoints = (c: OrderContainer): number => {
    return c.items.reduce((sum, ci) => {
      const lvl = ci.packagingLevel ?? 2
      return sum + lvl * ci.quantity
    }, 0)
  }

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

  // Auto-pack and cleanup routine
  const runAutoPack = (currentCart = cart, existingContainers = containers) => {
    let current: OrderContainer[] = existingContainers.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i })),
    }))

    // 1. Clean up container items whose cart item was deleted or quantity reduced
    current = current.map((c) => {
      const updatedItems = c.items
        .map((it) => {
          const ci = currentCart.find((cItem) => cItem.id === it.cartItemId)
          if (!ci) return null
          return it
        })
        .filter(Boolean) as OrderContainerItem[]
      return { ...c, items: updatedItems }
    })

    // If total allocated across all containers > cart quantity, trim excess
    currentCart.forEach((ci) => {
      let totalAllocated = current.reduce((sum, c) => {
        const found = c.items.find((i) => i.cartItemId === ci.id)
        return sum + (found ? found.quantity : 0)
      }, 0)

      while (totalAllocated > ci.quantity) {
        for (let i = current.length - 1; i >= 0; i--) {
          const found = current[i].items.find((it) => it.cartItemId === ci.id)
          if (found && found.quantity > 0) {
            found.quantity -= 1
            if (found.quantity === 0) {
              current[i].items = current[i].items.filter((it) => it.cartItemId !== ci.id)
            }
            totalAllocated -= 1
            break
          }
        }
      }
    })

    // 2. Auto-allocate unallocated portions (where packagingLevel > 0)
    currentCart.forEach((ci) => {
      const lvl = getItemPackagingLevel(ci)
      if (lvl === 0) return // 0 ball (ichimliklar) do not need container

      let unallocated = ci.quantity - current.reduce((sum, c) => {
        const found = c.items.find((i) => i.cartItemId === ci.id)
        return sum + (found ? found.quantity : 0)
      }, 0)

      while (unallocated > 0) {
        let target = current.find((c) => {
          const pts = c.items.reduce((sum, it) => sum + (it.packagingLevel ?? 2) * it.quantity, 0)
          return pts + lvl <= CONTAINER_CAPACITY
        })

        if (!target) {
          const nextIdx = current.length + 1
          target = {
            id: `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: `${nextIdx}-${t.personPack || "Idish"}`,
            items: [],
          }
          current.push(target)
        }

        const existingInBox = target.items.find((it) => it.cartItemId === ci.id)
        if (existingInBox) {
          existingInBox.quantity += 1
        } else {
          target.items.push({
            cartItemId: ci.id,
            name: ci.name,
            quantity: 1,
            packagingLevel: lvl,
            unitName: ci.unitName,
            imageUrl: ci.imageUrl,
          })
        }
        unallocated -= 1
      }
    })

    const filled = current.filter((c) => c.items.length > 0)
    const result = filled.length > 0 ? filled : current
    setContainers(result)
    if (!activeContainerId && result.length > 0) {
      setActiveContainerId(result[0].id)
    }
  }

  // Automatic sync on cart changes
  useEffect(() => {
    if (cart.length === 0) {
      if (containers.length > 0) setContainers([])
      return
    }

    const hasUnallocated = cart.some((ci) => {
      const lvl = getItemPackagingLevel(ci)
      if (lvl === 0) return false
      return getUnallocatedCount(ci.id, ci.quantity) > 0
    })

    const hasOrphans = containers.some((c) =>
      c.items.some((it) => {
        const ci = cart.find((item) => item.id === it.cartItemId)
        return !ci || it.quantity > ci.quantity
      })
    )

    if (hasUnallocated || hasOrphans || containers.length === 0) {
      runAutoPack(cart, containers)
    }
  }, [cart, allProducts])

  // Add a new package / container (automatically becomes active)
  const handleAddNewContainer = () => {
    triggerHaptic("medium")
    const nextIdx = containers.length + 1
    const newBoxId = `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newBoxName = `${nextIdx}-${t.personPack || "Idish"}`

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
      if (activeContainerId === boxId) {
        setActiveContainerId(filtered.length > 0 ? filtered[filtered.length - 1].id : null)
      }
      return filtered
    })
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
  const packedContainersCount = containers.filter((c) => c.items.length > 0).length
  const packagingFee = packedContainersCount * containerPrice

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
            <div className="space-y-3.5">
              {/* 1. ALL DISHES IN CART WITH STEPPERS & LEVEL BADGE */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const itemLvl = getItemPackagingLevel(item)
                  const unallocated = getUnallocatedCount(item.id, item.quantity)
                  return (
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

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                              {(item.price * item.quantity).toLocaleString()} {t.currency || "so'm"}
                            </strong>

                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                itemLvl === 0
                                  ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {itemLvl === 0
                                ? (t.drinkNoPackaging || "0 (qadoqsiz)")
                                : `${itemLvl} / 5 ${t.pointsWord || "ball"}`}
                            </span>

                            {itemLvl > 0 && unallocated > 0 && (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                ({unallocated} {t.remainingCount || "qoldi"})
                              </span>
                            )}
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
                  )
                })}
              </div>

              {/* 2. MANDATORY PACKAGING / CONTAINERS DISTRIBUTION SECTION */}
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3.5 shadow-xs">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 dark:text-white">
                        {t.packagingTitle || "Taomlarni Idishlarga Qadoqlash (Majburiy)"}
                      </h4>
                      <p className="text-[10px] text-neutral-400">
                        {t.packagingSubtitle || "Har bir idish sig'imi 5 ball"} • {containerPrice.toLocaleString()} {t.currency || "so'm"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewContainer}
                    className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold px-3 h-8 gap-1 shadow-2xs active:scale-95 flex-shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t.newContainer || "Yangi Idish"}
                  </Button>
                </div>

                {/* Notice: Drinks / 0-ball items */}
                {cart.some((ci) => getItemPackagingLevel(ci) === 0) && (
                  <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-300">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🥤</span>
                      <div>
                        <span className="font-bold block">
                          {t.noContainerNeeded || "Ichimliklar & Qadoqsiz taomlar (0 ball)"}
                        </span>
                        <span className="text-[10px] text-sky-700/80 dark:text-sky-400 font-normal">
                          {t.noContainerNeededDesc || "Alohida idish talab qilmaydi, idish to'lovi olinmaydi"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notice: Unallocated items waiting to be packed */}
                {cart.some((ci) => getItemPackagingLevel(ci) > 0 && getUnallocatedCount(ci.id, ci.quantity) > 0) && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>{t.unallocatedAlert || "Qadoqlanmagan taomlar mavjud"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => runAutoPack(cart, containers)}
                      className="text-xs text-amber-950 dark:text-amber-100 underline font-black hover:opacity-80 transition-opacity"
                    >
                      {t.autoPack || "Avtomatik taqsimlash"}
                    </button>
                  </div>
                )}

                {/* Containers List */}
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {containers.map((container, idx) => {
                      const isActive = container.id === activeContainerId
                      const pts = getContainerPoints(container)
                      const isFull = pts >= CONTAINER_CAPACITY

                      return (
                        <motion.div
                          key={container.id}
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
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
                                {container.name || `${idx + 1}-${t.personPack || "Idish"}`}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                                  isFull
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                }`}
                              >
                                {pts} / 5 {t.pointsWord || "ball"} {isFull ? "✓" : ""}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleRemoveContainer(container.id, e)}
                                className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                title={t.deleteContainer}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isFull ? "bg-emerald-600" : pts >= 4 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, (pts / 5) * 100)}%` }}
                            />
                          </div>

                          {/* Dishes in this container */}
                          <div>
                            {container.items.length === 0 ? (
                              <p className="text-[11px] text-neutral-400 italic">
                                {t.emptyContainerHint || "Qadoq bo'sh — tanlash uchun bosing"}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <AnimatePresence>
                                  {container.items.map((it) => (
                                    <motion.div
                                      key={it.cartItemId}
                                      layout
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.8, opacity: 0 }}
                                      className="flex items-center gap-1.5 p-1 pr-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700 text-[11px] font-semibold shadow-2xs"
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
                                      <span className="text-[9px] text-amber-700 dark:text-amber-300 font-bold bg-amber-100/70 dark:bg-amber-950 px-1 py-0.2 rounded">
                                        {(it.packagingLevel ?? 2) * it.quantity} {t.pointsWord || "ball"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemovePortionFromContainer(container.id, it.cartItemId)
                                        }}
                                        className="h-4 w-4 rounded-full bg-neutral-200/70 dark:bg-neutral-700 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-[10px] ml-0.5 text-neutral-500"
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
              </div>

              {/* 3. SUMMARY & CHECKOUT ACTION */}
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.dishesSum}:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {subtotal.toLocaleString()} {t.currency || "so'm"}
                  </span>
                </div>

                {packagingFee > 0 && (
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      {t.packagingFee || "Qadoqlash idishlari"} ({packedContainersCount} {t.containerUnit || "ta idish"} x {containerPrice.toLocaleString()} {t.currency || "so'm"}):
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      +{packagingFee.toLocaleString()} {t.currency || "so'm"}
                    </span>
                  </div>
                )}

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 flex items-center justify-between text-base font-black">
                  <span className="text-neutral-900 dark:text-white">{t.totalSum || "Jami to'lov"}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {(subtotal + packagingFee).toLocaleString()} {t.currency || "so'm"}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    triggerHaptic("medium")
                    const hasUnallocated = cart.some(
                      (ci) => getItemPackagingLevel(ci) > 0 && getUnallocatedCount(ci.id, ci.quantity) > 0
                    )
                    if (hasUnallocated) {
                      runAutoPack(cart, containers)
                    }
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

          {/* Checkout Totals & Submit */}
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3 shadow-xs">
            <div className="space-y-1.5 pb-1 text-xs">
              <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400 font-semibold">
                <span>{t.dishesSum || "Taomlar summasi"}:</span>
                <span className="text-neutral-900 dark:text-white font-bold">
                  {subtotal.toLocaleString()} {t.currency}
                </span>
              </div>

              {packagingFee > 0 && (
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    {t.packagingFee || "Qadoqlash idishlari"}:
                  </span>
                  <span className="font-bold">+{packagingFee.toLocaleString()} {t.currency}</span>
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
