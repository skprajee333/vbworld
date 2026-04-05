import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSearch, Loader2, Search, ShieldCheck } from 'lucide-react'
import { getAuditLogs } from '../../api'

const modules = ['', 'INDENTS', 'WAREHOUSE', 'PROCUREMENT', 'TRANSFERS']

export default function AuditTrailPage() {
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey:['audit-logs', module, search],
    queryFn:() => getAuditLogs(module || undefined, search || undefined),
    select:(r:any) => r.data.data || [],
  })

  const summary = useMemo(() => ({
    total: auditLogs.length,
    users: new Set(auditLogs.map((row:any) => row.actorName).filter(Boolean)).size,
  }), [auditLogs])

  return (
    <div style={{ maxWidth:1100 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Audit Trail</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Review sensitive operational actions across procurement, warehouse, transfers, and indents.</p>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.18)', color:'#22c55e', fontSize:12, fontWeight:700 }}>
          <ShieldCheck size={14} /> Governance enabled
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12, marginBottom:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Audit events</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#6366f1' }}>{summary.total}</div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Actors involved</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#22c55e' }}>{summary.users}</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 220px', gap:12, marginBottom:14 }}>
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actor, action, entity, summary..." style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
        </div>
        <select value={module} onChange={e => setModule(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none' }}>
          {modules.map(value => <option key={value} value={value}>{value || 'All modules'}</option>)}
        </select>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        {isLoading ? (
          <div style={{ padding:36, textAlign:'center', color:'var(--muted)' }}><Loader2 size={20} className="spin" /></div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
            <FileSearch size={34} style={{ opacity:.25, margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontSize:13, margin:0 }}>No audit events found</p>
          </div>
        ) : auditLogs.map((row:any) => (
          <div key={row.id} style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{row.summary}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{row.details || 'No extra details'}</div>
              </div>
              <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(99,102,241,.12)', color:'#6366f1', fontSize:11, fontWeight:700 }}>{row.moduleName}</span>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8, fontSize:10, color:'var(--muted)' }}>
              <span>{row.actorName || 'System'} {row.actorRole ? `(${row.actorRole})` : ''}</span>
              <span>{row.actionType}</span>
              <span>{row.entityType}</span>
              <span>{new Date(row.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
