import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIndents, getIndent, approveIndent, dispatchIndent, deliverIndent, cancelIndent } from '../../api'
import { CheckCircle, Truck, Package, X, Loader2, RefreshCw } from 'lucide-react'

const STATUS_C: Record<string, string> = {
  SUBMITTED: '#eab308',
  APPROVED: '#06b6d4',
  DISPATCHED: '#a78bfa',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
  DRAFT: '#64748b',
}

function Modal({ children }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        {children}
      </div>
    </div>
  )
}

export default function WarehouseOrders() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('SUBMITTED')
  const [detail, setDetail] = useState<any>(null)
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['wh-orders', tab, page],
    queryFn: () => getIndents({ status: tab || undefined, page, size: 15 }),
    select: (r) => r.data.data,
    refetchInterval: 30000,
  })

  const loadDetail = async (id: string) => {
    const res = await getIndent(id)
    setDetail(res.data.data)
  }

  const approve = useMutation({
    mutationFn: () => approveIndent(detail.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wh-orders'] })
      loadDetail(detail.id)
    },
  })
  const dispatch = useMutation({
    mutationFn: () => dispatchIndent(detail.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wh-orders'] })
      loadDetail(detail.id)
    },
  })
  const deliver = useMutation({
    mutationFn: () => deliverIndent(detail.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wh-orders'] })
      setDetail(null)
    },
  })
  const cancel = useMutation({
    mutationFn: () => cancelIndent(detail.id, 'Cancelled by warehouse'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wh-orders'] })
      setDetail(null)
    },
  })

  const tabs = [
    { k: 'SUBMITTED', label: 'Pending', color: '#eab308' },
    { k: 'APPROVED', label: 'Approved', color: '#06b6d4' },
    { k: 'DISPATCHED', label: 'Dispatched', color: '#a78bfa' },
    { k: 'DELIVERED', label: 'Delivered', color: '#22c55e' },
    { k: '', label: 'All Orders', color: 'var(--muted)' },
  ]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Order Management</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Review, approve, and dispatch orders from all branches</p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['wh-orders'] })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => {
              setTab(t.k)
              setPage(0)
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: tab === t.k ? '#6366f1' : 'var(--card)',
              color: tab === t.k ? '#fff' : t.color,
              border: tab === t.k ? '1px solid #6366f1' : '1px solid var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
        ) : (data?.content || []).length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
            No {tab || ''} orders found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--surface)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Indent #', 'Branch', 'Items', 'Status', 'Created', 'Scheduled', 'Slot', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.content || []).map((o: any) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', fontSize: 12 }}>{o.indentNumber}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>{o.branchName}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{o.itemCount} items</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_C[o.status] || '#6366f1'}18`, color: STATUS_C[o.status] || '#6366f1' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 11 }}>
                    {(o.scheduledDeliveryDate || o.expectedDate) ? new Date(o.scheduledDeliveryDate || o.expectedDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>{o.promisedDeliverySlot || o.requestedDeliverySlot || '-'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => loadDetail(o.id)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 11, cursor: 'pointer' }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>{data.totalElements} orders</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer' }}>Prev</button>
              <span style={{ padding: '5px 10px', color: 'var(--muted)' }}>{page + 1}/{data.totalPages}</span>
              <button disabled={data.last} onClick={() => setPage((p) => p + 1)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <Modal>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#6366f1', fontSize: 15 }}>{detail.indentNumber}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{detail.branchName} · {detail.createdByName}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${STATUS_C[detail.status]}18`, color: STATUS_C[detail.status] }}>
                {detail.status}
              </span>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={18} /></button>
            </div>
          </div>

          {detail.notes && (
            <div style={{ padding: '10px 18px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>
              Notes: {detail.notes}
            </div>
          )}

          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12 }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Scheduled Date</div>
              <div style={{ color: 'var(--text)', fontWeight: 700, marginTop: 2 }}>
                {(detail.scheduledDeliveryDate || detail.expectedDate) ? new Date(detail.scheduledDeliveryDate || detail.expectedDate).toLocaleDateString('en-IN') : '-'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Requested Slot</div>
              <div style={{ color: 'var(--text)', fontWeight: 700, marginTop: 2 }}>{detail.requestedDeliverySlot || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Promised Slot</div>
              <div style={{ color: 'var(--text)', fontWeight: 700, marginTop: 2 }}>{detail.promisedDeliverySlot || '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>Cutoff Rule</div>
              <div style={{ marginTop: 2 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: detail.cutoffApplied ? '#f59e0b18' : '#22c55e18', color: detail.cutoffApplied ? '#f59e0b' : '#22c55e' }}>
                  {detail.cutoffApplied ? 'Cutoff applied' : 'Within cutoff'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Item', 'Category', 'Requested', 'Approved', 'Unit'].map((h) => (
                    <th key={h} style={{ padding: '10px 0', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(detail.items || []).map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, color: 'var(--text)' }}>{item.itemName}</td>
                    <td style={{ padding: '10px 0', color: 'var(--muted)', fontSize: 11 }}>{item.category || '-'}</td>
                    <td style={{ padding: '10px 0', fontWeight: 700, color: 'var(--text)' }}>{item.requestedQty}</td>
                    <td style={{ padding: '10px 0', color: item.approvedQty ? '#22c55e' : 'var(--muted)' }}>{item.approvedQty ?? '-'}</td>
                    <td style={{ padding: '10px 0', color: 'var(--muted)' }}>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
            {detail.status === 'SUBMITTED' && (
              <button
                onClick={() => approve.mutate()}
                disabled={approve.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#22c55e', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {approve.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                Approve Order
              </button>
            )}
            {detail.status === 'APPROVED' && (
              <button
                onClick={() => dispatch.mutate()}
                disabled={dispatch.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#a78bfa', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {dispatch.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={14} />}
                Dispatch Order
              </button>
            )}
            {detail.status === 'DISPATCHED' && (
              <button
                onClick={() => deliver.mutate()}
                disabled={deliver.isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#06b6d4', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {deliver.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Package size={14} />}
                Mark Delivered
              </button>
            )}
            {['SUBMITTED', 'APPROVED'].includes(detail.status) && (
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #ef4444', background: 'none', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
            <button onClick={() => setDetail(null)} style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Close
            </button>
          </div>
        </Modal>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
