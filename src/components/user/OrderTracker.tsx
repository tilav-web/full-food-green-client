import React, { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/axios"
import { socket } from "@/api/socket"
import {
  Clock,
  CheckCircle2,
  Car,
  ChefHat,
  RefreshCw,
  Eye,
  CreditCard,
  Copy,
  Check,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/useTranslation"
import { useTelegram } from "@/hooks/useTelegram"
import { getImageUrl } from "@/lib/utils"
import type { Order } from "@/types"

export const OrderTracker: React.FC = () => {
  const { t } = useTranslation()
  const { triggerHaptic } = useTelegram()
  const queryClient = useQueryClient()
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery<Order[]>({
    queryKey: ["userOrders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders")
      return res.data
    },
    refetchInterval: 15000,
  })

  // Fetch restaurant bank card settings for easy transfer
  const { data: settings = [] } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: async () => (await apiClient.get("/settings")).data,
  })

  const cardNumber =
    settings.find((s: any) => s.key === "card_number")?.value || "8600 1234 5678 9012"
  const cardHolder =
    settings.find((s: any) => s.key === "card_holder")?.value || "FULL FOOD MCHJ"
  const cardBank =
    settings.find((s: any) => s.key === "card_bank")?.value || "Kapitalbank"

  // Real-time WebSocket connection for live order progress
  useEffect(() => {
    orders.forEach((o) => {
      socket.emit("join_order", { orderId: o.id })
    })

    const handleOrderUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["userOrders"] })
    }

    socket.on("order_updated", handleOrderUpdated)
    socket.on("order_status_updated", handleOrderUpdated)

    return () => {
      socket.off("order_updated", handleOrderUpdated)
      socket.off("order_status_updated", handleOrderUpdated)
    }
  }, [orders, queryClient])

  const handleCopyCard = (orderId: string, cardNum: string) => {
    navigator.clipboard.writeText(cardNum.replace(/\s+/g, ""))
    setCopiedOrderId(orderId)
    triggerHaptic("light")
    setTimeout(() => setCopiedOrderId(null), 2500)
  }

  const handleUploadReceipt = async (orderId: string, file?: File) => {
    if (!file) return

    try {
      setUploadingOrderId(orderId)
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await apiClient.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const uploadedUrl = uploadRes.data.url

      await apiClient.post(`/orders/${orderId}/upload-receipt`, {
        receiptImageUrl: uploadedUrl,
      })

      triggerHaptic("success")
      await queryClient.invalidateQueries({ queryKey: ["userOrders"] })
    } catch (err) {
      console.error(err)
      alert("Chekni yuklashda xatolik yuz berdi. Qaytadan urinib ko'ring.")
    } finally {
      setUploadingOrderId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return <Badge variant="secondary" className="font-bold">{t.statusPendingPayment || "To'lov kutilmoqda"}</Badge>
      case "PAYMENT_REVIEW":
        return <Badge className="bg-amber-500 text-white font-bold">{t.statusPaymentReview || "Tekshirilmoqda"}</Badge>
      case "PREPARING":
        return <Badge className="bg-blue-600 text-white font-bold">{t.statusPreparing || "Tayyorlanmoqda"}</Badge>
      case "READY_FOR_DELIVERY":
        return <Badge className="bg-indigo-600 text-white font-bold">{t.statusReady || "Tayyor"}</Badge>
      case "DELIVERING":
        return <Badge className="bg-purple-600 text-white font-bold">{t.statusDelivering || "Yetkazilmoqda"}</Badge>
      case "COMPLETED":
        return <Badge variant="success" className="font-bold">{t.statusCompleted || "Yetkazildi"}</Badge>
      case "CANCELLED":
        return <Badge variant="destructive" className="font-bold">{t.statusCancelled || "Bekor qilingan"}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            {t.myOrders}
          </h2>
          <p className="text-xs text-neutral-500">{t.liveTracker}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs rounded-xl"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {t.refresh}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-neutral-400">...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 space-y-2 border-2 border-dashed rounded-3xl p-6">
          <Clock className="h-12 w-12 mx-auto opacity-30 text-emerald-600" />
          <p className="font-bold text-base text-neutral-700 dark:text-neutral-300">
            {t.noOrders}
          </p>
          <p className="text-xs">{t.emptyCartDesc}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            return (
              <Card
                key={order.id}
                className="border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900"
              >
                <CardHeader className="p-4 sm:p-5 pb-3 bg-neutral-50/70 dark:bg-neutral-900/60 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                          #{order.orderNumber}
                        </CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {new Date(order.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 block">
                        {order.totalAmount?.toLocaleString()} {t.currency}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {order.type === "ONLINE_DELIVERY" ? t.deliveryYandex : t.pickup}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Status Progress steps */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        ["PAYMENT_REVIEW", "PREPARING", "READY_FOR_DELIVERY", "DELIVERING", "COMPLETED"].includes(
                          order.status
                        )
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold shadow-xs"
                          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-[10px] block leading-tight">{t.step1}</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl transition-all ${
                        ["PREPARING", "READY_FOR_DELIVERY", "DELIVERING", "COMPLETED"].includes(order.status)
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold shadow-xs"
                          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                      }`}
                    >
                      <ChefHat className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-[10px] block leading-tight">{t.step2}</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl transition-all ${
                        ["DELIVERING", "COMPLETED"].includes(order.status)
                          ? "bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 font-bold shadow-xs"
                          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                      }`}
                    >
                      <Car className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-[10px] block leading-tight">{t.step3}</span>
                    </div>

                    <div
                      className={`p-2 rounded-xl transition-all ${
                        order.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold shadow-xs"
                          : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-[10px] block leading-tight">{t.step4}</span>
                    </div>
                  </div>

                  {/* PAYMENT & RECEIPT UPLOAD SECTION FOR PENDING PAYMENT */}
                  {order.status === "PENDING_PAYMENT" && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-700/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                            {t.statusPendingPayment || "To'lov kutilmoqda"}
                          </span>
                        </div>
                        <span className="font-black text-sm text-amber-700 dark:text-amber-400">
                          {order.totalAmount?.toLocaleString()} {t.currency}
                        </span>
                      </div>

                      {/* Mini Bank Card Box */}
                      <div className="p-3 rounded-xl bg-neutral-900 text-white flex items-center justify-between shadow-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">{cardBank} • {cardHolder}</span>
                          <span className="font-mono font-bold text-sm text-emerald-400 tracking-wider">
                            {cardNumber}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCard(order.id, cardNumber)}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1 text-[11px] font-bold text-white active:scale-95"
                        >
                          {copiedOrderId === order.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Nusxalandi</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Nusxa olish</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Upload button */}
                      <div>
                        <label className="w-full border-2 border-dashed border-amber-400/50 hover:border-emerald-500 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-white/70 dark:bg-neutral-900/70 active:scale-98">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            disabled={uploadingOrderId === order.id}
                            onChange={(e) => handleUploadReceipt(order.id, e.target.files?.[0])}
                            className="hidden"
                          />
                          {uploadingOrderId === order.id ? (
                            <>
                              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Chek yuklanmoqda...
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                To'lov chekini yuklash (Rasm yoki PDF)
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* RECEIPT REVIEW STATUS */}
                  {order.status === "PAYMENT_REVIEW" && (
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 dark:bg-blue-950/30 dark:border-blue-700/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span>To'lov cheki yuborilgan — Kassir tekshirmoqda</span>
                        </div>
                        {order.receiptImageUrl && (
                          <button
                            onClick={() => setSelectedReceipt(getImageUrl(order.receiptImageUrl))}
                            className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" /> Chekni ko'rish
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-blue-200/40 dark:border-blue-900/40">
                        <span>To'lov tasdiqlangach, taom tayyorlanishga o'tadi</span>
                        <label className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            disabled={uploadingOrderId === order.id}
                            onChange={(e) => handleUploadReceipt(order.id, e.target.files?.[0])}
                            className="hidden"
                          />
                          {uploadingOrderId === order.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          <span>Qayta yuklash</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* REJECTED RECEIPT REASON */}
                  {order.receiptRejectReason && order.status === "CANCELLED" && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 dark:bg-red-950/30 dark:border-red-700/40 flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Chek rad etildi: </span>
                        <span>{order.receiptRejectReason}</span>
                      </div>
                    </div>
                  )}

                  {/* Yandex Taxi Live Status Callout if dispatched */}
                  {order.isYandexTaxiCalled && (
                    <div className="rounded-2xl border border-purple-200 bg-purple-50 dark:bg-purple-950/40 p-3.5 flex items-center justify-between text-xs shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-purple-950 dark:text-purple-200">
                            {t.yandexOnWay}
                          </p>
                          <p className="text-[11px] text-purple-700 dark:text-purple-300">
                            {t.yandexDriverAssigned}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                        {t.statusDelivering}
                      </Badge>
                    </div>
                  )}

                  {/* Items breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <span className="font-bold text-neutral-400 text-[10px] uppercase tracking-wider block">
                      {t.dishesSum}:
                    </span>
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
                        <span>
                          {item.name} <span className="text-neutral-400">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold">
                          {item.totalPrice?.toLocaleString()} {t.currency}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Container packaging breakdown if present */}
                  {order.containersJson && (() => {
                    try {
                      const containers = typeof order.containersJson === "string"
                        ? JSON.parse(order.containersJson)
                        : order.containersJson
                      if (Array.isArray(containers) && containers.length > 0) {
                        return (
                          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2 text-xs">
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px]">
                              🍱 {t.splitToContainers} ({containers.length} {t.dishesCount}):
                            </span>
                            <div className="space-y-1.5 divide-y divide-emerald-200/50 dark:divide-emerald-900/50">
                              {containers.map((c: any, cIdx: number) => (
                                <div key={cIdx} className="pt-1.5 first:pt-0">
                                  <span className="font-bold text-neutral-800 dark:text-neutral-200 block text-[11px]">
                                    📦 {c.name || `#${cIdx + 1}`} {c.label ? `(${c.label})` : ""}
                                  </span>
                                  <div className="pl-2 text-[10px] text-neutral-600 dark:text-neutral-400 space-y-0.5 mt-0.5">
                                    {c.items?.map((it: any, iIdx: number) => (
                                      <div key={iIdx}>
                                        ▫️ {it.quantity}x {it.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    } catch (e) {}
                    return null
                  })()}

                  {/* Receipt photo button if order already progressed */}
                  {order.receiptImageUrl && !["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(order.status) && (
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">{t.uploadReceiptHint}</span>
                      <button
                        onClick={() => setSelectedReceipt(getImageUrl(order.receiptImageUrl))}
                        className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> {t.viewReceipt}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal for viewing receipt image or PDF */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 max-w-md w-full space-y-3 shadow-2xl safe-area-bottom">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white">{t.receiptImage}</h4>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            {selectedReceipt.toLowerCase().endsWith(".pdf") ? (
              <div className="p-8 text-center space-y-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  📄 PDF formatdagi chek
                </p>
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  <Eye className="h-4 w-4" /> Chekni yangi oynada ochish
                </a>
              </div>
            ) : (
              <img
                src={selectedReceipt}
                alt="Receipt"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = "/logo.jpg"
                }}
                className="w-full max-h-96 object-contain rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTracker
