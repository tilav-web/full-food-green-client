import React from "react"
import { useTranslation } from "@/i18n/useTranslation"

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useTranslation()

  return (
    <div className="flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold shadow-xs">
      <button
        onClick={() => setLang("uz")}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          lang === "uz"
            ? "bg-emerald-600 text-white shadow-xs"
            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        }`}
      >
        UZ
      </button>
      <button
        onClick={() => setLang("ru")}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          lang === "ru"
            ? "bg-emerald-600 text-white shadow-xs"
            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        }`}
      >
        RU
      </button>
    </div>
  )
}
