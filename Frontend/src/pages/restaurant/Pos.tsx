import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelPosOrder,
  closePosShift,
  createPosQrSession,
  exportCashierReconciliationReport,
  getCashierReconciliationReport,
  getActivePosOrders,
  getCustomers,
  getItems,
  getPosShift,
  getPosTables,
  mergePosOrders,
  openPosShift,
  savePosTableOrder,
  updatePosService,
  sendPosKot,
  settlePosOrder,
  splitPosOrder,
} from '../../api'
import {
  ArrowLeftRight,
  CheckCircle2,
  CookingPot,
  Copy,
  CreditCard,
  Download,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Printer,
  Search,
  ShoppingCart,
  SplitSquareVertical,
  TimerReset,
  UtensilsCrossed,
  Wallet,
  XCircle,
} from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/StateBlocks'
import { useAuth } from '../../store/auth'

type MenuItem = {
  id: string
  name: string
  code: string
  category?: string
  salePrice?: number
}

type PosOrder = {
  id: string
  orderNumber: string
  tableNumber?: string
  tableId?: string
  status: string
  serviceStatus?: string
  customerName?: string
  customerPhone?: string
  customerId?: string
  assignedStaffName?: string
  guestCount?: number
  subtotal: number
  discountAmount: number
  loyaltyDiscountAmount?: number
  loyaltyRedeemedPoints?: number
  couponCode?: string
  splitCount?: number
  taxAmount: number
  totalAmount: number
  notes?: string
  servedAt?: string
  billRequestedAt?: string
  paidAt?: string
  payments?: Array<{ id: string; paymentMethod: string; amount: number; referenceNumber?: string }>
  items: Array<{ id: string; itemId: string; itemName: string; quantity: number; unitPrice: number; lineTotal: number; notes?: string }>
}

type PosTable = {
  id: string
  tableNumber: string
  capacity: number
  status: string
  serviceStatus?: string
  currentOrder?: PosOrder | null
}

type PaymentLine = { paymentMethod: string; amount: string; referenceNumber: string }
type QrSessionSummary = {
  sessionId: string
  sessionToken: string
  tableId: string
  tableNumber: string
  publicPath: string
  expiresAt: string
  status: string
  serviceStatus?: string
}

type ShiftSummary = {
  shiftId?: string | null
  status: string
  serviceStatus?: string
  openingCash: number
  expectedCash: number
  closingCash?: number | null
  varianceAmount?: number | null
  openedAt?: string | null
  closedAt?: string | null
  notes?: string | null
  paymentTotals: Record<string, number>
}

type CustomerLite = {
  id: string
  name: string
  phone?: string
  totalVisits: number
  totalSpend: number
  pointsBalance: number
  lastVisitAt?: string
}

type CashierReconciliationReport = {
  businessDate: string
  branchName: string
  totalBills: number
  grossSales: number
  discountTotal: number
  taxTotal: number
  netSales: number
  averageBillValue?: number | null
  expectedCash: number
  actualCash?: number | null
  varianceAmount?: number | null
  openShifts: number
  closedShifts: number
  splitBills: number
  couponBills: number
  paymentTotals: Record<string, number>
  shifts: Array<{
    shiftId: string
    cashierName: string
    status: string
  serviceStatus?: string
    openedAt?: string | null
    closedAt?: string | null
    openingCash: number
    expectedCash?: number | null
    closingCash?: number | null
    varianceAmount?: number | null
    totalBills: number
    netSales: number
    paymentTotals: Record<string, number>
  }>
  settlements: Array<{
    orderId: string
    orderNumber: string
    cashierName?: string | null
    tableNumber?: string | null
    paidAt?: string | null
    subtotal: number
    discountAmount: number
    taxAmount: number
    totalAmount: number
    couponCode?: string | null
    splitCount: number
    paymentMethods: string
    paymentReferences: string
  }>
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'WALLET', 'CREDIT']

function money(value?: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN')
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function RestaurantPos() {
  const qc = useQueryClient()
  const effectiveUser = useAuth(state => state.effectiveUser())
  const receiptGstin = (import.meta.env.VITE_RECEIPT_GSTIN || '').trim()
  const [selectedTableId, setSelectedTableId] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [assignedStaffName, setAssignedStaffName] = useState('')
  const [guestCount, setGuestCount] = useState('1')
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [taxAmount, setTaxAmount] = useState('0')
  const [payments, setPayments] = useState<PaymentLine[]>([{ paymentMethod: 'CASH', amount: '', referenceNumber: '' }])
  const [splitQty, setSplitQty] = useState<Record<string, string>>({})
  const [mergeSourceOrderId, setMergeSourceOrderId] = useState('')
  const [openingCash, setOpeningCash] = useState('0')
  const [closingCash, setClosingCash] = useState('0')
  const [shiftNotes, setShiftNotes] = useState('')
  const [redeemPoints, setRedeemPoints] = useState('0')
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [qrSession, setQrSession] = useState<QrSessionSummary | null>(null)
  const [lastSettledOrder, setLastSettledOrder] = useState<PosOrder | null>(null)

  const { data: tables = [], isLoading: loadingTables, isError: tablesError, refetch: refetchTables } = useQuery({
    queryKey: ['pos-tables'],
    queryFn: () => getPosTables(),
    select: res => (res.data.data || []) as PosTable[],
  })

  const { data: shift } = useQuery({
    queryKey: ['pos-shift'],
    queryFn: () => getPosShift(),
    select: res => (res.data.data || { status: 'CLOSED', openingCash: 0, expectedCash: 0, paymentTotals: {} }) as ShiftSummary,
  })

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['pos-active-orders'],
    queryFn: () => getActivePosOrders(),
    select: res => (res.data.data || []) as PosOrder[],
  })

  const customerLookup = (customerPhone || customerName).trim()
  const normalizedCustomerPhone = customerPhone.replace(/\D/g, '')
  const { data: customerMatches = [] } = useQuery({
    queryKey: ['pos-customer-search', customerLookup],
    queryFn: () => getCustomers(customerLookup || undefined),
    enabled: customerLookup.length >= 3,
    select: res => (res.data.data || []) as CustomerLite[],
  })

  const { data: reconciliation, isLoading: reconciliationLoading, isError: reconciliationError, refetch: refetchReconciliation } = useQuery({
    queryKey: ['pos-reconciliation', reportDate],
    queryFn: () => getCashierReconciliationReport(reportDate),
    select: res => (res.data.data || null) as CashierReconciliationReport | null,
  })

  const { data: menu = [], isLoading: loadingMenu, isError: menuError, refetch: refetchMenu } = useQuery({
    queryKey: ['pos-menu', search],
    queryFn: () => getItems({ search, size: 200 }),
    select: res => (res.data.data?.content || []) as MenuItem[],
  })
  useEffect(() => {
    if (!selectedTableId && tables.length) setSelectedTableId(tables[0].id)
  }, [selectedTableId, tables])

  useEffect(() => {
    if (shift) {
      setOpeningCash(String(shift.openingCash || 0))
      setClosingCash(String(shift.expectedCash || 0))
      setShiftNotes(shift.notes || '')
    }
  }, [shift?.shiftId, shift?.status])

  const selectedTable = useMemo(() => tables.find(table => table.id === selectedTableId) || null, [selectedTableId, tables])
  const currentOrder = selectedTable?.currentOrder || null
  const matchedCustomer = useMemo(() => {
    if (!customerMatches.length) return null
    if (normalizedCustomerPhone) {
      return customerMatches.find(customer => (customer.phone || '').replace(/\D/g, '') === normalizedCustomerPhone) || customerMatches[0]
    }
    return customerMatches[0]
  }, [customerMatches, normalizedCustomerPhone])
  const siblingOrders = activeOrders.filter(order => order.tableId === selectedTableId && order.id !== currentOrder?.id)

  useEffect(() => {
    if (currentOrder) {
      setCustomerName(currentOrder.customerName || '')
      setCustomerPhone(currentOrder.customerPhone || '')
      setAssignedStaffName(currentOrder.assignedStaffName || '')
      setGuestCount(String(currentOrder.guestCount || 1))
      setNotes(currentOrder.notes || '')
      setCouponCode(currentOrder.couponCode || '')
      setDiscountAmount(String(currentOrder.discountAmount || 0))
      setTaxAmount(String(currentOrder.taxAmount || 0))
      setSplitQty({})
      if (currentOrder.payments && currentOrder.payments.length > 0) {
        setPayments(currentOrder.payments.map(payment => ({ paymentMethod: payment.paymentMethod, amount: String(payment.amount), referenceNumber: payment.referenceNumber || '' })))
      } else {
        setPayments([{ paymentMethod: 'CASH', amount: String(currentOrder.totalAmount || ''), referenceNumber: '' }])
      }
    } else {
      setCustomerName('')
      setCustomerPhone('')
      setAssignedStaffName('')
      setGuestCount('1')
      setNotes('')
      setCouponCode('')
      setDiscountAmount('0')
      setTaxAmount('0')
      setRedeemPoints('0')
      setPayments([{ paymentMethod: 'CASH', amount: '', referenceNumber: '' }])
      setSplitQty({})
    }
  }, [currentOrder?.id])

  useEffect(() => {
    setMergeSourceOrderId(siblingOrders[0]?.id || '')
  }, [selectedTableId, siblingOrders.length])

  const pendingItems = useMemo(() => Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = menu.find(menuItem => menuItem.id === itemId)
      return item ? { ...item, quantity: qty } : null
    })
    .filter(Boolean) as Array<MenuItem & { quantity: number }>, [cart, menu])

  const pendingSubtotal = pendingItems.reduce((sum, item) => sum + (item.salePrice || 0) * item.quantity, 0)
  const baseSubtotal = (currentOrder?.subtotal || 0) + pendingSubtotal
  const loyaltyDiscount = matchedCustomer ? Math.min(Math.max(Number(redeemPoints || 0), 0), matchedCustomer.pointsBalance || 0) : 0
  const projectedTotal = Math.max(0, baseSubtotal - Number(discountAmount || 0) - loyaltyDiscount + Number(taxAmount || 0))
  const projectedEarnPoints = Math.floor(projectedTotal / 100)
  const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const splitLineCount = Object.values(splitQty).filter(value => Number(value || 0) > 0).length
  const reportShiftVariance = reconciliation?.varianceAmount || 0
  const posSetupReady = tables.length > 0

  const refreshPos = () => {
    qc.invalidateQueries({ queryKey: ['pos-tables'] })
    qc.invalidateQueries({ queryKey: ['pos-active-orders'] })
    qc.invalidateQueries({ queryKey: ['pos-shift'] })
    qc.invalidateQueries({ queryKey: ['pos-reconciliation'] })
  }

  const openShift = useMutation({ mutationFn: () => openPosShift({ openingCash: Number(openingCash || 0), notes: shiftNotes || null }), onSuccess: refreshPos })
  const closeShift = useMutation({ mutationFn: () => closePosShift({ closingCash: Number(closingCash || 0), notes: shiftNotes || null }), onSuccess: refreshPos })
  const saveOrder = useMutation({ mutationFn: () => savePosTableOrder(selectedTableId, { customerName, customerPhone, assignedStaffName, guestCount: Number(guestCount || 1), notes, items: pendingItems.map(item => ({ itemId: item.id, quantity: item.quantity })) }), onSuccess: () => { refreshPos(); setCart({}) } })
  const sendKot = useMutation({ mutationFn: (orderId: string) => sendPosKot(orderId), onSuccess: refreshPos })
  const settle = useMutation({
    mutationFn: (orderId: string) => settlePosOrder(orderId, {
      discountAmount: Number(discountAmount || 0),
      taxAmount: Number(taxAmount || 0),
      couponCode: couponCode || null,
      redeemPoints: loyaltyDiscount,
      payments: payments
        .filter(payment => Number(payment.amount || 0) > 0)
        .map(payment => ({ paymentMethod: payment.paymentMethod, amount: Number(payment.amount || 0), referenceNumber: payment.referenceNumber || null })),
    }),
    onSuccess: response => {
      const settledPayments = payments
        .filter(payment => Number(payment.amount || 0) > 0)
        .map((payment, index) => ({
          id: `${currentOrder?.id || 'settled'}-${index}`,
          paymentMethod: payment.paymentMethod,
          amount: Number(payment.amount || 0),
          referenceNumber: payment.referenceNumber || undefined,
        }))
      const settledOrder = ((response.data.data || null) as PosOrder | null) || (currentOrder ? {
        ...currentOrder,
        discountAmount: Number(discountAmount || 0),
        taxAmount: Number(taxAmount || 0),
        couponCode: couponCode || undefined,
        loyaltyDiscountAmount: loyaltyDiscount,
        loyaltyRedeemedPoints: loyaltyDiscount,
        totalAmount: projectedTotal,
        paidAt: new Date().toISOString(),
        payments: settledPayments,
      } : null)
      if (settledOrder) {
        setLastSettledOrder(settledOrder)
        setTimeout(() => printBill(settledOrder), 100)
      }
      refreshPos()
      setCart({})
      setCouponCode('')
      setDiscountAmount('0')
      setTaxAmount('0')
      setRedeemPoints('0')
      setPayments([{ paymentMethod: 'CASH', amount: '', referenceNumber: '' }])
    },
  })
  const cancel = useMutation({ mutationFn: (orderId: string) => cancelPosOrder(orderId), onSuccess: () => { refreshPos(); setCart({}) } })
  const split = useMutation({ mutationFn: (orderId: string) => splitPosOrder(orderId, { items: currentOrder?.items.filter(item => Number(splitQty[item.id] || 0) > 0).map(item => ({ orderItemId: item.id, quantity: Number(splitQty[item.id]) })) || [] }), onSuccess: () => { refreshPos(); setSplitQty({}) } })
  const merge = useMutation({ mutationFn: () => mergePosOrders(currentOrder!.id, { sourceOrderId: mergeSourceOrderId }), onSuccess: refreshPos })
  const updateService = useMutation({ mutationFn: (data: any) => updatePosService(currentOrder!.id, data), onSuccess: refreshPos })
  const createQrSession = useMutation({
    mutationFn: () => createPosQrSession(selectedTableId),
    onSuccess: response => {
      setQrSession((response.data.data || null) as QrSessionSummary | null)
    },
  })

  const setQty = (itemId: string, next: number) => setCart(current => ({ ...current, [itemId]: Math.max(0, next) }))
  const updatePayment = (index: number, field: keyof PaymentLine, value: string) => setPayments(current => current.map((payment, i) => i === index ? { ...payment, [field]: value } : payment))
  const addPaymentLine = () => setPayments(current => [...current, { paymentMethod: 'CARD', amount: '', referenceNumber: '' }])
  const removePaymentLine = (index: number) => setPayments(current => current.length === 1 ? current : current.filter((_, i) => i !== index))

  async function handleCopyQrLink() {
    if (!qrSession) return
    const fullUrl = `${window.location.origin}${qrSession.publicPath}`
    await navigator.clipboard.writeText(fullUrl)
  }

  async function handleReconciliationExport() {
    const response = await exportCashierReconciliationReport(reportDate)
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cashier-reconciliation-${reportDate}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  function printBill(order: PosOrder) {
    const receiptWindow = window.open('', '_blank', 'noopener,noreferrer,width=420,height=720')
    if (!receiptWindow) return

    const cgstAmount = Number((order.taxAmount || 0) / 2)
    const sgstAmount = Number((order.taxAmount || 0) / 2)
    const paymentSummary = (order.payments || [])
      .map(payment => `${payment.paymentMethod}: ${money(payment.amount)}${payment.referenceNumber ? ` (${payment.referenceNumber})` : ''}`)
      .join('<br/>') || 'Pending'
    const itemRows = order.items.map(item => `
      <tr>
        <td>${escapeHtml(item.itemName)}</td>
        <td style="text-align:center">${escapeHtml(item.quantity)}</td>
        <td style="text-align:right">${escapeHtml(money(item.unitPrice))}</td>
        <td style="text-align:right">${escapeHtml(money(item.lineTotal))}</td>
      </tr>
    `).join('')

    receiptWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(order.orderNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
      h1, h2, p { margin: 0; }
      .muted { color: #6b7280; font-size: 12px; }
      .header, .meta, .totals { display: grid; gap: 6px; }
      .section { margin-top: 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { padding: 6px 0; border-bottom: 1px dashed #d1d5db; }
      th { text-align: left; font-size: 11px; color: #6b7280; }
      .line { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; font-size: 12px; }
      .line.total { font-size: 14px; font-weight: 700; margin-top: 8px; }
      .footer { margin-top: 18px; font-size: 11px; color: #6b7280; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${escapeHtml(effectiveUser?.branchName || 'VB World Restaurant')}</h1>
      <p class="muted">Demo billing receipt</p>
      <p class="muted">GSTIN: ${escapeHtml(receiptGstin || 'Not configured')}</p>
    </div>

    <div class="meta section">
      <div class="line"><span>Bill No</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
      <div class="line"><span>Table</span><span>${escapeHtml(order.tableNumber || 'Walk-in')}</span></div>
      <div class="line"><span>Customer</span><span>${escapeHtml(order.customerName || 'Guest')}</span></div>
      <div class="line"><span>Phone</span><span>${escapeHtml(order.customerPhone || '-')}</span></div>
      <div class="line"><span>Guests</span><span>${escapeHtml(order.guestCount || '-')}</span></div>
      <div class="line"><span>Paid At</span><span>${escapeHtml(formatDateTime(order.paidAt))}</span></div>
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <div class="totals section">
      <div class="line"><span>Subtotal</span><strong>${escapeHtml(money(order.subtotal))}</strong></div>
      <div class="line"><span>Discount</span><strong>${escapeHtml(money(order.discountAmount))}</strong></div>
      <div class="line"><span>Loyalty Discount</span><strong>${escapeHtml(money(order.loyaltyDiscountAmount || 0))}</strong></div>
      <div class="line"><span>CGST</span><strong>${escapeHtml(money(cgstAmount))}</strong></div>
      <div class="line"><span>SGST</span><strong>${escapeHtml(money(sgstAmount))}</strong></div>
      <div class="line total"><span>Total</span><span>${escapeHtml(money(order.totalAmount))}</span></div>
      <div class="line"><span>Payments</span><span style="text-align:right">${paymentSummary}</span></div>
    </div>

    <div class="footer">
      <div>Served by ${escapeHtml(order.assignedStaffName || effectiveUser?.name || 'VB World')}</div>
      <div>Thank you for dining with us.</div>
    </div>
  </body>
</html>`)
    receiptWindow.document.close()
    receiptWindow.focus()
    setTimeout(() => {
      receiptWindow.print()
      receiptWindow.close()
    }, 250)
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>POS Billing</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>Manage dine-in tables, run cashier shifts, split or merge bills, and settle with multi-payment checkout.</p>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--text)' }}>Cashier Shift</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{shift?.status === 'OPEN' ? `Opened ${shift.openedAt ? new Date(shift.openedAt).toLocaleString('en-IN') : ''}` : 'No open shift'}</div>
          </div>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: shift?.status === 'OPEN' ? '#10b98122' : '#94a3b822', color: shift?.status === 'OPEN' ? '#10b981' : '#94a3b8', fontWeight: 800 }}>{shift?.status || 'CLOSED'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Opening Cash</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{money(shift?.openingCash)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Expected Cash</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{money(shift?.expectedCash)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>UPI</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{money(shift?.paymentTotals?.UPI)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Card</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{money(shift?.paymentTotals?.CARD)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Variance</div><div style={{ marginTop: 6, fontWeight: 800, color: shift?.varianceAmount && shift.varianceAmount !== 0 ? '#f59e0b' : 'var(--text)' }}>{money(shift?.varianceAmount)}</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr auto auto', gap: 10, marginTop: 12, alignItems: 'start' }}>
          <input value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="Opening cash" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          <input value={closingCash} onChange={e => setClosingCash(e.target.value)} placeholder="Closing cash" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Shift notes / handover remarks" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          <button onClick={() => openShift.mutate()} disabled={openShift.isPending || shift?.status === 'OPEN'} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: shift?.status === 'OPEN' ? 0.6 : 1 }}>Open Shift</button>
          <button onClick={() => closeShift.mutate()} disabled={closeShift.isPending || shift?.status !== 'OPEN'} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: shift?.status !== 'OPEN' ? 0.6 : 1 }}><TimerReset size={14} /> Close Shift</button>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--text)' }}>QR Self-Ordering</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Generate a live self-order link for the selected table so guests can order from their phones.</div>
          </div>
          <button
            onClick={() => createQrSession.mutate()}
            disabled={!selectedTableId || createQrSession.isPending}
            style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: !selectedTableId ? 0.6 : 1 }}
          >
            {createQrSession.isPending ? 'Generating...' : `Generate for ${selectedTable?.tableNumber || 'table'}`}
          </button>
        </div>
        {qrSession ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Guest link</div>
              <div style={{ marginTop: 4, color: 'var(--text)', fontWeight: 700, wordBreak: 'break-all' }}>{`${window.location.origin}${qrSession.publicPath}`}</div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>Expires {qrSession.expiresAt ? new Date(qrSession.expiresAt).toLocaleString('en-IN') : 'soon'}</div>
            </div>
            <button onClick={handleCopyQrLink} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Copy size={14} /> Copy Link
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>No active QR link generated for the selected table in this session yet.</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 390px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: 'var(--text)' }}>Tables</div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tables.length} total</span>
          </div>
          {loadingTables ? (
            <div style={{ padding: 24, textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} /></div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {tables.map(table => {
                const active = table.id === selectedTableId
                const occupied = table.status === 'OCCUPIED'

  return (
                  <button key={table.id} onClick={() => setSelectedTableId(table.id)} style={{ textAlign: 'left', padding: 12, borderRadius: 14, border: active ? '1px solid #6366f1' : '1px solid var(--border)', background: active ? '#6366f110' : 'var(--surface)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{table.tableNumber}</div>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: occupied ? '#f59e0b22' : '#10b98122', color: occupied ? '#f59e0b' : '#10b981' }}>{table.status}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>{table.capacity} seats</div>
                    {table.currentOrder && <div style={{ marginTop: 6, fontSize: 11, color: '#6366f1' }}>{table.currentOrder.orderNumber} • {money(table.currentOrder.totalAmount)}</div>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text)' }}>Menu</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Select items for {selectedTable?.tableNumber || 'a table'}.</div>
            </div>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu" style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
          </div>
          {loadingMenu ? (
            <div style={{ padding: 28, textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {menu.map(item => {
                const qty = cart[item.id] || 0

  return (
                  <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: 'var(--surface)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{item.category || 'Menu Item'} • {item.code}</div>
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{money(item.salePrice)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <button onClick={() => setQty(item.id, qty - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer' }}><Minus size={14} /></button>
                      <div style={{ minWidth: 22, textAlign: 'center', color: 'var(--text)', fontWeight: 800 }}>{qty}</div>
                      <button onClick={() => setQty(item.id, qty + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>Current Bill</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedTable?.tableNumber || 'No table selected'}</div>
              </div>
              <ShoppingCart size={18} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name (optional)" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Customer phone (recommended for loyalty)" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              {matchedCustomer ? (
                <div style={{ padding: 10, borderRadius: 12, border: '1px solid #f59e0b44', background: '#f59e0b12', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text)', fontWeight: 800 }}>{matchedCustomer.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{matchedCustomer.totalVisits} visits ? last {matchedCustomer.lastVisitAt ? new Date(matchedCustomer.lastVisitAt).toLocaleDateString('en-IN') : '?'}</div>
                    </div>
                    <div style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: '#f59e0b22', color: '#f59e0b', fontWeight: 800 }}>{matchedCustomer.pointsBalance} pts</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={redeemPoints} onChange={e => setRedeemPoints(e.target.value)} placeholder="Redeem points" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                    <div style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 12 }}>
                      Earn est. <strong>{projectedEarnPoints}</strong> pts
                    </div>
                  </div>
                </div>
              ) : customerLookup.length >= 3 ? (
                <div style={{ padding: 10, borderRadius: 12, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: 12 }}>
                  No existing customer match. Settling this bill with a phone number will create a new customer profile.
                </div>
              ) : null}
              <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes for kitchen / cashier" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {currentOrder?.items?.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 70px', gap: 8, fontSize: 12, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                  <div><div style={{ color: 'var(--text)', fontWeight: 700 }}>{item.itemName}</div><div style={{ color: 'var(--muted)' }}>{item.quantity} x {money(item.unitPrice)}</div></div>
                  <input value={splitQty[item.id] || ''} onChange={e => setSplitQty(current => ({ ...current, [item.id]: e.target.value }))} placeholder="Split" style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', height: 34 }} />
                  <div style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right', paddingTop: 7 }}>{money(item.lineTotal)}</div>
                </div>
              ))}
              {pendingItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
                  <div><div style={{ color: 'var(--text)', fontWeight: 700 }}>{item.name}</div><div style={{ color: 'var(--muted)' }}>{item.quantity} x {money(item.salePrice)}</div></div>
                  <div style={{ color: '#6366f1', fontWeight: 700 }}>{money((item.salePrice || 0) * item.quantity)}</div>
                </div>
              ))}
              {!currentOrder && pendingItems.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Add menu items to start a bill for this table.</div>}
            </div>
            {currentOrder && (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <button onClick={() => split.mutate(currentOrder.id)} disabled={split.isPending || splitLineCount === 0} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: splitLineCount === 0 ? 0.6 : 1 }}><SplitSquareVertical size={14} /> Split Bill</button>
                  <div style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>{splitLineCount} line(s) selected</div>
                </div>
                {siblingOrders.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <select value={mergeSourceOrderId} onChange={e => setMergeSourceOrderId(e.target.value)} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                      {siblingOrders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} • {money(order.totalAmount)}</option>)}
                    </select>
                    <button onClick={() => merge.mutate()} disabled={merge.isPending || !mergeSourceOrderId} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeftRight size={14} /> Merge</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>Open subtotal</span><span style={{ color: 'var(--text)', fontWeight: 700 }}>{money(baseSubtotal)}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="Discount" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <input value={taxAmount} onChange={e => setTaxAmount(e.target.value)} placeholder="Tax" style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--surface)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Split Payments</div>
                  <button onClick={addPaymentLine} style={{ border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><SplitSquareVertical size={14} /> Add Split</button>
                </div>
                {payments.map((payment, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 36px', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <select value={payment.paymentMethod} onChange={e => updatePayment(index, 'paymentMethod', e.target.value)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                        {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                      </select>
                      {payment.paymentMethod !== 'CASH' && <input value={payment.referenceNumber} onChange={e => updatePayment(index, 'referenceNumber', e.target.value)} placeholder="Ref / Txn ID" style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />}
                    </div>
                    <input value={payment.amount} onChange={e => updatePayment(index, 'amount', e.target.value)} placeholder="Amount" style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', height: 40 }} />
                    <button onClick={() => removePaymentLine(index)} disabled={payments.length === 1} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer', opacity: payments.length === 1 ? 0.45 : 1, height: 40 }}>-</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Payment total</span><span style={{ color: paymentTotal === projectedTotal ? '#10b981' : '#f59e0b', fontWeight: 800 }}>{money(paymentTotal)}</span></div>
              </div>
              <div style={{ display: 'grid', gap: 6, borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>Coupon</span><span style={{ color: couponCode ? '#6366f1' : 'var(--muted)', fontWeight: 700 }}>{couponCode || '-'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>Loyalty discount</span><span style={{ color: loyaltyDiscount > 0 ? '#f59e0b' : 'var(--muted)', fontWeight: 700 }}>{loyaltyDiscount > 0 ? `-${money(loyaltyDiscount)}` : '-'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--muted)' }}>Final total</span><span style={{ color: 'var(--text)', fontWeight: 900 }}>{money(projectedTotal)}</span></div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <button onClick={() => saveOrder.mutate()} disabled={!selectedTableId || pendingItems.length === 0 || saveOrder.isPending} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !selectedTableId || pendingItems.length === 0 ? 0.6 : 1 }}>{saveOrder.isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Receipt size={15} />}Save Bill</button>
                {currentOrder && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button onClick={() => sendKot.mutate(currentOrder.id)} disabled={sendKot.isPending || currentOrder.status === 'KOT_SENT'} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CookingPot size={14} /> KOT</button>
                    <button onClick={() => settle.mutate(currentOrder.id)} disabled={settle.isPending || Math.abs(paymentTotal - projectedTotal) > 0.009 || shift?.status !== 'OPEN'} style={{ padding: '9px 10px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: Math.abs(paymentTotal - projectedTotal) > 0.009 || shift?.status !== 'OPEN' ? 0.6 : 1 }}><CheckCircle2 size={14} /> Settle</button>
                    <button onClick={() => cancel.mutate(currentOrder.id)} disabled={cancel.isPending} style={{ padding: '9px 10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><XCircle size={14} /> Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: 'var(--text)' }}>Live KOT Queue</div>
              <UtensilsCrossed size={18} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {activeOrders.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No active POS tickets right now.</div>}
              {activeOrders.map(order => (
                <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{order.orderNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.tableNumber || 'Takeaway'} • {order.items.length} lines</div>
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#6366f118', color: '#6366f1', height: 'fit-content' }}>{order.status}</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700 }}>{money(order.totalAmount)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11 }}><Wallet size={13} /> {order.splitCount || 1} split <CreditCard size={13} /> {order.payments?.length || 0} payments</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, color: 'var(--text)' }}>End Of Day Cashier Reconciliation</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Verify sales, shift closure, and payment-method mix for the selected business day.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input type='date' value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            <button onClick={handleReconciliationExport} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Export CSV</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Bills</div><div style={{ marginTop: 6, fontWeight: 900, color: 'var(--text)' }}>{reconciliation?.totalBills || 0}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Net Sales</div><div style={{ marginTop: 6, fontWeight: 900, color: 'var(--text)' }}>{money(reconciliation?.netSales)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Expected Cash</div><div style={{ marginTop: 6, fontWeight: 900, color: 'var(--text)' }}>{money(reconciliation?.expectedCash)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Actual Cash</div><div style={{ marginTop: 6, fontWeight: 900, color: 'var(--text)' }}>{money(reconciliation?.actualCash || 0)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Variance</div><div style={{ marginTop: 6, fontWeight: 900, color: Math.abs(reportShiftVariance) > 0.009 ? '#f59e0b' : 'var(--text)' }}>{money(reportShiftVariance)}</div></div>
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Split / Coupon Bills</div><div style={{ marginTop: 6, fontWeight: 900, color: 'var(--text)' }}>{reconciliation?.splitBills || 0} / {reconciliation?.couponBills || 0}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontWeight: 800, color: 'var(--text)' }}>Shift Closures</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{reconciliation?.closedShifts || 0} closed / {reconciliation?.openShifts || 0} open</div>
            </div>
            <div style={{ display: 'grid', gap: 0 }}>
              {(reconciliation?.shifts || []).map(shiftRow => (
                <div key={shiftRow.shiftId} style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{shiftRow.cashierName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{shiftRow.openedAt || '-'}{shiftRow.closedAt ? ` -> ${shiftRow.closedAt}` : ''}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: shiftRow.status === 'CLOSED' ? '#10b98122' : '#f59e0b22', color: shiftRow.status === 'CLOSED' ? '#10b981' : '#f59e0b', fontWeight: 800 }}>{shiftRow.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10, fontSize: 12 }}>
                    <div><div style={{ color: 'var(--muted)' }}>Bills</div><div style={{ color: 'var(--text)', fontWeight: 700 }}>{shiftRow.totalBills}</div></div>
                    <div><div style={{ color: 'var(--muted)' }}>Sales</div><div style={{ color: 'var(--text)', fontWeight: 700 }}>{money(shiftRow.netSales)}</div></div>
                    <div><div style={{ color: 'var(--muted)' }}>Variance</div><div style={{ color: Math.abs(shiftRow.varianceAmount || 0) > 0.009 ? '#f59e0b' : 'var(--text)', fontWeight: 700 }}>{money(shiftRow.varianceAmount || 0)}</div></div>
                  </div>
                </div>
              ))}
              {(reconciliation?.shifts || []).length === 0 && <div style={{ padding: 18, color: 'var(--muted)', fontSize: 12 }}>No cashier shifts recorded for this date.</div>}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>Settlement Lines</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Each paid bill with payment-method split and cashier trace.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
                {PAYMENT_METHODS.map(method => <span key={method}>{method}: <strong style={{ color: 'var(--text)' }}>{money(reconciliation?.paymentTotals?.[method] || 0)}</strong></span>)}
              </div>
            </div>
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ background: 'var(--surface)', position: 'sticky', top: 0 }}>
                  <tr>
                    {['Order', 'Cashier', 'Paid At', 'Total', 'Payments'].map(header => (
                      <th key={header} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(reconciliation?.settlements || []).map(row => (
                    <tr key={row.orderId} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 800, color: 'var(--text)' }}>{row.orderNumber}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{row.tableNumber || 'Walk-in'} / split {row.splitCount}</div></td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{row.cashierName || 'Unknown'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{row.paidAt || '-'}</td>
                      <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 800, color: 'var(--text)' }}>{money(row.totalAmount)}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Disc {money(row.discountAmount)} / Tax {money(row.taxAmount)}</div></td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}><div>{row.paymentMethods || '-'}</div>{row.paymentReferences ? <div style={{ fontSize: 10, marginTop: 3 }}>Refs: {row.paymentReferences}</div> : null}</td>
                    </tr>
                  ))}
                  {(reconciliation?.settlements || []).length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '18px 12px', color: 'var(--muted)', textAlign: 'center' }}>No settled POS bills recorded for this date.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}











