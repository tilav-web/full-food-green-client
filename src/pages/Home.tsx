import React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/axios"
import { PromoBanner } from "@/components/user/PromoBanner"
import { MenuCatalog } from "@/components/user/MenuCatalog"
import type { Category, Product, Combo } from "@/types"

export const Home: React.FC = () => {
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
