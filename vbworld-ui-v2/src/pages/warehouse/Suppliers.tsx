import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplier,
  getItems,
  getSupplierItemMappings,
  getSuppliers,
  saveSupplierItemMapping,
  updateSupplier,
} from '../../api'
import {
  Edit3,
  Layers3,
  Loader2,
  Plus,
  Search,
  Star,
  Truck,
  X,
} from 'lucide-react'

function Modal({ children }: { children: ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,.45)' }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width:'100%',
  padding:'9px 10px',
  borderRadius:8,
  background:'var(--surface)',
  border:'1px solid var(--border)',
  color:'var(--text)',
  fontSize:13,
  outline:'none',
  boxSizing:'border-box',
}

const blankForm = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  leadTimeDays: '2',
  address: '',
  notes: '',
  active: true,
}

const blankMapping = {
  itemId: '',
  supplierSku: '',
  lastUnitCost: '',
  minOrderQuantity: '',
  leadTimeDays: '',
  preferred: false,
  active: true,
  notes: '',
}

function listData<T = any>(payload: any): T[] {
  const data = payload?.data?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  return []
}

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(blankForm)
  const [editSupplier, setEditSupplier] = useState<any>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [mappingForm, setMappingForm] = useState(blankMapping)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => getSuppliers(search || undefined),
    select: listData,
  })

  const { data: items = [] } = useQuery({
    queryKey: ['supplier-mapping-items'],
    queryFn: () => getItems({ active: true, size: 200 }),
    select: listData,
  })

  useEffect(() => {
    if (!selectedSupplierId && suppliers[0]?.id) {
      setSelectedSupplierId(suppliers[0].id)
    }
    if (selectedSupplierId && !suppliers.some((supplier: any) => supplier.id === selectedSupplierId)) {
      setSelectedSupplierId(suppliers[0]?.id || '')
    }
  }, [suppliers, selectedSupplierId])

  const selectedSupplier = suppliers.find((supplier: any) => supplier.id === selectedSupplierId) || null

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['supplier-mappings', selectedSupplierId],
    queryFn: () => getSupplierItemMappings(selectedSupplierId),
    enabled: !!selectedSupplierId,
    select: listData,
  })

  const summary = useMemo(() => {
    const list = suppliers || []
    return {
      total: list.length,
      active: list.filter((s: any) => s.active).length,
      mappedItems: list.reduce((sum: number, s: any) => sum + (s.mappedItemCount || 0), 0),
      preferredLinks: list.reduce((sum: number, s: any) => sum + (s.preferredItemCount || 0), 0),
    }
  }, [suppliers])

  const createMutation = useMutation({
    mutationFn: () => createSupplier({
      ...createForm,
      leadTimeDays: createForm.leadTimeDays ? parseInt(createForm.leadTimeDays, 10) : 2,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setShowCreate(false)
      setCreateForm(blankForm)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateSupplier(editSupplier.id, {
      code: editSupplier.code,
      name: editSupplier.name,
      contactPerson: editSupplier.contactPerson,
      phone: editSupplier.phone,
      email: editSupplier.email,
      leadTimeDays: editSupplier.leadTimeDays ? parseInt(editSupplier.leadTimeDays, 10) : 2,
      address: editSupplier.address,
      notes: editSupplier.notes,
      active: editSupplier.active,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setEditSupplier(null)
    },
  })

  const mappingMutation = useMutation({
    mutationFn: () => saveSupplierItemMapping(selectedSupplierId, {
      itemId: mappingForm.itemId,
      supplierSku: mappingForm.supplierSku || undefined,
      lastUnitCost: mappingForm.lastUnitCost ? parseFloat(mappingForm.lastUnitCost) : undefined,
      minOrderQuantity: mappingForm.minOrderQuantity ? parseFloat(mappingForm.minOrderQuantity) : undefined,
      leadTimeDays: mappingForm.leadTimeDays ? parseInt(mappingForm.leadTimeDays, 10) : undefined,
      preferred: mappingForm.preferred,
      active: mappingForm.active,
      notes: mappingForm.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-mappings', selectedSupplierId] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setMappingForm(blankMapping)
    },
  })

  const mappingItems = useMemo(() => {
    const mappedIds = new Set(mappings.map((mapping: any) => mapping.itemId))
    const selectedMapped = mappingForm.itemId && mappedIds.has(mappingForm.itemId)
    return items.filter((item: any) => !mappedIds.has(item.id) || item.id === mappingForm.itemId || !selectedMapped)
  }, [items, mappings, mappingForm.itemId])

  function startEditMapping(mapping: any) {
    setMappingForm({
      itemId: mapping.itemId,
      supplierSku: mapping.supplierSku || '',
      lastUnitCost: mapping.lastUnitCost != null ? String(mapping.lastUnitCost) : '',
      minOrderQuantity: mapping.minOrderQuantity != null ? String(mapping.minOrderQuantity) : '',
      leadTimeDays: mapping.leadTimeDays != null ? String(mapping.leadTimeDays) : '',
      preferred: !!mapping.preferred,
      active: !!mapping.active,
      notes: mapping.notes || '',
    })
  }

  return (
    <div style={{ maxWidth:1180 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Suppliers</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            Manage vendors, map catalog items to suppliers, and track who actually performs well in procurement.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'#6366f1', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}
        >
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:18 }}>
        {[
          { label:'Total suppliers', value:summary.total, color:'#6366f1' },
          { label:'Active suppliers', value:summary.active, color:'#22c55e' },
          { label:'Mapped items', value:summary.mappedItems, color:'#f59e0b' },
          { label:'Preferred links', value:summary.preferredLinks, color:'#14b8a6' },
        ].map(card => (
          <div key={card.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{card.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.15fr) minmax(360px, .85fr)', gap:16, alignItems:'start' }}>
        <section style={{ minWidth:0 }}>
          <div style={{ position:'relative', maxWidth:360, marginBottom:16 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search supplier, code, contact..."
              style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            {isLoading ? (
              <div style={{ padding:40, textAlign:'center' }}><Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} /></div>
            ) : suppliers.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'var(--muted)' }}>
                <Truck size={36} style={{ opacity:.2, margin:'0 auto 12px', display:'block' }} />
                <p style={{ fontSize:13 }}>No suppliers found</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead style={{ background:'var(--surface)' }}>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Supplier', 'Contact', 'Coverage', 'Performance', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier: any) => {
                      const selected = supplier.id === selectedSupplierId
                      return (
                        <tr
                          key={supplier.id}
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', background:selected ? 'rgba(99,102,241,.08)' : 'transparent' }}
                        >
                          <td style={{ padding:'12px 14px' }}>
                            <div style={{ fontWeight:700, color:'var(--text)' }}>{supplier.name}</div>
                            <div style={{ fontSize:10, color:'#6366f1', fontFamily:'monospace' }}>{supplier.code}</div>
                            <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>Lead time {supplier.leadTimeDays} days</div>
                          </td>
                          <td style={{ padding:'12px 14px', color:'var(--muted)', fontSize:12 }}>
                            <div>{supplier.contactPerson || '-'}</div>
                            <div>{supplier.phone || '-'}</div>
                          </td>
                          <td style={{ padding:'12px 14px', color:'var(--muted)', fontSize:12 }}>
                            <div>{supplier.mappedItemCount || 0} mapped items</div>
                            <div style={{ color:'#f59e0b', fontWeight:700 }}>{supplier.preferredItemCount || 0} preferred</div>
                          </td>
                          <td style={{ padding:'12px 14px', color:'var(--muted)', fontSize:12 }}>
                            <div>{supplier.totalPurchaseOrders || 0} POs • {supplier.completedPurchaseOrders || 0} completed</div>
                            <div style={{ color:'#14b8a6', fontWeight:700 }}>{supplier.fulfilmentPct || 0}% fulfilment</div>
                            <div style={{ color:(supplier.discrepancyReceipts || 0) > 0 ? '#ef4444' : 'var(--muted)' }}>{supplier.discrepancyReceipts || 0} discrepancy receipts</div>
                          </td>
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{
                              padding:'3px 10px',
                              borderRadius:20,
                              fontSize:11,
                              fontWeight:700,
                              background:supplier.active ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
                              color:supplier.active ? '#22c55e' : '#ef4444',
                            }}>
                              {supplier.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ padding:'12px 14px' }}>
                            <button
                              onClick={event => {
                                event.stopPropagation()
                                setEditSupplier({ ...supplier, leadTimeDays: String(supplier.leadTimeDays ?? 2) })
                              }}
                              style={{ padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                            >
                              <Edit3 size={11} /> Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section style={{ minWidth:0, display:'grid', gap:16 }}>
          {selectedSupplier && (
            <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,.16), rgba(20,184,166,.12))', border:'1px solid rgba(99,102,241,.2)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--text)', marginBottom:10 }}>Vendor Performance Snapshot</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10, fontSize:12 }}>
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <div style={{ color:'var(--muted)', marginBottom:4 }}>Purchase orders</div>
                  <div style={{ color:'var(--text)', fontWeight:800 }}>{selectedSupplier.totalPurchaseOrders || 0}</div>
                </div>
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <div style={{ color:'var(--muted)', marginBottom:4 }}>Completed</div>
                  <div style={{ color:'#22c55e', fontWeight:800 }}>{selectedSupplier.completedPurchaseOrders || 0}</div>
                </div>
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <div style={{ color:'var(--muted)', marginBottom:4 }}>Fulfilment</div>
                  <div style={{ color:'#14b8a6', fontWeight:800 }}>{selectedSupplier.fulfilmentPct || 0}%</div>
                </div>
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:12 }}>
                  <div style={{ color:'var(--muted)', marginBottom:4 }}>Discrepancies</div>
                  <div style={{ color:(selectedSupplier.discrepancyReceipts || 0) > 0 ? '#ef4444' : 'var(--text)', fontWeight:800 }}>{selectedSupplier.discrepancyReceipts || 0}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>Item Mapping Studio</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                  {selectedSupplier ? `Configure sourcing rules for ${selectedSupplier.name}` : 'Pick a supplier to start mapping items'}
                </div>
              </div>
              <Layers3 size={16} color="#6366f1" />
            </div>

            <div style={{ padding:16 }}>
              {!selectedSupplier ? (
                <div style={{ color:'var(--muted)', fontSize:13 }}>No supplier selected.</div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:10, marginBottom:10 }}>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Item *</label>
                      <select value={mappingForm.itemId} onChange={e => setMappingForm(prev => ({ ...prev, itemId: e.target.value }))} style={inputStyle}>
                        <option value="">Select item</option>
                        {mappingItems.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Supplier SKU</label>
                      <input value={mappingForm.supplierSku} onChange={e => setMappingForm(prev => ({ ...prev, supplierSku: e.target.value }))} style={inputStyle} placeholder="Vendor code / SKU" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Last Unit Cost</label>
                      <input value={mappingForm.lastUnitCost} onChange={e => setMappingForm(prev => ({ ...prev, lastUnitCost: e.target.value }))} style={inputStyle} placeholder="42.50" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Min Order Qty</label>
                      <input value={mappingForm.minOrderQuantity} onChange={e => setMappingForm(prev => ({ ...prev, minOrderQuantity: e.target.value }))} style={inputStyle} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Lead Time Override</label>
                      <input value={mappingForm.leadTimeDays} onChange={e => setMappingForm(prev => ({ ...prev, leadTimeDays: e.target.value }))} style={inputStyle} placeholder={String(selectedSupplier.leadTimeDays || 2)} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4 }}>Notes</label>
                      <input value={mappingForm.notes} onChange={e => setMappingForm(prev => ({ ...prev, notes: e.target.value }))} style={inputStyle} placeholder="Delivery days, packaging, quality notes" />
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:16, marginBottom:12, flexWrap:'wrap' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text)' }}>
                      <input type="checkbox" checked={mappingForm.preferred} onChange={e => setMappingForm(prev => ({ ...prev, preferred: e.target.checked }))} />
                      Preferred supplier for this item
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text)' }}>
                      <input type="checkbox" checked={mappingForm.active} onChange={e => setMappingForm(prev => ({ ...prev, active: e.target.checked }))} />
                      Mapping is active
                    </label>
                  </div>

                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <button
                      onClick={() => mappingMutation.mutate()}
                      disabled={!mappingForm.itemId || mappingMutation.isPending}
                      style={{ padding:'9px 14px', borderRadius:10, background:'#6366f1', border:'none', color:'#fff', fontWeight:700, cursor:'pointer' }}
                    >
                      {mappingMutation.isPending ? 'Saving...' : 'Save Mapping'}
                    </button>
                    <button
                      onClick={() => setMappingForm(blankMapping)}
                      style={{ padding:'9px 14px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer' }}
                    >
                      Reset
                    </button>
                  </div>

                  <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                    <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface)', fontSize:12, fontWeight:700, color:'var(--text)' }}>
                      Current Mappings
                    </div>
                    {mappingsLoading ? (
                      <div style={{ padding:24, textAlign:'center' }}><Loader2 size={18} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} /></div>
                    ) : mappings.length === 0 ? (
                      <div style={{ padding:20, fontSize:12, color:'var(--muted)' }}>No item mappings yet for this supplier.</div>
                    ) : (
                      <div style={{ maxHeight:320, overflow:'auto' }}>
                        {mappings.map((mapping: any) => (
                          <div key={mapping.id} style={{ padding:'12px 12px', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                              <div>
                                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{mapping.itemName}</div>
                                <div style={{ fontSize:10, color:'var(--muted)' }}>{mapping.itemCode} • {mapping.category || 'Uncategorized'}</div>
                              </div>
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                {mapping.preferred && (
                                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, background:'rgba(245,158,11,.14)', color:'#f59e0b', fontSize:10, fontWeight:800 }}>
                                    <Star size={10} /> Preferred
                                  </span>
                                )}
                                <button onClick={() => startEditMapping(mapping)} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontSize:11, cursor:'pointer' }}>Edit</button>
                              </div>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8, marginTop:10, fontSize:11, color:'var(--muted)' }}>
                              <div>Cost: <span style={{ color:'var(--text)', fontWeight:700 }}>{mapping.lastUnitCost ?? '-'}</span></div>
                              <div>Lead: <span style={{ color:'var(--text)', fontWeight:700 }}>{mapping.leadTimeDays ?? selectedSupplier.leadTimeDays} days</span></div>
                              <div>MOQ: <span style={{ color:'var(--text)', fontWeight:700 }}>{mapping.minOrderQuantity ?? '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {showCreate && (
        <SupplierModal
          title="Add Supplier"
          supplier={createForm}
          onClose={() => setShowCreate(false)}
          onChange={(patch: any) => setCreateForm((prev: any) => ({ ...prev, ...patch }))}
          onSubmit={() => createMutation.mutate()}
          loading={createMutation.isPending}
        />
      )}

      {editSupplier && (
        <SupplierModal
          title="Edit Supplier"
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onChange={(patch: any) => setEditSupplier((prev: any) => ({ ...prev, ...patch }))}
          onSubmit={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SupplierModal({ title, supplier, onChange, onClose, onSubmit, loading }: any) {
  return (
    <Modal>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 style={{ fontWeight:700, color:'var(--text)', margin:0 }}>{title}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><X size={18} /></button>
      </div>
      <div style={{ padding:18 }}>
        {[
          ['code', 'Supplier Code *', 'SUP-001'],
          ['name', 'Supplier Name *', 'Fresh Farms Traders'],
          ['contactPerson', 'Contact Person', 'Ramesh Kumar'],
          ['phone', 'Phone', '+91 98765 43210'],
          ['email', 'Email', 'ops@supplier.com'],
          ['leadTimeDays', 'Lead Time (days)', '2'],
        ].map(([key, label, placeholder]) => (
          <div key={key} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:12, color:'var(--muted)', marginBottom:4, fontWeight:500 }}>{label}</label>
            <input
              value={supplier[key]}
              onChange={(e: any) => onChange({ [key]: e.target.value })}
              placeholder={placeholder}
              style={inputStyle}
            />
          </div>
        ))}

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'var(--muted)', marginBottom:4, fontWeight:500 }}>Address</label>
          <textarea value={supplier.address} onChange={(e: any) => onChange({ address: e.target.value })} rows={2} style={{ ...inputStyle, resize:'none' }} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12, color:'var(--muted)', marginBottom:4, fontWeight:500 }}>Notes</label>
          <textarea value={supplier.notes} onChange={(e: any) => onChange({ notes: e.target.value })} rows={2} style={{ ...inputStyle, resize:'none' }} />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <input type="checkbox" checked={supplier.active} onChange={(e: any) => onChange({ active: e.target.checked })} />
            <span style={{ fontSize:13, color:'var(--text)' }}>Supplier is active</span>
          </label>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button
            onClick={onSubmit}
            disabled={loading || !String(supplier.code || '').trim() || !String(supplier.name || '').trim()}
            style={{ flex:1, padding:10, borderRadius:10, background:'#6366f1', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}
          >
            {loading ? 'Saving...' : 'Save Supplier'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
