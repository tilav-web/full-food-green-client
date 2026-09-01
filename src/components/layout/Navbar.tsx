import React from "react"
import { useNavigate } from "react-router-dom"
import { ShoppingBag, Leaf } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { useTranslation } from "@/i18n/useTranslation"
import logoImg from "@/assets/logo2.jpg"

interface NavbarProps {
  onOpenCart?: () => void
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { cart, user } = useAppStore()
  const { t } = useTranslation()
  const { triggerHaptic } = useTelegram()
  const navigate = useNavigate()

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const isCustomer = !user || user.role === "USER"

  const handleLogoClick = () => {
    triggerHaptic("light")
    if (user?.role === "ADMIN") {
      navigate("/admin?tab=STATS")
    } else if (user?.role === "CASHIER") {
      navigate("/cashier?tab=ORDERS")
    } else {
      navigate("/menu")
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-xs safe-area-top">
      <div className="container mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand with logo (role-based routing) */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="h-10 w-10 rounded-2xl overflow-hidden shadow-md ring-2 ring-emerald-500/30 flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
            <img src={logoImg} alt="Full Food Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-black text-xl tracking-tight text-neutral-900 dark:text-white">
              <span>Full</span>
              <span className="text-emerald-600 dark:text-emerald-400">Food</span>
              <Leaf className="h-4 w-4 text-emerald-500 fill-emerald-500" />
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold tracking-wide uppercase">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart button routed to /cart */}
          {isCustomer && (
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-emerald-700 dark:text-emerald-300 transition-all shadow-xs active:scale-95"
              title={t.navCart}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
