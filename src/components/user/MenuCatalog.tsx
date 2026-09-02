import React, { useMemo } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Plus, Minus, Sparkles, Layers, ArrowRight, Tag, Search, X, Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { ProductDetailModal } from "./ProductDetailModal"
import { Skeleton } from "@/components/ui/skeleton"
import { getImageUrl } from "@/lib/utils"
import type { Category, Product, Combo } from "@/types"

interface MenuCatalogProps {
  categories: Category[]
  products: Product[]
  combos: Combo[]
  isLoading?: boolean
}

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  categories,
  products,
  combos,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read URL search params
  const activeCategory = searchParams.get("category") || "all"
  const searchQuery = searchParams.get("search") || ""
  const activeDishSlug = searchParams.get("dish") || null

  const { addToCart, updateCartQuantity, cart } = useAppStore()
  const { triggerHaptic } = useTelegram()

  // Open Dish or Combo Sheet (Synced with Browser / Navigation history)
  const handleOpenDish = (item: Product | Combo) => {
    triggerHaptic("light")
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("dish", item.slug || item.id)
    navigate(`?${nextParams.toString()}`)
  }

  // Close Dish Sheet (Pops navigation history so hardware back button and UI button both close cleanly)
  const handleCloseDish = () => {
    triggerHaptic("light")
    if (searchParams.has("dish")) {
      navigate(-1)
    } else {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("dish")
      setSearchParams(nextParams)
    }
  }

  // Helper to change category in URL search params
  const handleSelectCategory = (catId: string) => {
    triggerHaptic("light")
    const nextParams = new URLSearchParams(searchParams)
    if (catId === "all") {
      nextParams.delete("category")
    } else {
      nextParams.set("category", catId)
    }
    setSearchParams(nextParams)
  }

  // Helper to update search in URL search params
  const handleSearchChange = (val: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (!val.trim()) {
      nextParams.delete("search")
    } else {
      nextParams.set("search", val)
    }
    setSearchParams(nextParams)
  }

  // Helper to get cart item for a product or combo
  const getCartEntry = (productId?: string, comboId?: string) => {
    return cart.find(
      (i) =>
        (productId && i.productId === productId) ||
        (comboId && i.comboId === comboId)
    )
  }

  const handleIncrement = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")
    const existing = getCartEntry(product.id, undefined)
    if (existing) {
      updateCartQuantity(existing.id, 1)
    } else {
      addToCart({
        id: `prod_${product.id}_${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        oldPrice: product.oldPrice,
        quantity: 1,
        portionCount: 1,
        unitName: product.unitName || product.unit?.name || "pors",
        imageUrl: product.imageUrl,
        calories: product.calories,
      })
    }
  }

  const handleDecrement = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic("light")
    const existing = getCartEntry(product.id, undefined)
    if (existing) {
      updateCartQuantity(existing.id, -1)
    }
  }

  // Sort categories by their designated admin sort order
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }, [categories])

  // Sort products strictly according to their parent category's sortOrder sequence
  const sortedProducts = useMemo(() => {
    const catOrderMap = new Map<string, number>()
    sortedCategories.forEach((c, idx) => {
      catOrderMap.set(c.id, c.sortOrder ?? idx + 1)
      if (c.slug) catOrderMap.set(c.slug, c.sortOrder ?? idx + 1)
    })

    return [...products].sort((a, b) => {
      const orderA = a.categoryId ? (catOrderMap.get(a.categoryId) ?? 999) : 999
      const orderB = b.categoryId ? (catOrderMap.get(b.categoryId) ?? 999) : 999
      if (orderA !== orderB) return orderA - orderB
      return (a.name || "").localeCompare(b.name || "")
    })
  }, [products, sortedCategories])

  // Top 10 most popular products
  const top10PopularProducts = useMemo(() => {
    const popularFlagged = products.filter((p) => p.isPopular)
    if (popularFlagged.length > 0) {
      return [...popularFlagged].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 10)
    }
    // Fallback: take first 10 products
    return [...products].slice(0, 10)
  }, [products])

  const top10PopularIds = useMemo(() => {
    return new Set(top10PopularProducts.map((p) => p.id))
  }, [top10PopularProducts])

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    if (activeCategory === "popular") {
      return top10PopularProducts.filter((p) => {
        const matchesSearch =
          !searchQuery ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        return matchesSearch
      })
    }

    const selectedCat = sortedCategories.find((c) => c.slug === activeCategory || c.id === activeCategory)
    const selectedCatId = selectedCat ? selectedCat.id : activeCategory

    return sortedProducts.filter((p) => {
      const matchesCategory =
        activeCategory === "all" ||
        p.categoryId === selectedCatId ||
        p.category?.id === selectedCatId ||
        p.category?.slug === activeCategory

      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [sortedProducts, sortedCategories, activeCategory, searchQuery, top10PopularProducts])

  // Mixed Feed Generation
  const feedItems = useMemo(() => {
    if (activeCategory === "popular") {
      return filteredProducts.map((p) => ({ type: "product" as const, data: p }))
    }

    if (activeCategory === "combos") {
      return combos.map((c) => ({ type: "combo" as const, data: c }))
    }

    if (activeCategory !== "all" || searchQuery) {
      return filteredProducts.map((p) => ({ type: "product" as const, data: p }))
    }

    const items: Array<
      | { type: "product"; data: Product }
      | { type: "combo"; data: Combo }
    > = []

    let pIdx = 0
    let cIdx = 0
    const totalP = filteredProducts.length

    while (pIdx < totalP) {
      const remainingP = totalP - pIdx

      let batchSize = 4
      if (cIdx < combos.length) {
        if (remainingP === 3) {
          batchSize = 2
        } else if (remainingP === 2) {
          batchSize = 2
        } else if (remainingP >= 4) {
          batchSize = 4
        } else {
          batchSize = remainingP
        }
      } else {
        batchSize = remainingP
      }

      for (let i = 0; i < batchSize && pIdx < totalP; i++) {
        items.push({ type: "product", data: filteredProducts[pIdx] })
        pIdx++
      }

      if (cIdx < combos.length) {
        items.push({ type: "combo", data: combos[cIdx] })
        cIdx++
      }
    }

    while (cIdx < combos.length) {
      items.push({ type: "combo", data: combos[cIdx] })
      cIdx++
    }

    return items
  }, [filteredProducts, combos, activeCategory, searchQuery])

  // Active inspected item from URL ?dish=slug
  const activeInspectedItem = useMemo(() => {
    if (!activeDishSlug) return null
    const foundProd = products.find(
      (p) => (p.slug && p.slug === activeDishSlug) || p.id === activeDishSlug
    )
    if (foundProd) return { item: foundProd, isCombo: false }

    const foundCombo = combos.find(
      (c) => (c.slug && c.slug === activeDishSlug) || c.id === activeDishSlug
    )
    if (foundCombo) return { item: foundCombo, isCombo: true }

    return null
  }, [activeDishSlug, products, combos])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search bar skeleton */}
        <Skeleton className="w-full h-11 rounded-2xl" />

        {/* Category pills skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-24 h-9 rounded-2xl shrink-0" />
          ))}
        </div>

        {/* Product Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-3 space-y-2.5 shadow-xs"
            >
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Input Bar (synced with URL) */}
      <div className="relative">
        <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Taom yoki salatni qidiring..."
          className="w-full text-xs font-bold pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-3 h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* CATEGORY PILLS BAR (synced with URL) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleSelectCategory("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === "all"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          {t.allDishes}
        </button>

        <button
          onClick={() => handleSelectCategory("popular")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === "popular"
              ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-400/40"
              : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
          }`}
        >
          <Flame
            className={`h-3.5 w-3.5 ${
              activeCategory === "popular"
                ? "text-white fill-white"
                : "text-amber-500 fill-amber-500"
            }`}
          />
          <span>{t.popularDishes || "Ommabop"}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeCategory === "popular"
                ? "bg-white/25 text-white"
                : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
            }`}
          >
            Top 10
          </span>
        </button>

        <button
          onClick={() => handleSelectCategory("combos")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            activeCategory === "combos"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {t.combos}
        </button>

        {sortedCategories.map((cat) => {
          const isActive = activeCategory === cat.id || activeCategory === cat.slug
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat.slug || cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
              }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* MIXED FEED: 2-Column Grid with Full-Image Combos */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {feedItems.map((entry, index) => {
          // FULL-IMAGE COMBO BANNER (Col-span-2)
          if (entry.type === "combo") {
            const combo = entry.data
            const hasDiscount = combo.oldPrice && combo.oldPrice > combo.price
            const discountPercent = hasDiscount
              ? Math.round(((combo.oldPrice! - combo.price) / combo.oldPrice!) * 100)
              : 0

            return (
              <motion.div
                key={`combo_${combo.id}_${index}`}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleOpenDish(combo)}
                className="col-span-2 relative h-48 sm:h-56 rounded-3xl overflow-hidden shadow-md cursor-pointer border border-neutral-200/80 dark:border-neutral-800 group"
              >
                {/* Background Image */}
                <img
                  src={getImageUrl(combo.imageUrl)}
                  alt={combo.name}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                  }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Dark Gradient Overlay for text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white font-black text-[11px] backdrop-blur-md gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t.combos}
                  </Badge>

                  {hasDiscount && (
                    <Badge className="bg-red-600 text-white font-black text-[11px] gap-1 shadow-md animate-pulse">
                      <Tag className="h-3 w-3" />
                      -{discountPercent}%
                    </Badge>
                  )}
                </div>

                {/* Floating Content On Image */}
                <div className="absolute bottom-3.5 left-4 right-4 text-white space-y-1">
                  <h3 className="font-black text-base sm:text-lg tracking-tight leading-snug drop-shadow-md">
                    {combo.name}
                  </h3>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                      {hasDiscount && (
                        <span className="line-through text-white/60 text-xs font-semibold">
                          {combo.oldPrice?.toLocaleString()} so'm
                        </span>
                      )}
                      <strong className="text-emerald-400 text-base sm:text-lg font-black tracking-tight drop-shadow-sm">
                        {combo.price.toLocaleString()} so'm
                      </strong>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl text-white border border-white/20">
                      {t.details} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          }

          // STANDARD 2-COLUMN DISH CARD
          const product = entry.data
          const cartItem = getCartEntry(product.id, undefined)
          const qty = cartItem ? cartItem.quantity : 0
          const hasDiscount = product.oldPrice && product.oldPrice > product.price
          const discountPercent = hasDiscount
            ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)
            : 0

          return (
            <motion.div
              key={`product_${product.id}_${index}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenDish(product)}
              className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-xs hover:shadow-md border border-neutral-200/80 dark:border-neutral-800/80 flex flex-col justify-between cursor-pointer group transition-all"
            >
              <div className="space-y-2">
                {/* Product Image Box */}
                <div className="relative h-32 sm:h-36 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img
                    src={getImageUrl(product.imageUrl)}
                    alt={product.name}
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-md">
                        {product.calories} kkal
                      </span>
                      {top10PopularIds.has(product.id) && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md flex items-center gap-0.5">
                          <Flame className="h-3 w-3 fill-white" />
                          {t.top10Badge || "Top 10"}
                        </span>
                      )}
                    </div>

                    {hasDiscount && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg bg-red-600 text-white shadow-xs">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Text */}
                <div className="px-3 space-y-1">
                  <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 leading-snug">
                    {product.name}
                  </h4>

                  <span className="text-[10px] text-neutral-400 block truncate">
                    {product.unit?.name || "1 porsiya"}
                  </span>
                </div>
              </div>

              {/* Price & Stepper Button Bar */}
              <div className="px-3 pb-3 pt-2">
                <div className="flex items-center justify-between gap-1">
                  {/* Price */}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 tracking-tight whitespace-nowrap">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-semibold">
                        so'm
                      </span>
                    </div>

                    {hasDiscount && (
                      <span className="text-[9px] text-neutral-400 line-through block -mt-0.5">
                        {product.oldPrice?.toLocaleString()} so'm
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Stepper */}
                  {qty === 0 ? (
                    <button
                      onClick={(e) => handleIncrement(product, e)}
                      className="h-8 w-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 active:scale-90 transition-all flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-2 py-1 rounded-2xl shadow-md shadow-emerald-600/20 flex-shrink-0"
                    >
                      <button
                        onClick={(e) => handleDecrement(product, e)}
                        className="h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-90"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{qty}</span>
                      <button
                        onClick={(e) => handleIncrement(product, e)}
                        className="h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-90"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Bottom Sheet Modal for Dish or Combo (Synced with navigation history & device back button) */}
      {activeInspectedItem && (
        <ProductDetailModal
          item={activeInspectedItem.item}
          isCombo={activeInspectedItem.isCombo}
          onClose={handleCloseDish}
        />
      )}
    </div>
  )
}
