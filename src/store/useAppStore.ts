import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { User, CartItem, Order, OrderContainer } from "@/types"

export interface SavedLocationItem {
  id: string
  label: "Uy" | "Ishxona" | "Boshqa" | string
  address: string
  lat: number
  lng: number
  distanceKm: number
}

interface AppState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  theme: "light" | "dark"
  lang: "uz" | "ru"
  cart: CartItem[]
  containers: OrderContainer[]
  currentActiveOrder: Order | null
  savedLocations: SavedLocationItem[]

  // Auth actions
  setUser: (user: User | null) => void
  setAuth: (user: User | null, accessToken?: string | null, refreshToken?: string | null) => void
  updateUserBalance: (balance: number) => void
  logout: () => void

  // Appearance & Language
  setLang: (lang: "uz" | "ru") => void
  setTheme: (theme: "light" | "dark") => void
  toggleTheme: () => void

  // Cart & Packaging actions
  addToCart: (item: CartItem) => void
  removeFromCart: (cartItemId: string) => void
  updateCartQuantity: (cartItemId: string, delta: number) => void
  getItemQuantity: (productId?: string, comboId?: string) => number
  clearCart: () => void
  setContainers: (containers: OrderContainer[] | ((prev: OrderContainer[]) => OrderContainer[])) => void
  clearContainers: () => void
  setCurrentActiveOrder: (order: Order | null) => void

  // Location actions
  addSavedLocation: (location: Omit<SavedLocationItem, "id">) => SavedLocationItem
  removeSavedLocation: (id: string) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: localStorage.getItem("fullfood_access_token") || null,
        refreshToken: localStorage.getItem("fullfood_refresh_token") || null,
        theme: "light",
        lang: "uz",
        cart: [],
        containers: [],
        currentActiveOrder: null,
        savedLocations: [],

        setUser: (user) => set({ user }),

        setAuth: (user, accessToken, refreshToken) => {
          if (accessToken) {
            localStorage.setItem("fullfood_access_token", accessToken)
          }
          if (refreshToken) {
            localStorage.setItem("fullfood_refresh_token", refreshToken)
          }
          set({
            user,
            accessToken: accessToken || get().accessToken,
            refreshToken: refreshToken || get().refreshToken,
          })
        },

        updateUserBalance: (balance: number) => {
          set((state) => ({
            user: state.user ? { ...state.user, balance } : null,
          }))
        },

        logout: () => {
          localStorage.removeItem("fullfood_access_token")
          localStorage.removeItem("fullfood_refresh_token")
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            currentActiveOrder: null,
          })
        },

        setLang: (lang) => set({ lang }),

        setTheme: (theme) => {
          if (theme === "dark") {
            document.documentElement.classList.add("dark")
          } else {
            document.documentElement.classList.remove("dark")
          }
          set({ theme })
        },

        toggleTheme: () =>
          set((state) => {
            const nextTheme = state.theme === "light" ? "dark" : "light"
            if (nextTheme === "dark") {
              document.documentElement.classList.add("dark")
            } else {
              document.documentElement.classList.remove("dark")
            }
            return { theme: nextTheme }
          }),

        addToCart: (newItem) => {
          const currentCart = get().cart
          if (!newItem.customPlate) {
            const existingIndex = currentCart.findIndex(
              (i) =>
                (newItem.productId && i.productId === newItem.productId) ||
                (newItem.comboId && i.comboId === newItem.comboId)
            )
            if (existingIndex > -1) {
              const updated = [...currentCart]
              updated[existingIndex].quantity += newItem.quantity
              set({ cart: updated })
              return
            }
          }
          set({ cart: [...currentCart, newItem] })
        },

        removeFromCart: (cartItemId) => {
          set({ cart: get().cart.filter((item) => item.id !== cartItemId) })
        },

        updateCartQuantity: (cartItemId, delta) => {
          const currentCart = get().cart
          const updated = currentCart
            .map((item) => {
              if (item.id === cartItemId) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : null
              }
              return item
            })
            .filter(Boolean) as CartItem[]

          set({ cart: updated })
        },

        getItemQuantity: (productId, comboId) => {
          const cart = get().cart
          return cart
            .filter(
              (i) =>
                (productId && i.productId === productId) ||
                (comboId && i.comboId === comboId)
            )
            .reduce((sum, i) => sum + i.quantity, 0)
        },

        clearCart: () => set({ cart: [], containers: [] }),

        setContainers: (action) =>
          set((state) => ({
            containers: typeof action === "function" ? action(state.containers) : action,
          })),

        clearContainers: () => set({ containers: [] }),

        setCurrentActiveOrder: (order) => set({ currentActiveOrder: order }),

        addSavedLocation: (location) => {
          const newLoc: SavedLocationItem = {
            ...location,
            id: `loc_${Date.now()}`,
          }
          set((state) => ({ savedLocations: [...state.savedLocations, newLoc] }))
          return newLoc
        },

        removeSavedLocation: (id) =>
          set((state) => ({
            savedLocations: state.savedLocations.filter((l) => l.id !== id),
          })),
      }),
      {
        name: "fullfood_storage",
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          lang: state.lang,
          savedLocations: state.savedLocations,
          cart: state.cart,
          containers: state.containers,
          currentActiveOrder: state.currentActiveOrder,
        }),
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.savedLocations)) {
            state.savedLocations = state.savedLocations.filter(
              (l) => l.id !== "loc_home" && l.id !== "loc_work"
            )
          }
        },
      }
    )
  )
)
