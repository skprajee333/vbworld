import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, Phone, Search, ShoppingBag, Star } from 'lucide-react'
import { getCustomer, getCustomers } from '../../api'

type CustomerSummary = {
  id: string
  name: string
  phone?: string
  branchName?: string
  totalVisits: number
  totalSpend: number
  pointsBalance: number
  lifetimePointsEarned: number
  lifetimePointsRedeemed: number
  lastVisitAt?: string
}

type CustomerDetail = CustomerSummary & {
  recentOrders?: Array<{
    id: string
    orderNumber: string
    tableNumber?: string
    totalAmount: number
    paymentMethods?: string
    paidAt?: string
  }>
  loyaltyTransactions?: Array<{
    id: string
    transactionType: string
    points: number
    amountValue: number
    branchName?: string
    orderNumber?: string
    createdByName?: string
    notes?: string
    createdAt?: string
  }>
}

function money(value?: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('en-IN') : '?'
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers(search || undefined),
    select: res => (res.data.data || []) as CustomerSummary[],
  })

  useEffect(() => {
    if (!selectedCustomerId && customers.length) {
      setSelectedCustomerId(customers[0].id)
    }
    if (selectedCustomerId && customers.length && !customers.some(customer => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(customers[0]?.id || '')
    }
  }, [customers, selectedCustomerId])

  const selectedSummary = useMemo(
    () => customers.find(customer => customer.id === selectedCustomerId) || null,
    [customers, selectedCustomerId],
  )

  const { data: detail } = useQuery({
    queryKey: ['customer-detail', selectedCustomerId],
    queryFn: () => getCustomer(selectedCustomerId),
    enabled: Boolean(selectedCustomerId),
    select: res => (res.data.data || null) as CustomerDetail | null,
  })

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1320 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>Customers And Loyalty</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
          Track repeat guests, loyalty balance, order history, and branch-level customer value.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name or phone"
              style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            />
          </div>

          <div style={{ display: 'grid', gap: 10, maxHeight: 720, overflow: 'auto' }}>
            {customers.map(customer => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                style={{
                  textAlign: 'left',
                  padding: 14,
                  borderRadius: 14,
                  border: selectedCustomerId === customer.id ? '1px solid #6366f1' : '1px solid var(--border)',
                  background: selectedCustomerId === customer.id ? '#6366f112' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text)' }}>{customer.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{customer.phone || 'No phone'}{customer.branchName ? ` ? ${customer.branchName}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#f59e0b22', color: '#f59e0b', fontWeight: 800 }}>
                    {customer.pointsBalance} pts
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>{customer.totalVisits} visits</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{money(customer.totalSpend)}</span>
                </div>
              </button>
            ))}
            {customers.length === 0 && (
              <div style={{ padding: 18, borderRadius: 14, border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
                No customers found yet. POS settlements with customer phone numbers will start building this CRM list.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{detail?.name || selectedSummary?.name || 'Select a customer'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} /> {detail?.phone || selectedSummary?.phone || 'No phone on file'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Last visit: {formatDate(detail?.lastVisitAt || selectedSummary?.lastVisitAt)}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{detail?.branchName || selectedSummary?.branchName || 'Branch not set'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Points Balance</div>
                <div style={{ marginTop: 6, color: '#f59e0b', fontWeight: 900 }}>{detail?.pointsBalance || 0}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Lifetime Spend</div>
                <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 900 }}>{money(detail?.totalSpend)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Visits</div>
                <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 900 }}>{detail?.totalVisits || 0}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Points Earned / Redeemed</div>
                <div style={{ marginTop: 6, color: 'var(--text)', fontWeight: 900 }}>{detail?.lifetimePointsEarned || 0} / {detail?.lifetimePointsRedeemed || 0}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={16} style={{ color: '#6366f1' }} />
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>Recent Orders</div>
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                {(detail?.recentOrders || []).map(order => (
                  <div key={order.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text)' }}>{order.orderNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{order.tableNumber || 'Walk-in'} ? {formatDate(order.paidAt)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10b981' }}>{money(order.totalAmount)}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{order.paymentMethods || '?'}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {(detail?.recentOrders || []).length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>No paid POS orders linked yet.</div>}
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Coins size={16} style={{ color: '#f59e0b' }} />
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>Loyalty Ledger</div>
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                {(detail?.loyaltyTransactions || []).map(tx => (
                  <div key={tx.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Star size={14} style={{ color: tx.points > 0 ? '#10b981' : '#f59e0b' }} />
                          {tx.transactionType}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{tx.orderNumber || 'Manual'}{tx.branchName ? ` ? ${tx.branchName}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: tx.points > 0 ? '#10b981' : '#f59e0b' }}>{tx.points > 0 ? `+${tx.points}` : tx.points} pts</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{formatDate(tx.createdAt)}</div>
                      </div>
                    </div>
                    {tx.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{tx.notes}</div>}
                  </div>
                ))}
                {(detail?.loyaltyTransactions || []).length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>No loyalty activity recorded yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
