import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ClipboardCheck, Loader2, Plus, RotateCcw, Search, ShieldCheck, Truck, X } from 'lucide-react'
import {
  getPurchaseOrders,
  getStock,
  getSuppliers,
  getWarehouseReceipts,
  receiveStock,
  recordVendorReturn,
  resolveWarehouseReceipt,
} from '../../api'

function Modal({ children }: any) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'100%', maxWidth:720, background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.45)' }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box',
}

const blankForm = {
  itemId: '',
  supplierId: '',
  purchaseOrderId: '',
  purchaseOrderItemId: '',
  quantityReceived: '',
  receivedUom: '',
  unitsPerPack: '1',
  orderedQuantity: '',
  shortageQuantity: '0',
  damagedQuantity: '0',
  unitCost: '',
  referenceNumber: '',
  invoiceNumber: '',
  batchNumber: '',
  expiryDate: '',
  notes: '',
}

const blankResolveForm = {
  resolutionStatus: 'REPLACEMENT_PENDING',
  resolutionNotes: '',
}

const blankReturnForm = {
  returnedQuantity: '',
  returnReference: '',
  returnNotes: '',
}

export default function WarehouseGrn() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [resolveTarget, setResolveTarget] = useState<any>(null)
  const [returnTarget, setReturnTarget] = useState<any>(null)
  const [resolveForm, setResolveForm] = useState(blankResolveForm)
  const [returnForm, setReturnForm] = useState(blankReturnForm)

  const { data: receipts = [], isLoading } = useQuery({
    queryKey:['warehouse-grn', search],
    queryFn:() => getWarehouseReceipts(search || undefined),
    select:(r:any) => r.data.data || [],
  })

  const { data: stock = [] } = useQuery({
    queryKey:['grn-stock'],
    queryFn:() => getStock(),
    select:(r:any) => r.data.data || [],
  })

  const { data: suppliers = [] } = useQuery({
    queryKey:['grn-suppliers'],
    queryFn:() => getSuppliers(),
    select:(r:any) => r.data.data || [],
  })

  const { data: purchaseOrders = [] } = useQuery({
    queryKey:['grn-purchase-orders'],
    queryFn:() => getPurchaseOrders(),
    select:(r:any) => (r.data.data || []).filter((po:any) => po.poStatus === 'SENT' || po.poStatus === 'PARTIALLY_RECEIVED'),
  })

  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((po:any) => po.id === form.purchaseOrderId),
    [purchaseOrders, form.purchaseOrderId],
  )

  const purchaseOrderLines = useMemo(() => {
    if (!selectedPurchaseOrder) return []
    return (selectedPurchaseOrder.items || []).filter((line:any) => Number(line.orderedQuantity || 0) > Number(line.receivedQuantity || 0))
  }, [selectedPurchaseOrder])

  const selectedPurchaseOrderLine = useMemo(
    () => purchaseOrderLines.find((line:any) => line.id === form.purchaseOrderItemId),
    [purchaseOrderLines, form.purchaseOrderItemId],
  )

  const summary = useMemo(() => {
    const list = receipts || []
    return {
      total: list.length,
      discrepancy: list.filter((row:any) => row.receiptStatus === 'RECEIVED_WITH_DISCREPANCY').length,
      open: list.filter((row:any) => row.resolutionStatus === 'OPEN' || row.resolutionStatus === 'REPLACEMENT_PENDING').length,
      returned: list.filter((row:any) => row.returnStatus === 'COMPLETED').length,
    }
  }, [receipts])

  const refresh = () => {
    qc.invalidateQueries({ queryKey:['warehouse-grn'] })
    qc.invalidateQueries({ queryKey:['stock'] })
    qc.invalidateQueries({ queryKey:['receipts'] })
    qc.invalidateQueries({ queryKey:['purchase-orders'] })
    qc.invalidateQueries({ queryKey:['grn-purchase-orders'] })
    qc.invalidateQueries({ queryKey:['suppliers'] })
  }

  const createMutation = useMutation({
    mutationFn:() => receiveStock(form.itemId, {
      supplierId: form.supplierId || undefined,
      purchaseOrderId: form.purchaseOrderId || undefined,
      purchaseOrderItemId: form.purchaseOrderItemId || undefined,
      quantityReceived: parseFloat(form.quantityReceived),
      receivedUom: form.receivedUom || undefined,
      unitsPerPack: form.unitsPerPack ? parseFloat(form.unitsPerPack) : undefined,
      orderedQuantity: form.orderedQuantity ? parseFloat(form.orderedQuantity) : undefined,
      shortageQuantity: form.shortageQuantity ? parseFloat(form.shortageQuantity) : undefined,
      damagedQuantity: form.damagedQuantity ? parseFloat(form.damagedQuantity) : undefined,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
      referenceNumber: form.referenceNumber || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      batchNumber: form.batchNumber || undefined,
      expiryDate: form.expiryDate || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess:() => {
      refresh()
      setShowCreate(false)
      setForm(blankForm)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => resolveWarehouseReceipt(resolveTarget.id, resolveForm),
    onSuccess: () => {
      refresh()
      setResolveTarget(null)
      setResolveForm(blankResolveForm)
    },
  })

  const returnMutation = useMutation({
    mutationFn: () => recordVendorReturn(returnTarget.id, {
      returnedQuantity: parseFloat(returnForm.returnedQuantity),
      returnReference: returnForm.returnReference || undefined,
      returnNotes: returnForm.returnNotes || undefined,
    }),
    onSuccess: () => {
      refresh()
      setReturnTarget(null)
      setReturnForm(blankReturnForm)
    },
  })

  function onPurchaseOrderChange(id: string) {
    const po = purchaseOrders.find((row:any) => row.id === id)
    setForm(prev => ({
      ...prev,
      purchaseOrderId: id,
      purchaseOrderItemId: '',
      supplierId: po?.supplierId || '',
      itemId: '',
      orderedQuantity: '',
      unitCost: '',
      referenceNumber: prev.referenceNumber || po?.poNumber || '',
    }))
  }

  function onPurchaseOrderLineChange(id: string) {
    const line = purchaseOrderLines.find((row:any) => row.id === id)
    const remaining = line ? Math.max(0, Number(line.orderedQuantity || 0) - Number(line.receivedQuantity || 0)) : 0
    setForm(prev => ({
      ...prev,
      purchaseOrderItemId: id,
      itemId: line?.itemId || '',
      orderedQuantity: remaining ? String(remaining) : '',
      unitCost: line?.unitCost != null ? String(line.unitCost) : prev.unitCost,
      referenceNumber: prev.referenceNumber || selectedPurchaseOrder?.poNumber || '',
    }))
  }

  function resolutionTone(status?: string) {
    switch (status) {
      case 'OPEN': return { bg:'rgba(239,68,68,.15)', color:'#fca5a5', label:'Open' }
      case 'REPLACEMENT_PENDING': return { bg:'rgba(245,158,11,.15)', color:'#fcd34d', label:'Replacement Pending' }
      case 'RETURN_TO_VENDOR': return { bg:'rgba(56,189,248,.15)', color:'#7dd3fc', label:'Return To Vendor' }
      case 'CLOSED': return { bg:'rgba(34,197,94,.15)', color:'#86efac', label:'Closed' }
      default: return { bg:'rgba(148,163,184,.15)', color:'#cbd5e1', label:'Not Required' }
    }
  }

  return (
    <div style={{ maxWidth:1180 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Goods Receipt Note</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Record inward stock, track discrepancies, and close issues with replacement or vendor return actions.</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          <Plus size={14} /> New GRN
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Receipts Logged', value:summary.total, color:'#6366f1', icon:ClipboardCheck },
          { label:'Discrepancies', value:summary.discrepancy, color:'#ef4444', icon:AlertTriangle },
          { label:'Open Actions', value:summary.open, color:'#f59e0b', icon:ShieldCheck },
          { label:'Vendor Returns', value:summary.returned, color:'#38bdf8', icon:RotateCcw },
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GRNs by item, supplier, PO, invoice, or reference..." style={{ ...inputStyle, paddingLeft:30 }} />
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:800, color:'var(--text)' }}>Recent GRNs</div>
        {isLoading ? (
          <div style={{ padding:24, color:'var(--muted)', display:'flex', alignItems:'center', gap:8 }}><Loader2 size={16} className="spin" /> Loading...</div>
        ) : receipts.length === 0 ? (
          <div style={{ padding:24, color:'var(--muted)' }}>No GRNs recorded yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ textAlign:'left', background:'rgba(255,255,255,.02)' }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Supplier</th>
                  <th style={thStyle}>PO</th>
                      <th style={thStyle}>Batch / Expiry</th>
                      <th style={thStyle}>Ordered / Received</th>
                  <th style={thStyle}>Damage / Shortage</th>
                  <th style={thStyle}>Resolution</th>
                  <th style={thStyle}>Return</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((row:any) => {
                  const tone = resolutionTone(row.resolutionStatus)
                  return (
                    <tr key={row.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={tdStyle}><div style={{ fontWeight:700, color:'var(--text)' }}>{row.itemName}</div><div style={{ fontSize:10, color:'var(--muted)', fontFamily:'monospace' }}>{row.itemCode}</div></td>
                      <td style={tdMuted}>{row.supplierName || 'Unlinked supplier'}</td>
                      <td style={tdMuted}>{row.purchaseOrderNumber || 'Manual receipt'}</td>
                      <td style={tdStyle}>
                        <div>{row.batchNumber || 'No batch'}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{row.expiryDate ? `Exp ${new Date(row.expiryDate).toLocaleDateString('en-IN')}` : 'No expiry'}</div>
                      </td>
                      <td style={tdStyle}>
                        {row.orderedQuantity ? Number(row.orderedQuantity).toLocaleString() : '-'} / {Number(row.quantityReceived).toLocaleString()}
                        <span style={{ color:'var(--muted)', fontSize:11 }}> {row.receivedUom || row.unit}</span>
                        {(row.unitsPerPack && Number(row.unitsPerPack) !== 1) && (
                          <div style={{ fontSize:10, color:'var(--muted)' }}>
                            {Number(row.baseQuantityReceived || 0).toLocaleString()} {row.unit} base stock
                          </div>
                        )}
                      </td>
                      <td style={tdMuted}>{Number(row.damagedQuantity || 0).toLocaleString()} / {Number(row.shortageQuantity || 0).toLocaleString()}</td>
                      <td style={tdStyle}>
                        <span style={{ padding:'4px 8px', borderRadius:999, fontSize:11, fontWeight:700, background:tone.bg, color:tone.color }}>{tone.label}</span>
                        {row.resolutionNotes && <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>{row.resolutionNotes}</div>}
                      </td>
                      <td style={tdMuted}>
                        {row.returnStatus === 'COMPLETED'
                          ? `${Number(row.returnedQuantity || 0).toLocaleString()} returned`
                          : row.returnStatus === 'PENDING'
                            ? 'Pending'
                            : 'Not required'}
                        {row.returnReference && <div style={{ fontSize:10, marginTop:4 }}>{row.returnReference}</div>}
                      </td>
                      <td style={tdStyle}>
                        {row.receiptStatus === 'RECEIVED_WITH_DISCREPANCY' ? (
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            <button onClick={() => { setResolveTarget(row); setResolveForm({ resolutionStatus: row.resolutionStatus === 'NOT_REQUIRED' ? 'REPLACEMENT_PENDING' : row.resolutionStatus || 'REPLACEMENT_PENDING', resolutionNotes: row.resolutionNotes || '' }) }} style={actionButtonStyle('#f59e0b')}>
                              Resolve
                            </button>
                            {Number(row.damagedQuantity || 0) > 0 && row.returnStatus !== 'COMPLETED' && (
                              <button onClick={() => { setReturnTarget(row); setReturnForm({ returnedQuantity: String(row.damagedQuantity || ''), returnReference: row.returnReference || '', returnNotes: row.returnNotes || '' }) }} style={actionButtonStyle('#38bdf8')}>
                                Return
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color:'var(--muted)', fontSize:11 }}>Closed</span>
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

      {showCreate && (
        <Modal>
          <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight:800, color:'var(--text)' }}>Record GRN</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Capture supplier receipt details and reconcile them against open purchase orders when available</div>
            </div>
            <button onClick={() => setShowCreate(false)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding:16, display:'grid', gap:12 }}>
            <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.18)', color:'var(--muted)', fontSize:12 }}>
              Link to an open purchase order when you want the GRN to update received quantities and procurement status automatically.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Purchase Order</span>
                <select value={form.purchaseOrderId} onChange={e => onPurchaseOrderChange(e.target.value)} style={inputStyle}>
                  <option value="">Manual receipt (no PO link)</option>
                  {purchaseOrders.map((po:any) => <option key={po.id} value={po.id}>{po.poNumber} • {po.supplierName}</option>)}
                </select>
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>PO Line</span>
                <select value={form.purchaseOrderItemId} onChange={e => onPurchaseOrderLineChange(e.target.value)} style={inputStyle} disabled={!selectedPurchaseOrder}>
                  <option value="">Select line</option>
                  {purchaseOrderLines.map((line:any) => {
                    const remaining = Number(line.orderedQuantity || 0) - Number(line.receivedQuantity || 0)
                    return <option key={line.id} value={line.id}>{line.itemName} • Remaining {remaining.toLocaleString(undefined, { maximumFractionDigits: 2 })} {line.unit}</option>
                  })}
                </select>
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Stock Item</span>
                <select value={form.itemId} onChange={e => setForm(s => ({ ...s, itemId:e.target.value, purchaseOrderItemId: s.purchaseOrderId ? '' : s.purchaseOrderItemId }))} style={inputStyle} disabled={!!selectedPurchaseOrderLine}>
                  <option value="">Select item</option>
                  {stock.map((row:any) => <option key={row.itemId} value={row.itemId}>{row.itemName} ({row.itemCode}) • {row.quantity} {row.unit}</option>)}
                </select>
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Supplier</span>
                <select value={form.supplierId} onChange={e => setForm(s => ({ ...s, supplierId:e.target.value }))} style={inputStyle} disabled={!!selectedPurchaseOrder}>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier:any) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Ordered Quantity</span>
                <input value={form.orderedQuantity} onChange={e => setForm(s => ({ ...s, orderedQuantity:e.target.value }))} type="number" step="0.01" style={inputStyle} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Received Quantity</span>
                <input value={form.quantityReceived} onChange={e => setForm(s => ({ ...s, quantityReceived:e.target.value }))} type="number" step="0.01" style={inputStyle} />
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Received UOM</span>
                <input value={form.receivedUom} onChange={e => setForm(s => ({ ...s, receivedUom:e.target.value }))} placeholder={selectedPurchaseOrderLine?.unit || 'Bag / Box / Carton'} style={inputStyle} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Units Per Pack</span>
                <input value={form.unitsPerPack} onChange={e => setForm(s => ({ ...s, unitsPerPack:e.target.value }))} type="number" step="0.001" style={inputStyle} />
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Shortage Quantity</span>
                <input value={form.shortageQuantity} onChange={e => setForm(s => ({ ...s, shortageQuantity:e.target.value }))} type="number" step="0.01" style={inputStyle} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Damaged Quantity</span>
                <input value={form.damagedQuantity} onChange={e => setForm(s => ({ ...s, damagedQuantity:e.target.value }))} type="number" step="0.01" style={inputStyle} />
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Reference Number</span>
                <input value={form.referenceNumber} onChange={e => setForm(s => ({ ...s, referenceNumber:e.target.value }))} style={inputStyle} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Invoice Number</span>
                <input value={form.invoiceNumber} onChange={e => setForm(s => ({ ...s, invoiceNumber:e.target.value }))} style={inputStyle} />
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Batch Number</span>
                <input value={form.batchNumber} onChange={e => setForm(s => ({ ...s, batchNumber:e.target.value }))} style={inputStyle} placeholder="LOT-2026-APR-01" />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Expiry Date</span>
                <input value={form.expiryDate} onChange={e => setForm(s => ({ ...s, expiryDate:e.target.value }))} type="date" style={inputStyle} />
              </label>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span style={labelStyle}>Unit Cost</span>
                <input value={form.unitCost} onChange={e => setForm(s => ({ ...s, unitCost:e.target.value }))} type="number" step="0.01" style={inputStyle} />
              </label>
              <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.18)', color:'var(--muted)', fontSize:12, alignSelf:'end' }}>
                Discrepancy status is derived automatically from shortage and damage values. Use the new resolution actions to close issues or record vendor returns later.
              </div>
            </div>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Notes</span>
              <textarea value={form.notes} onChange={e => setForm(s => ({ ...s, notes:e.target.value }))} rows={3} style={{ ...inputStyle, resize:'vertical' }} />
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:16, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setShowCreate(false)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>Cancel</button>
            <button disabled={createMutation.isPending || !form.itemId || !form.quantityReceived} onClick={() => createMutation.mutate()} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', opacity:createMutation.isPending ? 0.7 : 1 }}>
              {createMutation.isPending && <Loader2 size={14} className="spin" />}
              Save GRN
            </button>
          </div>
        </Modal>
      )}

      {resolveTarget && (
        <Modal>
          <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight:800, color:'var(--text)' }}>Resolve Discrepancy</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{resolveTarget.itemName} • {resolveTarget.supplierName || 'No supplier linked'}</div>
            </div>
            <button onClick={() => setResolveTarget(null)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding:16, display:'grid', gap:12 }}>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Resolution Status</span>
              <select value={resolveForm.resolutionStatus} onChange={e => setResolveForm(s => ({ ...s, resolutionStatus: e.target.value }))} style={inputStyle}>
                <option value="OPEN">Open</option>
                <option value="REPLACEMENT_PENDING">Replacement Pending</option>
                <option value="RETURN_TO_VENDOR">Return To Vendor</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Resolution Notes</span>
              <textarea value={resolveForm.resolutionNotes} onChange={e => setResolveForm(s => ({ ...s, resolutionNotes:e.target.value }))} rows={4} style={{ ...inputStyle, resize:'vertical' }} placeholder="Document the supplier conversation, replacement plan, or closure details" />
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:16, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setResolveTarget(null)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>Cancel</button>
            <button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer' }}>
              {resolveMutation.isPending && <Loader2 size={14} className="spin" />}
              Save Resolution
            </button>
          </div>
        </Modal>
      )}

      {returnTarget && (
        <Modal>
          <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight:800, color:'var(--text)' }}>Record Vendor Return</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{returnTarget.itemName} • Max returnable damage {returnTarget.damagedQuantity} {returnTarget.unit}</div>
            </div>
            <button onClick={() => setReturnTarget(null)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding:16, display:'grid', gap:12 }}>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Returned Quantity</span>
              <input value={returnForm.returnedQuantity} onChange={e => setReturnForm(s => ({ ...s, returnedQuantity:e.target.value }))} type="number" step="0.01" style={inputStyle} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Return Reference</span>
              <input value={returnForm.returnReference} onChange={e => setReturnForm(s => ({ ...s, returnReference:e.target.value }))} style={inputStyle} placeholder="RTV-2026-001" />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Return Notes</span>
              <textarea value={returnForm.returnNotes} onChange={e => setReturnForm(s => ({ ...s, returnNotes:e.target.value }))} rows={4} style={{ ...inputStyle, resize:'vertical' }} placeholder="Courier, pickup, approval, or replacement details" />
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:16, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setReturnTarget(null)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>Cancel</button>
            <button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending || !returnForm.returnedQuantity} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'none', background:'#38bdf8', color:'#fff', cursor:'pointer' }}>
              {returnMutation.isPending && <Loader2 size={14} className="spin" />}
              Record Return
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function actionButtonStyle(color: string): React.CSSProperties {
  return {
    padding:'5px 9px',
    borderRadius:8,
    border:'none',
    background:color,
    color:'#fff',
    fontSize:11,
    fontWeight:700,
    cursor:'pointer',
  }
}

const labelStyle: React.CSSProperties = { fontSize:12, fontWeight:700, color:'var(--text)' }
const thStyle: React.CSSProperties = { padding:'11px 14px', fontSize:11, color:'var(--muted)' }
const tdStyle: React.CSSProperties = { padding:'11px 14px', color:'var(--text)', fontSize:12, verticalAlign:'top' }
const tdMuted: React.CSSProperties = { padding:'11px 14px', color:'var(--muted)', fontSize:12, verticalAlign:'top' }

