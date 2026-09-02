import React, { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, ShoppingBag, Package, Tag, Sparkles, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { getImageUrl } from "@/lib/utils"
import type { Product, Combo } from "@/types"

interface ProductDetailModalProps {
  item: Product | Combo | null
  isCombo?: boolean
  onClose: () => void
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  isCombo = false,
  onClose,
}) => {
  const { t } = useTranslation()
  const { addToCart, updateCartQuantity, cart } = useAppStore()
  const { triggerHaptic } = useTelegram()

  // Hardware / Telegram WebApp Back Button handler
  useEffect(() => {
    const tgBack = window.Telegram?.WebApp?.BackButton
    if (tgBack) {
      tgBack.show()
      const handleTgBack = () => {
        onClose()
      }
      tgBack.onClick(handleTgBack)
      return () => {
        tgBack.offClick(handleTgBack)
        tgBack.hide()
      }
    }
  }, [onClose])

  if (!item) return null

  // Check if item is already in the cart
  const cartItem = cart.find((i) =>
    isCombo ? i.comboId === item.id : i.productId === item.id
  )
  const countInCart = cartItem?.quantity || 0

  const isFixed = !isCombo && (item as Product).type === "FIXED_COUNT"
  const isOutOfStock = isFixed && ((item as Product).stockQuantity || 0) <= 0

  const hasDiscount = item.oldPrice && item.oldPrice > item.price
  const discountPercent = hasDiscount
    ? Math.round(((item.oldPrice! - item.price) / item.oldPrice!) * 100)
    : 0

  let parsedComboItems: any[] = []
  if (isCombo && (item as Combo).itemsJson) {
    try {
      parsedComboItems = JSON.parse((item as Combo).itemsJson)
    } catch (e) {
      parsedComboItems = []
    }
  }

  // Handle Initial Add to Cart
  const handleInitialAdd = () => {
    if (isOutOfStock) return
    triggerHaptic("success")

    addToCart({
      id: `${isCombo ? "combo" : "prod"}_${item.id}_${Date.now()}`,
      productId: isCombo ? undefined : item.id,
      comboId: isCombo ? item.id : undefined,
      name: item.name,
      price: item.price,
      oldPrice: item.oldPrice,
      quantity: 1,
      portionCount: 1,
      unitName: isCombo ? undefined : (item as Product).unitName,
      imageUrl: item.imageUrl,
      calories: item.calories,
    })
  }

  // Handle Increment in Cart
  const handleIncrement = () => {
    if (isFixed && countInCart >= (item as Product).stockQuantity) return
    triggerHaptic("light")
    if (cartItem) {
      updateCartQuantity(cartItem.id, 1)
    } else {
      handleInitialAdd()
    }
  }

  // Handle Decrement in Cart
  const handleDecrement = () => {
    triggerHaptic("light")
    if (cartItem) {
      updateCartQuantity(cartItem.id, -1)
    }
  }

  const currentTotal = item.price * (countInCart > 0 ? countInCart : 1)
  const oldTotal = item.oldPrice ? item.oldPrice * (countInCart > 0 ? countInCart : 1) : null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-800"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Large Appetizing Image */}
          <div className="relative h-60 sm:h-72 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={getImageUrl(item.imageUrl)}
                alt={item.name}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-neutral-400">
                <ShoppingBag className="h-16 w-16 opacity-30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 text-white space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {!isCombo && (item as Product).isPopular && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black gap-1 shadow-md">
                    <Flame className="h-3.5 w-3.5 fill-white" />
                    {t.top10Badge || "Top 10"} {t.popularDishes || "Ommabop"}
                  </Badge>
                )}

                {isCombo ? (
                  <Badge className="bg-amber-500 text-white font-bold gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t.combos}
                  </Badge>
                ) : isFixed ? (
                  <Badge className="bg-blue-600 text-white gap-1 font-bold">
                    <Package className="h-3.5 w-3.5" />
                    {(item as Product).stockQuantity} {t.stockLeft}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600 text-white font-bold">
                    {(item as Product).unitName || "1 pors"}
                  </Badge>
                )}

                {hasDiscount && (
                  <Badge className="bg-red-600 text-white font-bold gap-1">
                    <Tag className="h-3 w-3" />
                    -{discountPercent}% {t.discount}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight drop-shadow-md">
                {item.name}
              </h2>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {item.description || "Yangi va sifatli masalliqlardan tayyorlangan mazali taom."}
            </p>

            {/* KBDU Nutritional Macros */}
            {(item.calories > 0 || (item as any).protein > 0) && (
              <div className="grid grid-cols-4 gap-2 bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 text-center">
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">{t.calories}</span>
                  <strong className="text-xs font-black text-emerald-800 dark:text-emerald-300">{item.calories || 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">{t.protein}</span>
                  <strong className="text-xs font-black text-emerald-800 dark:text-emerald-300">{(item as any).protein || 0}g</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">{t.fat}</span>
                  <strong className="text-xs font-black text-emerald-800 dark:text-emerald-300">{(item as any).fat || 0}g</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">{t.carbs}</span>
                  <strong className="text-xs font-black text-emerald-800 dark:text-emerald-300">{(item as any).carbs || 0}g</strong>
                </div>
              </div>
            )}

            {/* Combo set items list if it's a combo */}
            {isCombo && parsedComboItems.length > 0 && (
              <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 p-4 border border-neutral-200/80 dark:border-neutral-700 space-y-2">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  {t.comboSetIncludes}:
                </span>
                <div className="space-y-1.5">
                  {parsedComboItems.map((ci: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {ci.name}
                      </span>
                      <span className="font-semibold text-neutral-400">{ci.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-4 safe-area-bottom border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between gap-4">
            <div>
              {hasDiscount && oldTotal && (
                <span className="line-through text-neutral-400 text-xs block leading-none mb-0.5">
                  {oldTotal.toLocaleString()} {t.currency}
                </span>
              )}
              <strong className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                {currentTotal.toLocaleString()} {t.currency}
              </strong>
            </div>

            {/* ACTION BUTTONS: Initial Add vs Stepper (+/-) */}
            {countInCart === 0 ? (
              <Button
                onClick={handleInitialAdd}
                disabled={isOutOfStock}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-6 py-3 text-xs shadow-md shadow-emerald-600/20 active:scale-98 flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                {isOutOfStock ? t.outOfStock : t.addToCart}
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-600 text-white rounded-2xl p-1 shadow-md shadow-emerald-600/25">
                <button
                  onClick={handleDecrement}
                  className="h-8 w-8 rounded-xl bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center text-white active:scale-95 transition-transform"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-black text-sm">{countInCart}</span>
                <button
                  onClick={handleIncrement}
                  disabled={isFixed && countInCart >= (item as Product).stockQuantity}
                  className="h-8 w-8 rounded-xl bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center text-white active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
