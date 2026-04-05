import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, CheckCircle2, Loader2, PackageCheck, Search } from 'lucide-react'
import { getMyTransfers, receiveTransfer } from '../../api'
import { useAuth } from '../../store/auth'

export default function RestaurantTransfers() {
  const qc = useQueryClient()
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const [search, setSearch] = useState('')

  const { data: transfers = [], isLoading } = useQuery({
    queryKey:['my-transfers', search],
    queryFn:() => getMyTransfers(search || undefined),
    select:(r:any) => r.data.data || [],
  })

  const receiveMutation = useMutation({
    mutationFn:(id:string) => receiveTransfer(id),
    onSuccess:() => qc.invalidateQueries({ queryKey:['my-transfers'] }),
  })

  const inTransit = transfers.filter((transfer:any) => transfer.transferStatus === 'IN_TRANSIT').length
  const received = transfers.filter((transfer:any) => transfer.transferStatus === 'RECEIVED').length

  return (
    <div style={{ maxWidth:980 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Branch Transfers</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Track incoming warehouse transfers for {user?.branchName || 'your branch'} and confirm receipt.</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Incoming', value:inTransit, icon:ArrowRightLeft, color:'#eab308' },
          { label:'Received', value:received, icon:PackageCheck, color:'#22c55e' },
          { label:'Total Transfers', value:transfers.length, icon:CheckCircle2, color:'#6366f1' },
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfers..." style={{ width:'100%', padding:'10px 12px 10px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
      </div>

      <div style={{ display:'grid', gap:12 }}>
        {isLoading ? (
          <div style={{ padding:24, color:'var(--muted)', display:'flex', alignItems:'center', gap:8 }}><Loader2 size={16} className="spin" /> Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24, color:'var(--muted)' }}>No transfers found for your branch yet.</div>
        ) : transfers.map((transfer:any) => (
          <div key={transfer.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{transfer.itemName}</div>
                <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'monospace', marginTop:2 }}>{transfer.itemCode}</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:10 }}>
                  Qty: <strong style={{ color:'var(--text)' }}>{Number(transfer.quantityTransferred).toLocaleString()} {transfer.unit}</strong>
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>Reference: {transfer.referenceNumber || '-'}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>Transferred at: {new Date(transfer.transferredAt).toLocaleString()}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>Warehouse balance after transfer: {Number(transfer.quantityAfter).toLocaleString()} {transfer.unit}</div>
                {transfer.notes && <div style={{ fontSize:12, color:'var(--muted)', marginTop:8 }}>Notes: {transfer.notes}</div>}
              </div>
              <div style={{ display:'grid', gap:8, minWidth:190 }}>
                <span style={{ justifySelf:'start', padding:'5px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:transfer.transferStatus === 'RECEIVED' ? 'rgba(34,197,94,.15)' : 'rgba(234,179,8,.15)', color:transfer.transferStatus === 'RECEIVED' ? '#86efac' : '#fde68a' }}>{transfer.transferStatus === 'RECEIVED' ? 'Received' : 'Awaiting Receipt'}</span>
                {transfer.transferStatus === 'RECEIVED' ? (
                  <div style={{ fontSize:12, color:'var(--muted)' }}>Received at {transfer.receivedAt ? new Date(transfer.receivedAt).toLocaleString() : '-'}</div>
                ) : (
                  <button onClick={() => receiveMutation.mutate(transfer.id)} disabled={receiveMutation.isPending} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, padding:'9px 14px', borderRadius:10, border:'none', background:'#22c55e', color:'#fff', fontWeight:700, cursor:'pointer' }}>
                    {receiveMutation.isPending ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                    Mark Received
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
