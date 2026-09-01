import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAppStore } from "@/store/useAppStore"
import type { Role } from "@/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useAppStore()
  const location = useLocation()

  // If user is not logged in at all
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If user role is not permitted for this route
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
