import React, { useState, useEffect } from "react"
import { Wallet, X, Plus, Minus, ArrowUpRight, ArrowDownLeft, Clock, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/api/axios"
import { useTelegram } from "@/hooks/useTelegram"
import type { User, BalanceTransaction } from "@/types"

interface BalanceModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSuccess?: () => void
}

export const BalanceModal: React.FC<BalanceModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { triggerHaptic } = useTelegram()
  const [actionType, setActionType] = useState<"DEPOSIT" | "DEDUCT">("DEPOSIT")
  const [amountStr, setAmountStr] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<BalanceTransaction[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(Number(user?.balance || 0))

  useEffect(() => {
    if (user && isOpen) {
      setCurrentBalance(Number(user.balance || 0))
      setAmountStr("")
      setNote("")
      fetchHistory(user.id)
    }
  }, [user, isOpen])

  const fetchHistory = async (userId: string) => {
    try {
      setIsLoadingHistory(true)
      const res = await apiClient.get(`/users/${userId}/balance-history`)
      setHistory(res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  if (!isOpen || !user) return null

  const parsedAmount = parseInt(amountStr.replace(/\D/g, "") || "0", 10)

  const handlePreset = (val: number) => {
    triggerHaptic("light")
    setAmountStr(val.toLocaleString())
  }

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      alert("Iltimos, noldan katta summa kiriting!")
      return
    }

    if (actionType === "DEDUCT" && parsedAmount > currentBalance) {
      alert("Mijoz balansida bu miqdorda pul mavjud emas!")
      return
    }

    try {
      setIsSubmitting(true)
      triggerHaptic("medium")

      const finalAmount = actionType === "DEPOSIT" ? parsedAmount : -parsedAmount
      const res = await apiClient.post(`/users/${user.id}/balance`, {
        amount: finalAmount,
        type: actionType === "DEPOSIT" ? "DEPOSIT" : "MANUAL_ADJUSTMENT",
        note: note.trim() || undefined,
        performedBy: "Super Admin",
      })

      triggerHaptic("success")
      setCurrentBalance(res.data.user.balance)
      setAmountStr("")
      setNote("")
      fetchHistory(user.id)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      alert("Xatolik: " + (err.response?.data?.message || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                Mijoz Balansini Boshqarish
              </h3>
              <p className="text-[11px] text-neutral-400">
                {user.fullName || "Telegram Mijoz"} {user.phone ? `(${user.phone})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Current Balance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
              Joriy Balans (Depozit)
            </span>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {currentBalance.toLocaleString()} <span className="text-sm font-normal text-emerald-100">so'm</span>
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-bold backdrop-blur-xs">
                {user.role}
              </span>
            </div>
          </div>

          {/* Action toggle: Deposit vs Deduct */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light")
                setActionType("DEPOSIT")
              }}
              className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                actionType === "DEPOSIT"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Pul Qo'shish (Depozit)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light")
                setActionType("DEDUCT")
              }}
              className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                actionType === "DEDUCT"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              <Minus className="h-3.5 w-3.5" />
              <span>Pul Ayirish (Yechish)</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-300">
              Summa (so'mda)
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountStr}
                onChange={(e) => {
                  const num = e.target.value.replace(/\D/g, "")
                  setAmountStr(num ? parseInt(num, 10).toLocaleString() : "")
                }}
                placeholder="0 so'm"
                className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-base font-black text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400">Tezkor summalar:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[500000, 1000000, 2000000, 4000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="py-1.5 px-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-emerald-500 font-bold text-[11px] text-neutral-700 dark:text-neutral-300 transition-all active:scale-95"
                >
                  +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-300">
              Izoh / Sabab (ixtiyoriy)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Restoranda naqd to'landi yoki bonus berildi"
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Transaction History Section */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                Oxirgi Tranzaksiyalar Tarixi
              </span>
              {isLoadingHistory && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
            </div>

            {history.length === 0 ? (
              <p className="text-[11px] text-neutral-400 py-3 text-center bg-neutral-50 dark:bg-neutral-900/50 rounded-xl">
                Hozircha balans operatsiyalari mavjud emas
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {history.map((tx) => {
                  const isPositive = tx.amount > 0
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isPositive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                            {tx.note || (isPositive ? "Balans to'ldirildi" : "Buyurtma uchun to'lov")}
                          </p>
                          <span className="text-[9px] text-neutral-400 block">
                            {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.performedBy || "Tizim"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`font-black text-xs ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {tx.amount.toLocaleString()} so'm
                        </span>
                        <span className="text-[9px] text-neutral-400 block">
                          Qoldiq: {tx.balanceAfter.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Yopish
          </button>

          <Button
            disabled={isSubmitting || parsedAmount <= 0}
            onClick={handleSubmit}
            className={`text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg gap-2 ${
              actionType === "DEPOSIT"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{actionType === "DEPOSIT" ? "Balansga Qo'shish" : "Balansdan Ayirish"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
