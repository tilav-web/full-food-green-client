import React, { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/axios"
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { getImageUrl } from "@/lib/utils"
import type { Product } from "@/types"

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { addToCart, updateCartQuantity, cart } = useAppStore()
  const { triggerHaptic } = useTelegram()

  // Fetch Product by Slug
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await apiClient.get(`/products/slug/${slug}`)
      return res.data
    },
    enabled: !!slug,
  })

  // Dynamic SEO Document Title & Meta tags
  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Full Food Diet Restaurant`
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement("meta")
        metaDesc.setAttribute("name", "description")
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute(
        "content",
        product.description || `${product.name} — mazali, to'yimli va past kaloriyali parhez taom.`
      )
    }
  }, [product])

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3 max-w-lg mx-auto">
        <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-400 font-bold">Taom ma'lumotlari yuklanmoqda...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800">
        <p className="font-bold text-base text-neutral-800 dark:text-neutral-200">
          Kechirasiz, ushbu taom topilmadi
        </p>
        <Button
          onClick={() => navigate("/menu")}
          className="bg-emerald-600 text-white rounded-2xl text-xs font-bold"
        >
          Menyuga Qaytish
        </Button>
      </div>
    )
  }

  const currentCartItem = cart.find((i) => i.productId === product.id)
  const cartQuantity = currentCartItem?.quantity || 0

  const handleAddToCart = () => {
    triggerHaptic("medium")
    addToCart({
      id: `cart_${Date.now()}_${product.id}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      portionCount: 1,
      unitName: product.unit?.name || "pors",
    })
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-24">
      {/* Top Navbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shadow-xs hover:bg-neutral-50 active:scale-95 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <Badge variant="secondary" className="text-xs font-bold px-3 py-1">
          {product.category?.name || "Sog'lom Taom"}
        </Badge>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: product.name,
                text: `${product.name} — Full Food taomi`,
                url: window.location.href,
              })
            } else {
              navigator.clipboard.writeText(window.location.href)
              alert("Havola nusxalandi!")
            }
          }}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shadow-xs hover:bg-neutral-50 active:scale-95 transition-all"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Main Product Card */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm space-y-4 pb-5">
        {/* Big Food Image */}
        <div className="relative h-64 sm:h-72 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <img
            src={getImageUrl(product.imageUrl)}
            alt={product.name}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
            }}
            className="w-full h-full object-cover"
          />
          {product.oldPrice && product.oldPrice > product.price && (
            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
              -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% Chegirma
            </div>
          )}
        </div>

        {/* Info Content */}
        <div className="px-5 space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              {product.name}
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {product.description ||
                "Tabiiy va sifatli masalliqlardan tayyorlangan, parhezbop va organizm uchun foydali taom."}
            </p>
          </div>

          {/* Nutritional Values Grid (KBDU) */}
          <div className="grid grid-cols-4 gap-2 py-2">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 text-center">
              <span className="text-[10px] text-amber-600 font-bold block">Kaloriya</span>
              <strong className="text-xs font-black text-amber-900 dark:text-amber-300">
                {product.calories || 240} kkal
              </strong>
            </div>

            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-center">
              <span className="text-[10px] text-blue-600 font-bold block">Oqsil</span>
              <strong className="text-xs font-black text-blue-900 dark:text-blue-300">
                {product.protein || 26}g
              </strong>
            </div>

            <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/60 text-center">
              <span className="text-[10px] text-red-600 font-bold block">Yog'</span>
              <strong className="text-xs font-black text-red-900 dark:text-red-300">
                {product.fat || 5}g
              </strong>
            </div>

            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-center">
              <span className="text-[10px] text-emerald-600 font-bold block">Uglevod</span>
              <strong className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                {product.carbs || 18}g
              </strong>
            </div>
          </div>

          {/* Price & Unit Details */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 font-bold block">
                O'lchov birligi: {product.unit?.name || "1 porsiya"}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {product.price.toLocaleString()} so'm
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-xs text-neutral-400 line-through">
                    {product.oldPrice.toLocaleString()} so'm
                  </span>
                )}
              </div>
            </div>

            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
              Sifatli & Halol
            </Badge>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {cartQuantity === 0 ? (
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3.5 font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Savatga Qo'shish ({product.price.toLocaleString()} so'm)</span>
            </Button>
          ) : (
            <div className="flex-1 flex items-center justify-between bg-emerald-600 text-white rounded-2xl px-4 py-2 shadow-lg shadow-emerald-600/25">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span className="text-xs font-bold">Savatda: {cartQuantity} ta</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    triggerHaptic("light")
                    updateCartQuantity(currentCartItem!.id, -1)
                  }}
                  className="h-8 w-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-5 text-center font-black text-sm">{cartQuantity}</span>
                <button
                  onClick={() => {
                    triggerHaptic("light")
                    updateCartQuantity(currentCartItem!.id, 1)
                  }}
                  className="h-8 w-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <Button
            onClick={() => navigate("/cart")}
            variant="outline"
            className="rounded-2xl py-3.5 px-4 font-bold text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            Savat
          </Button>
        </div>
      </div>
    </div>
  )
}
