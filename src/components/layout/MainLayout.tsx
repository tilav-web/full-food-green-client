import React, { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "./BottomNav"
import { useAppStore } from "@/store/useAppStore"
import { useTelegram } from "@/hooks/useTelegram"
import { apiClient } from "@/api/axios"

export const MainLayout: React.FC = () => {
  useTelegram()
  const { theme, setUser, accessToken, logout } = useAppStore()
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

  const isFullScreenStaff = location.pathname.startsWith("/login")

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 font-sans transition-colors duration-200">
      {/* Main Navbar */}
      <Navbar />

      {/* Dynamic Page Content container: wide max-w-[1750px] for POS/Admin, max-w-4xl for Telegram Mini App */}
      <main
        className={`flex-1 mx-auto w-full pb-28 ${
          isWidePage
            ? "max-w-[1750px] px-2 sm:px-4 lg:px-6 py-2.5"
            : "max-w-4xl px-3 sm:px-6 lg:px-8 py-4"
        }`}
      >
        <Outlet />
      </main>

      {/* Persistent Bottom Navigation Bar for all pages across all devices */}
      {!isFullScreenStaff && <BottomNav />}

      <footer className="hidden md:block border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 mb-16">
        <p>&copy; {new Date().getFullYear()} FullFood — Mazali va Sifatli Taomlar Restorani.</p>
      </footer>
    </div>
  )
}
