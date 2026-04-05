import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Loader2, Plus, Search, X } from 'lucide-react'
import { createTransfer, getBranchList, getStock, getTransfers } from '../../api'

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
      <div style={{ width:'100%', maxWidth:560, background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box'
}

export default function WarehouseTransfers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ itemId:'', destinationBranchId:'', quantityTransferred:'', referenceNumber:'', notes:'' })

  const { data: transfers = [], isLoading } = useQuery({
    queryKey:['transfers', search],
    queryFn:() => getTransfers(search || undefined),
    select:(r:any) => r.data.data || [],
  })

  const { data: stock = [] } = useQuery({
    queryKey:['transfer-stock-options'],
    queryFn:() => getStock(),
    select:(r:any) => r.data.data || [],
  })

  const { data: branches = [] } = useQuery({
    queryKey:['transfer-branches'],
    queryFn:getBranchList,
    select:(r:any) => r.data.data || [],
  })

  const createMutation = useMutation({
    mutationFn:() => createTransfer({
      itemId: form.itemId,
      destinationBranchId: form.destinationBranchId,
      quantityTransferred: parseFloat(form.quantityTransferred),
      referenceNumber: form.referenceNumber || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess:() => {
      qc.invalidateQueries({ queryKey:['transfers'] })
      qc.invalidateQueries({ queryKey:['stock'] })
      setOpen(false)
      setForm({ itemId:'', destinationBranchId:'', quantityTransferred:'', referenceNumber:'', notes:'' })
    },
  })

  return (
    <div style={{ maxWidth:1100 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Branch Transfers</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Move stock from the warehouse to restaurant branches and track receipt status.</p>
        </div>
        <button onClick={() => setOpen(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          <Plus size={14} /> New Transfer
        </button>
      </div>

      <div style={{ position:'relative', maxWidth:360, marginBottom:14 }}>
        <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfers..." style={{ ...inputStyle, paddingLeft:30 }} />
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:800, color:'var(--text)' }}>Transfer History</div>
        {isLoading ? (
          <div style={{ padding:24, color:'var(--muted)', display:'flex', alignItems:'center', gap:8 }}><Loader2 size={16} className="spin" /> Loading...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding:24, color:'var(--muted)' }}>No transfers found yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ textAlign:'left', background:'rgba(255,255,255,.02)' }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Branch</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Reference</th>
                  <th style={thStyle}>Transferred</th>
                  <th style={thStyle}>Received</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer:any) => (
                  <tr key={transfer.id} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={tdStyle}><div style={{ fontWeight:700, color:'var(--text)' }}>{transfer.itemName}</div><div style={{ fontSize:10, color:'var(--muted)', fontFamily:'monospace' }}>{transfer.itemCode}</div></td>
                    <td style={tdMuted}>{transfer.destinationBranchName}</td>
                    <td style={tdStyle}>{Number(transfer.quantityTransferred).toLocaleString()} <span style={{ color:'var(--muted)', fontSize:11 }}>{transfer.unit}</span></td>
                    <td style={tdStyle}><span style={{ padding:'4px 8px', borderRadius:999, fontSize:11, fontWeight:700, background:transfer.transferStatus === 'RECEIVED' ? 'rgba(34,197,94,.15)' : 'rgba(234,179,8,.15)', color:transfer.transferStatus === 'RECEIVED' ? '#86efac' : '#fde68a' }}>{transfer.transferStatus}</span></td>
                    <td style={tdMuted}>{transfer.referenceNumber || '-'}</td>
                    <td style={tdMuted}>{new Date(transfer.transferredAt).toLocaleString()}</td>
                    <td style={tdMuted}>{transfer.receivedAt ? new Date(transfer.receivedAt).toLocaleString() : 'Pending branch receipt'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal>
          <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight:800, color:'var(--text)' }}>Create Transfer</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Dispatch stock to a branch</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding:16, display:'grid', gap:12 }}>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Stock Item</span>
              <select value={form.itemId} onChange={e => setForm(s => ({ ...s, itemId:e.target.value }))} style={inputStyle}>
                <option value="">Select item</option>
                {stock.map((row:any) => <option key={row.itemId} value={row.itemId}>{row.itemName} ({row.itemCode}) • {row.quantity} {row.unit}</option>)}
              </select>
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Destination Branch</span>
              <select value={form.destinationBranchId} onChange={e => setForm(s => ({ ...s, destinationBranchId:e.target.value }))} style={inputStyle}>
                <option value="">Select branch</option>
                {branches.map((branch:any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Quantity</span>
              <input value={form.quantityTransferred} onChange={e => setForm(s => ({ ...s, quantityTransferred:e.target.value }))} type="number" step="0.01" style={inputStyle} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Reference Number</span>
              <input value={form.referenceNumber} onChange={e => setForm(s => ({ ...s, referenceNumber:e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span style={labelStyle}>Notes</span>
              <textarea value={form.notes} onChange={e => setForm(s => ({ ...s, notes:e.target.value }))} rows={3} style={{ ...inputStyle, resize:'vertical' }} />
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:16, borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setOpen(false)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>Cancel</button>
            <button disabled={createMutation.isPending || !form.itemId || !form.destinationBranchId || !form.quantityTransferred} onClick={() => createMutation.mutate()} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', opacity:createMutation.isPending ? 0.7 : 1 }}>
              {createMutation.isPending && <Loader2 size={14} className="spin" />}
              Create Transfer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize:12, fontWeight:700, color:'var(--text)' }
const thStyle: React.CSSProperties = { padding:'11px 14px', fontSize:11, color:'var(--muted)' }
const tdStyle: React.CSSProperties = { padding:'11px 14px', color:'var(--text)', fontSize:12 }
const tdMuted: React.CSSProperties = { padding:'11px 14px', color:'var(--muted)', fontSize:12 }
