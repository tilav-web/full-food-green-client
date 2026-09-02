export type Role = "USER" | "CASHIER" | "ADMIN"

export type ProductType = "FIXED_COUNT" | "PORTION_BASED"

export interface User {
  id: string
  username: string
  fullName: string
  phone?: string
  role: Role
  telegramId?: string
  isTelegramVerified?: boolean
}

export interface BannerItem {
  id: string
  type: "PRODUCT" | "COMBO" | "CUSTOM"
  referenceId?: string
  name: string
  description?: string
  price: number
  oldPrice?: number
  badge?: string
  imageUrl?: string
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  unitName?: string
  isActive: boolean
  sortOrder?: number
}

export interface Banner {
  id: string
  badge: string
  title: string
  slug?: string
  description?: string
  gradient: string
  imageUrl?: string
  actionType: "MENU" | "CONSTRUCTOR" | "CATEGORY" | "DISH" | "LINK" | "PROMO_PAGE"
  actionTarget?: string
  actionText: string
  sortOrder: number
  isActive: boolean
  itemsJson?: string
  items?: BannerItem[]
  createdAt?: string
  updatedAt?: string
}

export interface Unit {
  id: string
  name: string
  shortName?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string
  imageUrl?: string
  sortOrder: number
  products?: Product[]
}

export interface Product {
  id: string
  name: string
  slug?: string
  description?: string
  categoryId?: string
  category?: Category
  unitId?: string
  unit?: Unit
  type: ProductType
  price: number
  costPrice?: number
  packagingLevel?: number
  oldPrice?: number
  stockQuantity: number
  calories: number
  protein: number
  fat: number
  carbs: number
  imageUrl?: string
  isActive: boolean
  unitName: string
}

export interface Combo {
  id: string
  name: string
  slug?: string
  description?: string
  price: number
  oldPrice?: number
  calories: number
  protein: number
  fat: number
  carbs: number
  imageUrl?: string
  itemsJson: string
  isActive: boolean
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PREPARING"
  | "READY_FOR_DELIVERY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED"

export type PaymentMethod = "CARD_TRANSFER" | "CASH" | "TERMINAL"
export type PaymentStatus = "UNPAID" | "REVIEW" | "PAID" | "REJECTED"

export interface OrderItem {
  id?: string
  productId?: string
  comboId?: string
  name: string
  quantity: number
  portionCount: number
  unitPrice: number
  totalPrice: number
  costPrice?: number
  totalCost?: number
  customPlateJson?: string
}

export interface OrderContainerItem {
  cartItemId: string
  name: string
  quantity: number
  packagingLevel?: number
  unitName?: string
  imageUrl?: string
}

export interface OrderContainer {
  id: string
  name: string // "1-Idish", "2-Idish", etc.
  label?: string // e.g. "Tushlik", "Ahmad uchun"
  items: OrderContainerItem[]
}

export interface Order {
  id: string
  orderNumber: string
  userId?: string
  customerName: string
  customerPhone: string
  type: "ONLINE_DELIVERY" | "ONLINE_PICKUP" | "DINE_IN"
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  packagingFee?: number
  totalAmount: number
  address?: string
  extraPhone?: string
  building?: string
  floor?: string
  apartment?: string
  latitude?: number
  longitude?: number
  distanceKm?: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  receiptImageUrl?: string
  receiptRejectReason?: string
  isYandexTaxiCalled: boolean
  yandexTaxiOrderId?: string
  yandexTaxiStatus?: string
  notes?: string
  containersJson?: string
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface InventoryLog {
  id: string
  productId: string
  product?: Product
  type: "KIRIM" | "SOTUV" | "HISOBDAN_CHIQARISH" | "TUZATISH"
  quantity: number
  previousStock: number
  newStock: number
  costPrice?: number
  supplier?: string
  note?: string
  createdBy?: string
  createdAt: string
}

export interface CartItem {
  id: string
  productId?: string
  comboId?: string
  name: string
  price: number
  oldPrice?: number
  quantity: number
  portionCount: number
  packagingLevel?: number
  unitName?: string
  imageUrl?: string
  calories?: number
  customPlate?: {
    portions: Array<{
      productId: string
      name: string
      portions: number
      price: number
      calories: number
    }>
  }
}
