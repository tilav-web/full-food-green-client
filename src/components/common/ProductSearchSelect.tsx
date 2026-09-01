import React, { useState, useRef, useEffect, useMemo } from "react"
import { Search, ChevronDown, Check, X, Package, UtensilsCrossed } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types"

interface ProductSearchSelectProps {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  placeholder?: string
  label?: string
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = "Taom yoki mahsulotni qidiring...",
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === value) || null,
    [products, value]
  )

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products
    const query = searchTerm.toLowerCase().trim()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category?.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    )
  }, [products, searchTerm])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchTerm("")
    }
  }, [isOpen])

  const handleSelect = (productId: string) => {
    onChange(productId)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setSearchTerm("")
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button / Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all outline-none bg-neutral-50 dark:bg-neutral-800 ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50"
        }`}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {selectedProduct.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt=""
                className="h-7 w-7 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 flex-shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                {selectedProduct.name}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                <span>{selectedProduct.price?.toLocaleString()} so'm</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Qoldiq: {selectedProduct.stockQuantity ?? 0} ta
                </span>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs font-medium text-neutral-400 truncate">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedProduct && (
            <span
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Search & Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Taom nomini yozing..."
                  className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
              {filteredProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400 space-y-1">
                  <Package className="h-6 w-6 mx-auto text-neutral-300 dark:text-neutral-700" />
                  <p>Mos keluvchi taom topilmadi</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === value

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center flex-shrink-0">
                            <UtensilsCrossed className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            {p.category?.name && <span>{p.category.name}</span>}
                            {p.category?.name && <span>•</span>}
                            <span>{p.price?.toLocaleString()} so'm</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                        <Badge
                          variant="secondary"
                          className="text-[9px] font-bold bg-neutral-100 dark:bg-neutral-800"
                        >
                          Omborda: {p.stockQuantity ?? 0} ta
                        </Badge>
                        {isSelected && (
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProductSearchSelect
