import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MapPin,
  X,
  Car,
  Home,
  Briefcase,
  Crosshair,
  Loader2,
  Navigation2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTelegram } from "@/hooks/useTelegram"
import { useAppStore } from "@/store/useAppStore"

declare global {
  interface Window {
    ymaps: any
  }
}

interface LocationPickerModalProps {
  isOpen: boolean
  currentAddress?: string
  currentDistance?: number
  currentLat?: number
  currentLng?: number
  onConfirm: (address: string, distanceKm: number, fee: number, lat?: number, lng?: number) => void
  onClose: () => void
}

const YANDEX_API_KEY = "0faa0d3b-2049-4fbc-b77e-437de12c50a3"
const RESTAURANT_COORDS = [41.311158, 69.279737] // Tashkent Center

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  currentAddress,
  currentDistance,
  currentLat,
  currentLng,
  onConfirm,
  onClose,
}) => {
  const { triggerHaptic } = useTelegram()
  const { addSavedLocation } = useAppStore()

  // Permission & Loading state
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Coords & Address
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLat || 41.311158,
    lng: currentLng || 69.279737,
  })
  const [address, setAddress] = useState(currentAddress || "")
  const [distanceKm, setDistanceKm] = useState(currentDistance || 3.0)

  // Label for saving
  const [selectedLabel, setSelectedLabel] = useState<"Uy" | "Ishxona" | "Boshqa">("Uy")
  const [customLabel, setCustomLabel] = useState("")

  // Calculate distance in KM
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
    return Math.max(1, Math.round(R * c * 10) / 10)
  }

  const calculateDeliveryFee = (km: number) => {
    let fee = 10000
    if (km > 2) {
      fee += Math.round((km - 2) * 3000)
    }
    return Math.ceil(fee / 500) * 500
  }

  const deliveryFee = calculateDeliveryFee(distanceKm)

  // Reverse Geocoding with Yandex API
  const reverseGeocode = async (lat: number, lng: number) => {
    if (window.ymaps && window.ymaps.geocode) {
      try {
        setIsGeocoding(true)
        const res = await window.ymaps.geocode([lat, lng], { results: 1 })
        const firstGeoObject = res.geoObjects.get(0)
        if (firstGeoObject) {
          const formattedAddress = firstGeoObject.getAddressLine()
          setAddress(formattedAddress)
        }
      } catch (err) {
        console.warn("Yandex Geocode error:", err)
      } finally {
        setIsGeocoding(false)
      }
    }
  }

  // Check initial permission status
  useEffect(() => {
    if (!isOpen) return

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            requestBrowserLocation()
          } else {
            setHasPermission(false)
          }
        })
        .catch(() => {
          setHasPermission(false)
        })
    }
  }, [isOpen])

  // Native Browser Geolocation Request
  const requestBrowserLocation = () => {
    setIsRequestingPermission(true)
    setPermissionError(null)

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const dist = calculateDistance(lat, lng)

          setCoords({ lat, lng })
          setDistanceKm(dist)
          setHasPermission(true)
          setIsRequestingPermission(false)
          triggerHaptic("success")

          // Reverse geocode & update map center if map is already active
          reverseGeocode(lat, lng)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter([lat, lng], 16)
            if (markerRef.current) {
              markerRef.current.geometry.setCoordinates([lat, lng])
            }
          }
        },
        (err) => {
          setIsRequestingPermission(false)
          setHasPermission(false)
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionError("Geolokatsiyaga ruxsat berilmadi. Iltimos, brauzer sozlamalaridan ruxsat bering.")
          } else {
            setPermissionError("Joylashuvni aniqlab bo'lmadi. Qayta urinib ko'ring.")
          }
          triggerHaptic("error")
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setIsRequestingPermission(false)
      setPermissionError("Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi.")
    }
  }

  // Load and initialize Yandex Maps SDK when permission is granted
  useEffect(() => {
    if (!isOpen || !hasPermission) return

    const loadYandexScript = () => {
      if (window.ymaps) {
        window.ymaps.ready(initMap)
        return
      }

      const existingScript = document.getElementById("yandex-map-script")
      if (!existingScript) {
        const script = document.createElement("script")
        script.id = "yandex-map-script"
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`
        script.async = true
        script.onload = () => {
          if (window.ymaps) {
            window.ymaps.ready(initMap)
          }
        }
        document.head.appendChild(script)
      } else {
        const checkInterval = setInterval(() => {
          if (window.ymaps) {
            clearInterval(checkInterval)
            window.ymaps.ready(initMap)
          }
        }, 100)
      }
    }

    const initMap = () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return

      try {
        const map = new window.ymaps.Map(mapContainerRef.current, {
          center: [coords.lat, coords.lng],
          zoom: 16,
          controls: ["zoomControl"],
        })

        mapInstanceRef.current = map

        // Draggable user position pin
        const marker = new window.ymaps.Placemark(
          [coords.lat, coords.lng],
          { hintContent: "Yetkazib berish manzili" },
          { preset: "islands#redDotIcon", draggable: true }
        )

        markerRef.current = marker
        map.geoObjects.add(marker)

        // Marker drag event
        marker.events.add("dragend", () => {
          const newCoords = marker.geometry.getCoordinates()
          const lat = newCoords[0]
          const lng = newCoords[1]
          setCoords({ lat, lng })
          setDistanceKm(calculateDistance(lat, lng))
          reverseGeocode(lat, lng)
          triggerHaptic("light")
        })

        // Map click event to relocate pin
        map.events.add("click", (e: any) => {
          const newCoords = e.get("coords")
          const lat = newCoords[0]
          const lng = newCoords[1]
          marker.geometry.setCoordinates(newCoords)
          setCoords({ lat, lng })
          setDistanceKm(calculateDistance(lat, lng))
          reverseGeocode(lat, lng)
          triggerHaptic("light")
        })

        setIsMapLoaded(true)
        reverseGeocode(coords.lat, coords.lng)
      } catch (err) {
        console.error("Map initialization error:", err)
      }
    }

    loadYandexScript()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [isOpen, hasPermission])

  // Confirm and save location
  const handleConfirm = () => {
    triggerHaptic("success")

    const finalLabel =
      selectedLabel === "Boshqa" && customLabel.trim()
        ? customLabel.trim()
        : selectedLabel

    // Automatically save to store
    addSavedLocation({
      label: finalLabel,
      address: address.trim() || `Toshkent (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      lat: coords.lat,
      lng: coords.lng,
      distanceKm,
    })

    onConfirm(
      address.trim() || `Toshkent (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      distanceKm,
      deliveryFee,
      coords.lat,
      coords.lng
    )
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 max-h-[92vh] flex flex-col justify-between"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-neutral-900 dark:text-white">
                  Joylashuvni Belgilash
                </h3>
                <p className="text-[10px] text-neutral-400">Ayni vaqtdagi aniq joylashuv</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* GATE 1: PERMISSION REQUEST SCREEN (When location is not granted yet) */}
          {/* ========================================================================= */}
          {!hasPermission ? (
            <div className="py-10 px-4 text-center space-y-5 my-auto">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shadow-lg border border-emerald-500/30">
                  <Navigation2 className="h-10 w-10 rotate-45 stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs mx-auto">
                <h4 className="font-black text-base text-neutral-900 dark:text-white">
                  Geolokatsiyaga Ruxsat Bering
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Xaritada ayni vaqtda turgan joyingizni ko'rsatish va yetkazish masofasini aniqlash uchun brauzer joylashuvingizga ruxsat so'raydi.
                </p>
              </div>

              {permissionError && (
                <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
                  {permissionError}
                </p>
              )}

              <Button
                onClick={requestBrowserLocation}
                disabled={isRequestingPermission}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs py-3 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ruxsat so'ralmoqda...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4" />
                    <span>Joylashuvga Ruxsat Berish</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* ========================================================================= */
            /* GATE 2: PURE MAP & CONFIRMATION SCREEN (When permission is granted) */
            /* ========================================================================= */
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-0.5">
              {/* Yandex Map Container */}
              <div className="relative h-56 sm:h-60 w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-inner bg-neutral-900">
                <div ref={mapContainerRef} className="h-full w-full" />

                {(!isMapLoaded || isGeocoding) && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-bold gap-2 pointer-events-none">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>{isGeocoding ? "Manzil aniqlanmoqda..." : "Xarita yuklanmoqda..."}</span>
                  </div>
                )}

                {/* Recenter Button */}
                <button
                  type="button"
                  onClick={requestBrowserLocation}
                  className="absolute top-2.5 right-2.5 h-8 w-8 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 shadow-md flex items-center justify-center hover:bg-emerald-50 active:scale-90 transition-transform z-10"
                  title="Mening joylashuvim"
                >
                  <Crosshair className="h-4 w-4 text-emerald-600" />
                </button>

                {/* Distance Badge */}
                <div className="absolute bottom-2.5 right-2.5 bg-emerald-600 text-white font-black text-[11px] px-3 py-1 rounded-xl shadow-md flex items-center gap-1 z-10 pointer-events-none">
                  <Car className="h-3.5 w-3.5" />
                  {distanceKm} km
                </div>
              </div>

              {/* Detected Address Display */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Aniqlangan Manzil:
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Manzil yuklanmoqda..."
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Label Selector: Uy / Ishxona / Boshqa */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-500">
                  Manzilga nom bering:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light")
                      setSelectedLabel("Uy")
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      selectedLabel === "Uy"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <Home className="h-3.5 w-3.5" /> Uy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light")
                      setSelectedLabel("Ishxona")
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      selectedLabel === "Ishxona"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <Briefcase className="h-3.5 w-3.5" /> Ishxona
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light")
                      setSelectedLabel("Boshqa")
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      selectedLabel === "Boshqa"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" /> Boshqa
                  </button>
                </div>

                {selectedLabel === "Boshqa" && (
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Masalan: Dala hovli"
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 outline-none mt-1"
                    autoFocus
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-1/3 rounded-2xl text-xs font-bold"
                >
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md"
                >
                  Manzilni Saqlash
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
