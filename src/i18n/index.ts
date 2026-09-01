import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

// Import JSON namespaces for Uzbek
import commonUz from "./locales/uz/common.json"
import menuUz from "./locales/uz/menu.json"
import cartUz from "./locales/uz/cart.json"
import ordersUz from "./locales/uz/orders.json"
import profileUz from "./locales/uz/profile.json"
import cashierUz from "./locales/uz/cashier.json"
import adminUz from "./locales/uz/admin.json"

// Import JSON namespaces for Russian
import commonRu from "./locales/ru/common.json"
import menuRu from "./locales/ru/menu.json"
import cartRu from "./locales/ru/cart.json"
import ordersRu from "./locales/ru/orders.json"
import profileRu from "./locales/ru/profile.json"
import cashierRu from "./locales/ru/cashier.json"
import adminRu from "./locales/ru/admin.json"

export const defaultNS = "common"
export const resources = {
  uz: {
    common: commonUz,
    menu: menuUz,
    cart: cartUz,
    orders: ordersUz,
    profile: profileUz,
    cashier: cashierUz,
    admin: adminUz,
  },
  ru: {
    common: commonRu,
    menu: menuRu,
    cart: cartRu,
    orders: ordersRu,
    profile: profileRu,
    cashier: cashierRu,
    admin: adminRu,
  },
} as const

// Get stored language or fallback to 'uz'
const savedLang = localStorage.getItem("fullfood_lang") || "uz"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: "uz",
    defaultNS: "common",
    fallbackNS: ["common", "menu", "cart", "orders", "profile", "cashier", "admin"],
    ns: ["common", "menu", "cart", "orders", "profile", "cashier", "admin"],
    keySeparator: false,
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "fullfood_lang",
    },
  })

export default i18n
