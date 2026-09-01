import React, { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { apiClient } from "@/api/axios"

interface ImageUploadFieldProps {
  value?: string
  onChange: (url: string) => void
  label?: string
  aspectRatio?: "square" | "wide"
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  label = "Rasm yuklash",
  aspectRatio = "wide",
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiClient.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      onChange(res.data.url)
    } catch (err) {
      console.error(err)
      alert("Rasm yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
          <span>{label}</span>
          {value && (
            <span className="text-[10px] text-emerald-600 font-semibold">Yuklangan</span>
          )}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {value ? (
        <div
          className={`relative w-full rounded-2xl overflow-hidden border border-emerald-500/40 group shadow-xs ${
            aspectRatio === "square" ? "h-36" : "h-40"
          }`}
        >
          <img
            src={value}
            alt="Uploaded Preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-neutral-900 text-xs font-bold shadow-md transition-transform active:scale-95"
            >
              Almashtirish
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md transition-transform active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`w-full rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-neutral-50 dark:bg-neutral-800/60 transition-all flex flex-col items-center justify-center cursor-pointer p-4 group ${
            aspectRatio === "square" ? "h-32" : "h-36"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-emerald-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-bold">Rasm yuklanmoqda...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-neutral-400 group-hover:text-emerald-600 transition-colors">
              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-800 shadow-xs border border-neutral-200 dark:border-neutral-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Rasmni tanlang yoki bu yerga tashlang
              </p>
              <span className="text-[10px] text-neutral-400">
                PNG, JPG, JPEG (Maks. 10MB)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
