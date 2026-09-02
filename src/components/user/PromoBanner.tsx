import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, ArrowRight, ShieldCheck, Flame } from "lucide-react"
import { apiClient } from "@/api/axios"
import { getImageUrl } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { Banner } from "@/types"

interface PromoBannerProps {
  onSelectTab?: (tab: "MENU" | "ORDERS") => void
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onSelectTab }) => {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Fetch dynamic banners from backend
  const { data: dbBanners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => (await apiClient.get("/banners?active=true")).data,
  })

  const banners = dbBanners

  // Auto-Slide Timer (Rotates every 4.5 seconds like high-converting food ad banners)
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 4500)

    return () => clearInterval(timer)
  }, [banners.length, isPaused])

  const handleBannerClick = (banner: Banner) => {
    // 1. External / Sponsor Ad Link (no internal page needed)
    if (banner.actionType === "LINK" && banner.actionTarget) {
      const url = banner.actionTarget.trim()
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("tg://") ||
        url.startsWith("//")
      ) {
        if ((window as any).Telegram?.WebApp?.openLink && (url.startsWith("http://") || url.startsWith("https://"))) {
          ;(window as any).Telegram.WebApp.openLink(url)
        } else {
          window.open(url, "_blank", "noopener,noreferrer")
        }
      } else {
        navigate(url)
      }
      return
    }

    // 2. Category link
    if (banner.actionType === "CATEGORY" && banner.actionTarget) {
      navigate(`/menu?category=${banner.actionTarget}`)
      return
    }

    // 3. Constructor
    if (banner.actionType === "CONSTRUCTOR") {
      navigate("/constructor")
      return
    }

    // 4. Specific dish
    if (banner.actionType === "DISH" && banner.actionTarget) {
      navigate(`/dish/${banner.actionTarget}`)
      return
    }

    // 5. Default: Open dedicated Promotion Landing Page with clean SEO slug!
    const targetSlug = banner.slug || banner.id
    navigate(`/promo/${targetSlug}`)
    if (onSelectTab) onSelectTab("MENU")
  }

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true)
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false)
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (diff > 40) {
      handleNext()
    } else if (diff < -40) {
      handlePrev()
    }
    touchStartX.current = null
  }

  if (isLoading) {
    return <Skeleton className="w-full h-[175px] sm:h-[195px] rounded-3xl" />
  }

  if (banners.length === 0) return null

  const currentBanner = banners[currentIndex] || banners[0]

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner.id || currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            willChange: "transform, opacity",
          }}
          onClick={() => handleBannerClick(currentBanner)}
          className={`w-full min-h-[175px] sm:min-h-[195px] rounded-3xl bg-gradient-to-br ${
            currentBanner.gradient || "from-emerald-700 via-teal-800 to-emerald-950"
          } p-5 sm:p-6 text-white shadow-xl relative overflow-hidden cursor-pointer border border-white/15 flex flex-col justify-between group transition-all`}
        >
          {/* Subtle Background Glow Elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/15 rounded-full blur-2xl pointer-events-none" />

          {/* Background image preview - ONLY rendered if banner has a real imageUrl */}
          {Boolean(currentBanner.imageUrl) && (
            <div className="absolute right-0 top-0 bottom-0 w-[55%] sm:w-[50%] opacity-30 pointer-events-none transition-transform duration-700 group-hover:scale-105">
              <img
                src={getImageUrl(currentBanner.imageUrl)}
                alt={currentBanner.title}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                }}
                className="h-full w-full object-cover rounded-r-3xl"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black/80" />
            </div>
          )}

          {/* Top Row: Badge & Promo Counter Indicator */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black text-white border border-white/25 shadow-xs">
              <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
              <span>{currentBanner.badge || "Aksiya"}</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bold text-white/80 bg-black/30 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
              <Flame className="h-3 w-3 text-amber-400" />
              <span>
                {currentIndex + 1} / {banners.length}
              </span>
            </div>
          </div>

          {/* Center Info: Title and Description */}
          <div className="relative z-10 space-y-1.5 max-w-[72%] sm:max-w-[70%] my-auto py-2">
            <h3 className="text-lg sm:text-2xl font-black leading-tight tracking-tight drop-shadow-sm line-clamp-2">
              {currentBanner.title}
            </h3>
            <p className="text-xs sm:text-sm text-white/85 line-clamp-2 leading-snug font-medium">
              {currentBanner.description}
            </p>
          </div>

          {/* Bottom Row: Call To Action and Quality Guarantee */}
          <div className="relative z-10 pt-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-black bg-white text-emerald-950 px-3.5 py-1.5 rounded-xl shadow-md transition-all group-hover:bg-emerald-50 group-hover:scale-105">
              {currentBanner.actionText || "Aksiyani ko'rish"}
              <ArrowRight className="h-3.5 w-3.5 text-emerald-700 transition-transform group-hover:translate-x-1" />
            </span>

            <div className="flex items-center gap-1 text-[10px] font-bold text-white/80">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>100% Parhezbop</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Pagination Dots */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2.5 pb-1">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(idx)
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? "w-6 bg-emerald-600 dark:bg-emerald-400"
                  : "w-2 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400"
              }`}
              title={`Slayd ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
