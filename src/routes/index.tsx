import { createBrowserRouter } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { Home } from "@/pages/Home"
import { ProductDetailPage } from "@/pages/ProductDetailPage"
import { PromoDetailPage } from "@/pages/PromoDetailPage"
import { CartPage } from "@/components/user/CartPage"
import { OrderTracker } from "@/components/user/OrderTracker"
import { UserProfile } from "@/components/user/UserProfile"
import { CashierView } from "@/components/cashier/CashierView"
import { AdminView } from "@/components/admin/AdminView"
import { LoginPage } from "@/pages/LoginPage"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { NotFound } from "@/pages/NotFound"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "menu",
        element: <Home />,
      },
      {
        path: "promo/:id",
        element: <PromoDetailPage />,
      },
      {
        path: "aksiya/:id",
        element: <PromoDetailPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "dish/:slug",
        element: <ProductDetailPage />,
      },
      {
        path: "product/:slug",
        element: <ProductDetailPage />,
      },
      {
        path: "cart",
        element: (
          <div className="max-w-xl mx-auto pb-16">
            <CartPage
              onGoToMenu={() => (window.location.href = "/menu")}
              onGoToOrders={() => (window.location.href = "/orders")}
            />
          </div>
        ),
      },
      {
        path: "orders",
        element: (
          <div className="max-w-xl mx-auto pb-16">
            <OrderTracker />
          </div>
        ),
      },
      {
        path: "profile",
        element: (
          <div className="max-w-xl mx-auto pb-16">
            <UserProfile />
          </div>
        ),
      },
      {
        path: "profile/locations",
        element: (
          <div className="max-w-xl mx-auto pb-16">
            <UserProfile />
          </div>
        ),
      },
      {
        path: "cashier",
        element: (
          <ProtectedRoute allowedRoles={["CASHIER", "ADMIN"]}>
            <CashierView />
          </ProtectedRoute>
        ),
      },
      {
        path: "pos",
        element: (
          <ProtectedRoute allowedRoles={["CASHIER", "ADMIN"]}>
            <CashierView />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminView />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/*",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminView />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
])
