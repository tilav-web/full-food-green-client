import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/api/axios"
import { socket } from "@/api/socket"
import {
  ShieldCheck,
  Plus,
  Utensils,
  Search,
  Check,
  Trash2,
  Package,
  Layers,
  Scale,
  X,
  BarChart3,
  Users,
  UtensilsCrossed,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Loader2,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Calendar,
  TrendingUp,
  Banknote,
  Truck,
  ShoppingBag,
  Store,
  Clock,
  Award,
  ArrowUp,
  ArrowDown,
  Pencil,
  ExternalLink,
  Eye,
  EyeOff,
  Percent,
  Tag,
  KeyRound,
  UserPlus,
  GripVertical,
  Megaphone,
  CheckSquare,
  Square,
  Send,
  Wallet,
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ImageUploadField } from "@/components/common/ImageUploadField"
import { BroadcastModal } from "./BroadcastModal"
import { BalanceModal } from "./BalanceModal"
import { useTelegram } from "@/hooks/useTelegram"
import { useTranslation } from "@/i18n/useTranslation"
import { generateSlug } from "@/utils/slugify"
import { getImageUrl } from "@/lib/utils"
import type { Product, Category, Unit, Banner, BannerItem, Combo, User } from "@/types"

export type AdminPage =
  | "PRODUCTS"
  | "CATALOG"
  | "STATS"
  | "STAFF"
  | "USERS"

export const AdminView: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentPage = ((searchParams.get("tab") as AdminPage) || "STATS")
  const catalogSubTab = ((searchParams.get("sub") as "CATEGORIES" | "UNITS" | "BANNERS" | "SETTINGS") || "CATEGORIES")

  // Statistics Period & Date Filter State
  const [statsPeriod, setStatsPeriod] = useState<"today" | "yesterday" | "week" | "month" | "all" | "custom">("today")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  const setCurrentPage = (tab: AdminPage) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("tab", tab)
    setSearchParams(nextParams)
  }

  const setCatalogSubTab = (sub: "CATEGORIES" | "UNITS" | "BANNERS" | "SETTINGS") => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("sub", sub)
    setSearchParams(nextParams)
  }

  // Real-Time WebSocket Connection for Admin Dashboard
  useEffect(() => {
    socket.emit("join_admin")

    const handleRealtimeUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] })
      queryClient.invalidateQueries({ queryKey: ["portionSummary"] })
    }

    socket.on("new_order", handleRealtimeUpdate)
    socket.on("order_updated", handleRealtimeUpdate)

    return () => {
      socket.off("new_order", handleRealtimeUpdate)
      socket.off("order_updated", handleRealtimeUpdate)
    }
  }, [queryClient])

  const { triggerHaptic } = useTelegram()
  const { t } = useTranslation()

  // Data fetching
  const { data: dashboard } = useQuery({
    queryKey: ["adminDashboard", statsPeriod, customStartDate, customEndDate],
    queryFn: async () => {
      const params: Record<string, string> = { period: statsPeriod }
      if (statsPeriod === "custom" && customStartDate) {
        params.startDate = customStartDate
        if (customEndDate) params.endDate = customEndDate
      }
      return (await apiClient.get("/reports/dashboard", { params })).data
    },
  })

  const { data: portionSummary = [] } = useQuery({
    queryKey: ["portionSummary"],
    queryFn: async () => (await apiClient.get("/inventory/portion-summary")).data,
  })

  const { data: products = [], refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["adminProducts"],
    queryFn: async () => (await apiClient.get("/products")).data,
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["adminCategories"],
    queryFn: async () => (await apiClient.get("/products/categories")).data,
  })

  const { data: units = [], refetch: refetchUnits } = useQuery<Unit[]>({
    queryKey: ["adminUnits"],
    queryFn: async () => (await apiClient.get("/units")).data,
  })

  const { data: staff = [], refetch: refetchStaff } = useQuery({
    queryKey: ["adminStaff"],
    queryFn: async () => (await apiClient.get("/users/staff")).data,
  })

  // App Settings (Container Price, etc.)
  const { data: appSettings = {}, refetch: refetchAppSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => (await apiClient.get("/settings")).data,
  })

  const [containerPriceInput, setContainerPriceInput] = useState("2000")
  const [isSavingContainerPrice, setIsSavingContainerPrice] = useState(false)

  useEffect(() => {
    if (appSettings) {
      const p = Array.isArray(appSettings)
        ? appSettings.find((s: any) => s.key === "container_price")?.value
        : (appSettings as Record<string, string>)["container_price"]
      if (p) setContainerPriceInput(p)
      else setContainerPriceInput("2000")
    }
  }, [appSettings])

  const handleSaveContainerPrice = async () => {
    if (!containerPriceInput.trim()) return
    try {
      setIsSavingContainerPrice(true)
      await apiClient.post("/settings", {
        container_price: containerPriceInput.trim(),
      })
      await refetchAppSettings()
      triggerHaptic("success")
      toast.success((t as any).priceSavedSuccess || "Qadoqlash (idish) narxi muvaffaqiyatli saqlandi!")
    } catch (err) {
      console.error(err)
      triggerHaptic("error")
      toast.error("Sozlamalarni saqlashda xatolik yuz berdi")
    } finally {
      setIsSavingContainerPrice(false)
    }
  }

  // Staff & Admin Credentials Management State
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffFullName, setStaffFullName] = useState("")
  const [staffUsername, setStaffUsername] = useState("")
  const [staffPhone, setStaffPhone] = useState("")
  const [staffPassword, setStaffPassword] = useState("")

  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [editStaffFullName, setEditStaffFullName] = useState("")
  const [editStaffUsername, setEditStaffUsername] = useState("")
  const [editStaffPhone, setEditStaffPhone] = useState("")
  const [editStaffPassword, setEditStaffPassword] = useState("")
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false)

  // Users Page Pagination, Search, Role & Bot Filter State
  const [userPage, setUserPage] = useState(1)
  const [userLimit, setUserLimit] = useState(20)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState<"ALL" | "USER" | "CASHIER" | "ADMIN">("ALL")
  const [userBotFilter, setUserBotFilter] = useState<"ALL" | "ACTIVE" | "BLOCKED">("ALL")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [selectedBalanceUser, setSelectedBalanceUser] = useState<User | null>(null)

  const { data: usersResponse, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["adminUsersPaginated", userPage, userLimit, userSearchQuery, userRoleFilter, userBotFilter],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: userPage,
        limit: userLimit,
      }
      if (userRoleFilter !== "ALL") params.role = userRoleFilter
      if (userBotFilter !== "ALL") params.botStatus = userBotFilter
      if (userSearchQuery.trim()) params.search = userSearchQuery.trim()
      return (await apiClient.get("/users", { params })).data
    },
  })

  const { refetch: refetchBotStats } = useQuery({
    queryKey: ["adminBotStats"],
    queryFn: async () => (await apiClient.get("/bot/stats")).data,
    enabled: currentPage === "USERS",
  })



  const { data: banners = [], refetch: refetchBanners } = useQuery<Banner[]>({
    queryKey: ["adminBanners"],
    queryFn: async () => (await apiClient.get("/banners")).data,
  })

  const { data: combos = [] } = useQuery<Combo[]>({
    queryKey: ["adminCombos"],
    queryFn: async () => (await apiClient.get("/products/combos")).data,
  })

  // Banner Modal State
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [bannerBadge, setBannerBadge] = useState("Aksiya -15%")
  const [bannerTitle, setBannerTitle] = useState("")
  const [bannerDescription, setBannerDescription] = useState("")
  const [bannerGradient, setBannerGradient] = useState("from-emerald-700 via-teal-800 to-emerald-950")
  const [bannerImageUrl, setBannerImageUrl] = useState("")
  const [bannerActionType, setBannerActionType] = useState<"PROMO_PAGE" | "LINK" | "CONSTRUCTOR" | "CATEGORY" | "DISH" | "MENU">("PROMO_PAGE")
  const [bannerActionTarget, setBannerActionTarget] = useState("")
  const [bannerActionText, setBannerActionText] = useState("Aksiyani ko'rish")
  const [bannerIsActive, setBannerIsActive] = useState(true)

  // Banner Promo Items Management State
  const [selectedBannerForItems, setSelectedBannerForItems] = useState<Banner | null>(null)
  const [showPromoItemsManager, setShowPromoItemsManager] = useState(false)
  const [bannerPromoItemsDraft, setBannerPromoItemsDraft] = useState<BannerItem[]>([])

  // Add/Edit Promo Item Sub-Modal State
  const [showAddPromoItemModal, setShowAddPromoItemModal] = useState(false)
  const [promoItemSource, setPromoItemSource] = useState<"EXISTING" | "CUSTOM">("EXISTING")
  const [selectedExistingId, setSelectedExistingId] = useState("")
  const [promoItemName, setPromoItemName] = useState("")
  const [promoItemDescription, setPromoItemDescription] = useState("")
  const [promoItemPrice, setPromoItemPrice] = useState<number | string>(25000)
  const [promoItemOldPrice, setPromoItemOldPrice] = useState<number | string>(30000)
  const [promoItemBadge, setPromoItemBadge] = useState("-20%")
  const [promoItemDiscountPct, setPromoItemDiscountPct] = useState<number | string>(20)
  const [promoItemImageUrl, setPromoItemImageUrl] = useState("")
  const [promoItemCalories, setPromoItemCalories] = useState<number | string>("")
  const [promoItemProtein, setPromoItemProtein] = useState<number | string>("")
  const [promoItemFat, setPromoItemFat] = useState<number | string>("")
  const [promoItemCarbs, setPromoItemCarbs] = useState<number | string>("")
  const [promoItemType, setPromoItemType] = useState<"PRODUCT" | "COMBO">("PRODUCT")
  const [promoItemUnitName, setPromoItemUnitName] = useState("pors")
  const [promoItemIsActive, setPromoItemIsActive] = useState(true)
  const [editingPromoItemId, setEditingPromoItemId] = useState<string | null>(null)

  // Product Modal State
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [newProductName, setNewProductName] = useState("")
  const [newProductCategory, setNewProductCategory] = useState("")
  const [newProductUnit, setNewProductUnit] = useState("")
  const [newProductPrice, setNewProductPrice] = useState<number | string>(15000)
  const [newProductCostPrice, setNewProductCostPrice] = useState<number | string>("")
  const [newProductPackagingLevel, setNewProductPackagingLevel] = useState<number>(2)
  const [newProductOldPrice, setNewProductOldPrice] = useState<number | string>("")
  const [newProductCalories, setNewProductCalories] = useState<number | string>("")
  const [newProductProtein, setNewProductProtein] = useState<number | string>("")
  const [newProductFat, setNewProductFat] = useState<number | string>("")
  const [newProductCarbs, setNewProductCarbs] = useState<number | string>("")
  const [newProductImageUrl, setNewProductImageUrl] = useState("")
  const [newProductDescription, setNewProductDescription] = useState("")

  // Search-Select Popovers & Fast Creation State
  const [catSearch, setCatSearch] = useState("")
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [showQuickCreateCat, setShowQuickCreateCat] = useState(false)
  const [quickCatName, setQuickCatName] = useState("")
  const [quickCatImageUrl, setQuickCatImageUrl] = useState("")

  const [unitSearch, setUnitSearch] = useState("")
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  const [showQuickCreateUnit, setShowQuickCreateUnit] = useState(false)
  const [quickUnitName, setQuickUnitName] = useState("")
  const [quickUnitShort, setQuickUnitShort] = useState("")

  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catModalName, setCatModalName] = useState("")
  const [catModalImageUrl, setCatModalImageUrl] = useState("")

  // Sorted Categories by sortOrder
  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [categories])

  // Handle Reorder Categories
  const handleReorderCategories = async (newOrderedList: Category[]) => {
    try {
      triggerHaptic("light")
      const payload = {
        items: newOrderedList.map((cat, idx) => ({
          id: cat.id,
          sortOrder: idx + 1,
        })),
      }
      // Optimistic cache update
      queryClient.setQueryData(["adminCategories"], newOrderedList)
      queryClient.setQueryData(["categories"], newOrderedList)

      await apiClient.put("/products/categories/reorder", payload)
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] })
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] })
    } catch (err) {
      console.error("Kategoriyalarni qayta tartiblashda xatolik:", err)
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] })
    }
  }

  const handleMoveCategoryUp = (index: number) => {
    if (index <= 0) return
    const nextList = [...sortedCategories]
    const temp = nextList[index]
    nextList[index] = nextList[index - 1]
    nextList[index - 1] = temp
    handleReorderCategories(nextList)
  }

  const handleMoveCategoryDown = (index: number) => {
    if (index >= sortedCategories.length - 1) return
    const nextList = [...sortedCategories]
    const temp = nextList[index]
    nextList[index] = nextList[index + 1]
    nextList[index + 1] = temp
    handleReorderCategories(nextList)
  }

  const [adminDraggedCatIndex, setAdminDraggedCatIndex] = useState<number | null>(null)
  const [adminDragOverCatIndex, setAdminDragOverCatIndex] = useState<number | null>(null)

  const handleAdminCategoryDragStart = (e: React.DragEvent, index: number) => {
    setAdminDraggedCatIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(index))
  }

  const handleAdminCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (adminDragOverCatIndex !== index) {
      setAdminDragOverCatIndex(index)
    }
  }

  const handleAdminCategoryDragEnd = () => {
    setAdminDraggedCatIndex(null)
    setAdminDragOverCatIndex(null)
  }

  const handleAdminCategoryDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (adminDraggedCatIndex === null || adminDraggedCatIndex === targetIndex) {
      setAdminDraggedCatIndex(null)
      setAdminDragOverCatIndex(null)
      return
    }

    const nextList = [...sortedCategories]
    const [removed] = nextList.splice(adminDraggedCatIndex, 1)
    nextList.splice(targetIndex, 0, removed)

    setAdminDraggedCatIndex(null)
    setAdminDragOverCatIndex(null)
    handleReorderCategories(nextList)
  }

  const handleOpenAddCategory = () => {
    setEditingCatId(null)
    setCatModalName("")
    setCatModalImageUrl("")
    setShowCatModal(true)
  }

  const handleOpenEditCategory = (c: Category) => {
    setEditingCatId(c.id)
    setCatModalName(c.name)
    setCatModalImageUrl(c.imageUrl || "")
    setShowCatModal(true)
  }

  const handleSaveCategory = async () => {
    const name = showQuickCreateCat ? quickCatName : catModalName
    const imageUrl = showQuickCreateCat ? quickCatImageUrl : catModalImageUrl
    if (!name.trim()) return

    try {
      let savedCatId = editingCatId
      if (editingCatId) {
        await apiClient.put(`/products/categories/${editingCatId}`, {
          name: name.trim(),
          imageUrl: imageUrl || undefined,
        })
      } else {
        const res = await apiClient.post("/products/categories", {
          name: name.trim(),
          imageUrl: imageUrl || undefined,
          icon: "Utensils",
          sortOrder: categories.length + 1,
        })
        savedCatId = res.data?.id
      }

      await queryClient.invalidateQueries({ queryKey: ["adminCategories"] })
      await queryClient.invalidateQueries({ queryKey: ["categories"] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["adminProducts"] })

      if (showQuickCreateCat && savedCatId) {
        setNewProductCategory(savedCatId)
        setCatSearch(name.trim())
        setShowCatDropdown(false)
      }

      setShowQuickCreateCat(false)
      setShowCatModal(false)
      setEditingCatId(null)
      setCatModalName("")
      setCatModalImageUrl("")
      setQuickCatName("")
      setQuickCatImageUrl("")
      triggerHaptic("success")
    } catch (err) {
      console.error(err)
      toast.error("Kategoriyani saqlashda xatolik yuz berdi")
    }
  }

  // Direct Unit Modal State
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [unitModalName, setUnitModalName] = useState("")
  const [unitModalShort, setUnitModalShort] = useState("")




  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu kategoriyani o'chirmoqchimisiz?")) return
    try {
      triggerHaptic("medium")
      await apiClient.delete(`/products/categories/${id}`)
      await queryClient.invalidateQueries({ queryKey: ["adminCategories"] })
      await queryClient.invalidateQueries({ queryKey: ["categories"] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["adminProducts"] })
      toast.success("Kategoriya muvaffaqiyatli o'chirildi")
    } catch (err) {
      console.error(err)
      toast.error("Kategoriyani o'chirishda xatolik")
    }
  }

  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu o'lchov birligini o'chirmoqchimisiz?")) return
    try {
      triggerHaptic("medium")
      await apiClient.delete(`/units/${id}`)
      await refetchUnits()
      toast.success("Birlik muvaffaqiyatli o'chirildi")
    } catch (err) {
      console.error(err)
      toast.error("Birlikni o'chirishda xatolik")
    }
  }

  // Handle Quick Unit Create
  const handleCreateQuickUnit = async (name: string, shortName?: string) => {
    if (!name.trim()) return
    try {
      const res = await apiClient.post("/units", {
        name: name.trim(),
        shortName: shortName?.trim() || name.trim(),
      })
      await refetchUnits()
      setNewProductUnit(res.data.name)
      setUnitSearch(res.data.name)
      setShowQuickCreateUnit(false)
      setShowUnitDropdown(false)
      setQuickUnitName("")
      setQuickUnitShort("")
      toast.success("Yangi birlik qo'shildi")
    } catch (err) {
      toast.error("O'lchov birligi yaratishda xatolik")
    }
  }

  // Handle Product Submit (Create or Update)
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProductName.trim()) {
      toast.warning("Iltimos, taom nomini kiriting")
      return
    }

    try {
      const payload = {
        name: newProductName.trim(),
        description: newProductDescription.trim(),
        categoryId: newProductCategory || categories[0]?.id,
        price: Number(newProductPrice) || 0,
        costPrice: newProductCostPrice !== "" ? Number(newProductCostPrice) : 0,
        packagingLevel: Number(newProductPackagingLevel) ?? 2,
        oldPrice: newProductOldPrice ? Number(newProductOldPrice) : undefined,
        calories: newProductCalories !== "" ? Number(newProductCalories) : 0,
        protein: newProductProtein !== "" ? Number(newProductProtein) : 0,
        fat: newProductFat !== "" ? Number(newProductFat) : 0,
        carbs: newProductCarbs !== "" ? Number(newProductCarbs) : 0,
        unitName: newProductUnit || "pors",
        imageUrl: newProductImageUrl || undefined,
      }

      if (editingProductId) {
        await apiClient.put(`/products/${editingProductId}`, payload)
      } else {
        await apiClient.post("/products", payload)
      }

      refetchProducts()
      setShowAddProduct(false)
      setEditingProductId(null)
      resetProductForm()
      toast.success(editingProductId ? "Taom yangilandi" : "Yangi taom saqlandi")
    } catch (err) {
      console.error(err)
      toast.error("Taomni saqlashda xatolik yuz berdi")
    }
  }

  const resetProductForm = () => {
    setNewProductName("")
    setNewProductDescription("")
    setNewProductCategory("")
    setCatSearch("")
    setNewProductUnit("")
    setUnitSearch("")
    setNewProductPrice(15000)
    setNewProductCostPrice("")
    setNewProductPackagingLevel(2)
    setNewProductOldPrice("")
    setNewProductCalories("")
    setNewProductProtein("")
    setNewProductFat("")
    setNewProductCarbs("")
    setNewProductImageUrl("")
    setEditingProductId(null)
  }

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id)
    setNewProductName(p.name)
    setNewProductDescription(p.description || "")
    setNewProductCategory(p.categoryId || "")
    const cat = categories.find((c) => c.id === p.categoryId)
    setCatSearch(cat ? cat.name : "")
    setNewProductUnit(p.unitName || "")
    setUnitSearch(p.unitName || "")
    setNewProductPrice(p.price)
    setNewProductCostPrice(p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : "")
    setNewProductPackagingLevel(p.packagingLevel !== undefined && p.packagingLevel !== null ? p.packagingLevel : 2)
    setNewProductOldPrice(p.oldPrice || "")
    setNewProductCalories(p.calories ?? "")
    setNewProductProtein(p.protein ?? "")
    setNewProductFat(p.fat ?? "")
    setNewProductCarbs(p.carbs ?? "")
    setNewProductImageUrl(p.imageUrl || "")
    setShowAddProduct(true)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) return
    try {
      await apiClient.delete(`/products/${id}`)
      refetchProducts()
      toast.success("Taom muvaffaqiyatli o'chirildi")
    } catch (err) {
      toast.error("Taomni o'chirishda xatolik")
    }
  }

  // Banner Handlers
  const handleOpenCreateBanner = () => {
    setEditingBannerId(null)
    setBannerBadge("Aksiya -15%")
    setBannerTitle("")
    setBannerDescription("")
    setBannerGradient("from-emerald-700 via-teal-800 to-emerald-950")
    setBannerImageUrl("")
    setBannerActionType("PROMO_PAGE")
    setBannerActionTarget("")
    setBannerActionText("Aksiyani ko'rish")
    setBannerIsActive(true)
    setShowBannerModal(true)
  }

  const handleOpenEditBanner = (b: Banner) => {
    setEditingBannerId(b.id)
    setBannerBadge(b.badge)
    setBannerTitle(b.title)
    setBannerDescription(b.description || "")
    setBannerGradient(b.gradient || "from-emerald-700 via-teal-800 to-emerald-950")
    setBannerImageUrl(b.imageUrl || "")
    setBannerActionType(b.actionType || "PROMO_PAGE")
    setBannerActionTarget(b.actionTarget || "")
    setBannerActionText(b.actionText || "Batafsil")
    setBannerIsActive(b.isActive)
    setShowBannerModal(true)
  }

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bannerTitle.trim()) {
      toast.warning("Banner sarlavhasini kiriting")
      return
    }
    const computedSlug = generateSlug(bannerTitle)
    try {
      const payload = {
        badge: bannerBadge,
        title: bannerTitle,
        slug: computedSlug,
        description: bannerDescription,
        gradient: bannerGradient,
        imageUrl: bannerImageUrl || undefined,
        actionType: bannerActionType,
        actionTarget: bannerActionTarget || undefined,
        actionText: bannerActionText,
        isActive: bannerIsActive,
      }
      if (editingBannerId) {
        await apiClient.put(`/banners/${editingBannerId}`, payload)
      } else {
        await apiClient.post("/banners", payload)
      }
      triggerHaptic("success")
      await refetchBanners()
      setShowBannerModal(false)
    } catch (err) {
      console.error(err)
      alert("Bannerni saqlashda xatolik yuz berdi")
    }
  }

  // Banner Promo Items Manager Handlers
  const handleOpenPromoItemsManager = (banner: Banner) => {
    setSelectedBannerForItems(banner)
    const items = banner.items || (banner.itemsJson ? JSON.parse(banner.itemsJson) : [])
    setBannerPromoItemsDraft(items)
    setShowPromoItemsManager(true)
  }

  const handleTogglePromoItemActive = async (itemId: string) => {
    if (!selectedBannerForItems) return
    const updated = bannerPromoItemsDraft.map((item) =>
      item.id === itemId ? { ...item, isActive: !item.isActive } : item
    )
    setBannerPromoItemsDraft(updated)
    try {
      await apiClient.put(`/banners/${selectedBannerForItems.id}`, {
        items: updated,
      })
      await refetchBanners()
      triggerHaptic("light")
    } catch (err) {
      console.error(err)
      alert("Aksiya holatini yangilashda xatolik")
    }
  }

  const handleDeletePromoItem = async (itemId: string) => {
    if (!selectedBannerForItems) return
    if (!confirm("Ushbu taomni aksiyadan olib tashlamoqchimisiz?")) return
    const updated = bannerPromoItemsDraft.filter((item) => item.id !== itemId)
    setBannerPromoItemsDraft(updated)
    try {
      await apiClient.put(`/banners/${selectedBannerForItems.id}`, {
        items: updated,
      })
      await refetchBanners()
      triggerHaptic("medium")
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenAddPromoItem = () => {
    setEditingPromoItemId(null)
    setPromoItemSource("EXISTING")
    setSelectedExistingId("")
    setPromoItemName("")
    setPromoItemDescription("")
    setPromoItemPrice(25000)
    setPromoItemOldPrice(30000)
    setPromoItemBadge("-20%")
    setPromoItemDiscountPct(20)
    setPromoItemImageUrl("")
    setPromoItemCalories("")
    setPromoItemProtein("")
    setPromoItemFat("")
    setPromoItemCarbs("")
    setPromoItemType("PRODUCT")
    setPromoItemUnitName("pors")
    setPromoItemIsActive(true)
    setShowAddPromoItemModal(true)
  }

  const handleOpenEditPromoItem = (item: BannerItem) => {
    setEditingPromoItemId(item.id)
    setPromoItemSource(item.referenceId ? "EXISTING" : "CUSTOM")
    setSelectedExistingId(item.referenceId || "")
    setPromoItemName(item.name)
    setPromoItemDescription(item.description || "")
    setPromoItemPrice(item.price)
    setPromoItemOldPrice(item.oldPrice || "")
    setPromoItemBadge(item.badge || "")
    const discount =
      item.oldPrice && item.oldPrice > item.price
        ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
        : ""
    setPromoItemDiscountPct(discount)
    setPromoItemImageUrl(item.imageUrl || "")
    setPromoItemCalories(item.calories ?? "")
    setPromoItemProtein(item.protein ?? "")
    setPromoItemFat(item.fat ?? "")
    setPromoItemCarbs(item.carbs ?? "")
    setPromoItemType(item.type === "COMBO" ? "COMBO" : "PRODUCT")
    setPromoItemUnitName(item.unitName || "pors")
    setPromoItemIsActive(item.isActive !== false)
    setShowAddPromoItemModal(true)
  }

  const handleSelectExistingProductForPromo = (id: string, isCombo = false) => {
    setSelectedExistingId(id)
    if (isCombo) {
      const combo = combos.find((c) => c.id === id)
      if (combo) {
        setPromoItemType("COMBO")
        setPromoItemName(combo.name)
        setPromoItemDescription(combo.description || "")
        setPromoItemOldPrice(combo.price)
        const discPct = Number(promoItemDiscountPct) || 15
        const discounted = Math.round((combo.price * (1 - discPct / 100)) / 500) * 500
        setPromoItemPrice(discounted)
        setPromoItemBadge(`-${discPct}%`)
        setPromoItemImageUrl(combo.imageUrl || "")
        setPromoItemCalories(combo.calories || "")
        setPromoItemProtein(combo.protein || "")
        setPromoItemFat(combo.fat || "")
        setPromoItemCarbs(combo.carbs || "")
        setPromoItemUnitName("set")
      }
    } else {
      const prod = products.find((p) => p.id === id)
      if (prod) {
        setPromoItemType("PRODUCT")
        setPromoItemName(prod.name)
        setPromoItemDescription(prod.description || "")
        setPromoItemOldPrice(prod.price)
        const discPct = Number(promoItemDiscountPct) || 20
        const discounted = Math.round((prod.price * (1 - discPct / 100)) / 500) * 500
        setPromoItemPrice(discounted)
        setPromoItemBadge(`-${discPct}%`)
        setPromoItemImageUrl(prod.imageUrl || "")
        setPromoItemCalories(prod.calories || "")
        setPromoItemProtein(prod.protein || "")
        setPromoItemFat(prod.fat || "")
        setPromoItemCarbs(prod.carbs || "")
        setPromoItemUnitName(prod.unitName || "pors")
      }
    }
  }

  const handleDiscountPctChange = (pct: number | string) => {
    setPromoItemDiscountPct(pct)
    const oldP = Number(promoItemOldPrice)
    const numPct = Number(pct)
    if (oldP > 0 && numPct > 0) {
      const newPrice = Math.round((oldP * (1 - numPct / 100)) / 500) * 500
      setPromoItemPrice(newPrice)
      setPromoItemBadge(`-${numPct}%`)
    }
  }

  const handleSavePromoItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBannerForItems) return
    if (!promoItemName.trim()) {
      toast.warning("Iltimos, taom nomini kiriting")
      return
    }

    const newItem: BannerItem = {
      id: editingPromoItemId || `promo_${Date.now()}`,
      name: promoItemName.trim(),
      description: promoItemDescription.trim(),
      price: Number(promoItemPrice) || 0,
      oldPrice: promoItemOldPrice ? Number(promoItemOldPrice) : undefined,
      badge: promoItemBadge || (promoItemDiscountPct ? `-${promoItemDiscountPct}%` : "Aksiya"),
      imageUrl: promoItemImageUrl || undefined,
      calories: promoItemCalories !== "" ? Number(promoItemCalories) : undefined,
      protein: promoItemProtein !== "" ? Number(promoItemProtein) : undefined,
      fat: promoItemFat !== "" ? Number(promoItemFat) : undefined,
      carbs: promoItemCarbs !== "" ? Number(promoItemCarbs) : undefined,
      unitName: promoItemUnitName || (promoItemType === "COMBO" ? "set" : "pors"),
      type: promoItemType,
      referenceId: selectedExistingId || undefined,
      isActive: promoItemIsActive,
    }

    let updated: BannerItem[]
    if (editingPromoItemId) {
      updated = bannerPromoItemsDraft.map((i) => (i.id === editingPromoItemId ? newItem : i))
    } else {
      updated = [...bannerPromoItemsDraft, newItem]
    }

    setBannerPromoItemsDraft(updated)
    try {
      await apiClient.put(`/banners/${selectedBannerForItems.id}`, {
        items: updated,
      })
      await refetchBanners()
      setShowAddPromoItemModal(false)
      setEditingPromoItemId(null)
      triggerHaptic("success")
      toast.success("Aksiya taomi saqlandi")
    } catch (err) {
      console.error(err)
      toast.error("Aksiya mahsulotini saqlashda xatolik")
    }
  }

  const handleToggleBanner = async (id: string) => {
    try {
      triggerHaptic("light")
      await apiClient.patch(`/banners/${id}/toggle`)
      await refetchBanners()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu bannerni o'chirmoqchimisiz?")) return
    try {
      triggerHaptic("medium")
      await apiClient.delete(`/banners/${id}`)
      await refetchBanners()
      toast.success("Banner o'chirildi")
    } catch (err) {
      console.error(err)
      toast.error("O'chirishda xatolik")
    }
  }

  // Staff & Admin Credentials Management Handlers
  const handleOpenEditStaff = (s: any) => {
    setEditingStaff(s)
    setEditStaffFullName(s.fullName || "")
    setEditStaffUsername(s.username || "")
    setEditStaffPhone(s.phone || "")
    setEditStaffPassword("")
  }

  const handleSaveStaffCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff) return
    if (!editStaffFullName.trim()) {
      toast.warning("Iltimos, ism-sharifni kiriting")
      return
    }
    if (!editStaffUsername.trim()) {
      toast.warning("Iltimos, login (username)ni kiriting")
      return
    }

    try {
      setIsUpdatingStaff(true)
      const payload: any = {
        fullName: editStaffFullName.trim(),
        username: editStaffUsername.trim(),
        phone: editStaffPhone.trim() || undefined,
      }
      if (editStaffPassword.trim()) {
        if (editStaffPassword.trim().length < 4) {
          toast.warning("Parol kamida 4 ta belgidan iborat bo'lishi kerak")
          setIsUpdatingStaff(false)
          return
        }
        payload.password = editStaffPassword.trim()
      }

      await apiClient.patch(`/users/${editingStaff.id}/credentials`, payload)
      triggerHaptic("success")
      toast.success("Ma'lumotlar muvaffaqiyatli yangilandi!")
      setEditingStaff(null)
      refetchStaff()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || "Yangilashda xatolik yuz berdi")
    } finally {
      setIsUpdatingStaff(false)
    }
  }

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" xodimini o'chirmoqchimisiz?`)) return
    try {
      triggerHaptic("medium")
      await apiClient.delete(`/users/${id}`)
      refetchStaff()
      toast.success("Xodim muvaffaqiyatli o'chirildi")
    } catch (err) {
      console.error(err)
      toast.error("O'chirishda xatolik yuz berdi")
    }
  }

  // Handle Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffFullName.trim() || !staffUsername.trim() || !staffPassword.trim()) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring")
      return
    }
    if (staffPassword.trim().length < 4) {
      alert("Parol kamida 4 ta belgidan iborat bo'lishi kerak")
      return
    }
    try {
      await apiClient.post("/users/cashier", {
        username: staffUsername.trim(),
        password: staffPassword.trim(),
        fullName: staffFullName.trim(),
        phone: staffPhone.trim() || undefined,
      })
      refetchStaff()
      setShowAddStaff(false)
      setStaffUsername("")
      setStaffPassword("")
      setStaffFullName("")
      setStaffPhone("")
      alert("Yangi kassir muvaffaqiyatli qo'shildi!")
    } catch (err: any) {
      console.error(err)
      alert(err?.response?.data?.message || "Kassir qo'shishda xatolik")
    }
  }

  // Filtered categories and units for search-select
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  )

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(unitSearch.toLowerCase())
  )

  // 5 Core Admin Mobile Bottom Navigation Tabs
  const bottomNavItems = [
    { id: "PRODUCTS" as const, label: "Taomlar", icon: UtensilsCrossed },
    { id: "CATALOG" as const, label: "Katalog", icon: Layers },
    { id: "STATS" as const, label: "Hisobot", icon: BarChart3 },
    { id: "STAFF" as const, label: "Xodimlar", icon: Users },
    { id: "USERS" as const, label: "Mijozlar", icon: UserCheck },
  ]

  return (
    <div className="space-y-4 max-w-3xl lg:max-w-4xl mx-auto pb-24 px-2 sm:px-4">
      {/* Admin Mobile Top Header */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-neutral-900 text-white shadow-lg border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight">Super Admin</h2>
            <p className="text-[11px] text-neutral-400">
              {currentPage === "PRODUCTS" && t.manageDishes}
              {currentPage === "CATALOG" && t.groupProductsCatalog}
              {currentPage === "STATS" && t.manageStats}
              {currentPage === "STAFF" && t.manageStaff}
              {currentPage === "USERS" && t.manageUsers}
            </p>
          </div>
        </div>

        <Badge className="bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
          ADMIN
        </Badge>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: DEDICATED PRODUCTS PAGE (TAOMLAR) */}
      {/* ========================================================================= */}
      {currentPage === "PRODUCTS" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500">
              Jami {products.length} ta taom
            </span>
            <Button
              size="sm"
              onClick={() => {
                resetProductForm()
                setShowAddProduct(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md shadow-emerald-600/20 h-8 px-3"
            >
              <Plus className="h-4 w-4" /> Taom Qo'shish
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => {
              const hasDiscount = p.oldPrice && p.oldPrice > p.price

              return (
                <div
                  key={p.id}
                  className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image */}
                    <div className="relative h-28 w-full bg-neutral-100 dark:bg-neutral-800">
                      {p.imageUrl ? (
                        <img
                          src={getImageUrl(p.imageUrl)}
                          alt={p.name}
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                          }}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-400">
                          <Package className="h-7 w-7 opacity-30" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {hasDiscount ? (
                          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shadow-xs">
                            Skitka
                          </span>
                        ) : <span />}
                        <div className="flex items-center gap-1">
                          <span className="bg-amber-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shadow-xs">
                            {p.packagingLevel === 0 ? "0 (qadoqsiz)" : `${p.packagingLevel ?? 2}/5 ball`}
                          </span>
                          <span className="bg-black/65 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg border border-white/20">
                            {p.unitName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                            {p.price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-semibold">so'm</span>
                        </div>
                        {p.costPrice && p.costPrice > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                            +{(p.price - p.costPrice).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                            {t.noCostWarning || "Tannarx yo'q"}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between pt-0.5">
                        <span>{t.costPriceShort || "Tannarx"}:</span>
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">
                          {p.costPrice && p.costPrice > 0 ? `${p.costPrice.toLocaleString()} so'm` : "—"}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                        <span>Qadoq darajasi:</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          {p.packagingLevel === 0 ? "0 (ichimlik)" : `${p.packagingLevel ?? 2} ball`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 pt-0 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 mt-1">
                    <button
                      onClick={() => handleEditProduct(p)}
                      className="text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 px-2 py-1 rounded-lg"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="text-red-500 hover:text-red-600 p-1 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: DEDICATED CATALOG SETTINGS PAGE (KATEGORIYALAR & UNITS) */}
      {/* ========================================================================= */}
      {currentPage === "CATALOG" && (
        <div className="space-y-4">
          {/* Segmented Sub-tab Pills (Mobile Optimized) */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 dark:bg-neutral-800/80 rounded-2xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                triggerHaptic("light")
                setCatalogSubTab("CATEGORIES")
              }}
              className={`flex-1 min-w-fit whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                catalogSubTab === "CATEGORIES"
                  ? "bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Kategoriyalar</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-black">
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => {
                triggerHaptic("light")
                setCatalogSubTab("UNITS")
              }}
              className={`flex-1 min-w-fit whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                catalogSubTab === "UNITS"
                  ? "bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Birliklar</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-black">
                {units.length}
              </span>
            </button>

            <button
              onClick={() => {
                triggerHaptic("light")
                setCatalogSubTab("BANNERS")
              }}
              className={`flex-1 min-w-fit whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                catalogSubTab === "BANNERS"
                  ? "bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Bannerlar</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black">
                {banners.length}
              </span>
            </button>

            <button
              onClick={() => {
                triggerHaptic("light")
                setCatalogSubTab("SETTINGS")
              }}
              className={`flex-1 min-w-fit whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                catalogSubTab === "SETTINGS"
                  ? "bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Package className="h-4 w-4 text-emerald-600" />
              <span>{(t as any).packagingTab || "Qadoqlash & Narx"}</span>
            </button>
          </div>

          {/* Sub-tab 1: Categories */}
          {catalogSubTab === "CATEGORIES" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-neutral-900 dark:text-white">
                    Taom Toifalari Navbati ({sortedCategories.length})
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    Navbatni o'zgartirish uchun ▲ va ▼ tugmalaridan foydalaning
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenAddCategory}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md h-8 px-3"
                >
                  <Plus className="h-4 w-4" /> Kategoriya Qo'shish
                </Button>
              </div>

              <div className="space-y-2">
                {sortedCategories.map((c, index) => {
                  const isDragging = adminDraggedCatIndex === index
                  const isOver = adminDragOverCatIndex === index
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => handleAdminCategoryDragStart(e, index)}
                      onDragOver={(e) => handleAdminCategoryDragOver(e, index)}
                      onDragEnd={handleAdminCategoryDragEnd}
                      onDrop={(e) => handleAdminCategoryDrop(e, index)}
                      className={`border bg-white dark:bg-neutral-900 rounded-2xl p-3 flex items-center justify-between shadow-xs transition-all cursor-grab active:cursor-grabbing select-none ${
                        isDragging ? "opacity-30 scale-95 border-dashed border-emerald-500" : ""
                      } ${
                        isOver
                          ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.01] border-dashed"
                          : "border-neutral-200/80 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GripVertical className="h-4 w-4 text-neutral-400 hover:text-neutral-700 flex-shrink-0" />
                        <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-black text-[11px] flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800">
                          #{index + 1}
                        </span>
                        <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center overflow-hidden border border-emerald-100 dark:border-emerald-900 flex-shrink-0">
                          {c.imageUrl ? (
                            <img
                              src={getImageUrl(c.imageUrl)}
                              alt={c.name}
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                              }}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Layers className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate">{c.name}</h4>
                          <span className="text-[10px] text-neutral-400">
                            {c.products?.length || 0} ta taom biriktirilgan
                          </span>
                        </div>
                      </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        disabled={index === 0}
                        onClick={() => handleMoveCategoryUp(index)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        title="Yuqoriga surish"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        disabled={index === sortedCategories.length - 1}
                        onClick={() => handleMoveCategoryDown(index)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        title="Pastga surish"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditCategory(c)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Units */}
          {catalogSubTab === "UNITS" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">
                  O'lchov birliklari (dona, pors, kg, gram, qoshiq)
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setUnitModalName("")
                    setUnitModalShort("")
                    setShowUnitModal(true)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md h-8 px-3"
                >
                  <Plus className="h-4 w-4" /> Birlik Qo'shish
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-xs block text-neutral-900 dark:text-white">{u.name}</span>
                      <span className="text-[10px] text-neutral-400">{u.shortName || u.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteUnit(u.id)}
                      className="text-neutral-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Banners (Promotions Stories) */}
          {catalogSubTab === "BANNERS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-neutral-900 dark:text-white">
                    Bosh Sahifadagi Aksiya va Reklama Bannerlari ({banners.length})
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    Mijozlar ilovasida aks etadigan story-bannerlar va maxsus takliflar
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenCreateBanner}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md shadow-emerald-600/20 h-8 px-3"
                >
                  <Plus className="h-4 w-4" /> Yangi Banner
                </Button>
              </div>

              {banners.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-10 text-center space-y-3 bg-neutral-50/50 dark:bg-neutral-950/40">
                  <Sparkles className="h-10 w-10 text-amber-500 mx-auto opacity-50" />
                  <div>
                    <h4 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      Hozircha faol bannerlar mavjud emas
                    </h4>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                      Mijozlarga chegirmalar va yangi taomlarni ko'rsatish uchun birinchi bannerni yarating
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenCreateBanner}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Yangi Banner Qo'shish
                  </Button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className="group rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                    >
                      {/* CARD UPPER: PREVIEW & INFO */}
                      <div className="p-4 sm:p-5 bg-neutral-50/40 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800/80">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {/* Mini realistic story card preview */}
                          <div
                            className={`w-full sm:w-44 h-24 rounded-2xl bg-gradient-to-br ${
                              b.gradient || "from-emerald-700 via-teal-800 to-emerald-950"
                            } relative overflow-hidden flex-shrink-0 p-3 flex flex-col justify-between shadow-sm`}
                          >
                            {b.imageUrl && (
                              <img
                                src={getImageUrl(b.imageUrl)}
                                alt={b.title}
                                onError={(e) => {
                                  ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                                }}
                                className="absolute inset-0 w-full h-full object-cover opacity-35"
                              />
                            )}
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="bg-white/20 backdrop-blur-md text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs line-clamp-1">
                                {b.badge}
                              </span>
                              <span className="text-[8px] font-bold text-white/70 tracking-wider uppercase">Story</span>
                            </div>
                            <div className="relative z-10 space-y-0.5">
                              <h5 className="font-black text-xs text-white line-clamp-1 drop-shadow-sm">
                                {b.title}
                              </h5>
                              <span className="inline-block bg-white text-emerald-950 font-black text-[8px] px-2 py-0.5 rounded-md shadow-xs">
                                {b.actionText || "Ko'rish"}
                              </span>
                            </div>
                          </div>

                          {/* Info Column */}
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                                    {b.title}
                                  </h4>
                                  <Badge
                                    className={`text-[10px] font-bold px-2 py-0.5 border-0 ${
                                      b.isActive
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                        : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                    }`}
                                  >
                                    {b.isActive ? "🟢 Faol" : "⚪ Nofaol"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                                  {b.description || "Qisqa tavsif kiritilmagan"}
                                </p>
                              </div>
                            </div>

                            {/* Metadata Badges */}
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {b.actionType === "LINK" ? (
                                <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 px-2.5 py-1 rounded-xl font-bold">
                                  <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                                  Tashqi Reklama: <span className="font-mono text-[10px] underline">{b.actionTarget || "Havola yo'q"}</span>
                                </span>
                              ) : b.actionType === "PROMO_PAGE" || !b.actionType ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-1 rounded-xl font-bold">
                                  <Tag className="h-3.5 w-3.5 text-emerald-600" />
                                  Maxsus Aksiya Sahifasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 px-2.5 py-1 rounded-xl font-bold">
                                  Yo'nalish: <b>{b.actionType}</b>
                                </span>
                              )}

                              <span className="text-neutral-400 dark:text-neutral-500 font-medium">
                                Tugma: <b className="text-neutral-700 dark:text-neutral-300">"{b.actionText || "Batafsil"}"</b>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CARD LOWER: ACTION TOOLBAR */}
                      <div className="p-3 sm:px-5 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-2.5">
                        <div>
                          {(b.actionType === "PROMO_PAGE" || !b.actionType || b.actionType === "MENU") ? (
                            <button
                              onClick={() => handleOpenPromoItemsManager(b)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-1.5 shadow-2xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all active:scale-98"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>Aksiya Taomlari ({b.items?.length || 0})</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-medium italic">
                              To'g'ridan-to'g'ri tashqi link
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBanner(b.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              b.isActive
                                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                            }`}
                          >
                            {b.isActive ? <EyeOff className="h-3.5 w-3.5 text-neutral-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                            <span>{b.isActive ? "O'chirish" : "Yoqish"}</span>
                          </button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditBanner(b)}
                            className="rounded-xl text-xs font-bold h-8 px-3 gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Tahrirlash</span>
                          </Button>

                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            className="h-8 w-8 rounded-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4: Packaging & System Settings */}
          {catalogSubTab === "SETTINGS" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                      {(t as any).containerPriceSetting || "Qadoqlash (Idish) Narxi Sozlamasi"}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {(t as any).containerPriceDesc || "Savatchada har bir ishlatilgan taom qadog'i (idishi) uchun mijoz to'laydigan narx"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
                    💡 {(t as any).containerPriceRule || "Qadoqlash qoidasi: Har bir standart idish 5 ball sig'imga ega. Har bir taomning qadoqlash darajasiga (0 dan 5 gacha) qarab taomlar idishlarga taqsimlanadi. Ichimliklar (0 ball) uchun idish hisoblanmaydi. Savatchada har bir to'ldirilgan idish uchun quyidagi narx avtomatik hisoblanadi."}
                  </p>
                </div>

                <div className="space-y-2 pt-1 max-w-sm">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>{(t as any).singleContainerPrice || "1 dona qadoq narxi (so'm)"}:</span>
                    <span className="text-[11px] font-black text-emerald-600">
                      {Number(containerPriceInput || 0).toLocaleString()} so'm
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={containerPriceInput}
                      onChange={(e) => setContainerPriceInput(e.target.value)}
                      placeholder="2000"
                      className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
                    />
                    <span className="absolute right-3.5 top-3 text-xs text-neutral-400 font-bold">so'm</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {[1000, 1500, 2000, 2500, 3000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setContainerPriceInput(String(preset))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          containerPriceInput === String(preset)
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveContainerPrice}
                    disabled={isSavingContainerPrice}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-md shadow-emerald-600/20 active:scale-98"
                  >
                    {isSavingContainerPrice ? "..." : ((t as any).savePrice || "Narxni Saqlash")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 3: DEDICATED STATS PAGE (MOLIYA & HISOBOT - DESKTOP GRADE UI) */}
      {/* ========================================================================= */}
      {currentPage === "STATS" && (
        <div className="space-y-4">
          {/* 1. PERIOD FILTER PILLS BAR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                {t.timeRangeFilter || "Vaqt Oralig'i (Filter)"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600">{t.liveAnalysis || "Jonli Tahlil"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "today", label: t.periodToday || "Bugun" },
                { id: "yesterday", label: t.periodYesterday || "Kecha" },
                { id: "week", label: t.periodWeek || "Shu hafta" },
                { id: "month", label: t.periodMonth || "Shu oy" },
                { id: "all", label: t.periodAll || "Barchasi" },
                { id: "custom", label: t.periodCustom || "Sana oralig'i" },
              ].map((p) => {
                const isActive = statsPeriod === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      triggerHaptic("light")
                      setStatsPeriod(p.id as any)
                    }}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/20"
                        : "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300"
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Custom Date Range Picker */}
            {statsPeriod === "custom" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 grid grid-cols-2 gap-2.5"
              >
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                    {t.dateFrom || "Dan (Boshlanish):"}
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                    {t.dateTo || "Gacha (Tugash):"}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* 2. HERO FINANCIAL SUMMARY CARD (TUSHUM, SOF FOYDA, TANNARX) */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-4">
            {/* Header Title & Period */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-neutral-900 dark:text-white tracking-wide uppercase block">
                    {statsPeriod === "today"
                      ? "Bugungi Moliyaviy Tahlil"
                      : statsPeriod === "yesterday"
                      ? "Kecha Moliyaviy Tahlili"
                      : statsPeriod === "week"
                      ? "Haftalik Moliyaviy Tahlil"
                      : statsPeriod === "month"
                      ? "Oylik Moliyaviy Tahlil"
                      : statsPeriod === "all"
                      ? "Barcha Vaqt Moliyaviy Tahlili"
                      : "Tanlangan Davr Tahlili"}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {dashboard?.startDate ? new Date(dashboard.startDate).toLocaleDateString() : ""} {dashboard?.endDate ? `— ${new Date(dashboard.endDate).toLocaleDateString()}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold">
                  {dashboard?.profitMargin || 0}% {t.profitMargin || "Rentabellik"}
                </span>
              </div>
            </div>

            {/* 3 Primary Metrics Grid: Tushum, Sof Foyda, Tannarx */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1. Tushum (Sotuv) */}
              <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  {t.dailyRevenue || "Sotuv Tushumi"}
                </span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                    {(dashboard?.revenue || 0).toLocaleString()}
                  </h2>
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{t.currency || "so'm"}</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {dashboard?.completedOrdersCount || 0} ta to'langan buyurtma
                </span>
              </div>

              {/* 2. Sof Foyda (Net Profit) - Highlighted */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/80 dark:border-emerald-800/80 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    {t.netProfit || "Sof Foyda"}
                  </span>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-lg shadow-xs">
                    +{dashboard?.profitMargin || 0}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                    +{(dashboard?.netProfit || 0).toLocaleString()}
                  </h2>
                  <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">{t.currency || "so'm"}</span>
                </div>
                <span className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90 block font-semibold">
                  Cho'ntakka qoladigan sof daromad
                </span>
              </div>

              {/* 3. Taomlar Tannarxi (Food Cost) */}
              <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  {t.totalCost || "Taomlar Tannarxi"} (COGS)
                </span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-800 dark:text-neutral-200">
                    -{(dashboard?.totalCost || 0).toLocaleString()}
                  </h2>
                  <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{t.currency || "so'm"}</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {dashboard?.revenue > 0 ? Math.round(((dashboard?.totalCost || 0) / dashboard.revenue) * 100) : 0}% tushumdan
                </span>
              </div>
            </div>

            {/* Bottom Operational Matrix (4 Columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {t.ordersCountLabel || "Buyurtmalar"}
                </span>
                <span className="text-sm font-black text-neutral-900 dark:text-white">
                  {dashboard?.totalOrders || 0} {t.itemsCount || "ta"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {t.averageCheckLabel || "O'rtacha Chek"}
                </span>
                <span className="text-sm font-black text-neutral-900 dark:text-white">
                  {(dashboard?.averageCheck || 0).toLocaleString()} <span className="text-[10px] text-neutral-400 font-medium">{t.currency || "so'm"}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {t.averageProfitLabel || "O'rtacha Foyda (chekdan)"}
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  +{(dashboard?.averageProfit || 0).toLocaleString()} <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">{t.currency || "so'm"}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">
                  {t.allTimeProfitLabel || "Jami Sof Foyda"}
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {((dashboard?.allTimeProfit || 0) / 1000000).toFixed(1)} {t.mlnSum || "mln"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. ORDER FULFILLMENT STATUS MATRIX */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  {t.completedStatus || "Bajarildi"}
                </span>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {dashboard?.completedOrdersCount || 0}
              </p>
              <span className="text-[9px] text-neutral-400 font-semibold block">
                {t.successfulLabel || "Muvaffaqiyatli"}
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-amber-500">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  {t.inProgressStatus || "Jarayonda"}
                </span>
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-amber-500">
                {dashboard?.pendingOrdersCount || 0}
              </p>
              <span className="text-[9px] text-neutral-400 font-semibold block">
                {t.kitchenTaxiLabel || "Oshxona / Taksi"}
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-red-500">
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  {t.cancelledStatus || "Bekor"}
                </span>
                <X className="h-4 w-4" />
              </div>
              <p className="text-lg font-black text-red-500">
                {dashboard?.cancelledOrdersCount || 0}
              </p>
              <span className="text-[9px] text-neutral-400 font-semibold block">
                {t.cancelledLabel || "Bekor qilingan"}
              </span>
            </div>
          </div>

          {/* 4. PAYMENT METHODS BREAKDOWN */}
          <Card className="border-neutral-200/80 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  {t.paymentMethodsDistribution || "To'lov Turlari Taqsimoti"}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {dashboard?.paymentBreakdown?.cardPercentage || 0}% {t.cardWord || "Karta"} / {dashboard?.paymentBreakdown?.cashPercentage || 0}% {t.cashWord || "Naqd"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Progress bar visual */}
              <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${dashboard?.paymentBreakdown?.cardPercentage || 0}%` }}
                  className="bg-emerald-600 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${dashboard?.paymentBreakdown?.cashPercentage || 0}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      <CreditCard className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      {t.cardOnline || "Karta (Online)"}
                    </span>
                  </div>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                    {(dashboard?.paymentBreakdown?.cardRevenue || 0).toLocaleString()} {t.currency || "so'm"}
                  </p>
                  <span className="text-[10px] text-neutral-400">
                    {dashboard?.paymentBreakdown?.cardCount || 0} {t.receiptsCount || "ta chek"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px]">
                      <Banknote className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      {t.cashZalPos || "Naqd Pul (Zal POS)"}
                    </span>
                  </div>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {(dashboard?.paymentBreakdown?.cashRevenue || 0).toLocaleString()} {t.currency || "so'm"}
                  </p>
                  <span className="text-[10px] text-neutral-400">
                    {dashboard?.paymentBreakdown?.cashCount || 0} {t.receiptsCount || "ta chek"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. SALES CHANNELS BREAKDOWN */}
          <Card className="border-neutral-200/80 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Store className="h-4 w-4 text-teal-600" />
                {t.salesChannelsRevenue || "Savdo Kanallari Bo'yicha Tushum"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60 text-center space-y-0.5">
                <Truck className="h-4 w-4 text-emerald-600 mx-auto" />
                <span className="text-[10px] font-bold text-neutral-500 block">
                  {t.yandexTaxiChannel || "Yandex Taxi"}
                </span>
                <p className="text-xs font-black text-neutral-900 dark:text-white">
                  {(dashboard?.channelBreakdown?.delivery?.revenue || 0).toLocaleString()}
                </p>
                <span className="text-[9px] text-neutral-400">
                  {dashboard?.channelBreakdown?.delivery?.count || 0} {t.itemsCount || "ta"}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60 text-center space-y-0.5">
                <ShoppingBag className="h-4 w-4 text-blue-600 mx-auto" />
                <span className="text-[10px] font-bold text-neutral-500 block">
                  {t.samovivozChannel || "Samovivoz"}
                </span>
                <p className="text-xs font-black text-neutral-900 dark:text-white">
                  {(dashboard?.channelBreakdown?.pickup?.revenue || 0).toLocaleString()}
                </p>
                <span className="text-[9px] text-neutral-400">
                  {dashboard?.channelBreakdown?.pickup?.count || 0} {t.itemsCount || "ta"}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-700/60 text-center space-y-0.5">
                <Store className="h-4 w-4 text-purple-600 mx-auto" />
                <span className="text-[10px] font-bold text-neutral-500 block">
                  {t.zalPosChannel || "Zal POS"}
                </span>
                <p className="text-xs font-black text-neutral-900 dark:text-white">
                  {(dashboard?.channelBreakdown?.dineIn?.revenue || 0).toLocaleString()}
                </p>
                <span className="text-[9px] text-neutral-400">
                  {dashboard?.channelBreakdown?.dineIn?.count || 0} {t.itemsCount || "ta"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 6. BEST SELLING DISHES & REVENUE RANKING */}
          <Card className="border-neutral-200/80 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  {t.bestSellingRating || "Eng Ko'p Sotilgan Taomlar Reytingi"}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400">
                  {dashboard?.topItems?.length || 0} {t.dishTypesCount || "xil taom"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {!dashboard?.topItems || dashboard.topItems.length === 0 ? (
                <div className="text-center py-6 space-y-1">
                  <Utensils className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
                  <p className="text-xs text-neutral-400 font-medium">
                    {t.noSalesInPeriod || "Bu davrda sotuvlar mavjud emas"}
                  </p>
                </div>
              ) : (
                dashboard.topItems.map((item: any, idx: number) => {
                  const maxRevenue = Math.max(...dashboard.topItems.map((i: any) => i.revenue || 1))
                  const percentage = Math.round(((item.revenue || 0) / maxRevenue) * 100)
                  const medals = ["🥇", "🥈", "🥉"]

                  return (
                    <div key={idx} className="space-y-2 p-3 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black w-5 text-center">
                            {idx < 3 ? medals[idx] : `#${idx + 1}`}
                          </span>
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white block">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400">
                              {item.totalQuantity} {t.soldCount || "ta sotildi"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-neutral-400">Tushum:</span>
                            <span className="font-black text-neutral-900 dark:text-white text-xs">
                              {(item.revenue || 0).toLocaleString()} {t.currency || "so'm"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1 text-[11px]">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Sof foyda:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              +{(item.profit || 0).toLocaleString()} {t.currency || "so'm"}
                            </span>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md">
                              {item.margin || 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bar Fill */}
                      <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={`h-full rounded-full ${
                            idx === 0
                              ? "bg-amber-500"
                              : idx === 1
                              ? "bg-slate-400"
                              : idx === 2
                              ? "bg-amber-700"
                              : "bg-emerald-600"
                          }`}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* 7. PORTION & GRAIN INVENTORY ANALYSIS */}
          <Card className="border-neutral-200/80 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
                  {t.potPortionsSpent || "Qozondagi Porsiyalar va Mahsulotlar Sarfi"}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300">
                  {t.warehouseControl || "Ombor Nazorati"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {portionSummary.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  {t.noPortionDishes || "Hozircha porsiyali taomlar yo'q"}
                </p>
              ) : (
                portionSummary.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 text-xs border border-neutral-100 dark:border-neutral-700/60"
                  >
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-white block">{item.name}</span>
                      <span className="text-[10px] text-neutral-400">
                        {t.totalLabel || "Jami:"} {(item.totalRevenue || 0).toLocaleString()} {t.currency || "so'm"}
                      </span>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1">
                      {item.totalPortions} {t.portionsCount || "ta porsiya"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: DEDICATED STAFF (HODIMLAR & KASSIRLAR) PAGE */}
      {/* ========================================================================= */}
      {currentPage === "STAFF" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-neutral-900 dark:text-white">
                Hodimlar va Kassirlar ({staff.length})
              </h3>
              <p className="text-[10px] text-neutral-400">
                Kassa planshetlari uchun xodimlar ro'yxati
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddStaff(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1 shadow-md h-8 px-3"
            >
              <Plus className="h-4 w-4" /> Yangi Kassir
            </Button>
          </div>

          <div className="space-y-2.5">
            {staff.map((s: any) => {
              const isAdmin = s.role === "ADMIN"
              return (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shadow-xs gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${
                        isAdmin
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/50 dark:border-emerald-800/50"
                          : "bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200/50 dark:border-purple-800/50"
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="h-5 w-5" /> : (s.fullName?.[0]?.toUpperCase() || "K")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate">{s.fullName}</h4>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 ${
                            isAdmin ? "bg-emerald-600 text-white" : "bg-purple-600 text-white"
                          }`}
                        >
                          {isAdmin ? "SUPER ADMIN" : "KASSIR"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                        <span className="font-mono">@{s.username}</span>
                        {s.phone && <span>• {s.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditStaff(s)}
                      className="rounded-xl text-xs font-bold h-8 px-2.5 gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                      title="Parol va loginni o'zgartirish"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Parol / Login</span>
                    </Button>

                    {!isAdmin && (
                      <button
                        onClick={() => handleDeleteStaff(s.id, s.fullName)}
                        className="h-8 w-8 rounded-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                        title="Xodimni o'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 5: DEDICATED USERS (FOYDALANUVCHILAR / MIJOZLAR) PAGE */}
      {/* ========================================================================= */}
      {currentPage === "USERS" && (() => {
        const usersList = usersResponse?.data || []
        const totalUsers = usersResponse?.total || 0
        const totalPages = usersResponse?.totalPages || 1
        const counts = usersResponse?.counts || { all: totalUsers, users: totalUsers, cashiers: 0, admins: 0 }

        const fromItem = totalUsers === 0 ? 0 : (userPage - 1) * userLimit + 1
        const toItem = Math.min(userPage * userLimit, totalUsers)

        // Generate visible page numbers for pagination
        const getPageNumbers = () => {
          const pages: (number | string)[] = []
          if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
          } else {
            if (userPage <= 3) {
              pages.push(1, 2, 3, 4, "...", totalPages)
            } else if (userPage >= totalPages - 2) {
              pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
              pages.push(1, "...", userPage - 1, userPage, userPage + 1, "...", totalPages)
            }
          }
          return pages
        }

        return (
          <div className="space-y-4">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Foydalanuvchilar & Bot Boshqaruvi
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Mijozlar bazasi, bot faolligi va xabarlar tarqatish
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isLoadingUsers && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
                <Button
                  onClick={() => {
                    triggerHaptic("medium")
                    setShowBroadcastModal(true)
                  }}
                  className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md gap-1.5 transition-all"
                >
                  <Megaphone className="h-4 w-4" />
                  <span>Xabar / Reklama Yuborish</span>
                </Button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value)
                  setUserPage(1)
                }}
                placeholder="Ism, telefon, username yoki Telegram ID bo'yicha qidiruv..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {userSearchQuery && (
                <button
                  onClick={() => {
                    setUserSearchQuery("")
                    setUserPage(1)
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Modern Unified Filters Toolbar */}
            <div className="p-2 sm:p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                {/* Role Tabs Segmented Control */}
                <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800/80 p-1 rounded-xl overflow-x-auto scrollbar-none">
                  {[
                    { label: "Barchasi", count: counts.all, value: "ALL" },
                    { label: "Mijozlar", count: counts.users, value: "USER" },
                    { label: "Kassirlar", count: counts.cashiers, value: "CASHIER" },
                    { label: "Adminlar", count: counts.admins, value: "ADMIN" },
                  ].map((rf) => (
                    <button
                      key={rf.value}
                      onClick={() => {
                        triggerHaptic("light")
                        setUserRoleFilter(rf.value as any)
                        setUserPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        userRoleFilter === rf.value
                          ? "bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-black"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{rf.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          userRoleFilter === rf.value
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-neutral-300/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                        }`}
                      >
                        {rf.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Bot Status Segmented Control */}
                <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800/80 p-1 rounded-xl overflow-x-auto scrollbar-none self-start md:self-auto">
                  {[
                    { label: "Barcha bot", value: "ALL" },
                    { label: `Faol (${counts.activeBot ?? 0})`, value: "ACTIVE", dot: "bg-emerald-500" },
                    { label: `Bloklangan (${counts.blockedBot ?? 0})`, value: "BLOCKED", dot: "bg-rose-500" },
                  ].map((bf) => (
                    <button
                      key={bf.value}
                      onClick={() => {
                        triggerHaptic("light")
                        setUserBotFilter(bf.value as any)
                        setUserPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        userBotFilter === bf.value
                          ? "bg-teal-700 text-white shadow-xs font-black"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                    >
                      {bf.dot && <span className={`h-2 w-2 rounded-full ${bf.dot}`} />}
                      <span>{bf.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selection Toolbar */}
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    triggerHaptic("light")
                    const pageIds = usersList.map((u: any) => u.id)
                    const allSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedUserIds.includes(id))
                    if (allSelected) {
                      setSelectedUserIds((prev) => prev.filter((id) => !pageIds.includes(id)))
                    } else {
                      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageIds])))
                    }
                  }}
                  className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 transition-colors"
                >
                  {usersList.length > 0 && usersList.every((u: any) => selectedUserIds.includes(u.id)) ? (
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Square className="h-4 w-4 text-neutral-400" />
                  )}
                  <span>Sahifadagi barchasini tanlash</span>
                </button>
              </div>

              {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md text-[11px]">
                    {selectedUserIds.length} ta tanlandi
                  </span>
                  <button
                    onClick={() => {
                      triggerHaptic("medium")
                      setShowBroadcastModal(true)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Send className="h-3 w-3" />
                    Xabar yuborish
                  </button>
                  <button
                    onClick={() => setSelectedUserIds([])}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-semibold text-[11px]"
                  >
                    Tozalash
                  </button>
                </div>
              )}
            </div>

            {/* Users List */}
            {isLoadingUsers ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1.5 flex-1 max-w-xs">
                        <Skeleton className="h-3.5 w-32 rounded-md" />
                        <Skeleton className="h-3 w-48 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-12 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 p-6 space-y-2">
                <Users className="h-8 w-8 text-neutral-400 mx-auto opacity-40" />
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  Mos foydalanuvchi topilmadi
                </p>
                <p className="text-[11px] text-neutral-400">
                  Qidiruv yoki filtr parametrlarini o'zgartirib ko'ring
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {usersList.map((u: any, idx: number) => {
                  const isSelected = selectedUserIds.includes(u.id)
                  return (
                    <div
                      key={u.id || idx}
                      className={`p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border transition-all flex items-center justify-between gap-3 shadow-xs ${
                        isSelected
                          ? "border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10"
                          : "border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          triggerHaptic("light")
                          setSelectedUserIds((prev) =>
                            prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }}
                        className="p-1 text-neutral-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                            u.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              : u.role === "CASHIER"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {u.fullName ? u.fullName[0]?.toUpperCase() : "M"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                              {u.fullName || "Telegram Mijoz"}
                            </h4>
                            {u.phone && (
                              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                ✓ Telefon tasdiqlangan
                              </span>
                            )}
                            {/* Bot status badge */}
                            {u.telegramId ? (
                              u.isBotActive !== false ? (
                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40">
                                  🟢 Botda faol
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-800/40">
                                  🔴 Botni bloklagan
                                </span>
                              )
                            ) : (
                              <span className="text-[9px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                Bot ulanmagan
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400 flex-wrap">
                            {u.phone && <span className="font-semibold text-neutral-600 dark:text-neutral-300">📞 {u.phone}</span>}
                            {u.telegramId && <span>ID: {u.telegramId}</span>}
                            {u.username && <span>@{u.username}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Balance button / badge */}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("light")
                            setSelectedBalanceUser(u)
                          }}
                          className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] flex items-center gap-1.5 transition-all border ${
                            Number(u.balance || 0) > 0
                              ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs active:scale-95"
                              : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 active:scale-95"
                          }`}
                          title="Balansni boshqarish"
                        >
                          <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{Number(u.balance || 0).toLocaleString()} so'm</span>
                        </button>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold flex-shrink-0 ${
                            u.role === "ADMIN"
                              ? "border-purple-500/40 text-purple-600 bg-purple-50 dark:bg-purple-950/30"
                              : u.role === "CASHIER"
                              ? "border-blue-500/40 text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                              : "border-neutral-200 text-neutral-500"
                          }`}
                        >
                          {u.role === "ADMIN" ? "Admin" : u.role === "CASHIER" ? "Kassir" : "Mijoz"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalUsers > 0 && (
              <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2 text-neutral-500 font-semibold text-[11px]">
                  <span>
                    Ko'rsatilmoqda: <b>{fromItem}-{toItem}</b> / Jami <b>{totalUsers}</b> ta
                  </span>
                  <select
                    value={userLimit}
                    onChange={(e) => {
                      setUserLimit(Number(e.target.value))
                      setUserPage(1)
                    }}
                    className="ml-2 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 font-bold outline-none text-[11px]"
                  >
                    <option value={10}>10 tadan</option>
                    <option value={20}>20 tadan</option>
                    <option value={50}>50 tadan</option>
                    <option value={100}>100 tadan</option>
                  </select>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={userPage <= 1 || isLoadingUsers}
                      onClick={() => {
                        triggerHaptic("light")
                        setUserPage((p) => Math.max(1, p - 1))
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-0.5 text-xs transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Oldingi</span>
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {getPageNumbers().map((p, pIdx) => {
                        if (p === "...") {
                          return (
                            <span key={`dots-${pIdx}`} className="px-1.5 text-neutral-400 text-xs">
                              ...
                            </span>
                          )
                        }
                        const pageNum = Number(p)
                        const isActive = userPage === pageNum
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => {
                              triggerHaptic("light")
                              setUserPage(pageNum)
                            }}
                            className={`h-8 w-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                              isActive
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      disabled={userPage >= totalPages || isLoadingUsers}
                      onClick={() => {
                        triggerHaptic("light")
                        setUserPage((p) => Math.min(totalPages, p + 1))
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-0.5 text-xs transition-colors"
                    >
                      <span>Keyingi</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Broadcast / Reklama Modal */}
            <BroadcastModal
              isOpen={showBroadcastModal}
              onClose={() => setShowBroadcastModal(false)}
              activeBotCount={counts.activeBot ?? 0}
              selectedUserIds={selectedUserIds}
              onSuccess={() => {
                refetchUsers()
                refetchBotStats()
              }}
            />

            {/* Balance Management Modal */}
            <BalanceModal
              isOpen={!!selectedBalanceUser}
              user={selectedBalanceUser}
              onClose={() => setSelectedBalanceUser(null)}
              onSuccess={() => refetchUsers()}
            />
          </div>
        )
      })()}

      {/* ========================================================================= */}
      {/* ADMIN MOBILE BOTTOM NAVIGATION BAR */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80 px-4 py-1.5 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic("light")
                  setCurrentPage(item.id)
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                <span className="text-[10px] mt-1 tracking-tight font-semibold">
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeAdminBottomIndicator"
                    className="absolute -bottom-1 w-6 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* PRODUCT CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* STICKY HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900 z-10">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                {editingProductId ? "Taomni Tahrirlash" : "Yangi Taom Yaratish"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddProduct(false)
                  resetProductForm()
                }}
                className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* FORM CONTAINER WITH SCROLLABLE BODY AND STICKY FOOTER */}
            <form onSubmit={handleAddProductSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* SCROLLABLE BODY */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Product Name */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Taom Nomi: *
                  </label>
                  <input
                    type="text"
                    value={newProductName}
                    placeholder="Masalan: Tandir Somsa"
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* SEARCH-SELECT FOR CATEGORY */}
                <div className="relative space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>Kategoriya: *</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreateCat(true)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Yangi Kategoriya
                    </button>
                  </label>

                  <div className="relative">
                    <div
                      onClick={() => setShowCatDropdown(!showCatDropdown)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-between cursor-pointer"
                    >
                      <span>{catSearch || "Kategoriyani qidirish va tanlash..."}</span>
                      <Search className="h-4 w-4 text-neutral-400" />
                    </div>

                    {showCatDropdown && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                        <input
                          type="text"
                          placeholder="Qidirish..."
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-1 outline-none"
                          autoFocus
                        />
                        {filteredCategories.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setNewProductCategory(c.id)
                              setCatSearch(c.name)
                              setShowCatDropdown(false)
                            }}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                              newProductCategory === c.id
                                ? "bg-emerald-50 text-emerald-700 font-bold"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <span>{c.name}</span>
                            {newProductCategory === c.id && <Check className="h-3.5 w-3.5" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SEARCH-SELECT FOR UNIT */}
                <div className="relative space-y-1">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                    <span>O'lchov Birligi (Unit): *</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCreateUnit(true)}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Yangi Birlik
                    </button>
                  </label>

                  <div className="relative">
                    <div
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-between cursor-pointer"
                    >
                      <span>{unitSearch || "Birlikni qidirish va tanlash..."}</span>
                      <Scale className="h-4 w-4 text-neutral-400" />
                    </div>

                    {showUnitDropdown && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                        <input
                          type="text"
                          placeholder="Qidirish..."
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-1 outline-none"
                          autoFocus
                        />
                        {filteredUnits.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => {
                              setNewProductUnit(u.name)
                              setUnitSearch(u.name)
                              setShowUnitDropdown(false)
                            }}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                              newProductUnit === u.name
                                ? "bg-emerald-50 text-emerald-700 font-bold"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <span>
                              {u.name} ({u.shortName})
                            </span>
                            {newProductUnit === u.name && <Check className="h-3.5 w-3.5" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing: Sotuv Narxi, Tannarx (COGS), Eski Narx */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Sotuv narxi */}
                    <div>
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Narxi (Sotuv) (so'm): *
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={newProductPrice}
                          placeholder="Masalan: 35000"
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none pr-10"
                          required
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] text-neutral-400 font-bold">so'm</span>
                      </div>
                    </div>

                    {/* Keltirilgan narxi (Tannarx / COGS) */}
                    <div>
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>Tannarxi:</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={newProductCostPrice}
                          placeholder="0"
                          onChange={(e) => setNewProductCostPrice(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 outline-none pr-10"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] text-emerald-600/70 font-bold">so'm</span>
                      </div>
                    </div>

                    {/* Eski narxi (Aksiya chegirmasi) */}
                    <div>
                      <label className="text-xs font-medium text-neutral-500">
                        Eski narxi (Aksiya): <span className="text-[10px]">(ixtiyoriy)</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          value={newProductOldPrice}
                          placeholder="Masalan: 40000"
                          onChange={(e) => setNewProductOldPrice(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none pr-10"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[10px] text-neutral-400 font-bold">so'm</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Profit Preview */}
                  {Number(newProductPrice) > 0 && Number(newProductCostPrice) > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        {t.expectedProfit || "Kutilayotgan foyda"} (1 dona/pors):
                      </span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400">
                        +{(Number(newProductPrice) - Number(newProductCostPrice)).toLocaleString()} so'm{" "}
                        <span className="text-[10px] bg-emerald-200/70 dark:bg-emerald-900 px-1.5 py-0.5 rounded-md ml-1 font-bold">
                          {Math.round(((Number(newProductPrice) - Number(newProductCostPrice)) / Number(newProductPrice)) * 100)}% marja
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Kaloriya & KBDU (Nutritional Info) */}
                <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 space-y-2">
                  <label className="text-xs font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>🔥 Kaloriya va Ozuqaviy Qiymat (KBDU)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 block">
                        Kaloriya (kkal):
                      </label>
                      <input
                        type="number"
                        value={newProductCalories}
                        placeholder="180"
                        onChange={(e) => setNewProductCalories(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 block">
                        Oqsil (g):
                      </label>
                      <input
                        type="number"
                        value={newProductProtein}
                        placeholder="12"
                        onChange={(e) => setNewProductProtein(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 block">
                        Yog' (g):
                      </label>
                      <input
                        type="number"
                        value={newProductFat}
                        placeholder="4"
                        onChange={(e) => setNewProductFat(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 block">
                        Uglevod (g):
                      </label>
                      <input
                        type="number"
                        value={newProductCarbs}
                        placeholder="28"
                        onChange={(e) => setNewProductCarbs(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Qadoqlash Sig'im Darajasi (Packaging Capacity Level 0 - 5) */}
                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-amber-600" />
                      <span>Qadoqlash (Idish talabi)</span>
                    </label>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                      {newProductPackagingLevel === 0
                        ? "0 (idishsiz / ichimlik)"
                        : `${newProductPackagingLevel} ball (qadoqli taom)`}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    0 — idish talab qilmaydi (ichimliklar). 1 va undan yuqori — buyurtmada nechta bo'lishidan qat'iy nazar, butun buyurtmaga bitta qadoqlash idishi narxi qo'shiladi.
                  </p>

                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                    {[0, 1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setNewProductPackagingLevel(lvl)}
                        className={`py-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                          newProductPackagingLevel === lvl
                            ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/50"
                            : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-amber-50 dark:hover:bg-neutral-700"
                        }`}
                      >
                        <span>{lvl === 0 ? "0" : `${lvl}`}</span>
                        <span className="text-[9px] font-medium opacity-80">
                          {lvl === 0 ? "Ichimlik" : "Idishli"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* PURE IMAGE UPLOAD FIELD */}
                <ImageUploadField
                  value={newProductImageUrl}
                  onChange={setNewProductImageUrl}
                  label="Taom Rasmi (Faqat fayl yuklash):"
                />

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Qisqacha Tavsif:
                  </label>
                  <textarea
                    value={newProductDescription}
                    placeholder="Masalan: Yangi sabzavotlar va zaytun bilan tayyorlangan salat"
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    rows={2}
                    className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  />
                </div>
              </div>

              {/* STICKY FOOTER ACTIONS */}
              <div className="flex gap-2 px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddProduct(false)
                    resetProductForm()
                  }}
                  className="w-1/3 rounded-2xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md"
                >
                  {editingProductId ? "O'zgarishlarni Saqlash" : "Taomni Menyu Qo'shish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK / DIRECT CATEGORY CREATION MODAL */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* QUICK / DIRECT CATEGORY CREATION & EDITING MODAL */}
      {/* ========================================================================= */}
      {(showQuickCreateCat || showCatModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-sm w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                {editingCatId ? "Kategoriyani Tahrirlash" : "Yangi Kategoriya Yaratish"}
              </h4>
              <button
                onClick={() => {
                  setShowQuickCreateCat(false)
                  setShowCatModal(false)
                  setEditingCatId(null)
                }}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Kategoriya Nomi: *
                </label>
                <input
                  type="text"
                  value={showQuickCreateCat ? quickCatName : catModalName}
                  placeholder="Masalan: Salqin Ichimliklar"
                  onChange={(e) => {
                    if (showQuickCreateCat) setQuickCatName(e.target.value)
                    else setCatModalName(e.target.value)
                  }}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  autoFocus
                />
              </div>

              {/* PURE IMAGE UPLOAD FIELD FOR CATEGORY */}
              <ImageUploadField
                value={showQuickCreateCat ? quickCatImageUrl : catModalImageUrl}
                onChange={(url) => {
                  if (showQuickCreateCat) setQuickCatImageUrl(url)
                  else setCatModalImageUrl(url)
                }}
                label="Kategoriya Rasmi (Faqat fayl yuklash):"
                aspectRatio="square"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuickCreateCat(false)
                    setShowCatModal(false)
                    setEditingCatId(null)
                  }}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor
                </Button>
                <Button
                  onClick={handleSaveCategory}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {editingCatId ? "O'zgarishlarni Saqlash" : "Kategoriyani Saqlash"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK / DIRECT UNIT CREATION MODAL */}
      {/* ========================================================================= */}
      {(showQuickCreateUnit || showUnitModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-sm w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                Yangi O'lchov Birligi (Unit) Yaratish
              </h4>
              <button
                onClick={() => {
                  setShowQuickCreateUnit(false)
                  setShowUnitModal(false)
                }}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Birlik Nomi (to'liq): *
                </label>
                <input
                  type="text"
                  value={showQuickCreateUnit ? quickUnitName : unitModalName}
                  placeholder="Masalan: qadoq, lagan, shisha"
                  onChange={(e) => {
                    if (showQuickCreateUnit) setQuickUnitName(e.target.value)
                    else setUnitModalName(e.target.value)
                  }}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Qisqartma (short):
                </label>
                <input
                  type="text"
                  value={showQuickCreateUnit ? quickUnitShort : unitModalShort}
                  placeholder="Masalan: qd, lgn, sh"
                  onChange={(e) => {
                    if (showQuickCreateUnit) setQuickUnitShort(e.target.value)
                    else setUnitModalShort(e.target.value)
                  }}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuickCreateUnit(false)
                    setShowUnitModal(false)
                  }}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor
                </Button>
                <Button
                  onClick={() => {
                    const name = showQuickCreateUnit ? quickUnitName : unitModalName
                    const short = showQuickCreateUnit ? quickUnitShort : unitModalShort
                    handleCreateQuickUnit(name, short)
                    setShowUnitModal(false)
                  }}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                >
                  Birlikni Saqlash
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASHIER CREATION MODAL */}
      {/* ========================================================================= */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <h4 className="font-black text-base text-neutral-900 dark:text-white">Yangi Kassir Qo'shish</h4>
            <form onSubmit={handleAddStaffSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Kassir F.I.SH:</label>
                <input
                  type="text"
                  value={staffFullName}
                  placeholder="Masalan: Sardor Aliyev"
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Login (username):</label>
                <input
                  type="text"
                  value={staffUsername}
                  placeholder="Masalan: kassir3"
                  onChange={(e) => setStaffUsername(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Parol:</label>
                <input
                  type="password"
                  value={staffPassword}
                  placeholder="Parolni kiriting"
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  required
                />
              </div>
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAddStaff(false)} className="w-1/3 rounded-xl text-xs">
                  Bekor qilish
                </Button>
                <Button type="submit" className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs">
                  Kassirni Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANNER CREATION & EDITING MODAL (WITH LIVE PREVIEW & SEO SLUG & SPONSOR LINK) */}
      {/* ========================================================================= */}
      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-lg w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl my-auto">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                  {editingBannerId ? "Bannerni Tahrirlash" : "Yangi Aksiya Banneri Qo'shish"}
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Bosh sahifadagi interaktiv reklama yoki aksiya kartasi
                </p>
              </div>
              <button
                onClick={() => setShowBannerModal(false)}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live Card Preview */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                Jonli Ko'rinish (Live Preview)
              </span>
              <div
                className={`w-full rounded-3xl bg-gradient-to-br ${bannerGradient} p-4 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[120px]`}
              >
                {bannerImageUrl && (
                  <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-30 mix-blend-luminosity pointer-events-none">
                    <img
                      src={bannerImageUrl}
                      alt="Banner Preview"
                      className="h-full w-full object-cover rounded-r-3xl"
                    />
                  </div>
                )}
                <div className="relative z-10 space-y-1 max-w-[70%]">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
                    <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                    <span>{bannerBadge || "Aksiya"}</span>
                  </div>
                  <h3 className="text-sm font-black leading-tight">
                    {bannerTitle || "Banner Sarlavhasi"}
                  </h3>
                  <p className="text-[11px] text-white/80 line-clamp-1">
                    {bannerDescription || "Qisqa tavsif matni..."}
                  </p>
                </div>
                <div className="relative z-10 pt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-emerald-950 px-2.5 py-1 rounded-xl shadow-xs">
                    {bannerActionText || "Batafsil"} <ChevronRight className="h-3 w-3 text-emerald-700" />
                  </span>
                  <span className="text-[9px] text-white/70">100% Parhez</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Badge Matni: *
                  </label>
                  <input
                    type="text"
                    value={bannerBadge}
                    placeholder="Masalan: Trendda -15%"
                    onChange={(e) => setBannerBadge(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Tugma Matni: *
                  </label>
                  <input
                    type="text"
                    value={bannerActionText}
                    placeholder="Masalan: Aksiyani ko'rish, Saytga o'tish"
                    onChange={(e) => setBannerActionText(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Sarlavha (Title): *
                </label>
                <input
                  type="text"
                  value={bannerTitle}
                  placeholder="Masalan: Yangi Parhez Taomlar"
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Qisqa Tavsif (Description):
                </label>
                <input
                  type="text"
                  value={bannerDescription}
                  placeholder="Masalan: KBDU hisoblangan eng toza taomlar to'plami"
                  onChange={(e) => setBannerDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                />
              </div>

              {/* Gradient Selector */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Fon Rangi (Gradient):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Yashil", value: "from-emerald-700 via-teal-800 to-emerald-950" },
                    { label: "Moviy", value: "from-teal-800 via-emerald-800 to-slate-900" },
                    { label: "Qorong'u", value: "from-emerald-900 via-green-950 to-neutral-950" },
                    { label: "Olovrang", value: "from-amber-700 via-orange-800 to-red-950" },
                  ].map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBannerGradient(g.value)}
                      className={`p-2 rounded-xl text-[10px] font-bold text-white bg-gradient-to-br ${g.value} border-2 ${
                        bannerGradient === g.value ? "border-emerald-400 ring-2 ring-emerald-500/50" : "border-transparent"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rasm yuklash */}
              <div>
                <ImageUploadField
                  label="Banner rasmi (O'ng tomon foni uchun)"
                  value={bannerImageUrl}
                  onChange={(url) => setBannerImageUrl(url)}
                />
              </div>

              {/* Action Settings */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Bosilganda Yo'nalish Turi:
                  </label>
                  <select
                    value={bannerActionType}
                    onChange={(e: any) => {
                      const val = e.target.value
                      setBannerActionType(val)
                      if (val === "PROMO_PAGE") setBannerActionTarget("")
                      if (val === "MENU") setBannerActionTarget("/menu")
                      if (val === "CONSTRUCTOR") setBannerActionTarget("/constructor")
                    }}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  >
                    <option value="PROMO_PAGE">🌟 Maxsus Aksiya Sahifasi (/promo/:slug)</option>
                    <option value="LINK">🔗 Tashqi Reklama / Sponsor Havolasi (URL / Telegram)</option>
                    <option value="CONSTRUCTOR">🥗 Konstruktor Sahifasi (/constructor)</option>
                    <option value="CATEGORY">📁 Kategoriya bo'yicha</option>
                    <option value="DISH">🍽 Alohida Taom bo'yicha</option>
                    <option value="MENU">📋 Asosiy Menyu (/menu)</option>
                  </select>
                </div>

                {bannerActionType === "LINK" && (
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
                    <label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                      Tashqi Reklama Havolasi (URL / Telegram): *
                    </label>
                    <input
                      type="url"
                      value={bannerActionTarget}
                      placeholder="https://t.me/kanal_nomi yoki https://reklama.uz"
                      onChange={(e) => setBannerActionTarget(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-900 outline-none"
                      required
                    />
                    <p className="text-[10px] text-blue-700 dark:text-blue-400">
                      User bannerni bosganida to'g'ridan-to'g'ri ushbu tashqi havolaga yo'naltiriladi (ichki sahifa ochilmaydi).
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBannerModal(false)}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                >
                  {editingBannerId ? "O'zgarishlarni Saqlash" : "Bannerni Yaratish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROMO ITEMS MANAGER MODAL (ATTACH & MANAGE PROMO DISHES & COMBOS) */}
      {/* ========================================================================= */}
      {showPromoItemsManager && selectedBannerForItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-xl w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl my-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                    Aksiya Mahsulotlarini Sozlash
                  </h4>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Banner: <b className="text-neutral-700 dark:text-neutral-300">"{selectedBannerForItems.title}"</b> (
                  {bannerPromoItemsDraft.length} ta mahsulot)
                </p>
              </div>
              <button
                onClick={() => setShowPromoItemsManager(false)}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-neutral-500">
                Aksiya Taom va Kombolari
              </span>
              <Button
                size="sm"
                onClick={handleOpenAddPromoItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold gap-1.5 shadow-sm h-8 px-3"
              >
                <Plus className="h-4 w-4" /> Taom / Kombo Qo'shish
              </Button>
            </div>

            {/* Items List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {bannerPromoItemsDraft.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 text-center space-y-3">
                  <Sparkles className="h-8 w-8 text-amber-500 mx-auto opacity-50" />
                  <p className="text-xs text-neutral-500 font-medium">
                    Hozircha ushbu aksiyaga biriktirilgan taom yoki kombo yo'q.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleOpenAddPromoItem}
                    className="bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Birinchi Taomni Biriktirish
                  </Button>
                </div>
              ) : (
                bannerPromoItemsDraft.map((item, index) => {
                  const hasDiscount = item.oldPrice && item.oldPrice > item.price
                  return (
                    <div
                      key={item.id || index}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        item.isActive !== false
                          ? "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 shadow-2xs"
                          : "bg-neutral-50 dark:bg-neutral-950/60 border-neutral-200/50 dark:border-neutral-900 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0 relative">
                          <img
                            src={getImageUrl(item.imageUrl)}
                            alt={item.name}
                            onError={(e) => {
                              ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                            }}
                            className="h-full w-full object-cover"
                          />
                          {item.badge && (
                            <span className="absolute bottom-0 right-0 left-0 bg-red-600 text-white text-[8px] font-black text-center py-0.5">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-xs text-neutral-900 dark:text-white truncate">
                              {item.name}
                            </h5>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                item.isActive !== false
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                              }`}
                            >
                              {item.isActive !== false ? "Faol (Ko'rinadi)" : "Nofaol (Yashiringan)"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {hasDiscount && (
                              <span className="text-[11px] line-through text-neutral-400 font-semibold">
                                {item.oldPrice?.toLocaleString()} so'm
                              </span>
                            )}
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                              {item.price.toLocaleString()} so'm
                            </span>
                            <span className="text-[10px] text-neutral-400">/ {item.unitName || "pors"}</span>
                          </div>

                          {item.calories ? (
                            <span className="text-[10px] text-neutral-400 mt-0.5 block font-medium">
                              {item.calories} kkal {item.protein ? `• ${item.protein}g oqsil` : ""}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleTogglePromoItemActive(item.id)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            item.isActive !== false
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                          title={item.isActive !== false ? "Nofaol qilish" : "Faol qilish"}
                        >
                          {item.isActive !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={() => handleOpenEditPromoItem(item)}
                          className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeletePromoItem(item.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="O'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end flex-shrink-0">
              <Button
                onClick={() => setShowPromoItemsManager(false)}
                className="bg-emerald-600 text-white rounded-2xl text-xs font-bold px-5"
              >
                Tayyor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PROMO ITEM SUB-MODAL */}
      {/* ========================================================================= */}
      {showAddPromoItemModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-md w-full space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                {editingPromoItemId ? "Aksiya Mahsulotini Tahrirlash" : "Aksiyaga Taom / Kombo Qo'shish"}
              </h4>
              <button
                onClick={() => setShowAddPromoItemModal(false)}
                className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Source selector (Mavjud taom vs Yangi maxsus taom) */}
            {!editingPromoItemId && (
              <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setPromoItemSource("EXISTING")}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    promoItemSource === "EXISTING"
                      ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>Menyudan Tanlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoItemSource("CUSTOM")}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    promoItemSource === "CUSTOM"
                      ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Yangi Maxsus Taom</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSavePromoItem} className="space-y-3.5">
              {/* Existing Dish/Combo Picker */}
              {promoItemSource === "EXISTING" && !editingPromoItemId && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/20">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">
                    Mavjud Taom yoki Komboni Tanlang: *
                  </label>
                  <select
                    value={selectedExistingId}
                    onChange={(e) => {
                      const val = e.target.value
                      const isCombo = val.startsWith("combo_")
                      const cleanId = isCombo ? val.replace("combo_", "") : val
                      handleSelectExistingProductForPromo(cleanId, isCombo)
                    }}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none"
                    required
                  >
                    <option value="">-- Taomni tanlang --</option>
                    <optgroup label="📋 Taomlar (Menyudan)">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price.toLocaleString()} so'm)
                        </option>
                      ))}
                    </optgroup>
                    {combos.length > 0 && (
                      <optgroup label="✨ Kombo Setlar">
                        {combos.map((c) => (
                          <option key={c.id} value={`combo_${c.id}`}>
                            {c.name} ({c.price.toLocaleString()} so'm)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* Name & Description */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Taom / Kombo Nomi: *
                </label>
                <input
                  type="text"
                  value={promoItemName}
                  placeholder="Masalan: Tovuqli Parhez Salat"
                  onChange={(e) => setPromoItemName(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 bg-neutral-50 dark:bg-neutral-800 outline-none"
                  required
                />
              </div>

              {/* Discount Percentage and Prices */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-500/20 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-amber-500" />
                      Chegirma Foizi (%):
                    </label>
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                      -{promoItemDiscountPct}% chegirma
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleDiscountPctChange(pct)}
                        className={`py-1.5 text-xs font-black rounded-xl transition-all text-center ${
                          Number(promoItemDiscountPct) === pct
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-amber-50"
                        }`}
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-200/50 dark:border-amber-900/40">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block truncate">Eski Narxi:</label>
                    <input
                      type="number"
                      value={promoItemOldPrice}
                      placeholder="35000"
                      onChange={(e) => {
                        setPromoItemOldPrice(e.target.value)
                        const oldP = Number(e.target.value)
                        const pct = Number(promoItemDiscountPct)
                        if (oldP > 0 && pct > 0) {
                          setPromoItemPrice(Math.round((oldP * (1 - pct / 100)) / 500) * 500)
                        }
                      }}
                      className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-white dark:bg-neutral-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-600 block truncate">Aksiya Narxi: *</label>
                    <input
                      type="number"
                      value={promoItemPrice}
                      placeholder="28000"
                      onChange={(e) => setPromoItemPrice(e.target.value)}
                      className="w-full text-xs font-black text-emerald-600 px-2.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 mt-0.5 bg-white dark:bg-neutral-900 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block truncate">Badge:</label>
                    <input
                      type="text"
                      value={promoItemBadge}
                      placeholder="-20%"
                      onChange={(e) => setPromoItemBadge(e.target.value)}
                      className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-white dark:bg-neutral-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Nutritional Macros (KBJU) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block">
                  Ozuqaviy qiymati (KBJU):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 block text-center truncate">Kkal</label>
                    <input
                      type="number"
                      value={promoItemCalories}
                      placeholder="250"
                      onChange={(e) => setPromoItemCalories(e.target.value)}
                      className="w-full text-xs font-bold text-center px-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 block text-center truncate">Oqsil (g)</label>
                    <input
                      type="number"
                      value={promoItemProtein}
                      placeholder="25"
                      onChange={(e) => setPromoItemProtein(e.target.value)}
                      className="w-full text-xs font-bold text-center px-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 block text-center truncate">Yog' (g)</label>
                    <input
                      type="number"
                      value={promoItemFat}
                      placeholder="8"
                      onChange={(e) => setPromoItemFat(e.target.value)}
                      className="w-full text-xs font-bold text-center px-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 block text-center truncate">Uglevod (g)</label>
                    <input
                      type="number"
                      value={promoItemCarbs}
                      placeholder="30"
                      onChange={(e) => setPromoItemCarbs(e.target.value)}
                      className="w-full text-xs font-bold text-center px-1 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-0.5 bg-neutral-50 dark:bg-neutral-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <ImageUploadField
                  label="Taom rasmi:"
                  value={promoItemImageUrl}
                  onChange={(url) => setPromoItemImageUrl(url)}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Faollik holati (Active)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    O'chirilsa, foydalanuvchiga aksiya sahifasida ko'rinmaydi
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={promoItemIsActive}
                  onChange={(e) => setPromoItemIsActive(e.target.checked)}
                  className="h-5 w-5 accent-emerald-600 rounded-md cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddPromoItemModal(false)}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                >
                  {editingPromoItemId ? "Saqlash" : "Aksiyaga Qo'shish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: EDIT STAFF / ADMIN CREDENTIALS */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${
                  editingStaff.role === "ADMIN" 
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600" 
                    : "bg-purple-100 dark:bg-purple-950/80 text-purple-600"
                }`}>
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {editingStaff.role === "ADMIN" ? "Super Admin hisobini tahrirlash" : "Kassir hisobini tahrirlash"}
                  </h4>
                  <p className="text-[10px] text-neutral-400">Login va parolni yangilash</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaffCredentials} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Ism-sharif (F.I.SH):
                </label>
                <input
                  type="text"
                  required
                  value={editStaffFullName}
                  onChange={(e) => setEditStaffFullName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Login (Username):
                </label>
                <input
                  type="text"
                  required
                  value={editStaffUsername}
                  onChange={(e) => setEditStaffUsername(e.target.value)}
                  className="w-full text-xs font-mono font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Telefon raqami (Ixtiyoriy):
                </label>
                <input
                  type="text"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  <span>Yangi parol o'rnatish:</span>
                </div>
                <input
                  type="text"
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  placeholder="Yangi parol (O'zgartirmaslik uchun bo'sh qoldiring)"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Parolni o'zgartirmoqchi bo'lmasangiz, bu qatorni bo'sh qoldiring.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStaff(null)}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingStaff}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {isUpdatingStaff ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW CASHIER */}
      {/* ========================================================================= */}
      {showAddStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Yangi Kassir Qo'shish</h4>
                  <p className="text-[10px] text-neutral-400">Planshet/kassa uchun xodim akkounti</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStaff(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Xodim F.I.SH:
                </label>
                <input
                  type="text"
                  required
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  placeholder="Masalan: Malika Karimova"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Login (Username):
                </label>
                <input
                  type="text"
                  required
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="kassir1"
                  className="w-full text-xs font-mono font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Telefon raqami (Ixtiyoriy):
                </label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="+998 90 987 65 43"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Parol:
                </label>
                <input
                  type="text"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Kamida 4 ta belgi"
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-1 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddStaff(false)}
                  className="w-1/3 rounded-xl text-xs"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Kassirni Qo'shish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

