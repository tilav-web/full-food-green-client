import { useTranslation as useReactI18next } from "react-i18next"
import { useAppStore } from "@/store/useAppStore"
import { useEffect } from "react"
import { resources } from "./index"

export type Language = "uz" | "ru"

export function useTranslation(ns?: string | string[]) {
  const { t: i18nTranslate, i18n: currentI18n } = useReactI18next(
    ns || ["common", "menu", "cart", "orders", "profile", "cashier", "admin"]
  )
  const { lang, setLang: setStoreLang } = useAppStore()

  const currentLang = (lang === "ru" || currentI18n.language?.startsWith("ru") ? "ru" : "uz") as Language

  // Sync state between Zustand and i18next
  useEffect(() => {
    if (lang && lang !== currentI18n.language) {
      currentI18n.changeLanguage(lang)
    }
  }, [lang, currentI18n])

  const setLang = (newLang: Language) => {
    setStoreLang(newLang)
    currentI18n.changeLanguage(newLang)
    localStorage.setItem("fullfood_lang", newLang)
  }

  const lookupFallback = (key: string, isPropAccess = false): string => {
    const targetLang = lang === "ru" || currentI18n.language?.startsWith("ru") ? "ru" : "uz"
    const langRes = (resources as any)[targetLang] || (resources as any).uz
    for (const nsKey of Object.keys(langRes)) {
      if (langRes[nsKey] && langRes[nsKey][key] !== undefined) {
        return langRes[nsKey][key]
      }
    }
    // Also check alternate language if missing
    const altLang = targetLang === "ru" ? "uz" : "ru"
    const altRes = (resources as any)[altLang]
    if (altRes) {
      for (const nsKey of Object.keys(altRes)) {
        if (altRes[nsKey] && altRes[nsKey][key] !== undefined) {
          return altRes[nsKey][key]
        }
      }
    }
    return isPropAccess ? "" : key
  }

  // Create a smart proxy object so `t.key` and `t("key")` both work effortlessly
  const smartT = new Proxy(i18nTranslate, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as any)[prop]
      }
      const val = target(prop)
      if (val === prop || !val) {
        return lookupFallback(prop, true)
      }
      return val
    },
    apply(target, thisArg, argArray) {
      const key = argArray[0]
      const val = Reflect.apply(target, thisArg, argArray)
      if (val === key && typeof key === "string") {
        return lookupFallback(key, false)
      }
      return val
    },
  }) as typeof i18nTranslate & Record<string, string>

  return {
    t: smartT,
    i18n: currentI18n,
    lang: currentLang,
    setLang,
  }
}
