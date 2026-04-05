import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleCheckBig,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import {
  createPurchaseOrder,
  getItems,
  getPurchaseOrderRecommendations,
  getPurchaseOrders,
  getSuppliers,
  updatePurchaseOrderStatus,
} from '../../api'

function Modal({ children }: { children: ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'100%', maxWidth:980, maxHeight:'90vh', overflow:'auto', background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.45)' }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width:'100%',
  padding:'10px 12px',
  borderRadius:10,
  background:'var(--surface)',
  border:'1px solid var(--border)',
  color:'var(--text)',
  fontSize:13,
  outline:'none',
  boxSizing:'border-box',
}

const blankLine = { itemId:'', orderedQuantity:'', unitCost:'', notes:'' }
const blankForm = {
  supplierId: '',
  expectedDate: '',
  referenceNumber: '',
  notes: '',
  items: [{ ...blankLine }],
}

const statusMeta: Record<string, { color: string; bg: string }> = {
  DRAFT: { color:'#cbd5e1', bg:'rgba(148,163,184,.16)' },
  SENT: { color:'#93c5fd', bg:'rgba(59,130,246,.16)' },
  PARTIALLY_RECEIVED: { color:'#fde68a', bg:'rgba(245,158,11,.16)' },
  RECEIVED: { color:'#86efac', bg:'rgba(34,197,94,.16)' },
  CANCELLED: { color:'#fca5a5', bg:'rgba(239,68,68,.16)' },
}

function listData<T = any>(payload: any): T[] {
  const data = payload?.data?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  return []
}

export default function WarehousePurchaseOrders() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blankForm)

  const selectedItemIds = useMemo(
    () => Array.from(new Set(form.items.map(line => line.itemId).filter(Boolean))),
    [form.items]
  )

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey:['purchase-orders', search],
    queryFn:() => getPurchaseOrders(search || undefined),
    select:listData,
  })

  const { data: suppliers = [] } = useQuery({
    queryKey:['po-suppliers'],
    queryFn:() => getSuppliers(),
    select:listData,
  })

  const { data: items = [] } = useQuery({
    queryKey:['po-items'],
    queryFn:() => getItems({ active: true, size: 200 }),
    select:listData,
  })

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey:['po-recommendations', selectedItemIds],
    queryFn:() => getPurchaseOrderRecommendations(selectedItemIds),
    enabled:selectedItemIds.length > 0 && open,
    select:listData,
  })

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((supplier: any) => [supplier.id, supplier])),
    [suppliers]
  )

  const summary = useMemo(() => {
    const list = purchaseOrders || []
    return {
      total: list.length,
      drafts: list.filter((row:any) => row.poStatus === 'DRAFT').length,
      sent: list.filter((row:any) => row.poStatus === 'SENT').length,
      received: list.filter((row:any) => row.poStatus === 'RECEIVED').length,
    }
  }, [purchaseOrders])

  const createMutation = useMutation({
    mutationFn:() => createPurchaseOrder({
      supplierId: form.supplierId,
      expectedDate: form.expectedDate || undefined,
      referenceNumber: form.referenceNumber || undefined,
      notes: form.notes || undefined,
      items: form.items
        .filter(line => line.itemId && line.orderedQuantity)
        .map(line => ({
          itemId: line.itemId,
          orderedQuantity: parseFloat(line.orderedQuantity),
          unitCost: line.unitCost ? parseFloat(line.unitCost) : undefined,
          notes: line.notes || undefined,
        })),
    }),
    onSuccess:() => {
      qc.invalidateQueries({ queryKey:['purchase-orders'] })
      setOpen(false)
      setForm(blankForm)
    },
  })

  const statusMutation = useMutation({
    mutationFn:({ id, status }: { id: string; status: string }) => updatePurchaseOrderStatus(id, status),
    onSuccess:() => qc.invalidateQueries({ queryKey:['purchase-orders'] }),
  })

  const bestRecommendation = recommendations[0] || null

  function patchLine(index: number, patch: Record<string, string>) {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((line, i) => i === index ? { ...line, ...patch } : line),
    }))
  }

  function addLine() {
    setForm(prev => ({ ...prev, items: [...prev.items, { ...blankLine }] }))
  }

  function removeLine(index: number) {
    setForm(prev => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== index),
    }))
  }

  function applyRecommendation(rec: any) {
    setForm(prev => ({
      ...prev,
      supplierId: rec.supplierId,
      expectedDate: rec.suggestedExpectedDate || prev.expectedDate,
      items: prev.items.map(line => {
        const covered = rec.coveredItems?.find((item: any) => item.itemId === line.itemId)
        return covered && !line.unitCost
          ? { ...line, unitCost: covered.lastUnitCost != null ? String(covered.lastUnitCost) : line.unitCost }
          : line
      }),
    }))
  }

  return (
    <div style={{ maxWidth:1180 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Purchase Orders</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            Create supplier-facing procurement orders and use smart vendor guidance before issuing them.
          </p>
        </div>
        <button onClick={() => setOpen(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          <Plus size={14} /> New Purchase Order
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Total POs', value:summary.total, color:'#6366f1', icon:FileText },
          { label:'Draft POs', value:summary.drafts, color:'#f59e0b', icon:FileText },
          { label:'Sent To Supplier', value:summary.sent, color:'#3b82f6', icon:Send },
          { label:'Fully Received', value:summary.received, color:'#22c55e', icon:CircleCheckBig },
        ].map(card => (
          <div key={card.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <card.icon size={18} color={card.color} />
              <span style={{ fontSize:22, fontWeight:900, color:'var(--text)' }}>{card.value}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ position:'relative', maxWidth:360, marginBottom:14 }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO number, supplier, item, or reference..." style={{ ...inputStyle, paddingLeft:30 }} />
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:800, color:'var(--text)' }}>Purchase Order Register</div>
        {isLoading ? (
          <div style={{ padding:32, textAlign:'center' }}><Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} /></div>
        ) : purchaseOrders.length === 0 ? (
          <div style={{ padding:28, color:'var(--muted)', fontSize:13 }}>No purchase orders yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['PO', 'Supplier', 'Coverage', 'Status', 'Expected', 'Action'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po: any) => {
                  const meta = statusMeta[po.poStatus] || statusMeta.DRAFT
                  return (
                    <tr key={po.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:800, color:'var(--text)' }}>{po.poNumber}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{po.referenceNumber || 'No reference'}</div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:700, color:'var(--text)' }}>{po.supplierName}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{po.createdByName || 'System'}</div>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--muted)', fontSize:12 }}>
                        <div>{po.items?.length || 0} lines</div>
                        <div>{po.totalReceivedQuantity || 0} / {po.totalOrderedQuantity || 0} received</div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ padding:'4px 10px', borderRadius:20, background:meta.bg, color:meta.color, fontSize:11, fontWeight:800 }}>
                          {po.poStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--text)', fontWeight:700 }}>{po.expectedDate || '-'}</td>
                      <td style={{ padding:'12px 14px' }}>
                        {po.poStatus === 'DRAFT' ? (
                          <button onClick={() => statusMutation.mutate({ id: po.id, status: 'SENT' })} style={{ padding:'6px 10px', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', fontWeight:700, cursor:'pointer' }}>
                            Mark Sent
                          </button>
                        ) : (
                          <span style={{ color:'var(--muted)', fontSize:12 }}>No action</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal>
          <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:'var(--text)' }}>New Purchase Order</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Use mapped supplier intelligence to choose the best vendor before issuing the PO.</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={18} /></button>
          </div>

          <div style={{ padding:18, display:'grid', gridTemplateColumns:'minmax(0, 1.1fr) minmax(320px, .9fr)', gap:18, alignItems:'start' }}>
            <div style={{ display:'grid', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Supplier *</label>
                  <select value={form.supplierId} onChange={e => setForm(prev => ({ ...prev, supplierId: e.target.value }))} style={inputStyle}>
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier: any) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Expected Date</label>
                  <input type="date" value={form.expectedDate} onChange={e => setForm(prev => ({ ...prev, expectedDate: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Reference Number</label>
                  <input value={form.referenceNumber} onChange={e => setForm(prev => ({ ...prev, referenceNumber: e.target.value }))} style={inputStyle} placeholder="PO-REQ-001" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Selected Supplier Lead Time</label>
                  <div style={{ ...inputStyle, display:'flex', alignItems:'center', color:'var(--muted)' }}>
                    {form.supplierId ? `${supplierMap[form.supplierId]?.leadTimeDays || '-'} days` : 'Pick supplier'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>PO Notes</label>
                <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize:'none' }} placeholder="Any receiving or vendor instructions" />
              </div>

              <div style={{ border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>PO Lines</span>
                  <button onClick={addLine} style={{ padding:'6px 10px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, cursor:'pointer' }}>Add Line</button>
                </div>
                <div style={{ padding:14, display:'grid', gap:12 }}>
                  {form.items.map((line, index) => {
                    const lineItem = items.find((item: any) => item.id === line.itemId)
                    const lineBest = recommendations.find((rec: any) => rec.coveredItems?.some((covered: any) => covered.itemId === line.itemId))
                    const covered = lineBest?.coveredItems?.find((covered: any) => covered.itemId === line.itemId)
                    return (
                      <div key={index} style={{ border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'2.1fr 1fr 1fr auto', gap:10, alignItems:'end' }}>
                          <div>
                            <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Item *</label>
                            <select value={line.itemId} onChange={e => patchLine(index, { itemId: e.target.value })} style={inputStyle}>
                              <option value="">Select item</option>
                              {items.map((item: any) => (
                                <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Qty *</label>
                            <input value={line.orderedQuantity} onChange={e => patchLine(index, { orderedQuantity: e.target.value })} style={inputStyle} placeholder="10" />
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Unit Cost</label>
                            <input value={line.unitCost} onChange={e => patchLine(index, { unitCost: e.target.value })} style={inputStyle} placeholder={covered?.lastUnitCost != null ? String(covered.lastUnitCost) : 'Auto'} />
                          </div>
                          <button onClick={() => removeLine(index)} style={{ height:40, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer' }}>Remove</button>
                        </div>
                        <div style={{ marginTop:10 }}>
                          <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Line Notes</label>
                          <input value={line.notes} onChange={e => patchLine(index, { notes: e.target.value })} style={inputStyle} placeholder="Packing, preferred brand, grade, or quality notes" />
                        </div>
                        {lineItem && (
                          <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginTop:10, fontSize:11, color:'var(--muted)', flexWrap:'wrap' }}>
                            <span>{lineItem.category || 'Uncategorized'} • {lineItem.unit || 'Unit'}</span>
                            {covered ? (
                              <span style={{ color: covered.preferred ? '#f59e0b' : '#38bdf8', fontWeight:700 }}>
                                Suggested: {lineBest?.supplierName} • {covered.leadTimeDays} day lead • MOQ {covered.minOrderQuantity ?? '-'}
                              </span>
                            ) : (
                              <span>No mapped vendor yet for this item</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gap:12 }}>
              <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,.16), rgba(20,184,166,.12))', border:'1px solid rgba(99,102,241,.22)', borderRadius:16, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Sparkles size={16} color="#6366f1" />
                  <span style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Smart Procurement Guide</span>
                </div>
                {selectedItemIds.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--muted)' }}>Add one or more items to see ranked supplier recommendations.</div>
                ) : recommendationsLoading ? (
                  <div style={{ padding:'10px 0' }}><Loader2 size={18} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} /></div>
                ) : recommendations.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--muted)' }}>No supplier mappings found yet for the selected items. Add mappings in Suppliers first.</div>
                ) : (
                  <div style={{ display:'grid', gap:10 }}>
                    {recommendations.slice(0, 3).map((rec: any, index: number) => {
                      const active = rec.supplierId === form.supplierId
                      return (
                        <button
                          key={rec.supplierId}
                          onClick={() => applyRecommendation(rec)}
                          style={{ textAlign:'left', padding:12, borderRadius:12, border:active ? '1px solid #6366f1' : '1px solid var(--border)', background:active ? 'rgba(99,102,241,.12)' : 'var(--card)', color:'var(--text)', cursor:'pointer' }}
                        >
                          <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:800 }}>{index === 0 ? 'Top Pick' : `Option ${index + 1}`} • {rec.supplierName}</div>
                              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{rec.supplierCode} • {rec.contactPerson || 'No contact'} • {rec.phone || 'No phone'}</div>
                            </div>
                            {rec.preferredItemCount > 0 && (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:20, background:'rgba(245,158,11,.14)', color:'#f59e0b', fontSize:10, fontWeight:800 }}>
                                <Star size={10} /> {rec.preferredItemCount} preferred
                              </span>
                            )}
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8, marginTop:10, fontSize:11, color:'var(--muted)' }}>
                            <div>Coverage: <strong style={{ color:'var(--text)' }}>{rec.mappedItemCount} items</strong></div>
                            <div>Lead: <strong style={{ color:'var(--text)' }}>{rec.averageLeadTimeDays} days</strong></div>
                            <div>Avg cost: <strong style={{ color:'var(--text)' }}>{rec.averageUnitCost ?? '-'}</strong></div>
                          </div>
                          <div style={{ marginTop:8, fontSize:11, color:'#94a3b8' }}>
                            Suggested expected date: {rec.suggestedExpectedDate || '-'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16 }}>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', marginBottom:8 }}>PO Readiness</div>
                <div style={{ display:'grid', gap:8, fontSize:12, color:'var(--muted)' }}>
                  <div>Lines selected: <strong style={{ color:'var(--text)' }}>{selectedItemIds.length}</strong></div>
                  <div>Supplier chosen: <strong style={{ color:'var(--text)' }}>{form.supplierId ? supplierMap[form.supplierId]?.name : 'No'}</strong></div>
                  <div>Smart top pick: <strong style={{ color:'var(--text)' }}>{bestRecommendation?.supplierName || 'No recommendation yet'}</strong></div>
                </div>
                {bestRecommendation && form.supplierId && bestRecommendation.supplierId !== form.supplierId && (
                  <div style={{ marginTop:10, fontSize:11, color:'#f59e0b' }}>
                    Current supplier differs from the best-ranked mapped vendor.
                  </div>
                )}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.supplierId || !form.items.some(line => line.itemId && line.orderedQuantity) || createMutation.isPending}
                  style={{ flex:1, padding:'11px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:800, cursor:'pointer' }}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
                </button>
                <button onClick={() => setOpen(false)} style={{ padding:'11px 14px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
