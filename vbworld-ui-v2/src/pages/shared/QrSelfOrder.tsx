import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getPublicQrSession, requestQrBill, submitPublicQrOrder } from '../../api'
import { Loader2, Minus, Plus, ShoppingCart } from 'lucide-react'

type QrMenuItem = {
  id: string
  code: string
  name: string
  category?: string
  unit?: string
  salePrice: number
}

type QrSession = {
  sessionId: string
  sessionToken: string
  status: string
  branchName: string
  tableNumber: string
  capacity?: number
  publicPath: string
  expiresAt: string
  customerName?: string
  customerPhone?: string
  notes?: string
  menuItems: QrMenuItem[]
  activeOrder?: {
    orderNumber: string
    status: string
    serviceStatus?: string
    totalAmount: number
    items: Array<{ id: string; itemName: string; quantity: number; lineTotal: number }>
  } | null
}

function money(value?: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
}

export default function QrSelfOrderPage() {
  const { token = '' } = useParams()
  const qc = useQueryClient()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['qr-session', token],
    queryFn: () => getPublicQrSession(token),
    enabled: !!token,
    select: res => (res.data.data || null) as QrSession | null,
  })

  const items = session?.menuItems || []
  const cartItems = useMemo(() => Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = items.find(entry => entry.id === itemId)
      return item ? { ...item, quantity: qty } : null
    })
    .filter(Boolean) as Array<QrMenuItem & { quantity: number }>, [cart, items])
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * (item.salePrice || 0), 0)

  const requestBill = useMutation({
    mutationFn: () => requestQrBill(token),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['qr-session', token] })
    },
  })

  const submitOrder = useMutation({
    mutationFn: () => submitPublicQrOrder(token, {
      customerName,
      customerPhone,
      notes,
      items: cartItems.map(item => ({ itemId: item.id, quantity: item.quantity })),
    }),
    onSuccess: async () => {
      setCart({})
      await qc.invalidateQueries({ queryKey: ['qr-session', token] })
    },
  })

  function setQty(itemId: string, next: number) {
    setCart(current => ({ ...current, [itemId]: Math.max(0, next) }))
  }

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc' }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e' }} /></div>
  }

  if (!session || error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 520, background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #e2e8f0' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>QR link unavailable</h1>
          <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>This self-order link is missing or has expired. Ask the restaurant team to generate a fresh table QR link.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc 0%,#ecfeff 100%)', padding: '28px 16px 40px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={{ background: '#0f172a', color: '#fff', borderRadius: 24, padding: 24, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.8 }}>VB World Self-Order</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>{session.branchName} • Table {session.tableNumber}</h1>
          <p style={{ margin: 0, color: '#cbd5e1', maxWidth: 760 }}>Guests can order directly from this page. The restaurant counter will see the table order inside POS immediately.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#14b8a622', color: '#99f6e4', fontSize: 12, fontWeight: 800 }}>Live table session</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#ffffff18', color: '#e2e8f0', fontSize: 12, fontWeight: 700 }}>Expires {new Date(session.expiresAt).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 18, alignItems: 'start' }}>
          <div style={{ background: '#fff', borderRadius: 22, border: '1px solid #e2e8f0', padding: 18, display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 18 }}>Menu</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Tap items to build your table order.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {items.map(item => {
                const qty = cart[item.id] || 0
                return (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: 14, display: 'grid', gap: 10, background: '#fff' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 800 }}>{item.category || 'Menu Item'}</div>
                      <div style={{ marginTop: 4, fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>{item.unit || 'Nos'} • {money(item.salePrice)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <button onClick={() => setQty(item.id, qty - 1)} style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}><Minus size={14} /></button>
                      <div style={{ minWidth: 28, textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{qty}</div>
                      <button onClick={() => setQty(item.id, qty + 1)} style={{ width: 34, height: 34, borderRadius: 999, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}><Plus size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 22, border: '1px solid #e2e8f0', padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 900 }}><ShoppingCart size={18} /> Your order</div>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name" style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number" style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid #cbd5e1' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for the table or kitchen" rows={3} style={{ padding: '11px 12px', borderRadius: 12, border: '1px solid #cbd5e1', resize: 'vertical' }} />
              <div style={{ display: 'grid', gap: 8 }}>
                {cartItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#64748b' }}>No items selected yet.</div>
                ) : cartItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                    <span style={{ color: '#0f172a' }}>{item.name} × {item.quantity}</span>
                    <strong style={{ color: '#0f172a' }}>{money(item.quantity * item.salePrice)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e2e8f0', fontWeight: 900, color: '#0f172a' }}>
                <span>Estimated total</span>
                <span>{money(subtotal)}</span>
              </div>
              <button
                onClick={() => submitOrder.mutate()}
                disabled={submitOrder.isPending || cartItems.length === 0}
                style={{ padding: '12px 14px', borderRadius: 14, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer', fontWeight: 800, opacity: cartItems.length === 0 ? 0.6 : 1 }}>
                {submitOrder.isPending ? 'Placing order...' : 'Place self-order'}
              </button>
            </div>

            {session.activeOrder ? (
              <div style={{ background: '#fff', borderRadius: 22, border: '1px solid #e2e8f0', padding: 18, display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: '#0f172a' }}>Current table order</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{session.activeOrder.orderNumber} • {session.activeOrder.status}</div>
                {session.activeOrder.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                    <span style={{ color: '#0f172a' }}>{item.itemName} × {item.quantity}</span>
                    <strong style={{ color: '#0f172a' }}>{money(item.lineTotal)}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e2e8f0', fontWeight: 900, color: '#0f172a' }}>
                  <span>Running total</span>
                  <span>{money(session.activeOrder.totalAmount)}</span>
                </div>
                <button onClick={() => requestBill.mutate()} disabled={requestBill.isPending || session.activeOrder.serviceStatus === 'BILL_REQUESTED'} style={{ padding: '11px 12px', borderRadius: 12, border: 'none', background: session.activeOrder.serviceStatus === 'BILL_REQUESTED' ? '#cbd5e1' : '#f59e0b', color: session.activeOrder.serviceStatus === 'BILL_REQUESTED' ? '#334155' : '#fff', cursor: 'pointer', fontWeight: 800, opacity: session.activeOrder.serviceStatus === 'BILL_REQUESTED' ? 0.8 : 1 }}>
                  {session.activeOrder.serviceStatus === 'BILL_REQUESTED' ? 'Bill already requested' : requestBill.isPending ? 'Requesting bill...' : 'Request bill'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
