import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(url?: string): string {
  if (!url) return "/logo.jpg"
  if (url.startsWith("data:")) {
    return url
  }
  // If url is absolute, check if it points to /uploads/
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("/uploads/")) {
      return `/uploads/${url.split("/uploads/")[1]}`
    }
    return url
  }
  if (url.startsWith("/uploads/")) {
    return url
  }
  if (url.startsWith("uploads/")) {
    return `/${url}`
  }
  if (url.startsWith("/")) {
    return url
  }
  return `/uploads/${url}`
}
