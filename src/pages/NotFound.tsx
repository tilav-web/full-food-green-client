import React from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-500 mb-4">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">404 - Sahifa topilmadi</h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan bo'lishi mumkin.
      </p>
      <Button asChild>
        <Link to="/" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Bosh sahifaga qaytish
        </Link>
      </Button>
    </div>
  )
}
