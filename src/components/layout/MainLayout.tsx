import React, { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { BottomNav } from "./BottomNav"
import { useAppStore } from "@/store/useAppStore"

export const MainLayout: React.FC = () => {
  const { theme } = useAppStore()
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

  // Show BottomNav across all customer and staff pages (only hide on login page)
  const isFullScreenStaff = location.pathname.startsWith("/login")

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 font-sans transition-colors duration-200">
      {/* Main Navbar */}
      <Navbar />

      {/* Mobile-first Page Content container */}
      <main className="flex-1 container mx-auto max-w-4xl px-3 sm:px-6 lg:px-8 py-4 pb-24">
        <Outlet />
      </main>

      {/* Persistent Bottom Navigation Bar for all customer pages */}
      {!isFullScreenStaff && <BottomNav />}

      <footer className="hidden md:block border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 mb-16">
        <p>&copy; {new Date().getFullYear()} FullFood — Mazali va Sifatli Taomlar Restorani.</p>
      </footer>
    </div>
  )
}
