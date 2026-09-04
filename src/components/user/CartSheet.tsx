import React, { useState } from "react"
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
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { LocationPickerModal } from "./LocationPickerModal"
import { useQuery } from "@tanstack/react-query"

interface CartSheetProps {
  isOpen: boolean
  onClose: () => void
}

export const CartSheet: React.FC<CartSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { cart, removeFromCart, updateCartQuantity, clearCart, user, setCurrentActiveOrder } =
    useAppStore()
  const { triggerHaptic } = useTelegram()

  // Steps: 'CART' | 'LOCATION' | 'PAYMENT' | 'SUCCESS'
  const [step, setStep] = useState<"CART" | "LOCATION" | "PAYMENT" | "SUCCESS">("CART")

  // Customer & Location info
  const [customerName, setCustomerName] = useState(user?.fullName || "Azizbek")
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "+998 90 123 45 67")
  const [deliveryAddress, setDeliveryAddress] = useState("Toshkent sh., Yunusobod 4-mavze, 12-uy")
  const [distanceKm, setDistanceKm] = useState(3.2)
  const [orderType, setOrderType] = useState<"ONLINE_DELIVERY" | "ONLINE_PICKUP">("ONLINE_DELIVERY")
  const [notes, setNotes] = useState("")

  // Location modal open state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({})

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

  const cardNumber = getSetting("card_number", "9860 1001 2517 4530")
  const cardHolder = getSetting("card_holder", "SHAHRIZOD XALIMOV")

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalAmount = subtotal

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""))
    setCopiedCard(true)
    triggerHaptic("success")
    setTimeout(() => setCopiedCard(false), 2000)
  }

  // Confirm location from modal
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

  // Create Order API call
  const handleCreateOrder = async () => {
    if (!customerPhone || !customerName) {
      alert("Iltimos, ism va telefon raqamingizni kiriting")
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
        customerName,
        customerPhone,
        type: orderType,
        paymentMethod: "CARD_TRANSFER",
        address: deliveryAddress,
        distanceKm,
        deliveryFee: 0,
        latitude: coords.lat,
        longitude: coords.lng,
        notes,
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

  // Upload receipt
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

      // Send to orders API
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white dark:bg-neutral-950 h-full flex flex-col shadow-2xl overflow-hidden border-l border-neutral-200 dark:border-neutral-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-neutral-900 dark:text-white">
                  {step === "CART" && t.cartTitle}
                  {step === "LOCATION" && t.orderType}
                  {step === "PAYMENT" && t.paymentTitle}
                  {step === "SUCCESS" && t.orderSuccessTitle}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {step === "CART" && `${cart.length} ta mahsulot`}
                  {step === "LOCATION" && "Manzil va Yandex narxi"}
                  {step === "PAYMENT" && `Buyurtma #${createdOrder?.orderNumber}`}
                  {step === "SUCCESS" && "Oshxonada tayyorlanmoqda"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STEP 1: CART ITEMS */}
            {step === "CART" && (
              <>
                {cart.length === 0 ? (
                  <div className="py-24 text-center text-neutral-400 space-y-3">
                    <ShoppingBag className="h-14 w-14 mx-auto opacity-30 text-emerald-600" />
                    <p className="font-bold text-base text-neutral-700 dark:text-neutral-300">
                      {t.emptyCartTitle}
                    </p>
                    <p className="text-xs">{t.emptyCartDesc}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                            {item.name}
                          </h4>

                          {item.customPlate && (
                            <div className="mt-1 space-y-0.5">
                              {item.customPlate.portions.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block text-[10px] bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-md mr-1 font-medium"
                                >
                                  {p.name} ({p.portions} pors)
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                              {(item.price * item.quantity).toLocaleString()} so'm
                            </strong>
                          </div>
                        </div>

                        {/* Stepper buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="h-7 w-7 rounded-xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 text-xs active:scale-95 transition-transform"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="h-7 w-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs active:scale-95 transition-transform shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-neutral-400 hover:text-red-500 p-1 ml-1 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* STEP 2: LOCATION & YANDEX DELIVERY */}
            {step === "LOCATION" && (
              <div className="space-y-4">
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

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      {t.yourName}:
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                      {t.yourPhone}:
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-900"
                    />
                  </div>

                  {orderType === "ONLINE_DELIVERY" && (
                    <>
                      {/* Location selector button */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          {t.deliveryAddress}:
                        </label>
                        <div
                          onClick={() => setIsLocationModalOpen(true)}
                          className="p-3 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                {deliveryAddress}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        </div>

                        {/* Direct Map Pin Preview Links (Yandex & Google) during checkout */}
                        {coords.lat && coords.lng && (
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
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 mt-1 outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50 dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT WITH RECEIPT UPLOAD */}
            {step === "PAYMENT" && createdOrder && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
                  <Badge className="bg-emerald-600 text-white font-bold">
                    Buyurtma #{createdOrder.orderNumber}
                  </Badge>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                    {t.totalSum}:
                  </p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {createdOrder.totalAmount?.toLocaleString()} so'm
                  </p>
                </div>

                {/* Sleek Bank Card Visual */}
                <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white p-5 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                      {t.restaurantCard}
                    </span>
                    <Badge className="bg-white/10 text-emerald-300 border-0 text-[10px]">
                      UZCARD / HUMO
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-black tracking-widest text-emerald-300">
                      {cardNumber}
                    </span>
                    <button
                      onClick={handleCopyCard}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-1 text-xs active:scale-95"
                    >
                      {copiedCard ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-300 text-[11px] font-bold">{t.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span className="text-[11px] font-semibold">{t.copyCard}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-neutral-300 font-medium">{cardHolder}</p>
                </div>

                {/* Receipt Upload Dropzone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-emerald-600" />
                    {t.uploadReceipt}:
                  </label>
                  <p className="text-[11px] text-neutral-500">{t.uploadReceiptHint}</p>

                  <div className="relative border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 rounded-2xl p-6 text-center bg-emerald-50/30 dark:bg-emerald-950/20 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2 pointer-events-none">
                      <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600">
                        <Upload className={`h-5 w-5 ${isUploading ? "animate-bounce" : ""}`} />
                      </div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        {isUploading ? t.uploadingReceipt : t.selectReceiptFile}
                      </p>
                      <p className="text-[10px] text-neutral-400">PNG, JPG, JPEG (10MB)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === "SUCCESS" && (
              <div className="py-14 text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                  <Check className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                    {t.orderSuccessTitle}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {t.orderSuccessDesc}
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={onClose}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold py-3 text-xs shadow-md"
                  >
                    {t.viewMyOrders}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
            {step === "CART" && cart.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.dishesSum}:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {subtotal.toLocaleString()} so'm
                  </span>
                </div>
                <Button
                  onClick={() => setStep("LOCATION")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold py-3 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
                >
                  {t.proceedToLocation} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step === "LOCATION" && (
              <div className="space-y-3">
                {orderType === "ONLINE_DELIVERY" && (
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-neutral-500" />
                      Yetkazib berish:
                    </span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Alohida to'lanadi
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-neutral-500">{t.totalSum}:</span>
                  <strong className="font-black text-emerald-700 dark:text-emerald-400 text-base">
                    {totalAmount.toLocaleString()} so'm
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
                    disabled={isSubmitting}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/20 active:scale-98"
                  >
                    {isSubmitting ? "Yaratilmoqda..." : t.proceedToPayment}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Location Picker Modal */}
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          currentAddress={deliveryAddress}
          currentDistance={distanceKm}
          currentLat={coords.lat}
          currentLng={coords.lng}
          onConfirm={handleLocationConfirm}
          onClose={() => setIsLocationModalOpen(false)}
        />
      </div>
    </AnimatePresence>
  )
}
