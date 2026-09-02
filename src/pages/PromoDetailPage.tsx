import React, { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Sparkles,
  Flame,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Layers,
  Utensils,
  Share2,
} from "lucide-react"
import { apiClient } from "@/api/axios"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { useTranslation } from "@/i18n/useTranslation"
import { ProductDetailModal } from "@/components/user/ProductDetailModal"
import { getImageUrl } from "@/lib/utils"
import type { Banner, BannerItem, Product } from "@/types"

export const PromoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { triggerHaptic } = useTelegram()
  const { addToCart, updateCartQuantity, cart } = useAppStore()

  const [activeTab, setActiveTab] = useState<"ALL" | "PRODUCTS" | "COMBOS">("ALL")
  const [selectedItemForModal, setSelectedItemForModal] = useState<Product | null>(null)

  // Fetch specific banner by slug or ID
  const { data: banner, isLoading } = useQuery<Banner>({
    queryKey: ["banner", id],
    queryFn: async () => {
      if (!id) throw new Error("No id")
      return (await apiClient.get(`/banners/${encodeURIComponent(id)}`)).data
    },
  })

  // Cart total items & price
  const cartTotalQty = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotalPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Filter only active promo items
  const promoItems: BannerItem[] = useMemo(() => {
    if (!banner || !banner.items) return []
    return banner.items.filter((item) => item.isActive !== false)
  }, [banner])

  const filteredItems = useMemo(() => {
    if (activeTab === "PRODUCTS") return promoItems.filter((i) => i.type !== "COMBO")
    if (activeTab === "COMBOS") return promoItems.filter((i) => i.type === "COMBO")
    return promoItems
  }, [promoItems, activeTab])

  const getCartEntry = (itemId: string) => {
    return cart.find((i) => i.productId === itemId || i.comboId === itemId || i.id.includes(itemId))
  }

  const handleAddToCart = (item: BannerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")

    const isCombo = item.type === "COMBO"
    addToCart({
      id: `promo_${item.id}_${Date.now()}`,
      productId: !isCombo ? (item.referenceId || item.id) : undefined,
      comboId: isCombo ? (item.referenceId || item.id) : undefined,
      name: item.name,
      price: item.price,
      oldPrice: item.oldPrice,
      quantity: 1,
      portionCount: 1,
      unitName: item.unitName || (isCombo ? "set" : "pors"),
      imageUrl: item.imageUrl,
      calories: item.calories,
    })
  }

  const handleIncrement = (item: BannerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")
    const entry = getCartEntry(item.id)
    if (entry) {
      updateCartQuantity(entry.id, 1)
    } else {
      handleAddToCart(item, e)
    }
  }

  const handleDecrement = (item: BannerItem, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")
    const entry = getCartEntry(item.id)
    if (entry) {
      updateCartQuantity(entry.id, -1)
    }
  }

  const handleOpenDetailModal = (item: BannerItem) => {
    triggerHaptic("light")
    const mockProduct: Product = {
      id: item.id,
      name: item.name,
      slug: `promo-${item.id}`,
      description: item.description || "",
      price: item.price,
      oldPrice: item.oldPrice,
      stockQuantity: 99,
      calories: item.calories || 0,
      protein: item.protein || 0,
      fat: item.fat || 0,
      carbs: item.carbs || 0,
      imageUrl: item.imageUrl,
      type: "PORTION_BASED",
      unitName: item.unitName || "pors",
      isActive: true,
    }
    setSelectedItemForModal(mockProduct)
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs font-bold">{t.promoLoading || "Aksiya sahifasi yuklanmoqda..."}</span>
        </div>
      </div>
    )
  }

  if (!banner) {
    return (
      <div className="max-w-xl mx-auto min-h-screen p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
          <Tag className="h-8 w-8" />
        </div>
        <h3 className="text-base font-black text-neutral-900 dark:text-white">
          {t.promoNotFound || "Aksiya topilmadi"}
        </h3>
        <p className="text-xs text-neutral-400">
          {t.promoNotFoundDesc || "Bu aksiya muddati tugagan yoki o'chirilgan bo'lishi mumkin."}
        </p>
        <button
          onClick={() => navigate("/menu")}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md"
        >
          {t.backToMenu || "Bosh menyuga qaytish"}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-44 sm:pb-48 min-h-screen">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-30 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-md py-2.5 px-1 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="h-9 px-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-emerald-600" />
          <span>{t.back || "Ortga"}</span>
        </button>

        <span className="text-xs font-black text-neutral-900 dark:text-white tracking-tight">
          {t.specialPromo || "Maxsus Aksiya"}
        </span>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: banner.title,
                text: banner.description,
                url: window.location.href,
              })
            }
          }}
          className="h-9 w-9 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shadow-xs"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Hero Promotion Spotlight Banner */}
      <div
        className={`rounded-3xl bg-gradient-to-br ${
          banner.gradient || "from-emerald-700 via-teal-800 to-emerald-950"
        } p-6 text-white shadow-xl relative overflow-hidden border border-white/15`}
      >
        {/* Ambient background blur lights */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {Boolean(banner.imageUrl || banner.items?.[0]?.imageUrl) && (
          <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[50%] opacity-40 pointer-events-none">
            <img
              src={getImageUrl(banner.imageUrl || banner.items?.[0]?.imageUrl)}
              alt=""
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = "none"
              }}
              className="h-full w-full object-cover rounded-r-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/30 to-black/85" />
          </div>
        )}

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-white border border-white/25 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>{banner.badge || "Aksiya"}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-sm">
            {banner.title}
          </h1>

          <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
            {banner.description}
          </p>

          <div className="pt-2 flex items-center gap-3 text-[11px] font-bold text-white/80">
            <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-xl">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.limitedOffer || "Cheklangan taklif"}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-xl">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.dietGuaranteed || "100% Sog'lom diet"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs: Barchasi | Taomlar | Kombolar */}
      {promoItems.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              triggerHaptic("light")
              setActiveTab("ALL")
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "ALL"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {t.allOffers || "Barcha Takliflar"} ({promoItems.length})
          </button>

          <button
            onClick={() => {
              triggerHaptic("light")
              setActiveTab("PRODUCTS")
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "PRODUCTS"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
            }`}
          >
            <Utensils className="h-3.5 w-3.5" />
            {t.discountDishes || "Chegirmali Taomlar"}
          </button>

          <button
            onClick={() => {
              triggerHaptic("light")
              setActiveTab("COMBOS")
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "COMBOS"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {t.specialSets || "Maxsus Setlar"}
          </button>
        </div>
      )}

      {/* Spotlight Promo Items Feed */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 p-8 text-center space-y-2">
          <Sparkles className="h-8 w-8 text-amber-500 mx-auto opacity-50" />
          <h4 className="font-black text-sm text-neutral-900 dark:text-white">
            {t.promoDishesPreparing || "Ushbu aksiyaga taomlar tayyorlanmoqda"}
          </h4>
          <p className="text-xs text-neutral-400">
            {t.promoDishesPreparingDesc || "Admin paneldan yangi chegirmali taomlar qo'shilgach, bu yerda aks etadi."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => {
            const isCombo = item.type === "COMBO"
            const cartEntry = getCartEntry(item.id)
            const qty = cartEntry ? cartEntry.quantity : 0
            const hasDiscount = item.oldPrice && item.oldPrice > item.price
            const savings = hasDiscount ? (item.oldPrice! - item.price) : 0
            const discountPercent = hasDiscount
              ? Math.round(((item.oldPrice! - item.price) / item.oldPrice!) * 100)
              : 0

            return (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleOpenDetailModal(item)}
                className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-md border border-neutral-200/80 dark:border-neutral-800 cursor-pointer transition-all flex flex-col sm:flex-row group"
              >
                {/* Image Section */}
                <div className="relative h-44 sm:h-auto sm:w-48 bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 overflow-hidden">
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt={item.name}
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Discount Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 pointer-events-none">
                    {hasDiscount && (
                      <span className="bg-red-600 text-white font-black text-[11px] px-2 py-0.5 rounded-lg shadow-sm">
                        -{discountPercent}%
                      </span>
                    )}
                    {item.badge && item.badge !== `-${discountPercent}%` && (
                      <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-lg shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 pointer-events-none">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg border border-white/20">
                      {item.calories ? `${item.calories} ${t.calories || "kkal"}` : (t.diet100 || "Parhezbop")}
                    </span>
                  </div>
                </div>

                {/* Info & Cart Actions Section */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {isCombo ? (t.specialComboSet || "Maxsus Kombo Set") : (t.promoDish || "Aksiya Taomi")}
                      </span>
                      {savings > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          {t.savings || "Tejov"}: {savings.toLocaleString()} {t.sum || "so'm"}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-base text-neutral-900 dark:text-white leading-snug group-hover:text-emerald-600 transition-colors">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Macro nutritional chips */}
                    {(item.protein || item.fat || item.carbs) ? (
                      <div className="flex items-center gap-2 pt-1">
                        {item.protein ? (
                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                            {t.protein || "Oqsil"}: {item.protein}g
                          </span>
                        ) : null}
                        {item.fat ? (
                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                            {t.fat || "Yog'"}: {item.fat}g
                          </span>
                        ) : null}
                        {item.carbs ? (
                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                            {t.carbs || "Uglevod"}: {item.carbs}g
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Price and Add-To-Cart Counter */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <div className="flex flex-col">
                      {hasDiscount && (
                        <span className="text-xs line-through text-neutral-400 font-semibold">
                          {item.oldPrice?.toLocaleString()} {t.sum || "so'm"}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <strong className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                          {item.price.toLocaleString()}
                        </strong>
                        <span className="text-xs font-bold text-neutral-400">{t.sum || "so'm"}</span>
                      </div>
                    </div>

                    {qty === 0 ? (
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.addToCart || "Qo'shish"}
                      </button>
                    ) : (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-1 shadow-xs"
                      >
                        <button
                          onClick={(e) => handleDecrement(item, e)}
                          className="h-7 w-7 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 shadow-xs transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-black px-1 text-emerald-900 dark:text-emerald-200">
                          {qty}
                        </span>
                        <button
                          onClick={(e) => handleIncrement(item, e)}
                          className="h-7 w-7 rounded-xl bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 shadow-xs transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar when items are in cart (positioned safely above bottom navigation bar) */}
      {cartTotalQty > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-16 sm:bottom-18 left-3.5 right-3.5 max-w-xl mx-auto z-30"
        >
          <div
            onClick={() => navigate("/cart")}
            className="bg-emerald-700 hover:bg-emerald-800 text-white p-3 sm:p-3.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer border border-emerald-500/40 backdrop-blur-lg transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center relative font-black text-sm">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-md">
                  {cartTotalQty}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-200 block leading-tight">
                  {t.selectedInCart || "Savatda tanlangan"}
                </span>
                <span className="text-sm sm:text-base font-black">
                  {cartTotalPrice.toLocaleString()} {t.sum || "so'm"}
                </span>
              </div>
            </div>

            <span className="bg-white text-emerald-900 text-[11px] font-black px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1">
              {t.goToCart || "Savatga o'tish"} <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </span>
          </div>
        </motion.div>
      )}

      {/* Dish Inspection Sheet */}
      {selectedItemForModal && (
        <ProductDetailModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}
    </div>
  )
}
