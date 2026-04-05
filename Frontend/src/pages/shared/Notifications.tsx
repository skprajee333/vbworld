import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, CheckCheck, Loader2, Search } from 'lucide-react'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/StateBlocks'

const typeColors: Record<string, { color: string; bg: string }> = {
  INDENT: { color:'#6366f1', bg:'rgba(99,102,241,.12)' },
  TRANSFER: { color:'#06b6d4', bg:'rgba(6,182,212,.12)' },
  PURCHASE_ORDER: { color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
  GRN_DISCREPANCY: { color:'#ef4444', bg:'rgba(239,68,68,.12)' },
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const { data: notifications = [], isLoading, isError, refetch } = useQuery({
    queryKey:['notifications', unreadOnly],
    queryFn:() => getNotifications(unreadOnly),
    select:(r:any) => r.data.data || [],
  })

  const typeOptions = useMemo(() => ['ALL', ...Array.from(new Set(notifications.map((item:any) => item.notificationType).filter(Boolean)))], [notifications])

  const markOne = useMutation({
    mutationFn:(id: string) => markNotificationRead(id),
    onSuccess:() => qc.invalidateQueries({ queryKey:['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn:() => markAllNotificationsRead(),
    onSuccess:() => qc.invalidateQueries({ queryKey:['notifications'] }),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notifications.filter((item:any) => {
      const matchesSearch = !q
        || String(item.title || '').toLowerCase().includes(q)
        || String(item.message || '').toLowerCase().includes(q)
        || String(item.notificationType || '').toLowerCase().includes(q)
      const matchesType = typeFilter === 'ALL' || item.notificationType === typeFilter
      return matchesSearch && matchesType
    })
  }, [notifications, search, typeFilter])

  const unreadCount = notifications.filter((item:any) => !item.read).length
  const filteredUnreadCount = filtered.filter((item:any) => !item.read).length

  async function markVisibleRead() {
    const unreadVisible = filtered.filter((item:any) => !item.read)
    await Promise.all(unreadVisible.map((item:any) => markNotificationRead(item.id)))
    qc.invalidateQueries({ queryKey:['notifications'] })
  }

  return (
    <div style={{ maxWidth:1040 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Notifications</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Track operational updates for your role and mark them off as you act on them.</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => markVisibleRead()} disabled={filteredUnreadCount === 0} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, opacity: filteredUnreadCount === 0 ? 0.6 : 1 }}>
            <CheckCheck size={14} /> Mark visible read
          </button>
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending || unreadCount === 0} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, opacity: unreadCount === 0 ? 0.6 : 1 }}>
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Total', value:notifications.length, color:'#6366f1' },
          { label:'Unread', value:unreadCount, color:'#f59e0b' },
          { label:'Filtered', value:filtered.length, color:'#06b6d4' },
          { label:'Filtered unread', value:filteredUnreadCount, color:'#22c55e' },
        ].map(card => (
          <div key={card.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{card.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', maxWidth:360, flex:1 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications..." style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13 }}>
          {typeOptions.map((type:any) => <option key={String(type)} value={String(type)}>{type === 'ALL' ? 'All types' : String(type).replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={() => setUnreadOnly(false)} style={pill(unreadOnly === false)}>All</button>
        <button onClick={() => setUnreadOnly(true)} style={pill(unreadOnly === true)}>Unread Only</button>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        {isLoading ? (
          <LoadingState title="Loading notifications" message="Pulling the latest role-based alerts and action items." />
        ) : isError ? (
          <ErrorState title="Couldn't load notifications" message="Retry to refresh your operational alerts." onAction={() => refetch()} compact={false} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No notifications found" message="Try a different search, clear the type filter, or switch between all and unread alerts." onAction={() => refetch()} actionLabel="Refresh feed" compact={false} />
        ) : filtered.map((item:any) => {
          const visual = typeColors[item.notificationType] || { color:'#94a3b8', bg:'rgba(148,163,184,.12)' }
          return (
            <div key={item.id} style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', background:item.read ? 'transparent' : 'rgba(99,102,241,.04)', display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:10, background:visual.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {item.read ? <Bell size={16} style={{ color:visual.color }} /> : <BellRing size={16} style={{ color:visual.color }} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{item.title}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{item.message}</div>
                  </div>
                  {!item.read && (
                    <button onClick={() => markOne.mutate(item.id)} disabled={markOne.isPending} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
                      Mark read
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap', fontSize:10, color:'var(--muted)' }}>
                  <span style={{ padding:'3px 8px', borderRadius:999, background:visual.bg, color:visual.color, fontWeight:700 }}>{item.notificationType.replace(/_/g, ' ')}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.read && item.readAt && <span>Read {new Date(item.readAt).toLocaleString()}</span>}
                  {item.actionUrl && <span style={{ color:'#6366f1', fontWeight:700 }}>{item.actionUrl}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding:'8px 12px',
    borderRadius:999,
    border:`1px solid ${active ? '#6366f1' : 'var(--border)'}`,
    background:active ? 'rgba(99,102,241,.1)' : 'var(--card)',
    color:active ? '#6366f1' : 'var(--muted)',
    fontSize:12,
    fontWeight:700,
    cursor:'pointer',
  }
}

