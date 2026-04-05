import axios from 'axios'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const clearSession = () => {
  useAuth.getState().clear()
  useUi.getState().pushToast({
    tone: 'warning',
    title: 'Session expired',
    message: 'Please sign in again to continue.',
  })
  window.location.href = '/login'
}

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach(pending => {
    if (error || !token) pending.reject(error)
    else pending.resolve(token)
  })
  failedQueue = []
}

http.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (error.code === 'ECONNABORTED') {
      useUi.getState().pushToast({
        tone: 'warning',
        title: 'Request timed out',
        message: 'The server took too long to respond. Please try again.',
      })
      return Promise.reject({ message: 'Server is taking too long. Try again.' })
    }

    if (!originalRequest || error.response?.status !== 401) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Something went wrong while processing your request.'
      useUi.getState().pushToast({
        tone: error.response?.status >= 500 ? 'error' : 'warning',
        title: error.response?.status >= 500 ? 'Server error' : 'Request failed',
        message,
      })
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      clearSession()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(http(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')

      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      const newAccessToken = res.data.data.accessToken
      const newRefreshToken = res.data.data.refreshToken

      localStorage.setItem('token', newAccessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      useAuth.setState(state => ({ ...state, token: newAccessToken }))

      http.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
      processQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return http(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      clearSession()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export { http }

export const pushToast = (toast: { tone: 'info' | 'success' | 'warning' | 'error'; title?: string; message: string }) =>
  useUi.getState().pushToast(toast)

export const login = (email: string, password: string) =>
  http.post('/auth/login', { email, password })
export const register = (data: any) => http.post('/auth/register', data)
export const getMe = () => http.get('/auth/me')
export const impersonateUser = (userId: string) => http.post('/auth/impersonate', { userId })

export const getSummary = () => http.get('/analytics/summary')
export const getDaily = (days = 14) => http.get(`/analytics/daily?days=${days}`)
export const getBranches = () => http.get('/analytics/branches')
export const getTopItems = (days = 30, limit = 10) =>
  http.get(`/analytics/top-items?days=${days}&limit=${limit}`)
export const getReportSummary = (days = 30) =>
  http.get(`/analytics/reports/summary?days=${days}`)
export const getBranchPerformanceReport = (days = 30) =>
  http.get(`/analytics/reports/branches?days=${days}`)
export const getInventoryRiskReport = () =>
  http.get('/analytics/reports/inventory-risk')
export const getWastageReport = (days = 30) =>
  http.get(`/analytics/reports/wastage?days=${days}`)
export const getExecutiveSummaryReport = (days = 30) =>
  http.get(`/analytics/reports/executive?days=${days}`)
export const getSlaReport = (days = 30) =>
  http.get(`/analytics/reports/sla?days=${days}`)
export const getStockAgingReport = () =>
  http.get('/analytics/reports/stock-aging')
export const getCashierReconciliationReport = (date?: string) =>
  http.get('/analytics/reports/cashier-reconciliation', { params: date ? { date } : {} })
export const exportCashierReconciliationReport = (date?: string) =>
  http.get('/analytics/reports/cashier-reconciliation/export', { params: date ? { date } : {}, responseType: 'blob' })
export const exportBranchPerformanceReport = (days = 30) =>
  http.get(`/analytics/reports/branches/export?days=${days}`, { responseType: 'blob' })
export const exportInventoryRiskReport = () =>
  http.get('/analytics/reports/inventory-risk/export', { responseType: 'blob' })
export const exportExecutiveSummaryReport = (days = 30) =>
  http.get(`/analytics/reports/executive/export?days=${days}`, { responseType: 'blob' })
export const exportSlaReport = (days = 30) =>
  http.get(`/analytics/reports/sla/export?days=${days}`, { responseType: 'blob' })
export const exportStockAgingReport = () =>
  http.get('/analytics/reports/stock-aging/export', { responseType: 'blob' })

export const getIndents = (params: Record<string, any> = {}) =>
  http.get('/indents', { params })
export const getIndent = (id: string) => http.get(`/indents/${id}`)
export const createIndent = (data: any) => http.post('/indents', data)
export const getRoutePlan = (date: string) => http.get('/indents/route-plan', { params: { date } })
export const getDeliveryRoutes = (date: string) => http.get('/delivery-routes', { params: { date } })
export const getOptimizedDeliveryRoutes = (date: string) => http.get('/delivery-routes/optimize', { params: { date } })
export const getAggregatorOrders = (search?: string) =>
  http.get('/aggregator-orders', { params: search ? { search } : {} })
export const getAggregatorIntegrations = () => http.get('/aggregator-orders/integrations')
export const saveAggregatorIntegration = (data: any) => http.post('/aggregator-orders/integrations', data)
export const triggerAggregatorSync = (id: string) => http.post(`/aggregator-orders/integrations/${id}/sync`)
export const createAggregatorOrder = (data: any) => http.post('/aggregator-orders', data)
export const updateAggregatorOrderStatus = (id: string, data: any) => http.patch(`/aggregator-orders/${id}/status`, data)
export const reconcileAggregatorOrder = (id: string, data: any) => http.patch(`/aggregator-orders/${id}/reconcile`, data)
export const createDeliveryRoute = (data: any) => http.post('/delivery-routes', data)
export const updateDeliveryRouteStatus = (id: string, status: string) =>
  http.patch(`/delivery-routes/${id}/status`, { status })
export const approveIndent = (id: string, data = {}) =>
  http.patch(`/indents/${id}/approve`, data)
export const dispatchIndent = (id: string) => http.patch(`/indents/${id}/dispatch`)
export const deliverIndent = (id: string, data = {}) =>
  http.patch(`/indents/${id}/deliver`, data)
export const cancelIndent = (id: string, reason: string) =>
  http.patch(`/indents/${id}/cancel`, { reason })
export const rescheduleIndent = (id: string, data: any) =>
  http.patch(`/indents/${id}/schedule`, data)
export const reorderIndent = (id: string) => http.get(`/indents/${id}/reorder`)

export const getPosTables = () => http.get('/pos/tables')
export const createPosQrSession = (tableId: string) => http.post(`/pos/tables/${tableId}/qr-session`)
export const getPublicQrSession = (token: string) => http.get(`/pos/qr/${token}`)
export const submitPublicQrOrder = (token: string, data: any) => http.post(`/pos/qr/${token}/orders`, data)
export const requestQrBill = (token: string) => http.post(`/pos/qr/${token}/request-bill`)
export const getActivePosOrders = () => http.get('/pos/orders/active')
export const savePosTableOrder = (tableId: string, data: any) => http.post(`/pos/tables/${tableId}/orders`, data)
export const updatePosService = (orderId: string, data: any) => http.patch(`/pos/orders/${orderId}/service`, data)
export const sendPosKot = (orderId: string) => http.patch(`/pos/orders/${orderId}/kot`)
export const settlePosOrder = (orderId: string, data: any) => http.patch(`/pos/orders/${orderId}/settle`, data)
export const cancelPosOrder = (orderId: string) => http.patch(`/pos/orders/${orderId}/cancel`)

export const splitPosOrder = (orderId: string, data: any) => http.post(`/pos/orders/${orderId}/split`, data)
export const mergePosOrders = (targetOrderId: string, data: any) => http.post(`/pos/orders/${targetOrderId}/merge`, data)

export const getPosShift = () => http.get('/pos/shift')
export const openPosShift = (data: any) => http.post('/pos/shift/open', data)
export const closePosShift = (data: any) => http.post('/pos/shift/close', data)

export const getItems = (params: any = {}) => http.get('/items', { params })
export const getCategories = () => http.get('/items/categories')
export const createItem = (data: any) => http.post('/items', data)
export const updateItem = (id: string, data: any) => http.patch(`/items/${id}`, data)

export const getStock = (search?: string) =>
  http.get('/warehouse/stock', { params: search ? { search } : {} })
export const exportWarehouseStock = () =>
  http.get('/warehouse/stock/export', { responseType: 'blob' })
export const downloadWarehouseStockImportTemplate = () =>
  http.get('/warehouse/stock/import-template', { responseType: 'blob' })
export const importWarehouseStock = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/warehouse/stock/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const getLowStock = () => http.get('/warehouse/stock/low')
export const getWarehouseReceipts = (search?: string) =>
  http.get('/warehouse/receipts', { params: search ? { search } : {} })
export const getWarehouseLots = (params: { search?: string; expiringWithinDays?: number } = {}) =>
  http.get('/warehouse/lots', { params })
export const getWarehouseAdjustments = (search?: string) =>
  http.get('/warehouse/adjustments', { params: search ? { search } : {} })
export const getWarehouseWastageLog = () =>
  http.get('/warehouse/adjustments/wastage')
export const updateStock = (itemId: string, data: any) =>
  http.patch(`/warehouse/stock/${itemId}`, data)
export const receiveStock = (itemId: string, data: any) =>
  http.post(`/warehouse/stock/${itemId}/receive`, data)
export const resolveWarehouseReceipt = (receiptId: string, data: any) =>
  http.post(`/warehouse/receipts/${receiptId}/resolve`, data)
export const recordVendorReturn = (receiptId: string, data: any) =>
  http.post(`/warehouse/receipts/${receiptId}/return`, data)
export const adjustStock = (itemId: string, data: any) =>
  http.post(`/warehouse/stock/${itemId}/adjust`, data)
export const getTransfers = (search?: string) =>
  http.get('/transfers', { params: search ? { search } : {} })
export const getMyTransfers = (search?: string) =>
  http.get('/transfers/mine', { params: search ? { search } : {} })
export const createTransfer = (data: any) => http.post('/transfers', data)
export const receiveTransfer = (id: string, data: any = {}) =>
  http.post(`/transfers/${id}/receive`, data)

export const getBranchList = () => http.get('/branches')
export const getBranchSlotAvailability = (branchId: string, date: string) =>
  http.get(`/branches/${branchId}/slot-availability`, { params: { date } })
export const createBranch = (data: any) => http.post('/branches', data)
export const updateBranch = (id: string, data: any) => http.patch(`/branches/${id}`, data)

export const getSuppliers = (search?: string) =>
  http.get('/suppliers', { params: search ? { search } : {} })
export const createSupplier = (data: any) => http.post('/suppliers', data)
export const updateSupplier = (id: string, data: any) => http.patch(`/suppliers/${id}`, data)
export const getSupplierItemMappings = (supplierId: string) => http.get(`/suppliers/${supplierId}/items`)
export const saveSupplierItemMapping = (supplierId: string, data: any) =>
  http.post(`/suppliers/${supplierId}/items`, data)

export const getRecipes = (search?: string) =>
  http.get('/recipes', { params: search ? { search } : {} })
export const saveRecipe = (data: any) => http.post('/recipes', data)

export const getPurchaseOrders = (search?: string) =>
  http.get('/purchase-orders', { params: search ? { search } : {} })
export const createPurchaseOrder = (data: any) => http.post('/purchase-orders', data)
export const updatePurchaseOrderStatus = (id: string, status: string) =>
  http.patch(`/purchase-orders/${id}/status`, { status })
export const getProcurementPlan = () => http.get('/purchase-orders/planning')
export const getPurchaseOrderRecommendations = (itemIds: string[]) =>
  http.get('/purchase-orders/recommendations', { params: { itemIds } })
export const createAutoDraftPurchaseOrders = (includeMedium = false) =>
  http.post('/purchase-orders/auto-draft', { includeMedium })

export const getReadiness = (branchId?: string) =>
  http.get('/smart/readiness', { params: branchId ? { branchId } : {} })
export const getSuggestions = (branchId?: string, targetDate?: string) =>
  http.get('/smart/suggestions', { params: { branchId, targetDate } })
export const getPatterns = (branchId?: string) =>
  http.get('/smart/patterns', { params: branchId ? { branchId } : {} })
export const getBranchForecast = (branchId?: string, startDate?: string, days?: number) =>
  http.get('/smart/branch-forecast', { params: { branchId, startDate, days } })
export const getNetworkForecast = (startDate?: string, days?: number) =>
  http.get('/smart/network-forecast', { params: { startDate, days } })
export const createForecastDraft = (data: any) =>
  http.post('/smart/branch-forecast/draft', data)

export const getCustomers = (search?: string) =>
  http.get('/customers', { params: search ? { search } : {} })
export const getCustomer = (id: string) => http.get(`/customers/${id}`)

export const getTemplates = (branchId?: string) =>
  http.get('/templates', { params: branchId ? { branchId } : {} })
export const saveTemplate = (data: any) => http.post('/templates', data)
export const useTemplate = (id: string, branchId?: string) =>
  http.post(`/templates/${id}/use`, {}, { params: branchId ? { branchId } : {} })
export const deleteTemplate = (id: string) => http.delete(`/templates/${id}`)

export const getAllUsers = () => http.get('/users')
export const getPendingUsers = () => http.get('/users/pending')
export const approveUser = (id: string) => http.post(`/users/${id}/approve`)
export const rejectUser = (id: string, reason?: string) =>
  http.post(`/users/${id}/reject`, { reason })
export const createUser = (data: any) => http.post('/users', data)
export const updateUser = (id: string, data: any) => http.patch(`/users/${id}`, data)

export const submitFeedback = (data: { type: string; subject: string; message: string }) =>
  http.post('/feedback', data)
export const getFeedback = (status?: string) =>
  http.get('/feedback', { params: status ? { status } : {} })
export const updateFeedbackStatus = (id: string, status: string, adminNote?: string) =>
  http.patch(`/feedback/${id}/status`, { status, adminNote })

export const getNotifications = (unreadOnly = false) =>
  http.get('/governance/notifications', { params: { unreadOnly } })
export const markNotificationRead = (id: string) =>
  http.patch(`/governance/notifications/${id}/read`)
export const markAllNotificationsRead = () =>
  http.patch('/governance/notifications/read-all')
export const getAuditLogs = (module?: string, search?: string) =>
  http.get('/governance/audit', { params: { module, search } })
export const getMyPermissions = () =>
  http.get('/governance/permissions/me')
export const getPermissionMatrix = (userId: string) =>
  http.get(`/governance/permissions/${userId}`)
export const updatePermissionMatrix = (userId: string, permissions: any[]) =>
  http.put(`/governance/permissions/${userId}`, { permissions })
export const getSystemMonitor = () =>
  http.get('/governance/monitor')
export const getFraudRules = () =>
  http.get('/governance/fraud-rules')
export const updateFraudRules = (rules: any[]) =>
  http.put('/governance/fraud-rules', { rules })
export const getGovernanceExceptions = (params: { status?: string; riskLevel?: string } = {}) =>
  http.get('/governance/exceptions', { params })
export const escalateGovernanceException = (id: string, note?: string) =>
  http.post(`/governance/exceptions/${id}/escalate`, { note })
export const resolveGovernanceException = (id: string, note?: string, dismissed = false) =>
  http.post(`/governance/exceptions/${id}/resolve`, { note, dismissed })






