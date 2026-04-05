import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Bell, CheckCircle2, Loader2, MessageSquareWarning, Package, ShieldCheck, UserCheck } from 'lucide-react'
import { getSystemMonitor } from '../../api'

function Card({ label, value, color, icon: Icon }: any) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
      <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, marginBottom:10 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ fontSize:26, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{label}</div>
    </div>
  )
}

export default function SystemMonitorPage() {
  const { data: monitor, isLoading } = useQuery({
    queryKey:['system-monitor'],
    queryFn:getSystemMonitor,
    select:(r:any) => r.data?.data,
    refetchInterval:20000,
  })

  return (
    <div style={{ maxWidth:1240 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <Activity size={20} style={{ color:'#6366f1' }} /> System Monitor
          </h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Live governance, approval, and operational exception view for admin control.</p>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.18)', color:'#22c55e', fontSize:12, fontWeight:700 }}>
          <ShieldCheck size={14} /> Auto-refresh every 20s
        </div>
      </div>

      {isLoading || !monitor ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}><Loader2 size={22} className="spin" /></div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:18 }}>
            <Card label="Pending approvals" value={monitor.pendingApprovals} color="#6366f1" icon={UserCheck} />
            <Card label="Open feedback" value={monitor.openFeedbackCount} color="#f59e0b" icon={MessageSquareWarning} />
            <Card label="Low stock items" value={monitor.lowStockCount} color="#ef4444" icon={AlertTriangle} />
            <Card label="Submitted indents" value={monitor.submittedIndents} color="#14b8a6" icon={Package} />
            <Card label="Unread alerts" value={monitor.unreadNotifications} color="#a78bfa" icon={Bell} />
            <Card label="Governance events (24h)" value={monitor.governanceEvents24h} color="#22c55e" icon={CheckCircle2} />
            <Card label="Open exceptions" value={monitor.openExceptions} color="#f97316" icon={AlertTriangle} />
            <Card label="High-risk exceptions" value={monitor.highRiskExceptions} color="#dc2626" icon={AlertTriangle} />
            <Card label="Active fraud rules" value={monitor.activeFraudRules} color="#0ea5e9" icon={ShieldCheck} />
            <Card label="Triggered rules (24h)" value={monitor.triggeredRules24h} color="#8b5cf6" icon={Activity} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'320px minmax(0, 1fr)', gap:16 }}>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--text)', marginBottom:12 }}>Risk Highlights</div>
              <div style={{ display:'grid', gap:10 }}>
                {[
                  { label:'Impersonation events (24h)', value: monitor.impersonationEvents24h, color:'#f97316' },
                  { label:'Unread notifications', value: monitor.unreadNotifications, color:'#6366f1' },
                  { label:'Open feedback tickets', value: monitor.openFeedbackCount, color:'#eab308' },
                  { label:'Open exceptions', value: monitor.openExceptions, color:'#ef4444' },
                  { label:'High-risk exceptions', value: monitor.highRiskExceptions, color:'#dc2626' },
                ].map(item => (
                  <div key={item.label} style={{ border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{item.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:item.color, marginTop:4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gap:16 }}>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Recent Governance Events</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Latest audit activity across operations and governance modules.</div>
                </div>
                {(monitor.recentEvents || []).length === 0 ? (
                  <div style={{ padding:30, textAlign:'center', color:'var(--muted)' }}>No recent events</div>
                ) : monitor.recentEvents.map((event:any, index:number) => (
                  <div key={`${event.moduleName}-${event.createdAt}-${index}`} style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{event.summary}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{event.actorName || 'System'} {event.actorRole ? `(${event.actorRole})` : ''}</div>
                      </div>
                      <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(99,102,241,.12)', color:'#6366f1', fontSize:10, fontWeight:800 }}>{event.moduleName}</span>
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8, fontSize:10, color:'var(--muted)' }}>
                      <span>{event.actionType}</span>
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Recent Exceptions</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Latest fraud-control and escalation exceptions raised by risky actions.</div>
                </div>
                {(monitor.recentExceptions || []).length === 0 ? (
                  <div style={{ padding:30, textAlign:'center', color:'var(--muted)' }}>No recent exceptions</div>
                ) : monitor.recentExceptions.map((event:any, index:number) => (
                  <div key={`${event.title}-${event.triggeredAt}-${index}`} style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{event.title}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{event.summary}</div>
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(239,68,68,.12)', color:'#ef4444', fontSize:10, fontWeight:800 }}>{event.riskLevel}</span>
                        <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(99,102,241,.12)', color:'#6366f1', fontSize:10, fontWeight:800 }}>{event.status}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:8, fontSize:10, color:'var(--muted)' }}>
                      <span>{event.moduleName}</span>
                      <span>{new Date(event.triggeredAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}
