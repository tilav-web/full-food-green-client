import React from "react"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/axios"
import {
  UtensilsCrossed,
  ShoppingBag,
  ClipboardList,
  User,
  Receipt,
  PackagePlus,
  Store,
  BarChart3,
} from "lucide-react"
import { useTranslation } from "@/i18n/useTranslation"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import type { Order } from "@/types"

export const BottomNav: React.FC = () => {
  const { t } = useTranslation()
  const { cart, user } = useAppStore()
  const { triggerHaptic } = useTelegram()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const currentTab = searchParams.get("tab") || "ORDERS"

  // Live query for active cashier orders count (Payment reviews & new orders)
  const { data: cashierOrders = [] } = useQuery<Order[]>({
    queryKey: ["cashierOrders"],
    queryFn: async () => (await apiClient.get("/orders")).data,
    enabled: user?.role === "CASHIER" || user?.role === "ADMIN",
    refetchInterval: 15000,
  })

  const pendingReviewCount = cashierOrders.filter((o) => o.status === "PAYMENT_REVIEW").length
  const activeOrdersCount = cashierOrders.filter(
    (o) => o.status === "PAYMENT_REVIEW" || o.status === "PREPARING"
  ).length

  // 1. CASHIER ROLE NAVIGATION
  if (user?.role === "CASHIER") {
    const cashierNavItems = [
      {
        path: "/cashier?tab=POS",
        label: "Zal POS",
        icon: Store,
        isActive: location.pathname.startsWith("/cashier") && currentTab === "POS",
      },
      {
        path: "/cashier?tab=ORDERS",
        label: "Buyurtmalar",
        icon: ClipboardList,
        badge: pendingReviewCount > 0 ? pendingReviewCount : activeOrdersCount > 0 ? activeOrdersCount : undefined,
        badgeColor: pendingReviewCount > 0 ? "bg-amber-500" : "bg-emerald-600",
        isActive: location.pathname.startsWith("/cashier") && (currentTab === "ORDERS" || !currentTab),
      },
      {
        path: "/cashier?tab=KIRIM",
        label: "Kirim Qabul",
        icon: PackagePlus,
        isActive: location.pathname.startsWith("/cashier") && currentTab === "KIRIM",
      },
      {
        path: "/profile",
        label: "Profil",
        icon: User,
        isActive: location.pathname.startsWith("/profile"),
      },
    ]

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-emerald-500/20 dark:border-neutral-800 px-3 pt-2 pb-2 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {cashierNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.isActive

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  triggerHaptic("light")
                  navigate(item.path)
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-2xl transition-all ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-neutral-950 ${
                        item.badgeColor || "bg-emerald-600"
                      } animate-pulse`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeCashierTab"
                    className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  // 2. ADMIN ROLE NAVIGATION
  if (user?.role === "ADMIN") {
    const adminNavItems = [
      {
        path: "/admin?tab=STATS",
        label: t.navStats || "Statistika",
        icon: BarChart3,
        isActive:
          location.pathname.startsWith("/admin") &&
          (currentTab === "STATS" || (!searchParams.get("tab") && location.pathname === "/admin")),
      },
      {
        path: "/admin?tab=PRODUCTS",
        label: t.navDishes || "Taomlar",
        icon: UtensilsCrossed,
        isActive: location.pathname.startsWith("/admin") && currentTab === "PRODUCTS",
      },
      {
        path: "/cashier?tab=ORDERS",
        label: t.navCashierPos || "Kassa POS",
        icon: Receipt,
        badge: pendingReviewCount > 0 ? pendingReviewCount : activeOrdersCount > 0 ? activeOrdersCount : undefined,
        badgeColor: pendingReviewCount > 0 ? "bg-amber-500" : "bg-emerald-600",
        isActive: location.pathname.startsWith("/cashier"),
      },
      {
        path: "/profile",
        label: t.navManagement || "Boshqaruv",
        icon: User,
        isActive: location.pathname.startsWith("/profile"),
      },
    ]

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-purple-500/20 dark:border-neutral-800 px-3 pt-2 pb-2 shadow-2xl safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.isActive

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  triggerHaptic("light")
                  navigate(item.path)
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-2xl transition-all ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400 font-bold scale-105"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[17px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-neutral-950 ${
                        item.badgeColor || "bg-purple-600"
                      } animate-pulse`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeAdminTab"
                    className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-purple-600 dark:bg-purple-400"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  // 3. REGULAR CUSTOMER NAVIGATION
  const customerNavItems = [
    { path: "/menu", label: t.navMenu, icon: UtensilsCrossed, aliases: ["/", "/menu"] },
    { path: "/cart", label: t.navCart, icon: ShoppingBag, badge: totalCartCount, aliases: ["/cart"] },
    { path: "/orders", label: t.navOrders, icon: ClipboardList, aliases: ["/orders"] },
    { path: "/profile", label: t.navProfile, icon: User, aliases: ["/profile", "/profile/locations"] },
  ]

  const isCurrentActive = (item: (typeof customerNavItems)[0]) => {
    return item.aliases.some((p) =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80 px-4 pt-2 pb-2 shadow-2xl safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {customerNavItems.map((item) => {
          const Icon = item.icon
          const isActive = isCurrentActive(item)

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                triggerHaptic("light")
                navigate(item.path)
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-[10px] font-medium tracking-tight mt-0.5">
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-1 w-6 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
