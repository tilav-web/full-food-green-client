import React, { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/api/axios"
import {
  Receipt,
  Car,
  Package,
  Eye,
  X,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Search,
  UtensilsCrossed,
  ExternalLink,
  FileText,
  Check,
  LayoutGrid,
  ShoppingBag,
  Flame,
  GripVertical,
  Wallet,
  UserCheck,
  Loader2,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useTelegram } from "@/hooks/useTelegram"
import { ProductSearchSelect } from "@/components/common/ProductSearchSelect"
import { getImageUrl } from "@/lib/utils"
import type { Order, Product, Category, OrderStatus, User } from "@/types"

import { socket } from "@/api/socket"

const NOTIFICATION_SOUND = "/mixkit-happy-bells-notification-937.wav"
let sharedAudio: HTMLAudioElement | null = null
let audioUnlocked = false

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio(NOTIFICATION_SOUND)
    sharedAudio.preload = "auto"
  }
  return sharedAudio
}

function unlockSharedAudio(): Promise<void> {
  const a = getSharedAudio()
  if (audioUnlocked) return Promise.resolve()
  const prev = a.volume
  a.volume = 0.01
  return a
    .play()
    .then(() => {
      a.pause()
      a.currentTime = 0
      a.volume = prev
      audioUnlocked = true
    })
    .catch((err) => {
      a.volume = prev
      throw err
    })
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING_PAYMENT: {
    label: "To'lov kutilmoqda",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  PAYMENT_REVIEW: {
    label: "Chek tekshirilmoqda",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
  },
  PREPARING: {
    label: "Oshxonada tayyorlanmoqda",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  READY_FOR_DELIVERY: {
    label: "Yetkazishga tayyor",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  DELIVERING: {
    label: "Yetkazilmoqda (Kuryerda)",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  COMPLETED: {
    label: "Yetkazildi (Yakunlangan)",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  CANCELLED: {
    label: "Bekor qilingan",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
}

const renderStatusBadge = (status: string) => {
  const conf = STATUS_CONFIG[status] || {
    label: status,
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
  }

  return (
    <div
      className={`w-full text-center py-2 px-3 rounded-2xl border text-xs font-bold ${conf.bg} ${conf.text} ${conf.border}`}
    >
      {conf.label}
    </div>
  )
}

export const CashierView: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { triggerHaptic } = useTelegram()

  const [soundBlocked, setSoundBlocked] = React.useState(!audioUnlocked)
  const [audioReady, setAudioReady] = React.useState(audioUnlocked)

  // URL State
  const activeTab = (searchParams.get("tab") as "ORDERS" | "POS" | "KIRIM") || "ORDERS"
  const orderFilter = searchParams.get("status") || "ALL"
  const activeReceiptId = searchParams.get("receipt") || null
  const activeYandexId = searchParams.get("yandex") || null

  const setActiveTab = (tab: "ORDERS" | "POS" | "KIRIM") => {
    const next = new URLSearchParams(searchParams)
    next.set("tab", tab)
    setSearchParams(next)
  }

  const setOrderFilter = (status: string) => {
    const next = new URLSearchParams(searchParams)
    if (status === "ALL") {
      next.delete("status")
    } else {
      next.set("status", status)
    }
    setSearchParams(next)
  }

  // Audio gesture unlocker
  useEffect(() => {
    const onGesture = () => {
      unlockSharedAudio()
        .then(() => {
          setSoundBlocked(false)
          setAudioReady(true)
          window.removeEventListener("click", onGesture)
          window.removeEventListener("keydown", onGesture)
          window.removeEventListener("touchstart", onGesture)
        })
        .catch(() => {})
    }

    if (!audioUnlocked) {
      window.addEventListener("click", onGesture)
      window.addEventListener("keydown", onGesture)
      window.addEventListener("touchstart", onGesture)
    }

    return () => {
      window.removeEventListener("click", onGesture)
      window.removeEventListener("keydown", onGesture)
      window.removeEventListener("touchstart", onGesture)
    }
  }, [])

  const enableSound = () => {
    const a = getSharedAudio()
    a.volume = 1
    a.currentTime = 0
    a.play()
      .then(() => {
        audioUnlocked = true
        setSoundBlocked(false)
        setAudioReady(true)
        triggerHaptic("success")
      })
      .catch((err) => {
        console.warn("[CashierAudio] Play failed:", err)
      })
  }

  const playNotificationChime = () => {
    try {
      const a = getSharedAudio()
      a.pause()
      a.currentTime = 0
      a.volume = 1
      a.play()
        .then(() => {
          setSoundBlocked(false)
          setAudioReady(true)
        })
        .catch((err) => {
          console.warn("[CashierAudio] Audio blocked by browser:", err)
          setSoundBlocked(true)
          // Fallback Web Audio oscillator chime
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.type = "sine"
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime)
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15)
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            osc.start()
            osc.stop(audioCtx.currentTime + 0.6)
          } catch (e) {}
        })
    } catch (e) {
      setSoundBlocked(true)
    }
  }

  // 1. Orders data (Instant WebSocket events + fallback background sync)
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["cashierOrders"],
    queryFn: async () => (await apiClient.get("/orders")).data,
    refetchInterval: 15000,
  })

  // 2. Real-Time WebSocket Connection & Instant Audio Alert
  useEffect(() => {
    socket.emit("join_cashier")

    const handleNewOrder = (order: Order) => {
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
      // Kassir o'zi zal uchun yaratgan buyurtmalar uchun tovush chalinmasin!
      if (order?.type === "DINE_IN") {
        return
      }
      triggerHaptic("heavy")
      playNotificationChime()
    }

    const handleOrderUpdated = (order: Order) => {
      // If payment review receipt uploaded, chime
      if (order?.status === "PAYMENT_REVIEW") {
        triggerHaptic("heavy")
        playNotificationChime()
      }
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
    }

    socket.on("new_order", handleNewOrder)
    socket.on("order_updated", handleOrderUpdated)

    return () => {
      socket.off("new_order", handleNewOrder)
      socket.off("order_updated", handleOrderUpdated)
    }
  }, [queryClient, triggerHaptic])

  // 3. Products & Categories data
  const { data: products = [], isLoading: isProductsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["cashierProducts"],
    queryFn: async () => (await apiClient.get("/products")).data,
  })

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ["cashierCategories"],
    queryFn: async () => (await apiClient.get("/products/categories")).data,
  })

  // Helper to find image for dish
  const getDishImage = (productId?: string) => {
    if (!productId) return "/logo.jpg"
    const found = products.find((p) => p.id === productId)
    return getImageUrl(found?.imageUrl)
  }

  // Modals state derived from URL
  const selectedReceiptOrder = useMemo(
    () => orders.find((o) => o.id === activeReceiptId) || null,
    [orders, activeReceiptId]
  )

  const yandexConfirmOrder = useMemo(
    () => orders.find((o) => o.id === activeYandexId) || null,
    [orders, activeYandexId]
  )

  const [isDispatchingYandex, setIsDispatchingYandex] = React.useState(false)

  // POS State (Walk-in customer order)
  const [posCart, setPosCart] = React.useState<Array<{ product: Product; quantity: number }>>([])
  const [posCustomerName, setPosCustomerName] = React.useState("Zal Mijoz")
  const [posPaymentMethod, setPosPaymentMethod] = React.useState<"CASH" | "TERMINAL" | "BALANCE">("CASH")
  const [posSelectedCategory, setPosSelectedCategory] = React.useState<string>("")
  const [posSearchQuery, setPosSearchQuery] = React.useState<string>("")
  const [posSelectedCustomer, setPosSelectedCustomer] = React.useState<User | null>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState("")
  const [customerSearchResults, setCustomerSearchResults] = React.useState<User[]>([])
  const [isSearchingCustomer, setIsSearchingCustomer] = React.useState(false)

  const handleSearchCustomers = async (q: string) => {
    setCustomerSearchQuery(q)
    if (!q.trim()) {
      setCustomerSearchResults([])
      return
    }
    try {
      setIsSearchingCustomer(true)
      const res = await apiClient.get(`/users/search?q=${encodeURIComponent(q)}`)
      setCustomerSearchResults(res.data || [])
    } catch (_) {
      setCustomerSearchResults([])
    } finally {
      setIsSearchingCustomer(false)
    }
  }

  // POS Grid Columns State (3, 4, 5) - Default 4, remembered in localStorage
  const [posGridCols, setPosGridCols] = React.useState<3 | 4 | 5>(() => {
    try {
      const saved = localStorage.getItem("fullfood_pos_grid_cols")
      if (saved === "3" || saved === "4" || saved === "5") return Number(saved) as 3 | 4 | 5
    } catch (_) {}
    return 3
  })

  const handleSetPosGridCols = (cols: 3 | 4 | 5) => {
    triggerHaptic("light")
    setPosGridCols(cols)
    try {
      localStorage.setItem("fullfood_pos_grid_cols", String(cols))
    } catch (_) {}
  }

  // Ordered POS Categories with Drag and Drop Reordering
  const [orderedCategories, setOrderedCategories] = React.useState<Category[]>([])
  const [draggedCatIndex, setDraggedCatIndex] = React.useState<number | null>(null)
  const [dropInsertPosition, setDropInsertPosition] = React.useState<{ index: number; side: "left" | "right" } | null>(null)

  useEffect(() => {
    if (categories.length > 0) {
      const sorted = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      setOrderedCategories(sorted)
      if (!posSelectedCategory || posSelectedCategory === "ALL" || posSelectedCategory === "POPULAR") {
        setPosSelectedCategory(sorted[0]?.id || "")
      }
    }
  }, [categories])

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCatIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
  }

  const handleCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const side = mouseX < rect.width / 2 ? "left" : "right"
    if (
      !dropInsertPosition ||
      dropInsertPosition.index !== index ||
      dropInsertPosition.side !== side
    ) {
      setDropInsertPosition({ index, side })
    }
  }

  const handleCategoryDragEnd = () => {
    setDraggedCatIndex(null)
    setDropInsertPosition(null)
  }

  // Instant Insertion-Line Drop
  const handleCategoryDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedCatIndex === null) {
      handleCategoryDragEnd()
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const side = mouseX < rect.width / 2 ? "left" : "right"
    const targetSlot = side === "left" ? targetIndex : targetIndex + 1

    const fromIndex = draggedCatIndex
    if (fromIndex === targetSlot || fromIndex === targetSlot - 1) {
      handleCategoryDragEnd()
      return
    }

    const previousOrder = [...orderedCategories]
    const nextCategories = [...orderedCategories]
    const [draggedItem] = nextCategories.splice(fromIndex, 1)
    const finalIndex = fromIndex < targetSlot ? targetSlot - 1 : targetSlot
    nextCategories.splice(finalIndex, 0, draggedItem)

    // INSTANT UI UPDATE
    setOrderedCategories(nextCategories)
    handleCategoryDragEnd()
    triggerHaptic("medium")

    // Update query cache optimistically
    queryClient.setQueryData(["cashierCategories"], nextCategories)
    queryClient.setQueryData(["categories"], nextCategories)

    try {
      const items = nextCategories.map((c, idx) => ({ id: c.id, sortOrder: idx + 1 }))
      await apiClient.put("/products/categories/reorder", { items })
    } catch (err) {
      console.error("Kategoriyalarni qayta tartiblashda xatolik:", err)
      toast.error("Tartibni saqlashda xatolik yuz berdi")
      setOrderedCategories(previousOrder)
      queryClient.setQueryData(["cashierCategories"], previousOrder)
    }
  }

  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        !posSelectedCategory ||
        p.categoryId === posSelectedCategory ||
        (p.category && (p.category.id === posSelectedCategory || p.category.name === posSelectedCategory))

      const matchesSearch =
        !posSearchQuery.trim() ||
        p.name.toLowerCase().includes(posSearchQuery.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [products, posSelectedCategory, posSearchQuery])

  // Kirim Modal State
  const [kirimProductId, setKirimProductId] = React.useState("")
  const [kirimQty, setKirimQty] = React.useState(20)
  const [kirimSupplier, setKirimSupplier] = React.useState("Parhez Somsa Seh")
  const [kirimNote, setKirimNote] = React.useState("Ertalabki yangi kirim")
  const [isSubmittingKirim, setIsSubmittingKirim] = React.useState(false)

  // Review Receipt Mutation
  const reviewReceiptMutation = useMutation({
    mutationFn: async ({ orderId, approved }: { orderId: string; approved: boolean }) => {
      return apiClient.post(`/orders/${orderId}/review-receipt`, { approved })
    },
    onSuccess: () => {
      triggerHaptic("success")
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
      const next = new URLSearchParams(searchParams)
      next.delete("receipt")
      setSearchParams(next)
    },
  })

  // Confirm Balance Payment Mutation
  const confirmBalancePaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.post(`/orders/${orderId}/confirm-balance-payment`, { performedBy: "Kassir" })
    },
    onSuccess: () => {
      triggerHaptic("success")
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
      toast.success("Mijoz balansidan to'lov muvaffaqiyatli yechildi va buyurtma tasdiqlandi!")
    },
    onError: (err: any) => {
      toast.error("Xatolik: " + (err.response?.data?.message || err.message))
    },
  })

  // Dispatch Yandex Taxi
  const handleConfirmYandexDispatch = async () => {
    if (!yandexConfirmOrder) return
    try {
      setIsDispatchingYandex(true)
      await apiClient.post(`/orders/${yandexConfirmOrder.id}/dispatch-yandex`)
      triggerHaptic("success")
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
      const next = new URLSearchParams(searchParams)
      next.delete("yandex")
      setSearchParams(next)
    } catch (err) {
      console.error(err)
      toast.error("Yandex Taxi chaqirishda xatolik yuz berdi")
    } finally {
      setIsDispatchingYandex(false)
    }
  }

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      return apiClient.patch(`/orders/${orderId}/status`, { status })
    },
    onSuccess: () => {
      triggerHaptic("light")
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
    },
  })

  // POS Order submission
  const handlePosOrder = async () => {
    if (posCart.length === 0) return
    try {
      const items = posCart.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        portionCount: 1,
        unitPrice: i.product.price,
      }))

      await apiClient.post("/orders", {
        userId: posSelectedCustomer?.id,
        customerName: posCustomerName,
        customerPhone: posSelectedCustomer?.phone || "+998 00 000 00 00",
        type: "DINE_IN",
        paymentMethod: posPaymentMethod,
        items,
      })

      triggerHaptic("success")
      setPosCart([])
      setPosSelectedCustomer(null)
      setPosCustomerName("Zal Mijoz")
      setCustomerSearchQuery("")
      setPosPaymentMethod("CASH")
      queryClient.invalidateQueries({ queryKey: ["cashierOrders"] })
      queryClient.invalidateQueries({ queryKey: ["cashierProducts"] })
      toast.success("POS Buyurtma muvaffaqiyatli saqlandi!")
    } catch (err: any) {
      console.error(err)
      toast.error("Xatolik yuz berdi: " + (err.response?.data?.message || err.message))
    }
  }

  // Kirim Submission
  const handleKirimSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kirimProductId || kirimQty <= 0) {
      toast.warning("Mahsulot va miqdorni tanlang")
      return
    }

    try {
      setIsSubmittingKirim(true)
      await apiClient.post("/inventory/kirim", {
        productId: kirimProductId,
        quantity: kirimQty,
        supplier: kirimSupplier,
        note: kirimNote,
        createdBy: "Kassir (1-Kassa)",
      })

      triggerHaptic("success")
      refetchProducts()
      toast.success("Kirim muvaffaqiyatli qabul qilindi!")
      setKirimQty(20)
    } catch (err) {
      console.error(err)
      toast.error("Kirimda xatolik yuz berdi")
    } finally {
      setIsSubmittingKirim(false)
    }
  }

  const fixedProducts = products.filter((p) => p.type === "FIXED_COUNT")
  const pendingReviewOrders = orders.filter((o) => o.status === "PAYMENT_REVIEW")
  const posTotal = posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const [ordersSearchQuery, setOrdersSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const ORDERS_PER_PAGE = 24

  const STATUS_PRIORITY: Record<string, number> = {
    PAYMENT_REVIEW: 1, // Chek tekshirish - 1-o'rinda!
    PREPARING: 2,      // Oshxonada tayyorlanmoqda - 2-o'rinda!
    DELIVERING: 3,     // Kuryerda yetkazilmoqda - 3-o'rinda!
    PENDING_PAYMENT: 4,// To'lov kutilmoqda - 4-o'rinda!
    COMPLETED: 5,      // Yakunlangan - 5-o'rinda!
    CANCELLED: 6,      // Bekor qilingan - oxirida!
  }

  // Filtered and priority-sorted orders list
  const filteredOrders = useMemo(() => {
    let list = [...orders]

    // 1. Status or Type filter
    if (orderFilter === "BOT") list = list.filter((o) => o.type !== "DINE_IN")
    else if (orderFilter === "ZAL") list = list.filter((o) => o.type === "DINE_IN")
    else if (orderFilter === "REVIEW") list = list.filter((o) => o.status === "PAYMENT_REVIEW")
    else if (orderFilter === "PREPARING") list = list.filter((o) => o.status === "PREPARING")
    else if (orderFilter === "DELIVERING") list = list.filter((o) => o.status === "DELIVERING")
    else if (orderFilter === "COMPLETED") list = list.filter((o) => o.status === "COMPLETED")

    // 2. Search query filter
    if (ordersSearchQuery.trim()) {
      const q = ordersSearchQuery.toLowerCase().trim()
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.toLowerCase().includes(q) ||
          o.address?.toLowerCase().includes(q)
      )
    }

    // 3. Logical business priority sorting:
    // PAYMENT_REVIEW -> PREPARING -> DELIVERING -> PENDING_PAYMENT -> COMPLETED -> CANCELLED
    return list.sort((a, b) => {
      const prioA = STATUS_PRIORITY[a.status] || 99
      const prioB = STATUS_PRIORITY[b.status] || 99
      if (prioA !== prioB) return prioA - prioB
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [orders, orderFilter, ordersSearchQuery])

  // Pagination calculation for high-performance rendering (60 FPS with 10,000+ orders)
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE)
  }, [filteredOrders, currentPage])

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <Receipt className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Kassir Ishchi Stoli</h2>
            <p className="text-xs text-emerald-200">
              Online buyurtmalar, Zal POS va Kundalik kirim nazorati
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={enableSound}
            title={audioReady ? "Ovoz faol (Test qilish uchun bosing)" : "Ovozni yoqish"}
            className={`px-3 py-2 rounded-2xl border flex items-center gap-1.5 text-xs font-black transition-all ${
              audioReady
                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900"
                : "bg-amber-500 text-white border-amber-400 animate-pulse shadow-md"
            }`}
          >
            {audioReady ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{audioReady ? "Ovoz Faol" : "Ovozni Yoqish"}</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-emerald-950/60 rounded-2xl border border-emerald-700/50">
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "ORDERS"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              Buyurtmalar ({pendingReviewOrders.length > 0 && <span className="text-amber-400 font-black">{pendingReviewOrders.length} ta chek</span>})
            </button>
            <button
              onClick={() => setActiveTab("POS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "POS"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              Zal POS
            </button>
            <button
              onClick={() => setActiveTab("KIRIM")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "KIRIM"
                  ? "bg-white text-emerald-950 shadow-md"
                  : "text-emerald-200 hover:text-white"
              }`}
            >
              Kirim Qabul
            </button>
          </div>
        </div>
      </div>

      {/* AUDIO PERMISSION PROMPT BANNER */}
      {soundBlocked && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-amber-500/20 border border-amber-400">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <VolumeX className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-black text-sm">Ovozli bildirishnomaga ruxsat bering</h4>
              <p className="text-xs text-white/90">
                Yangi buyurtmalar va to'lov cheklari kelganda qo'ng'iroq ovozi yangrashi uchun ruxsat bering.
              </p>
            </div>
          </div>
          <Button
            onClick={enableSound}
            className="bg-white text-amber-950 hover:bg-neutral-100 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md active:scale-95"
          >
            <Volume2 className="h-4 w-4 text-amber-600" />
            <span>Ovozni Yoqish (Test qilish)</span>
          </Button>
        </div>
      )}

      {/* TAB 1: ONLINE ORDERS & DISPATCH */}
      {activeTab === "ORDERS" && (
        <div className="space-y-5">
          {/* Header Controls: Filters + Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0">
              {[
                { id: "ALL", label: "Barchasi", count: orders.length },
                { id: "BOT", label: "📱 Telegram / Onlayn", count: orders.filter((o) => o.type !== "DINE_IN").length },
                { id: "ZAL", label: "🍽️ Zal (Kassa)", count: orders.filter((o) => o.type === "DINE_IN").length },
                { id: "REVIEW", label: "Chek tekshirish", count: pendingReviewOrders.length, alert: true },
                { id: "PREPARING", label: "Oshxonada", count: orders.filter((o) => o.status === "PREPARING").length },
                { id: "DELIVERING", label: "Yetkazilmoqda", count: orders.filter((o) => o.status === "DELIVERING").length },
                { id: "COMPLETED", label: "Yakunlangan", count: orders.filter((o) => o.status === "COMPLETED").length },
              ].map((pill) => {
                const isActive = orderFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setOrderFilter(pill.id)
                      setCurrentPage(1)
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 h-4 ${
                        pill.alert && pill.count > 0 ? "bg-amber-500 text-white" : ""
                      }`}
                    >
                      {pill.count}
                    </Badge>
                  </button>
                )
              })}
            </div>

            {/* Instant Orders Search Bar */}
            <div className="relative w-full md:w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={ordersSearchQuery}
                onChange={(e) => {
                  setOrdersSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Buyurtma #, mijoz, tel..."
                className="w-full pl-9 pr-8 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {ordersSearchQuery && (
                <button
                  onClick={() => {
                    setOrdersSearchQuery("")
                    setCurrentPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-400 space-y-2 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-6">
                <Receipt className="h-12 w-12 mx-auto opacity-30 text-emerald-600" />
                <p className="font-bold text-xs">Ushbu holat bo'yicha buyurtmalar yo'q</p>
              </div>
            ) : (
              paginatedOrders.map((order) => {
                const isPendingReview = order.status === "PAYMENT_REVIEW"

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-3xl bg-white dark:bg-neutral-900 border transition-all flex flex-col justify-between space-y-3 shadow-xs ${
                      isPendingReview
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-amber-500/10"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    {(() => {
                      const isDineIn = order.type === "DINE_IN"
                      const isPickup = order.type === "ONLINE_PICKUP"

                      return (
                        <>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-emerald-600 text-white font-bold text-xs">
                                  #{order.orderNumber}
                                </Badge>
                                {isDineIn ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                                    🍽️ ZAL (KASSA)
                                  </span>
                                ) : isPickup ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 flex items-center gap-1">
                                    🚶 OLIB KETISH
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                                    📱 TELEGRAM YETKAZISH
                                  </span>
                                )}
                                {order.paymentMethod === "BALANCE" && (
                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                      order.isPaidFromBalance
                                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                        : "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700 animate-pulse"
                                    }`}
                                  >
                                    <Wallet className="h-3 w-3" />
                                    {order.isPaidFromBalance ? "BALANSDAN TO'LANGAN" : "BALANS (TASDIQLASH KUTILMOQDA)"}
                                  </span>
                                )}
                                {STATUS_CONFIG[order.status] && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].text} ${STATUS_CONFIG[order.status].border}`}
                                  >
                                    {STATUS_CONFIG[order.status].label}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-400 font-bold">
                                {new Date(order.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                                {isDineIn ? (order.customerName || "Zal mijozi") : order.customerName}
                              </h4>
                              {!isDineIn && order.customerPhone && order.customerPhone !== "+998 00 000 00 00" && (
                                <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {order.customerPhone}
                                </p>
                              )}
                              {!isDineIn && order.address && (
                                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                                  📍 {order.address}
                                </p>
                              )}
                              {order.notes && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-xl border border-amber-200/50">
                                  💬 {order.notes}
                                </p>
                              )}
                            </div>

                            {/* Items with visual Food Images */}
                            <div className="py-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                              {order.items?.map((it, idx) => {
                                const dishImage = getDishImage(it.productId)

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2.5 p-1.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60"
                                  >
                                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                                      <img
                                        src={dishImage}
                                        alt={it.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                                        {it.quantity}x {it.name}
                                      </p>
                                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-black">
                                        {(it.unitPrice * it.quantity).toLocaleString()} so'm
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Container Packaging Breakdown if present */}
                            {!isDineIn && order.containersJson && (() => {
                              try {
                                const containers = typeof order.containersJson === "string"
                                  ? JSON.parse(order.containersJson)
                                  : order.containersJson

                                if (Array.isArray(containers) && containers.length > 0) {
                                  return (
                                    <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                          👥 Kishilar bo'yicha taqsimot ({containers.length} to'plam)
                                        </span>
                                        <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                          Alohida paketlash
                                        </Badge>
                                      </div>

                                      <div className="space-y-2 divide-y divide-emerald-200/50 dark:divide-emerald-900/50">
                                        {containers.map((c: any, cIdx: number) => (
                                          <div key={cIdx} className="pt-1.5 first:pt-0 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-100">
                                                👤 {c.name || `${cIdx + 1}-Kishi to'plami`}
                                              </span>
                                              {c.label && (
                                                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800">
                                                  {c.label}
                                                </span>
                                              )}
                                            </div>

                                            <div className="pl-2 space-y-0.5">
                                              {c.items && c.items.length > 0 ? (
                                                c.items.map((cItem: any, iIdx: number) => (
                                                  <div
                                                    key={iIdx}
                                                    className="flex items-center justify-between text-[11px] text-neutral-700 dark:text-neutral-300 font-medium"
                                                  >
                                                    <span>▫️ {cItem.name}</span>
                                                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                                      {cItem.quantity} {cItem.unitName || "pors"}
                                                    </span>
                                                  </div>
                                                ))
                                              ) : (
                                                <span className="text-[10px] text-neutral-400 italic">
                                                  Bo'sh to'plam
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                }
                              } catch (e) {
                                return null
                              }
                              return null
                            })()}
                          </div>

                          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-neutral-500 font-bold">Jami summa:</span>
                              <strong className="text-sm font-black text-neutral-900 dark:text-white">
                                {Number(order.totalAmount || 0).toLocaleString()} so'm
                              </strong>
                            </div>

                            {/* Underlined Receipt Link (Visible in all statuses if receipt was uploaded) */}
                            {order.receiptImageUrl && (
                              <div className="flex items-center justify-between py-1 px-0.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-xl px-2">
                                <span className="text-[11px] text-neutral-400 font-medium">To'lov hujjati:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = new URLSearchParams(searchParams)
                                    next.set("receipt", order.id)
                                    setSearchParams(next)
                                  }}
                                  className="inline-flex items-center gap-1 font-bold text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 underline underline-offset-4 decoration-emerald-500/70 hover:decoration-emerald-700 transition-all cursor-pointer"
                                >
                                  <Receipt className="h-3.5 w-3.5" />
                                  <span>To'lov chekini ko'rish</span>
                                </button>
                              </div>
                            )}

                            {/* Action buttons */}
                            {isDineIn ? (
                              order.status === "PREPARING" ? (
                                <Button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "COMPLETED",
                                    })
                                  }
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Mijozga berildi (Yakunlash)</span>
                                </Button>
                              ) : order.status === "COMPLETED" ? (
                                <div className="w-full text-center py-2 px-3 rounded-2xl border text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                  ✅ Yakunlangan (Zalda iste'mol)
                                </div>
                              ) : (
                                renderStatusBadge(order.status)
                              )
                            ) : order.paymentMethod === "BALANCE" && !order.isPaidFromBalance && (order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_REVIEW") ? (
                              <div className="space-y-2 p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                                    <Wallet className="h-4 w-4 text-emerald-600" />
                                    <span>Mijoz Balansidan To'lov</span>
                                  </div>
                                  <span className="text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold px-2 py-0.5 rounded-full">
                                    Yetarli
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                  Tasdiqlansa, mijoz hisobidan <b>{Number(order.totalAmount || 0).toLocaleString()} so'm</b> avtomatik yechiladi.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                  <Button
                                    disabled={confirmBalancePaymentMutation.isPending}
                                    onClick={() => confirmBalancePaymentMutation.mutate(order.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black py-2 shadow-sm flex items-center justify-center gap-1"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Balansdan yechish</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    disabled={updateStatusMutation.isPending}
                                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "PREPARING" })}
                                    className="w-full rounded-xl text-xs font-bold py-2 border-neutral-300 dark:border-neutral-700"
                                  >
                                    <span>Tashqarida to'landi</span>
                                  </Button>
                                </div>
                              </div>
                            ) : isPendingReview ? (
                              <Button
                                onClick={() => {
                                  const next = new URLSearchParams(searchParams)
                                  next.set("receipt", order.id)
                                  setSearchParams(next)
                                }}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-98"
                              >
                                <Eye className="h-4 w-4" /> Chekni Tekshirish
                              </Button>
                            ) : order.status === "PREPARING" ? (
                              isPickup ? (
                                <Button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "COMPLETED",
                                    })
                                  }
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Mijoz olib ketdi (Yakunlash)</span>
                                </Button>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      const next = new URLSearchParams(searchParams)
                                      next.set("yandex", order.id)
                                      setSearchParams(next)
                                    }}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold py-2.5 flex items-center justify-center gap-1 shadow-sm"
                                  >
                                    <Car className="h-3.5 w-3.5" /> Yandex Chaqirish
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        orderId: order.id,
                                        status: "COMPLETED",
                                      })
                                    }
                                    className="rounded-2xl text-xs font-bold"
                                  >
                                    Yakunlash
                                  </Button>
                                </div>
                              )
                            ) : order.status === "DELIVERING" ? (
                              <Button
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: "COMPLETED",
                                  })
                                }
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold py-2.5 shadow-md"
                              >
                                Yetkazildi deb belgilash
                              </Button>
                            ) : (
                              renderStatusBadge(order.status)
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <div className="text-xs text-neutral-500 font-medium">
                Jami <b className="text-neutral-900 dark:text-white font-bold">{filteredOrders.length}</b> ta buyurtma • Sahifa {currentPage} / {totalPages}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs font-bold h-8"
                >
                  Oldingi
                </Button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i)
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 p-0 rounded-xl text-xs font-black ${
                        currentPage === pageNum ? "bg-emerald-600 text-white shadow-sm" : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )
                })}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl text-xs font-bold h-8"
                >
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IN-STORE POS CASHIER WITH VISUAL FOOD CARDS & CATEGORY FILTERS */}
      {activeTab === "POS" && (
        <div className="flex flex-col lg:flex-row items-start gap-4 xl:gap-5 relative">
          {/* Main Products Grid Column */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            {/* Header + Quick Search & Grid Column Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
                  Taomlar Menusi (Tezkor POS)
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {filteredPosProducts.length} ta taom ko'rsatilmoqda
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Grid Column Switcher (3, 4, 5 qator) */}
                <div className="flex items-center bg-white dark:bg-neutral-900 p-1 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
                  <div className="flex items-center gap-1 pl-2 pr-1.5 text-neutral-400">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline-block">
                      {t.posColsWord || "Qator"}:
                    </span>
                  </div>
                  {([3, 4, 5] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => handleSetPosGridCols(cols)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                        posGridCols === cols
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                      title={`${cols} qator qilib ko'rsatish`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>

                {/* Quick Search Input */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder={t.posSearchDish || "Taom nomini qidirish..."}
                    className="w-full pl-9 pr-8 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                  {posSearchQuery && (
                    <button
                      onClick={() => setPosSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category Filter Square Cards with Photos (Mobile-Friendly & Touch-Optimized for POS) */}
            {isCategoriesLoading ? (
              <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="w-[78px] h-[78px] sm:w-24 sm:h-24 md:w-26 md:h-26 shrink-0 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto py-2.5 px-2 scrollbar-none snap-x">
                {orderedCategories.map((c, index) => {
                  const count = products.filter((p) => p.categoryId === c.id).length
                  const isSelected = posSelectedCategory === c.id
                  const isDragging = draggedCatIndex === index
                  const showLeftIndicator =
                    dropInsertPosition?.index === index &&
                    dropInsertPosition.side === "left" &&
                    draggedCatIndex !== null &&
                    draggedCatIndex !== index &&
                    draggedCatIndex !== index - 1
                  const showRightIndicator =
                    dropInsertPosition?.index === index &&
                    dropInsertPosition.side === "right" &&
                    draggedCatIndex !== null &&
                    draggedCatIndex !== index &&
                    draggedCatIndex !== index + 1

                  return (
                    <div key={c.id} className="relative shrink-0 flex items-center">
                      {/* Insertion Line Before (Left) */}
                      {showLeftIndicator && (
                        <div className="absolute -left-2 top-0 bottom-0 z-30 flex items-center justify-center pointer-events-none">
                          <div className="w-1.5 h-full rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/80 animate-pulse flex flex-col justify-between items-center py-0.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 -mt-1 shadow-sm ring-2 ring-white dark:ring-neutral-900" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 -mb-1 shadow-sm ring-2 ring-white dark:ring-neutral-900" />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => handleCategoryDragStart(e, index)}
                        onDragOver={(e) => handleCategoryDragOver(e, index)}
                        onDragEnd={handleCategoryDragEnd}
                        onDrop={(e) => handleCategoryDrop(e, index)}
                        onClick={() => setPosSelectedCategory(c.id)}
                        className={`w-[78px] h-[78px] sm:w-24 sm:h-24 md:w-26 md:h-26 shrink-0 rounded-2xl relative overflow-hidden flex flex-col justify-between p-2 sm:p-2.5 text-left transition-all active:scale-95 select-none cursor-grab active:cursor-grabbing snap-start group my-1 ${
                          isDragging ? "opacity-25 scale-95 border-2 border-dashed border-emerald-400" : ""
                        } ${
                          isSelected
                            ? "ring-3 ring-emerald-500 ring-offset-2 dark:ring-offset-neutral-950 shadow-lg shadow-emerald-600/30 scale-[1.02]"
                            : "border border-neutral-200/80 dark:border-neutral-800 hover:border-emerald-500 opacity-95 hover:opacity-100"
                        }`}
                      >
                        {/* Background Image - pointer-events-none & draggable={false} ensure full card is draggable */}
                        <img
                          src={getImageUrl(c.imageUrl)}
                          alt=""
                          draggable={false}
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                          }}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                        />

                        {/* Gradient Overlay for Text Contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20 pointer-events-none select-none" />

                        {/* Top Row: Drag Handle & Count Badge */}
                        <div className="relative z-10 flex items-center justify-between w-full pointer-events-none select-none">
                          <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white font-black">
                            {count} ta
                          </span>
                        </div>

                        {/* Bottom Label: Category Name */}
                        <div className="relative z-10 pointer-events-none select-none">
                          <span className="text-xs sm:text-sm font-black text-white block leading-tight drop-shadow-md truncate">
                            {c.name}
                          </span>
                        </div>
                      </button>

                      {/* Insertion Line After (Right) */}
                      {showRightIndicator && (
                        <div className="absolute -right-2 top-0 bottom-0 z-30 flex items-center justify-center pointer-events-none">
                          <div className="w-1.5 h-full rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/80 animate-pulse flex flex-col justify-between items-center py-0.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 -mt-1 shadow-sm ring-2 ring-white dark:ring-neutral-900" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 -mb-1 shadow-sm ring-2 ring-white dark:ring-neutral-900" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Products Grid */}
            {isProductsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="rounded-3xl border border-neutral-100 dark:border-neutral-800 p-2.5 space-y-2 bg-white dark:bg-neutral-900">
                    <Skeleton className="h-32 sm:h-36 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-4 w-1/3 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-10 text-center space-y-2 bg-white dark:bg-neutral-900">
                <Package className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  {t.noDishesFound || "Ushbu kategoriya yoki qidiruv bo'yicha taom topilmadi"}
                </p>
                <button
                  onClick={() => {
                    setPosSelectedCategory(orderedCategories[0]?.id || "")
                    setPosSearchQuery("")
                  }}
                  className="text-xs text-emerald-600 font-bold underline"
                >
                  {t.clearFilter || "Filterni tozalash"}
                </button>
              </div>
            ) : (
              <div
                className={
                  posGridCols === 5
                    ? "grid gap-2 sm:gap-2.5"
                    : posGridCols === 4
                    ? "grid gap-2.5 sm:gap-3"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5"
                }
                style={
                  posGridCols === 5
                    ? { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }
                    : posGridCols === 4
                    ? { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }
                    : undefined
                }
              >
                {filteredPosProducts.map((p) => {
                  const inCartItem = posCart.find((i) => i.product.id === p.id)
                  const qty = inCartItem?.quantity || 0

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        triggerHaptic("light")
                        setPosCart((prev) => {
                          const ex = prev.find((i) => i.product.id === p.id)
                          if (ex) {
                            return prev.map((i) =>
                              i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i
                            )
                          }
                          return [...prev, { product: p, quantity: 1 }]
                        })
                      }}
                      className={`${
                        posGridCols === 5 ? "rounded-2xl" : "rounded-3xl"
                      } bg-white dark:bg-neutral-900 border overflow-hidden cursor-pointer transition-all shadow-xs flex flex-col justify-between group active:scale-98 ${
                        qty > 0
                          ? "border-emerald-600 ring-2 ring-emerald-500/30 shadow-md"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-emerald-500"
                      }`}
                    >
                      {/* Visual Dish Image Header: Large, prominent, clear */}
                      <div
                        className={`relative w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden ${
                          posGridCols === 5
                            ? "h-24 sm:h-28"
                            : posGridCols === 4
                            ? "h-28 sm:h-32"
                            : "h-36 sm:h-40"
                        }`}
                      >
                        <img
                          src={getImageUrl(p.imageUrl)}
                          alt={p.name}
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 pointer-events-none">
                          <span
                            className={`${
                              posGridCols === 5 ? "text-[9px] px-1 py-0.2" : "text-[10px] px-2 py-0.5"
                            } font-black rounded-lg bg-black/60 text-white backdrop-blur-md`}
                          >
                            {p.calories} kkal
                          </span>
                          {p.isPopular && (
                            <span
                              className={`${
                                posGridCols === 5 ? "text-[9px] px-1 py-0.2" : "text-[10px] px-2 py-0.5"
                              } font-black rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md flex items-center gap-0.5`}
                            >
                              <Flame className="h-3 w-3 fill-white" />
                              Top 10
                            </span>
                          )}
                        </div>

                        {qty > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20 flex items-center bg-emerald-600 text-white rounded-full shadow-lg ring-2 ring-white dark:ring-neutral-900 p-0.5 animate-in zoom-in-50"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                triggerHaptic("light")
                                setPosCart((prev) => {
                                  const existing = prev.find((i) => i.product.id === p.id)
                                  if (!existing) return prev
                                  if (existing.quantity <= 1) {
                                    return prev.filter((i) => i.product.id !== p.id)
                                  }
                                  return prev.map((i) =>
                                    i.product.id === p.id ? { ...i, quantity: i.quantity - 1 } : i
                                  )
                                })
                              }}
                              className="h-6 w-6 rounded-full hover:bg-emerald-700 active:scale-90 flex items-center justify-center text-white transition-all"
                              title="Kamaytirish (-)"
                            >
                              <Minus className="h-3 w-3 stroke-[3]" />
                            </button>

                            <span className="px-1 text-xs font-black min-w-[16px] text-center select-none">
                              {qty}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                triggerHaptic("light")
                                setPosCart((prev) => {
                                  return prev.map((i) =>
                                    i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i
                                  )
                                })
                              }}
                              className="h-6 w-6 rounded-full hover:bg-emerald-700 active:scale-90 flex items-center justify-center text-white transition-all"
                              title="Ko'paytirish (+)"
                            >
                              <Plus className="h-3 w-3 stroke-[3]" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dish Info: Large BOLD name and Price */}
                      <div className={`${posGridCols === 5 ? "p-2 space-y-0.5" : "p-3 space-y-1"}`}>
                        <h4
                          className={`font-black ${
                            posGridCols === 5
                              ? "text-xs leading-snug"
                              : posGridCols === 4
                              ? "text-xs sm:text-sm leading-tight"
                              : "text-sm sm:text-base leading-tight"
                          } text-neutral-900 dark:text-white line-clamp-1`}
                          title={p.name}
                        >
                          {p.name}
                        </h4>
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <span className="font-black text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400">
                            {p.price.toLocaleString()} so'm
                          </span>
                          {p.unit?.name && (
                            <span className="text-[10px] text-neutral-400 font-semibold truncate">
                              {p.unit.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* POS Cart Sidebar: Sticky on Desktop/Tablet right next to the menu! */}
          <div className="w-full lg:w-[350px] xl:w-[390px] 2xl:w-[420px] lg:sticky lg:top-3 z-20 flex-shrink-0 space-y-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-3.5 shadow-sm">
              {/* Header with Dish Counter & Clear Cart */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">
                      {t.posCartTitle || "Zal Savatchasi"}
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      {posCart.reduce((s, i) => s + i.quantity, 0)} {t.dishesCountShort || "ta taom"}
                    </span>
                  </div>
                </div>

                {posCart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium")
                      setPosCart([])
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Tozalash</span>
                  </button>
                )}
              </div>

              {/* Customer Selection & Table Info */}
              <div className="space-y-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Mijoz / Stol (ixtiyoriy)
                  </span>
                  {posSelectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setPosSelectedCustomer(null)
                        setPosCustomerName("Zal Mijoz")
                        if (posPaymentMethod === "BALANCE") setPosPaymentMethod("CASH")
                      }}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      Tozalash
                    </button>
                  )}
                </div>

                {posSelectedCustomer ? (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-500/40 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-neutral-900 dark:text-white truncate">
                        👤 {posSelectedCustomer.fullName || posSelectedCustomer.username}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {posSelectedCustomer.phone || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-400">Shaxsiy balans:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                        {Number(posSelectedCustomer.balance || 0).toLocaleString()} so'm
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Live search for registered customer */}
                    <div className="relative">
                      {isSearchingCustomer ? (
                        <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      )}
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value)
                          handleSearchCustomers(e.target.value)
                        }}
                        placeholder="Mijozni qidirish (ism yoki tel)..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      {/* Dropdown search results */}
                      {customerSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1 space-y-1">
                          {customerSearchResults.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => {
                                setPosSelectedCustomer(cust)
                                setPosCustomerName(cust.fullName || cust.username || "Mijoz")
                                setCustomerSearchQuery("")
                                setCustomerSearchResults([])
                                if (Number(cust.balance || 0) >= posTotal) {
                                  setPosPaymentMethod("BALANCE")
                                }
                                triggerHaptic("light")
                              }}
                              className="w-full p-2 text-left rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between text-xs transition-colors"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-bold text-neutral-900 dark:text-white truncate">
                                  {cust.fullName || cust.username}
                                </p>
                                <span className="text-[10px] text-neutral-400">
                                  {cust.phone || (cust.telegramId ? `ID: ${cust.telegramId}` : "")}
                                </span>
                              </div>
                              <span className="font-black text-[11px] text-emerald-600 flex-shrink-0">
                                {Number(cust.balance || 0).toLocaleString()} so'm
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Walk-in Note (e.g. 1-Stol / Zal Mijoz) */}
                    <input
                      type="text"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      placeholder="Stol yoki mijoz nomi (masalan: 1-Stol)"
                      className="w-full text-xs font-semibold px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Cart items list */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="text-center py-8 space-y-2 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Package className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-700" />
                    <p className="text-xs text-neutral-400 font-medium">
                      {t.posNoDishSelected || "Taom tanlanmagan"}
                    </p>
                    <span className="text-[10px] text-neutral-400 block">Menyudan taom ustiga bosing</span>
                  </div>
                ) : (
                  posCart.map((item) => {
                    const dishImage = getDishImage(item.product.id)

                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 transition-all shadow-2xs"
                      >
                        <div className="h-11 w-11 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                          <img
                            src={dishImage}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {item.product.name}
                          </p>
                          <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                            {(item.product.price * item.quantity).toLocaleString()} so'm
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPosCart((prev) =>
                                prev
                                  .map((i) =>
                                    i.product.id === item.product.id
                                      ? { ...i, quantity: i.quantity - 1 }
                                      : i
                                  )
                                  .filter((i) => i.quantity > 0)
                              )
                            }
                            className="h-7 w-7 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center font-bold text-xs active:scale-95 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPosCart((prev) =>
                                prev.map((i) =>
                                  i.product.id === item.product.id
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                                )
                              )
                            }
                            className="h-7 w-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs active:scale-95 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Checkout & Payment Area */}
              <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{t.totalPayment || "Jami to'lov"}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{posTotal.toLocaleString()} so'm</span>
                </div>

                {/* Payment Method selection */}
                <div className={`grid gap-2 ${posSelectedCustomer ? "grid-cols-3" : "grid-cols-2"}`}>
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod("CASH")}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all ${
                      posPaymentMethod === "CASH"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {t.cashPayment || "Naqd pul"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod("TERMINAL")}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all ${
                      posPaymentMethod === "TERMINAL"
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {t.terminalPayment || "Terminal"}
                  </button>
                  {posSelectedCustomer && (
                    <button
                      type="button"
                      disabled={Number(posSelectedCustomer.balance || 0) < posTotal}
                      onClick={() => setPosPaymentMethod("BALANCE")}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                        posPaymentMethod === "BALANCE"
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                          : Number(posSelectedCustomer.balance || 0) >= posTotal
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-neutral-200 text-neutral-300 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-1 font-black">
                        <Wallet className="h-3 w-3" /> Balans
                      </span>
                    </button>
                  )}
                </div>

                <Button
                  onClick={handlePosOrder}
                  disabled={posCart.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black py-3.5 shadow-lg shadow-emerald-600/20 active:scale-98"
                >
                  {t.posSaveOrder || "Buyurtmani Saqlash"} ({posTotal.toLocaleString()} so'm)
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Checkout Bar for Mobile/Tablet positioned safely above the bottom nav */}
          {posCart.length > 0 && (
            <div className="fixed bottom-[72px] sm:bottom-[76px] left-3 right-3 sm:left-6 sm:right-6 max-w-xl sm:mx-auto lg:hidden z-30 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white p-3 rounded-2xl shadow-xl shadow-emerald-950/25 border border-emerald-500/40 backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-black text-xs shadow-xs backdrop-blur-xs border border-white/25">
                  {posCart.reduce((s, i) => s + i.quantity, 0)}
                </div>
                <div>
                  <p className="text-xs text-emerald-100 font-bold leading-tight">
                    {posCart.length} {t.dishesCountShort || "ta taom"}
                  </p>
                  <strong className="text-sm font-black text-white tracking-tight">
                    {posTotal.toLocaleString()} so'm
                  </strong>
                </div>
              </div>

              <Button
                onClick={handlePosOrder}
                className="bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-all border-none"
              >
                {t.posSaveOrder || "Buyurtmani Saqlash"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KIRIM INVENTORY */}
      {activeTab === "KIRIM" && (
        <div className="max-w-xl mx-auto p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
          <h3 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Kundalik Sanoqli Taomlar Kirimi
          </h3>

          <form onSubmit={handleKirimSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Taomni tanlang:
              </label>
              <ProductSearchSelect
                products={fixedProducts.length > 0 ? fixedProducts : products}
                value={kirimProductId}
                onChange={setKirimProductId}
                placeholder="-- Taomni tanlang yoki qidiring --"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Kirim miqdori (dona):
              </label>
              <input
                type="number"
                value={kirimQty}
                onChange={(e) => setKirimQty(Number(e.target.value))}
                min={1}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 mt-1 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Yetkazib beruvchi / Seh:
              </label>
              <input
                type="text"
                value={kirimSupplier}
                onChange={(e) => setKirimSupplier(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 mt-1 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Izoh:
              </label>
              <input
                type="text"
                value={kirimNote}
                onChange={(e) => setKirimNote(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 mt-1 outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmittingKirim}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs py-3 mt-2 shadow-md"
            >
              {isSubmittingKirim ? "Qabul qilinmoqda..." : "Kirimni Qabul Qilish"}
            </Button>
          </form>
        </div>
      )}

      {/* RECEIPT REVIEW MODAL */}
      {selectedReceiptOrder && (() => {
        const rawUrl = selectedReceiptOrder.receiptImageUrl || ""
        const receiptFullUrl = rawUrl ? getImageUrl(rawUrl) : ""
        const isPdf = rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.toLowerCase().includes(".pdf")

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-neutral-900 dark:text-white">
                      To'lov Cheki #{selectedReceiptOrder.orderNumber}
                    </h3>
                    <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                      Kutmoqda
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {selectedReceiptOrder.customerName} • {selectedReceiptOrder.customerPhone} •{" "}
                    <b className="text-emerald-600 dark:text-emerald-400">
                      {(selectedReceiptOrder.totalAmount || 0).toLocaleString()} so'm
                    </b>
                  </p>
                </div>

                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams)
                    next.delete("receipt")
                    setSearchParams(next)
                  }}
                  className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Receipt Content Box */}
              <div className="space-y-2">
                {!receiptFullUrl ? (
                  <div className="h-56 w-full bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 text-xs">
                    Chek fayli topilmadi
                  </div>
                ) : isPdf ? (
                  /* PDF File View */
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 text-center space-y-3">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shadow-inner">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">
                        PDF Formatidagi Chek
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Mijoz to'lov chekini PDF hujjat shaklida yuklagan
                      </p>
                    </div>
                    <a
                      href={receiptFullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-98"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>PDF Chekni Yangi Oynada Ochish</span>
                    </a>
                  </div>
                ) : (
                  /* Image View */
                  <div className="space-y-2">
                    <div className="relative max-h-80 min-h-56 w-full bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-700 group">
                      <img
                        src={receiptFullUrl}
                        alt={`Chek #${selectedReceiptOrder.orderNumber}`}
                        className="max-h-80 w-full object-contain cursor-pointer hover:scale-[1.01] transition-transform"
                        onClick={() => window.open(receiptFullUrl, "_blank", "noopener,noreferrer")}
                        onError={(e) => {
                          console.error("Failed to load image from:", receiptFullUrl, e)
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                      <span>Kattalashtirish uchun rasm ustiga bosing</span>
                      <a
                        href={receiptFullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Alohida oynada ochish</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  variant="outline"
                  onClick={() =>
                    reviewReceiptMutation.mutate({
                      orderId: selectedReceiptOrder.id,
                      approved: false,
                    })
                  }
                  className="w-1/2 rounded-2xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 h-10"
                >
                  Rad etish
                </Button>
                <Button
                  onClick={() =>
                    reviewReceiptMutation.mutate({
                      orderId: selectedReceiptOrder.id,
                      approved: true,
                    })
                  }
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md h-10"
                >
                  Tasdiqlash
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* YANDEX CONFIRM MODAL */}
      {yandexConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2 text-purple-600">
                <Car className="h-5 w-5" /> Yandex Taxi Chaqirish
              </h3>
              <button
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete("yandex")
                  setSearchParams(next)
                }}
                className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 space-y-1.5 text-xs">
              <p className="font-bold">Mijoz: {yandexConfirmOrder.customerName}</p>
              <p className="font-mono font-bold text-emerald-600">
                {yandexConfirmOrder.customerPhone}
              </p>
              <p className="text-neutral-500">Manzil: {yandexConfirmOrder.address}</p>
              <p className="text-purple-600 font-black">
                Taxminiy taksi haqi: ~{yandexConfirmOrder.deliveryFee?.toLocaleString()} so'm (Mijoz to'laydi)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete("yandex")
                  setSearchParams(next)
                }}
                className="w-1/3 rounded-2xl text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleConfirmYandexDispatch}
                disabled={isDispatchingYandex}
                className="w-2/3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md"
              >
                {isDispatchingYandex ? "Chaqirilmoqda..." : "Tasdiqlash & Chaqirish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
