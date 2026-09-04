import React from "react"
import { useNavigate } from "react-router-dom"
import {
  ShoppingBag,
  Leaf,
  MapPin,
  Moon,
  Sun,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { useTranslation } from "@/i18n/useTranslation"
import logoImg from "@/assets/logo2.jpg"

interface NavbarProps {
  onOpenCart?: () => void
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { cart, user, theme, setTheme } = useAppStore()
  const { t } = useTranslation()
  const { triggerHaptic } = useTelegram()
  const navigate = useNavigate()

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const isCustomer = !user || user.role === "USER"
  const isAdmin = user?.role === "ADMIN"
  const isCashier = user?.role === "CASHIER"

  const handleLogoClick = () => {
    triggerHaptic("light")
    if (isAdmin) {
      navigate("/admin?tab=STATS")
    } else if (isCashier) {
      navigate("/cashier?tab=POS")
    } else {
      navigate("/")
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md shadow-xs safe-area-top">
      <div className="w-full max-w-[1750px] mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 lg:px-8 gap-4">
        {/* Brand with logo (role-based routing) */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 cursor-pointer select-none group flex-shrink-0"
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl overflow-hidden shadow-md ring-2 ring-emerald-500/30 flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
            <img src={logoImg} alt="Full Food Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-tight text-neutral-900 dark:text-white leading-none">
              <span>Full</span>
              <span className="text-emerald-600 dark:text-emerald-400">Food</span>
              <Leaf className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
              <MapPin className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
            </div>
            <p className="text-[9px] sm:text-[10px] text-rose-600 dark:text-rose-400 font-bold tracking-tight mt-0.5">
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light")
              setTheme(theme === "dark" ? "light" : "dark")
            }}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Mavzuni almashtirish"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User Profile Pill */}
          {user ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light")
                navigate("/profile")
              }}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 transition-all text-left"
              title="Profil va Boshqaruv"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block min-w-0 max-w-[120px]">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate leading-tight">
                  {user.fullName || user.username || "Foydalanuvchi"}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                  {isAdmin ? "Super Admin" : isCashier ? "Kassir" : "Mijoz"}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95"
            >
              Kirish
            </button>
          )}

          {/* Cart button for customers */}
          {isCustomer && (
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-emerald-700 dark:text-emerald-300 transition-all shadow-xs active:scale-95"
              title={t.navCart}
            >
              <ShoppingBag className="h-4 w-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
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
