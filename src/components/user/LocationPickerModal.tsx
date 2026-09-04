import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  X,
  Car,
  Home,
  Briefcase,
  Crosshair,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Building,
  Layers,
  DoorClosed,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import { useAppStore } from "@/store/useAppStore"

interface LocationPickerModalProps {
  isOpen: boolean
  currentAddress?: string
  currentDistance?: number
  currentLat?: number
  currentLng?: number
  onConfirm: (address: string, distanceKm: number, fee: number, lat?: number, lng?: number) => void
  onClose: () => void
}

const RESTAURANT_COORDS = [38.83825, 65.792222] // Full Food Restaurant Location (Qarshi)
const YANDEX_API_KEY = "0faa0d3b-2049-4fbc-b77e-437de12c50a3"

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  currentAddress,
  currentDistance,
  currentLat,
  currentLng,
  onConfirm,
  onClose,
}) => {
  const { triggerHaptic, requestLocation } = useTelegram()
  const { addSavedLocation } = useAppStore()

  // Coords state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    currentLat && currentLng ? { lat: currentLat, lng: currentLng } : null
  )
  const [isGpsLocated, setIsGpsLocated] = useState<boolean>(false)
  const [address, setAddress] = useState(currentAddress || "")
  const [distanceKm, setDistanceKm] = useState(currentDistance || 2.0)
  const [isLocating, setIsLocating] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Extra details
  const [selectedLabel, setSelectedLabel] = useState<"Uy" | "Ishxona" | "Boshqa">("Uy")
  const [building, setBuilding] = useState("")
  const [floor, setFloor] = useState("")
  const [apartment, setApartment] = useState("")

  // Calculate distance in KM using Haversine formula
  const calculateDistance = (lat: number, lng: number) => {
    const R = 6371
    const dLat = ((lat - RESTAURANT_COORDS[0]) * Math.PI) / 180
    const dLon = ((lng - RESTAURANT_COORDS[1]) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((RESTAURANT_COORDS[0] * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.max(0.5, Math.round(R * c * 10) / 10)
  }

  // Delivery fee estimation: 10,000 UZS base (up to 2km), then +3,000 UZS / km
  const calculateDeliveryFee = (km: number) => {
    let fee = 10000
    if (km > 2) {
      fee += Math.round((km - 2) * 3000)
    }
    return Math.ceil(fee / 500) * 500
  }

  const deliveryFee = calculateDeliveryFee(distanceKm)

  // Lightweight HTTP reverse geocode without heavy maps SDK
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)
    try {
      const res = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&geocode=${lng},${lat}&format=json&lang=uz_UZ`
      )
      const data = await res.json()
      const foundText =
        data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text

      if (foundText) {
        setAddress(foundText)
      } else if (!address) {
        setAddress(`Qarshi shahar (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      }
    } catch {
      if (!address) {
        setAddress(`Qarshi shahar (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      }
    } finally {
      setIsGeocoding(false)
    }
  }

  // 1-Tap Location Fetch via Telegram / Browser with instant response
  const handleGetLocation = async () => {
    setIsLocating(true)
    setErrorMsg(null)
    triggerHaptic("medium")

    try {
      const result = await requestLocation()
      if (result.success && result.lat && result.lng) {
        const lat = result.lat
        const lng = result.lng
        const dist = calculateDistance(lat, lng)

        setCoords({ lat, lng })
        setDistanceKm(dist)
        setIsGpsLocated(true)
        triggerHaptic("success")

        await reverseGeocode(lat, lng)
      } else {
        setErrorMsg(result.error || "Joylashuvni aniqlab bo'lmadi. GPS yoqilganligini tekshiring.")
        triggerHaptic("error")
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Joylashuvni olishda xatolik yuz berdi")
      triggerHaptic("error")
    } finally {
      setIsLocating(false)
    }
  }

  // Yandex Go deep link for preview
  const yandexGoPreviewUrl = coords
    ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lng}&tariffClass=econom&ref=fullfood&appmetrica_tracking_id=1178268795219780156&lang=uz`
    : null

  const handleConfirm = () => {
    triggerHaptic("success")

    const finalAddress =
      address.trim() || (coords ? `Qarshi (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "Qarshi shahar")

    // Automatically save to app store for quick reuse
    addSavedLocation({
      label: selectedLabel,
      address: finalAddress,
      lat: coords?.lat || RESTAURANT_COORDS[0],
      lng: coords?.lng || RESTAURANT_COORDS[1],
      distanceKm,
    })

    onConfirm(
      finalAddress,
      distanceKm,
      deliveryFee,
      coords?.lat,
      coords?.lng
    )
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 max-h-[92vh] flex flex-col justify-between"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                  Yetkazib Berish Manzili
                </h3>
                <p className="text-[10px] text-neutral-400">Aniq yetkazish va hisob-kitob uchun</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto flex-1 pr-0.5">
            {/* GPS LOCATION STATUS / DISCOVERY CARD */}
            {isGpsLocated ? (
              /* State A: GPS is successfully acquired */
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Joylashuv muvaffaqiyatli aniqlandi
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLocating ? "animate-spin" : ""}`} />
                    <span>Qayta aniqlash</span>
                  </button>
                </div>
                {coords && (
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium">
                    GPS: <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                  </p>
                )}
              </div>
            ) : (
              /* State B: GPS not triggered yet -> Show Discovery Button */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Crosshair className="h-4 w-4 text-emerald-600 animate-pulse" />
                    Geolokatsiyani aniqlash
                  </span>
                  <span className="text-[10px] text-neutral-400">1 marta bosish</span>
                </div>

                <Button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs py-3 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Joylashuv aniqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span>📍 Mening Joylashuvimni Aniqlash</span>
                    </>
                  )}
                </Button>

                {errorMsg && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            )}

            {/* Location Metrics (Distance, Delivery Fee) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Restorandan Masofa
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Car className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-black text-neutral-900 dark:text-white">
                    ~{distanceKm} km
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Yetkazish (Taksi) Narxi
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-black text-emerald-600">
                    ~{deliveryFee.toLocaleString()} so'm
                  </span>
                </div>
              </div>
            </div>

            {/* Address Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                <span>Yetkazish manzili / Mo'ljal:</span>
                {isGeocoding && (
                  <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Manzil aniqlanmoqda...
                  </span>
                )}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Masalan: Women area magazin, Registon ko'chasi 5..."
                className="w-full text-xs font-semibold px-3.5 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/80 outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white placeholder:text-neutral-400"
              />
            </div>

            {/* Optional Building / Floor / Apt inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1 mb-1">
                  <Building className="h-3 w-3" /> Dom / Bino
                </label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="№ 12"
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1 mb-1">
                  <Layers className="h-3 w-3" /> Qavat
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="3-etaj"
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-500 flex items-center gap-1 mb-1">
                  <DoorClosed className="h-3 w-3" /> Xonadon
                </label>
                <input
                  type="text"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder="№ 24"
                  className="w-full text-xs font-bold px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Label Selector: Uy / Ishxona / Boshqa */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-500">
                Manzil turi:
              </span>
              <div className="flex gap-2">
                {(["Uy", "Ishxona", "Boshqa"] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light")
                      setSelectedLabel(lbl)
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedLabel === lbl
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                    }`}
                  >
                    {lbl === "Uy" && <Home className="h-3.5 w-3.5" />}
                    {lbl === "Ishxona" && <Briefcase className="h-3.5 w-3.5" />}
                    {lbl === "Boshqa" && <MapPin className="h-3.5 w-3.5" />}
                    <span>{lbl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Yandex Go verification link button */}
            {yandexGoPreviewUrl && isGpsLocated && (
              <a
                href={yandexGoPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-colors border border-amber-500/20"
              >
                <Car className="h-3.5 w-3.5 text-amber-600" />
                <span>🚕 Yandex Go orqali marshrutni ko'rish</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>

          {/* Confirm Button */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex-shrink-0">
            <Button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm py-3.5 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Manzilni Tasdiqlash</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
