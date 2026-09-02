import { useEffect, useState, useCallback } from "react"
import { apiClient } from "@/api/axios"
import { useAppStore } from "@/store/useAppStore"

declare global {
  interface Window {
    Telegram?: {
      WebApp: any
    }
  }
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState(false)
  const [tgUser, setTgUser] = useState<any>(null)
  const [initDataRaw, setInitDataRaw] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { user, setUser, theme, cart } = useAppStore()

  // Initialize Telegram WebApp capabilities on mount
  useEffect(() => {
    const webapp = window.Telegram?.WebApp

    if (webapp && (webapp.initData || webapp.initDataUnsafe?.user)) {
      setIsTelegram(true)
      setInitDataRaw(webapp.initData || "")

      // 1. Inform Telegram that Mini App is ready
      webapp.ready()

      // 2. Expand to 100% full viewport height
      webapp.expand()

      // 3. Request Fullscreen mode (Telegram 7.7+ / 8.0+)
      if (typeof webapp.requestFullscreen === "function") {
        try {
          webapp.requestFullscreen()
          setIsFullscreen(true)
        } catch (e) {
          console.warn("Fullscreen request error:", e)
        }
      }

      // Safe Area Inset synchronization for iOS Dynamic Island / Notch / Android Navigation Bar
      const updateSafeArea = () => {
        try {
          const contentTop = webapp.contentSafeAreaInset?.top ?? webapp.safeAreaInset?.top ?? 0
          const contentBottom = webapp.contentSafeAreaInset?.bottom ?? webapp.safeAreaInset?.bottom ?? 0

          if (contentTop > 0) {
            document.documentElement.style.setProperty("--tg-safe-area-inset-top", `${contentTop}px`)
            document.documentElement.style.setProperty("--tg-content-safe-area-inset-top", `${contentTop}px`)
          }
          if (contentBottom > 0) {
            document.documentElement.style.setProperty("--tg-safe-area-inset-bottom", `${contentBottom}px`)
            document.documentElement.style.setProperty("--tg-content-safe-area-inset-bottom", `${contentBottom}px`)
          }
        } catch (err) {
          console.warn("SafeArea inset error:", err)
        }
      }

      updateSafeArea()
      webapp.onEvent?.("safeAreaChanged", updateSafeArea)
      webapp.onEvent?.("contentSafeAreaChanged", updateSafeArea)

      // 4. Style Telegram Header and Background with Emerald Brand colors
      try {
        const headerColor = theme === "dark" ? "#0a0a0a" : "#059669"
        const bgColor = theme === "dark" ? "#0a0a0a" : "#fafafa"

        if (typeof webapp.setHeaderColor === "function") {
          webapp.setHeaderColor(headerColor)
        }
        if (typeof webapp.setBackgroundColor === "function") {
          webapp.setBackgroundColor(bgColor)
        }
      } catch (e) {
        console.warn("Header/Bg color styling error:", e)
      }

      // 5. Extract initData user and auto-sync with backend
      if (webapp.initDataUnsafe?.user) {
        const userObj = webapp.initDataUnsafe.user
        setTgUser(userObj)

        apiClient
          .post("/auth/telegram-sync", {
            telegramId: String(userObj.id),
            username: userObj.username,
            fullName: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || userObj.first_name || "Mijoz",
            initData: webapp.initData,
          })
          .then((res) => {
            if (res.data?.user) {
              setUser({
                ...res.data.user,
                isTelegramVerified: !!(res.data.user.phone && res.data.user.telegramId),
              })
            }
          })
          .catch((err) => {
            console.warn("Telegram sync warning:", err)
          })
      }
    } else {
      setIsTelegram(false)

      // Fallback: Check if desktop web was opened with ?auth_token=... from Bot
      const urlParams = new URLSearchParams(window.location.search)
      const authToken = urlParams.get("auth_token")
      if (authToken) {
        apiClient
          .get(`/auth/web-session-status/${authToken}`)
          .then((res) => {
            if (res.data?.status === "COMPLETED" && res.data.user) {
              setUser({ ...res.data.user, isTelegramVerified: true })
              window.history.replaceState({}, document.title, window.location.pathname)
            }
          })
          .catch(console.warn)
      }
    }
  }, [setUser, theme])

  // Closing confirmation toggle when cart is not empty (Telegram WebApp 6.2+)
  useEffect(() => {
    const webapp = window.Telegram?.WebApp
    if (
      webapp &&
      typeof webapp.isVersionAtLeast === "function" &&
      webapp.isVersionAtLeast("6.2") &&
      typeof webapp.enableClosingConfirmation === "function"
    ) {
      if (cart.length > 0) {
        webapp.enableClosingConfirmation()
      } else {
        webapp.disableClosingConfirmation?.()
      }
    }
  }, [cart.length])

  // 1-Tap Phone Request directly from Mini App UI button
  const requestPhoneContact = useCallback(
    async (): Promise<{ success: boolean; phone?: string; error?: string }> => {
      const webapp = window.Telegram?.WebApp

      if (!webapp) {
        return { success: false, error: "Not inside Telegram" }
      }

      // Check if Telegram supports requestContact native API
      if (typeof webapp.requestContact === "function") {
        return new Promise((resolve) => {
          webapp.requestContact((granted: boolean, response: any) => {
            if (granted) {
              const rawContact = response?.responseUnsafe?.contact || response?.contact
              const phoneNumber = rawContact?.phone_number || ""

              if (phoneNumber) {
                // Attach phone to user on backend
                const tgId = webapp.initDataUnsafe?.user?.id || user?.telegramId

                apiClient
                  .post("/auth/telegram-sync", {
                    telegramId: String(tgId),
                    phone: phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`,
                    username: webapp.initDataUnsafe?.user?.username || user?.username,
                    fullName:
                      user?.fullName ||
                      `${webapp.initDataUnsafe?.user?.first_name || ""} ${webapp.initDataUnsafe?.user?.last_name || ""}`.trim(),
                  })
                  .then((res) => {
                    if (res.data?.user) {
                      setUser({ ...res.data.user, isTelegramVerified: true })
                    }
                    resolve({ success: true, phone: phoneNumber })
                  })
                  .catch((err) => {
                    resolve({ success: false, error: err.message })
                  })
              } else {
                resolve({ success: true })
              }
            } else {
              resolve({ success: false, error: "Permission denied by user" })
            }
          })
        })
      } else {
        // Fallback: Open bot chat to request contact
        if (typeof webapp.openTelegramLink === "function") {
          webapp.openTelegramLink("https://t.me/fullfoodbot?start=auth_verify")
        }
        return { success: false, error: "requestContact not supported on this Telegram version" }
      }
    },
    [user, setUser]
  )

  // Haptic feedback engine
  const triggerHaptic = useCallback(
    (style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") => {
      const webapp = window.Telegram?.WebApp
      if (webapp?.HapticFeedback) {
        if (["light", "medium", "heavy"].includes(style)) {
          webapp.HapticFeedback.impactOccurred(style)
        } else {
          webapp.HapticFeedback.notificationOccurred(style)
        }
      }
    },
    []
  )

  // Native Telegram Popups & Links
  const showNativeAlert = (message: string) => {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message)
    } else {
      alert(message)
    }
  }

  const showNativeConfirm = (message: string): Promise<boolean> => {
    if (window.Telegram?.WebApp?.showConfirm) {
      return new Promise((resolve) => {
        window.Telegram?.WebApp?.showConfirm(message, (confirmed: boolean) => {
          resolve(confirmed)
        })
      })
    }
    return Promise.resolve(window.confirm(message))
  }

  const openTgLink = (url: string) => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, "_blank")
    }
  }

  return {
    isTelegram,
    tgUser,
    initDataRaw,
    isFullscreen,
    tgWebApp: window.Telegram?.WebApp,
    triggerHaptic,
    requestPhoneContact,
    showNativeAlert,
    showNativeConfirm,
    openTgLink,
  }
}
