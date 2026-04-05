import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, PlugZap, ReceiptText, RefreshCcw, Search, Wallet } from 'lucide-react'
import {
  createAggregatorOrder,
  getAggregatorIntegrations,
  getAggregatorOrders,
  getBranchList,
  reconcileAggregatorOrder,
  saveAggregatorIntegration,
  triggerAggregatorSync,
  updateAggregatorOrderStatus,
} from '../../api'
import { useAuth } from '../../store/auth'

type Branch = { id: string; name: string }


type AggregatorIntegration = {
  id: string
  branchId: string
  branchName: string
  source: string
  storeCode: string
  outletName?: string
  integrationStatus: string
  autoSyncEnabled: boolean
  syncIntervalMinutes: number
  lastSyncAt?: string
  lastSyncStatus?: string
  lastSyncMessage?: string
  lastOrderImportedAt?: string
}

type AggregatorOrder = {
  id: string
  branchId: string
  branchName: string
  source: string
  externalOrderId: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  items: Array<{ itemName: string; quantity: number; unitPrice: number }>
  subtotal: number
  taxAmount: number
  packagingCharge: number
  deliveryCharge: number
  discountAmount: number
  totalAmount: number
  aggregatorStatus: string
  paymentStatus: string
  reconciliationStatus: string
  payoutReference?: string
  payoutAmount?: number
  notes?: string
  orderedAt: string
  acceptedAt?: string
  deliveredAt?: string
  reconciledAt?: string
}

const SOURCES = ['SWIGGY', 'ZOMATO', 'WEBSITE', 'PHONE']
const AGGREGATOR_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED']
const RECON_STATUSES = ['PENDING', 'MATCHED', 'DISPUTED', 'SETTLED']

function money(value?: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
}

function fmtDate(value?: string) {
  return value ? new Date(value).toLocaleString('en-IN') : '?'
}

export default function AggregatorHubPage() {
  const qc = useQueryClient()
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const isAdminLike = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE_ADMIN'

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [source, setSource] = useState('SWIGGY')
  const [externalOrderId, setExternalOrderId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [itemsText, setItemsText] = useState('Paneer Fried Rice|2|180')
  const [subtotal, setSubtotal] = useState('360')
  const [taxAmount, setTaxAmount] = useState('0')
  const [packagingCharge, setPackagingCharge] = useState('20')
  const [deliveryCharge, setDeliveryCharge] = useState('0')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutReference, setPayoutReference] = useState('')
  const [integrationBranchId, setIntegrationBranchId] = useState('')
  const [integrationSource, setIntegrationSource] = useState('SWIGGY')
  const [storeCode, setStoreCode] = useState('')
  const [outletName, setOutletName] = useState('')
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('15')

  const { data: branches = [] } = useQuery({
    queryKey: ['hub-branches'],
    queryFn: getBranchList,
    select: res => (res.data.data || []) as Branch[],
  })

  const { data: integrations = [] } = useQuery({
    queryKey: ['aggregator-integrations'],
    queryFn: () => getAggregatorIntegrations(),
    enabled: isAdminLike,
    select: res => (res.data.data || []) as AggregatorIntegration[],
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['aggregator-orders', search],
    queryFn: () => getAggregatorOrders(search || undefined),
    select: res => (res.data.data || []) as AggregatorOrder[],
  })

  const selected = useMemo(() => orders.find(order => order.id === selectedId) || orders[0] || null, [orders, selectedId])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['aggregator-orders'] })
    qc.invalidateQueries({ queryKey: ['aggregator-integrations'] })
  }

  const saveIntegration = useMutation({
    mutationFn: () => saveAggregatorIntegration({
      branchId: integrationBranchId || undefined,
      source: integrationSource,
      storeCode,
      outletName: outletName || null,
      autoSyncEnabled: true,
      syncIntervalMinutes: Number(syncIntervalMinutes || 15),
      integrationStatus: 'ACTIVE',
    }),
    onSuccess: () => {
      refresh()
      setStoreCode('')
      setOutletName('')
      setSyncIntervalMinutes('15')
    },
  })

  const runSync = useMutation({
    mutationFn: (integrationId: string) => triggerAggregatorSync(integrationId),
    onSuccess: response => {
      const imported = (response.data.data?.orders || []) as AggregatorOrder[]
      if (imported.length > 0) setSelectedId(imported[0].id)
      refresh()
    },
  })

  const createOrder = useMutation({
    mutationFn: () => createAggregatorOrder({
      branchId: branchId || undefined,
      source,
      externalOrderId,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      deliveryAddress: deliveryAddress || null,
      items: itemsText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [itemName, quantity, unitPrice] = line.split('|')
          return { itemName, quantity: Number(quantity || 1), unitPrice: Number(unitPrice || 0) }
        }),
      subtotal: Number(subtotal || 0),
      taxAmount: Number(taxAmount || 0),
      packagingCharge: Number(packagingCharge || 0),
      deliveryCharge: Number(deliveryCharge || 0),
      discountAmount: Number(discountAmount || 0),
      paymentStatus: 'PAID',
      notes: notes || null,
    }),
    onSuccess: () => {
      refresh()
      setExternalOrderId('')
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setItemsText('')
      setSubtotal('0')
      setTaxAmount('0')
      setPackagingCharge('0')
      setDeliveryCharge('0')
      setDiscountAmount('0')
      setNotes('')
    },
  })

  const updateStatus = useMutation({
    mutationFn: (payload: { aggregatorStatus?: string; paymentStatus?: string; notes?: string }) =>
      updateAggregatorOrderStatus(selected!.id, payload),
    onSuccess: refresh,
  })

  const reconcile = useMutation({
    mutationFn: (status: string) => reconcileAggregatorOrder(selected!.id, {
      reconciliationStatus: status,
      payoutAmount: payoutAmount ? Number(payoutAmount) : null,
      payoutReference: payoutReference || null,
      notes: notes || null,
    }),
    onSuccess: refresh,
  })

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1380 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>Aggregator Order Hub</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
          One screen for external order intake, kitchen progress, and payout reconciliation.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {isAdminLike && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
              <div style={{ fontWeight: 900, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlugZap size={16} /> Integrations And Sync
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select value={integrationBranchId} onChange={e => setIntegrationBranchId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="">Select branch</option>
                    {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                  <select value={integrationSource} onChange={e => setIntegrationSource(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    {SOURCES.filter(option => option !== 'PHONE').map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input value={storeCode} onChange={e => setStoreCode(e.target.value)} placeholder="Store code / external outlet key" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  <input value={outletName} onChange={e => setOutletName(e.target.value)} placeholder="Outlet display name" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <input value={syncIntervalMinutes} onChange={e => setSyncIntervalMinutes(e.target.value)} placeholder="Sync interval in minutes" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <button onClick={() => saveIntegration.mutate()} disabled={saveIntegration.isPending || !integrationBranchId || !storeCode} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                  {saveIntegration.isPending ? 'Saving...' : 'Save Integration'}
                </button>
                <div style={{ display: 'grid', gap: 8 }}>
                  {integrations.map(integration => (
                    <div key={integration.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--surface)', display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text)' }}>{integration.source} ? {integration.branchName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{integration.outletName || integration.storeCode} ? every {integration.syncIntervalMinutes} min</div>
                        </div>
                        <button onClick={() => runSync.mutate(integration.id)} disabled={runSync.isPending} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <RefreshCcw size={14} /> Sync Now
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{integration.lastSyncStatus || 'Never synced'} ? {integration.lastSyncAt ? fmtDate(integration.lastSyncAt) : 'No sync yet'}</div>
                      {integration.lastSyncMessage ? <div style={{ fontSize: 11, color: 'var(--text)' }}>{integration.lastSyncMessage}</div> : null}
                    </div>
                  ))}
                  {integrations.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No integrations saved yet.</div>}
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
            <div style={{ fontWeight: 900, color: 'var(--text)', marginBottom: 12 }}>Import Aggregator Order</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {isAdminLike && (
                <select value={branchId} onChange={e => setBranchId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                  <option value="">Select branch</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <select value={source} onChange={e => setSource(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                  {SOURCES.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <input value={externalOrderId} onChange={e => setExternalOrderId(e.target.value)} placeholder="External order ID" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Customer phone" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2} placeholder="Delivery address" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} />
              <textarea value={itemsText} onChange={e => setItemsText(e.target.value)} rows={4} placeholder="One line per item: Item Name|Qty|Unit Price" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={subtotal} onChange={e => setSubtotal(e.target.value)} placeholder="Subtotal" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <input value={taxAmount} onChange={e => setTaxAmount(e.target.value)} placeholder="Tax" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <input value={packagingCharge} onChange={e => setPackagingCharge(e.target.value)} placeholder="Packaging" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
                <input value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} placeholder="Delivery" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <input value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="Discount" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ops note or import note" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} />
              <button onClick={() => createOrder.mutate()} disabled={createOrder.isPending || !externalOrderId} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
                {createOrder.isPending ? 'Importing...' : 'Add To Hub'}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID, customer, or phone" style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 12, maxHeight: 500, overflow: 'auto' }}>
              {orders.map(order => (
                <button key={order.id} onClick={() => setSelectedId(order.id)} style={{ textAlign: 'left', padding: 12, borderRadius: 14, border: selected?.id === order.id ? '1px solid #6366f1' : '1px solid var(--border)', background: selected?.id === order.id ? '#6366f112' : 'var(--surface)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{order.source} ? {order.externalOrderId}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{order.branchName} ? {order.customerName || 'Guest'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#10b981' }}>{money(order.totalAmount)}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{order.reconciliationStatus}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
          {!selected ? (
            <div style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No aggregator orders available yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{selected.source} ? {selected.externalOrderId}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{selected.branchName} ? ordered {fmtDate(selected.orderedAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#6366f118', color: '#6366f1', fontWeight: 800 }}>{selected.aggregatorStatus}</span>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#10b98118', color: '#10b981', fontWeight: 800 }}>{selected.paymentStatus}</span>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#f59e0b18', color: '#f59e0b', fontWeight: 800 }}>{selected.reconciliationStatus}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Customer</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{selected.customerName || 'Guest'}</div><div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{selected.customerPhone || 'No phone'}</div></div>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Sales</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{money(selected.totalAmount)}</div></div>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Accepted</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{fmtDate(selected.acceptedAt)}</div></div>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>Delivered</div><div style={{ marginTop: 6, fontWeight: 800, color: 'var(--text)' }}>{fmtDate(selected.deliveredAt)}</div></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ReceiptText size={15} /> Order Lines
                  </div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {selected.items.map((item, index) => (
                      <div key={`${item.itemName}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.itemName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{item.quantity} x {money(item.unitPrice)}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: '#10b981' }}>{money((item.quantity || 0) * (item.unitPrice || 0))}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Operational Status</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <select defaultValue={selected.aggregatorStatus} onChange={e => updateStatus.mutate({ aggregatorStatus: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                        {AGGREGATOR_STATUSES.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <select defaultValue={selected.paymentStatus} onChange={e => updateStatus.mutate({ paymentStatus: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
                        {PAYMENT_STATUSES.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Changing to `ACCEPTED` or `DELIVERED` stamps ops time automatically.</div>
                  </div>

                  {isAdminLike && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Wallet size={15} /> Payout Reconciliation
                      </div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <input value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder='Payout amount' style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                          <input value={payoutReference} onChange={e => setPayoutReference(e.target.value)} placeholder='Payout reference' style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {RECON_STATUSES.map(status => (
                            <button key={status} onClick={() => reconcile.mutate(status)} style={{ padding: '9px 10px', borderRadius: 10, border: 'none', background: status === 'DISPUTED' ? '#ef4444' : status === 'SETTLED' ? '#10b981' : '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                              {status}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current payout: {selected.payoutAmount ? money(selected.payoutAmount) : '?'} ? Ref: {selected.payoutReference || '?'}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link2 size={15} /> Delivery And Accounting Notes
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>{selected.deliveryAddress || 'No address recorded.'}</div>
                    {selected.notes && <div style={{ marginTop: 10, color: 'var(--text)', fontSize: 12 }}>{selected.notes}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
