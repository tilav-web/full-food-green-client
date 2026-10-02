import React, { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "./BottomNav"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"
import { AuthRequiredModal } from "@/components/auth/AuthRequiredModal"

export const MainLayout: React.FC = () => {
  const { isSyncing } = useTelegram()
  const { theme, setUser, accessToken, logout, user } = useAppStore()
  const location = useLocation()

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.body.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
      document.body.classList.remove("dark")
    }
  }, [theme])

  // Automatically refresh profile from server to guarantee fresh role and data
  useEffect(() => {
    if (accessToken) {
      apiClient
        .get("/auth/me")
        .then((res) => {
          if (res.data) {
            setUser({
              ...res.data,
              isTelegramVerified: !!(res.data.phone && res.data.telegramId),
            })
          }
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            logout()
          }
        })
    }
  }, [accessToken, setUser, logout])

  // Detect wide workstation pages (Cashier POS, Admin Panel)
  const isWidePage =
    location.pathname.startsWith("/cashier") ||
    location.pathname.startsWith("/pos") ||
    location.pathname.startsWith("/admin")

  useEffect(() => {
    if (isWidePage) {
      document.documentElement.classList.add("overflow-hidden")
      document.body.classList.add("overflow-hidden")
      return () => {
        document.documentElement.classList.remove("overflow-hidden")
        document.body.classList.remove("overflow-hidden")
      }
    }
  }, [isWidePage])

  const isFullScreenStaff = location.pathname.startsWith("/login")

  const isExcludedPage =
    isFullScreenStaff ||
    isWidePage

  const isAuthRequired =
    !isSyncing &&
    !isExcludedPage &&
    (!user?.phone || user.phone.trim().length === 0)

  return (
    <div
      className={`min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 font-sans transition-colors duration-200 ${
        isWidePage ? "h-screen max-h-screen overflow-hidden" : ""
      }`}
    >
      {/* Main Navbar */}
      <Navbar />

      {/* Mandatory Phone Verification / Login Modal */}
      <AuthRequiredModal isOpen={isAuthRequired} />

      {/* Dynamic Page Content container: wide max-w-[1750px] for POS/Admin, max-w-4xl for Telegram Mini App */}
      <main
        className={`flex-1 mx-auto w-full ${
          isWidePage
            ? "max-w-[1750px] px-2 sm:px-4 lg:px-6 py-2 pb-20 lg:pb-[76px] overflow-hidden flex flex-col min-h-0"
            : "max-w-4xl px-3 sm:px-6 lg:px-8 py-4 pb-28"
        }`}
      >
        <Outlet />
      </main>

      {/* Persistent Bottom Navigation Bar for all pages across all devices */}
      {!isFullScreenStaff && <BottomNav />}

      {!isFullScreenStaff && !isWidePage && (
        <footer className="hidden md:block border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 mb-16">
          <p>&copy; {new Date().getFullYear()} FullFood — Mazali va Sifatli Taomlar Restorani.</p>
        </footer>
      )}
    </div>
  )
}
