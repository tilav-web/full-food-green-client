import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(url?: string): string {
  if (!url) return "/logo.jpg"
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url
  }
  const apiUrl = import.meta.env.VITE_API_URL || "https://api.full-food.hotel-familyhouse.uz/api"
  const backendBase = apiUrl.replace(/\/api\/?$/, "")
  const cleanPath = url.startsWith("/") ? url : `/${url}`
  return `${backendBase}${cleanPath}`
}
