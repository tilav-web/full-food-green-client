import React, { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ShieldAlert, Store, ArrowRight } from "lucide-react"
import { apiClient } from "@/api/axios"
import { useAppStore } from "@/store/useAppStore"
import { PromoBanner } from "@/components/user/PromoBanner"
import { MenuCatalog } from "@/components/user/MenuCatalog"
import type { Category, Product, Combo } from "@/types"

export const Home: React.FC = () => {
  const { user } = useAppStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isViewMenuMode = searchParams.get("viewMenu") === "true"

  useEffect(() => {
    // If Admin or Cashier landed on default Home/Menu without explicit ?viewMenu=true flag
    if (!isViewMenuMode) {
      if (user?.role === "ADMIN") {
        navigate("/admin?tab=STATS", { replace: true })
      } else if (user?.role === "CASHIER") {
        navigate("/cashier?tab=POS", { replace: true })
      }
    }
  }, [user?.role, isViewMenuMode, navigate])

  // Fetch Categories, Products, Combos
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => (await apiClient.get("/products/categories")).data,
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => (await apiClient.get("/products")).data,
  })

  const { data: combos = [] } = useQuery<Combo[]>({
    queryKey: ["combos"],
    queryFn: async () => (await apiClient.get("/products/combos")).data,
  })

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-6">
      {/* Role Banner for Admin when viewing customer menu */}
      {user?.role === "ADMIN" && isViewMenuMode && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-purple-600 flex-shrink-0" />
            <span className="font-semibold">Super Admin (Mijozlar menyusi)</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin?tab=STATS")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600 text-white font-bold text-[11px] shadow-xs hover:bg-purple-700 transition-colors"
          >
            <span>Boshqaruv</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Role Banner for Cashier when viewing customer menu */}
      {user?.role === "CASHIER" && isViewMenuMode && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold">Kassir (Mijozlar menyusi)</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/cashier?tab=POS")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-[11px] shadow-xs hover:bg-blue-700 transition-colors"
          >
            <span>Kassa POS</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Top Promotional Stories Carousel */}
      <PromoBanner onSelectTab={() => {}} />

      {/* Mixed Dishes & Combos Feed with URL Search Params Sync */}
      <MenuCatalog
        categories={categories}
        products={products}
        combos={combos}
      />
    </div>
  )
}
