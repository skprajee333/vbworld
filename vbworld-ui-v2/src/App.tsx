import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/auth'
import Layout from './components/layout/Layout'

const Login = lazy(() => import('./pages/shared/Login'))
const Register = lazy(() => import('./pages/shared/Register'))
const NotificationsPage = lazy(() => import('./pages/shared/Notifications'))
const CustomersPage = lazy(() => import('./pages/shared/Customers'))
const AggregatorHubPage = lazy(() => import('./pages/shared/AggregatorHub'))
const QrSelfOrderPage = lazy(() => import('./pages/shared/QrSelfOrder'))

const RestaurantDashboard = lazy(() => import('./pages/restaurant/Dashboard'))
const RestaurantHistory = lazy(() => import('./pages/restaurant/History'))
const RestaurantOrders = lazy(() => import('./pages/restaurant/Orders'))
const RestaurantPos = lazy(() => import('./pages/restaurant/Pos'))
const SmartOrder = lazy(() => import('./pages/restaurant/SmartOrder'))
const RestaurantTransfers = lazy(() => import('./pages/restaurant/Transfers'))

const WarehouseDashboard = lazy(() => import('./pages/warehouse/Dashboard'))
const WarehouseGrn = lazy(() => import('./pages/warehouse/Grn'))
const WarehouseOrders = lazy(() => import('./pages/warehouse/Orders'))
const ProcurementPlanner = lazy(() => import('./pages/warehouse/ProcurementPlanner'))
const WarehousePurchaseOrders = lazy(() => import('./pages/warehouse/PurchaseOrders'))
const WarehouseReports = lazy(() => import('./pages/warehouse/Reports'))
const RoutePlanner = lazy(() => import('./pages/warehouse/RoutePlanner'))
const WarehouseStock = lazy(() => import('./pages/warehouse/Stock'))
const WarehouseSuppliers = lazy(() => import('./pages/warehouse/Suppliers'))
const WarehouseTransfers = lazy(() => import('./pages/warehouse/Transfers'))

const AdminAuditTrail = lazy(() => import('./pages/admin/AuditTrail'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const FeedbackPanel = lazy(() => import('./pages/admin/FeedbackPanel'))
const ExceptionsPage = lazy(() => import('./pages/admin/Exceptions'))
const Impersonate = lazy(() => import('./pages/admin/Impersonate'))
const PermissionsPage = lazy(() => import('./pages/admin/Permissions'))
const RecipesPage = lazy(() => import('./pages/admin/Recipes'))
const SystemMonitorPage = lazy(() => import('./pages/admin/SystemMonitor'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--muted)',
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '.02em',
    }}>
      Loading VB World...
    </div>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function RoleRouter() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  if (!user) return <Navigate to="/login" replace />

  return (
    <Routes>
      {user.role === 'RESTAURANT_STAFF' && <>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<RestaurantDashboard />} />
        <Route path="orders" element={<RestaurantOrders />} />
        <Route path="pos" element={<RestaurantPos />} />
        <Route path="history" element={<RestaurantHistory />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="aggregators" element={<AggregatorHubPage />} />
        <Route path="transfers" element={<RestaurantTransfers />} />
        <Route path="smart" element={<SmartOrder />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </>}

      {user.role === 'WAREHOUSE_MANAGER' && <>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<WarehouseDashboard />} />
        <Route path="orders" element={<WarehouseOrders />} />
        <Route path="stock" element={<WarehouseStock />} />
        <Route path="procurement-plan" element={<ProcurementPlanner />} />
        <Route path="reports" element={<WarehouseReports />} />
        <Route path="route-planner" element={<RoutePlanner />} />
        <Route path="purchase-orders" element={<WarehousePurchaseOrders />} />
        <Route path="grn" element={<WarehouseGrn />} />
        <Route path="transfers" element={<WarehouseTransfers />} />
        <Route path="suppliers" element={<WarehouseSuppliers />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </>}

      {user.role === 'WAREHOUSE_ADMIN' && <>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<WarehouseDashboard />} />
        <Route path="orders" element={<WarehouseOrders />} />
        <Route path="stock" element={<WarehouseStock />} />
        <Route path="procurement-plan" element={<ProcurementPlanner />} />
        <Route path="reports" element={<WarehouseReports />} />
        <Route path="route-planner" element={<RoutePlanner />} />
        <Route path="purchase-orders" element={<WarehousePurchaseOrders />} />
        <Route path="grn" element={<WarehouseGrn />} />
        <Route path="transfers" element={<WarehouseTransfers />} />
        <Route path="suppliers" element={<WarehouseSuppliers />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="aggregators" element={<AggregatorHubPage />} />
        <Route path="audit" element={<AdminAuditTrail />} />
        <Route path="monitor" element={<SystemMonitorPage />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="impersonate" element={<Impersonate />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="feedback" element={<FeedbackPanel />} />
      </>}

      {user.role === 'ADMIN' && <>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<WarehouseOrders />} />
        <Route path="stock" element={<WarehouseStock />} />
        <Route path="procurement-plan" element={<ProcurementPlanner />} />
        <Route path="reports" element={<WarehouseReports />} />
        <Route path="route-planner" element={<RoutePlanner />} />
        <Route path="purchase-orders" element={<WarehousePurchaseOrders />} />
        <Route path="grn" element={<WarehouseGrn />} />
        <Route path="transfers" element={<WarehouseTransfers />} />
        <Route path="suppliers" element={<WarehouseSuppliers />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="aggregators" element={<AggregatorHubPage />} />
        <Route path="audit" element={<AdminAuditTrail />} />
        <Route path="monitor" element={<SystemMonitorPage />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="feedback" element={<FeedbackPanel />} />
        <Route path="impersonate" element={<Impersonate />} />
      </>}

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/qr/:token" element={<QrSelfOrderPage />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route path="*" element={<RoleRouter />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
