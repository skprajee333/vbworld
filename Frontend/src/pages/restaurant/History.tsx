import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIndents, getIndent, cancelIndent, createIndent } from '../../api'
import { useAuth } from '../../store/auth'
import { RefreshCw, Eye, X, Loader2, Package } from 'lucide-react'

const STATUS_C: Record<string,string> = {
  SUBMITTED:'#eab308',APPROVED:'#06b6d4',DISPATCHED:'#a78bfa',
  DELIVERED:'#22c55e',CANCELLED:'#ef4444',DRAFT:'#64748b'
}

function Modal({ children, onClose }: any) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,width:'100%',maxWidth:600,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.5)' }}>
        {children}
      </div>
    </div>
  )
}

export default function RestaurantHistory() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [reordering, setReordering] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['myorders', statusFilter, page],
    queryFn: () => getIndents({ branchId:user?.branchId, status:statusFilter||undefined, page, size:15 }),
    select: r => r.data.data
  })

  const cancel = useMutation({
    mutationFn: (id:string) => cancelIndent(id, 'Cancelled by user'),
    onSuccess: () => { qc.invalidateQueries({queryKey:['myorders']}); setDetail(null) }
  })

  const reorder = useMutation({
    mutationFn: async (indent: any) => {
      setReordering(true)
      return createIndent({
        branchId: user?.branchId,
        notes: `Reorder of ${indent.indentNumber}`,
        items: indent.items.map((i:any) => ({ itemId:i.itemId, quantity:i.requestedQty }))
      })
    },
    onSuccess: () => {
      setReordering(false); setDetail(null)
      qc.invalidateQueries({queryKey:['myorders']})
      alert('Reorder submitted successfully!')
    },
    onError: () => setReordering(false)
  })

  const loadDetail = async (id: string) => {
    const res = await getIndent(id)
    setDetail(res.data.data)
  }

  const statuses = ['SUBMITTED','APPROVED','DISPATCHED','DELIVERED','CANCELLED']

  return (
    <div style={{ maxWidth:1000 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:20,fontWeight:900,color:'var(--text)',margin:0 }}>Order History</h1>
        <p style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>All your past orders. Reorder with one click.</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:6,marginBottom:16,flexWrap:'wrap' }}>
        {['', ...statuses].map(s=>(
          <button key={s} onClick={()=>{setStatusFilter(s);setPage(0)}}
            style={{ padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
              background:statusFilter===s?'#6366f1':'var(--card)',
              color:statusFilter===s?'#fff':'var(--muted)',
              border: statusFilter===s?'1px solid #6366f1':'1px solid var(--border)' } as any}>
            {s||'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:40,textAlign:'center' }}><Loader2 size={24} style={{color:'#6366f1',animation:'spin 1s linear infinite'}}/></div>
        ) : (data?.content||[]).length === 0 ? (
          <div style={{ padding:40,textAlign:'center',color:'var(--muted)' }}>
            <Package size={40} style={{margin:'0 auto 8px',opacity:.3,display:'block'}}/>
            No orders found
          </div>
        ) : (
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--surface)',borderBottom:'1px solid var(--border)' }}>
                {['Order #','Items','Expected','Status','Created','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px',textAlign:'left',color:'var(--muted)',fontWeight:600,fontSize:11,textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.content||[]).map((o:any)=>(
                <tr key={o.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 14px',fontFamily:'monospace',fontWeight:700,color:'#6366f1',fontSize:12 }}>{o.indentNumber}</td>
                  <td style={{ padding:'12px 14px',color:'var(--muted)',fontSize:12 }}>{o.itemCount} items</td>
                  <td style={{ padding:'12px 14px',color:'var(--muted)',fontSize:12 }}>
                    {o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                      background:`${STATUS_C[o.status]||'#6366f1'}18`,color:STATUS_C[o.status]||'#6366f1' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px',color:'var(--muted)',fontSize:11 }}>
                    {new Date(o.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex',gap:6 }}>
                      <button onClick={()=>loadDetail(o.id)} style={{ padding:'4px 10px',borderRadius:7,border:'1px solid var(--border)',background:'none',color:'var(--text)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:4 }}>
                        <Eye size={11}/> View
                      </button>
                      {o.status === 'DELIVERED' && (
                        <button onClick={async()=>{await loadDetail(o.id)}} style={{ padding:'4px 10px',borderRadius:7,border:'none',background:'rgba(99,102,241,.15)',color:'#6366f1',fontSize:11,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',gap:4 }}>
                          <RefreshCw size={11}/> Reorder
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div style={{ padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12 }}>
            <span style={{ color:'var(--muted)' }}>{data.totalElements} total orders</span>
            <div style={{ display:'flex',gap:6 }}>
              <button disabled={page===0} onClick={()=>setPage(p=>p-1)} style={{ padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontSize:12 }}>← Prev</button>
              <span style={{ padding:'5px 12px',color:'var(--muted)' }}>{page+1}/{data.totalPages}</span>
              <button disabled={data.last} onClick={()=>setPage(p=>p+1)} style={{ padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontSize:12 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <Modal onClose={()=>setDetail(null)}>
          <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:800,color:'#6366f1',fontFamily:'monospace',fontSize:15 }}>{detail.indentNumber}</div>
              <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>{detail.branchName} • {detail.createdByName}</div>
            </div>
            <div style={{ display:'flex',gap:8,alignItems:'center' }}>
              <span style={{ padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,
                background:`${STATUS_C[detail.status]||'#6366f1'}18`,color:STATUS_C[detail.status]||'#6366f1' }}>
                {detail.status}
              </span>
              <button onClick={()=>setDetail(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)' }}>
                <X size={18}/>
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',gap:16,overflowX:'auto' }}>
            {[
              {label:'Submitted',time:detail.createdAt,done:true},
              {label:'Approved',time:detail.approvedAt,done:!!detail.approvedAt},
              {label:'Dispatched',time:detail.dispatchedAt,done:!!detail.dispatchedAt},
              {label:'Delivered',time:detail.deliveredAt,done:!!detail.deliveredAt},
            ].map((s,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                {i>0 && <div style={{ width:24,height:1,background:s.done?'#22c55e':'var(--border)' }}/>}
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 4px',
                    background:s.done?'#22c55e':'var(--border)',color:'#fff',fontSize:10,fontWeight:800 }}>
                    {s.done?'✓':(i+1)}
                  </div>
                  <div style={{ fontSize:10,color:s.done?'var(--text)':'var(--muted)',fontWeight:s.done?600:400,whiteSpace:'nowrap' }}>{s.label}</div>
                  {s.time && <div style={{ fontSize:9,color:'var(--muted)' }}>{new Date(s.time).toLocaleDateString('en-IN')}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Items */}
          <div style={{ padding:'0 20px' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Item','Requested','Approved','Delivered','Unit'].map(h=>(
                    <th key={h} style={{ padding:'10px 0',textAlign:'left',color:'var(--muted)',fontWeight:600,fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(detail.items||[]).map((item:any)=>(
                  <tr key={item.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 0',color:'var(--text)',fontWeight:500 }}>{item.itemName}</td>
                    <td style={{ padding:'10px 0',color:'var(--text)',fontWeight:700 }}>{item.requestedQty}</td>
                    <td style={{ padding:'10px 0',color:item.approvedQty?'#22c55e':'var(--muted)' }}>{item.approvedQty??'—'}</td>
                    <td style={{ padding:'10px 0',color:item.deliveredQty?'#6366f1':'var(--muted)' }}>{item.deliveredQty??'—'}</td>
                    <td style={{ padding:'10px 0',color:'var(--muted)' }}>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div style={{ padding:16,display:'flex',gap:10 }}>
            {detail.status === 'DELIVERED' && (
              <button onClick={()=>reorder.mutate(detail)} disabled={reordering}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,background:'#6366f1',border:'none',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer' }}>
                {reordering?<Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/>:<RefreshCw size={14}/>}
                Reorder Same Items
              </button>
            )}
            {['SUBMITTED','DRAFT'].includes(detail.status) && (
              <button onClick={()=>cancel.mutate(detail.id)} disabled={cancel.isPending}
                style={{ padding:'9px 18px',borderRadius:10,border:'1px solid #ef4444',background:'none',color:'#ef4444',fontWeight:700,fontSize:13,cursor:'pointer' }}>
                Cancel Order
              </button>
            )}
            <button onClick={()=>setDetail(null)} style={{ marginLeft:'auto',padding:'9px 18px',borderRadius:10,border:'1px solid var(--border)',background:'none',color:'var(--text)',cursor:'pointer',fontSize:13 }}>
              Close
            </button>
          </div>
        </Modal>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
