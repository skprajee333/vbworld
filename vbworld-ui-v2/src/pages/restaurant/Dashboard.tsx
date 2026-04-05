import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSummary, getDaily, getTopItems, getIndents, getReadiness } from '../../api'
import { useAuth } from '../../store/auth'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Package, Clock, CheckCircle, Sparkles, TrendingUp, AlertCircle } from 'lucide-react'

const C = ['#6366f1','#06b6d4','#22c55e','#f97316','#a78bfa']
const DAY_W: Record<number,number> = {1:.9,2:1,3:1,4:1.1,5:1.4,6:2.0,7:1.8}
const DAY_N = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function KPI({ icon:Icon, label, value, color, sub }: any) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center', background:`${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{value ?? '—'}</div>
      <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, marginTop:3, fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

export default function RestaurantDashboard() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const navigate = useNavigate()

  const branchId = user?.branchId
  const dark = document.documentElement.classList.contains('dark')
  const grid = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'
  const tick = '#64748b'
  const tt = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)' }

  const { data: sum } = useQuery({ queryKey:['sum'], queryFn: getSummary, select: r=>r.data.data, refetchInterval:30000 })
  const { data: daily } = useQuery({ queryKey:['daily',14], queryFn:()=>getDaily(14), select:r=>r.data.data })
  const { data: top } = useQuery({ queryKey:['top',30], queryFn:()=>getTopItems(30,8), select:r=>r.data.data })
  const { data: myOrders } = useQuery({ queryKey:['myorders'], queryFn:()=>getIndents({branchId,size:5}), select:r=>r.data.data?.content || [] })
  const { data: readiness } = useQuery({ queryKey:['readiness',branchId], queryFn:()=>getReadiness(branchId), select:r=>r.data.data })

  const dailyFmt = (daily||[]).map((d:any)=>({ ...d, date:new Date(d.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}) }))

  // Day pattern from today
  const todayDow = new Date().getDay() || 7 // 1=Mon 7=Sun
  const tomorrowDow = todayDow === 7 ? 1 : todayDow + 1

  const STATUS_COLOR: Record<string,string> = {
    SUBMITTED:'#eab308',APPROVED:'#06b6d4',DISPATCHED:'#a78bfa',DELIVERED:'#22c55e',CANCELLED:'#ef4444'
  }

  return (
    <div style={{ maxWidth:1200 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', margin:0 }}>
            Good {new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>
            {user?.branchName} — {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
          </p>
        </div>
        <button onClick={()=>navigate('/orders')} style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
          borderRadius:12, border:'none', background:'#6366f1', color:'#fff',
          fontSize:14, fontWeight:700, cursor:'pointer'
        }}>
          <Package size={16}/> Place New Order
        </button>
      </div>

      {/* Smart Suggestion Banner */}
      {readiness?.ready && (
        <div onClick={()=>navigate('/smart')} style={{
          background:'linear-gradient(135deg,rgba(99,102,241,.15),rgba(167,139,250,.1))',
          border:'1px solid rgba(99,102,241,.3)', borderRadius:14, padding:'14px 18px',
          marginBottom:20, cursor:'pointer', display:'flex', alignItems:'center', gap:12
        }}>
          <div style={{ width:10,height:10,borderRadius:'50%',background:'#6366f1', animation:'pulse 2s infinite' }}/>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:700, color:'#a78bfa' }}>🤖 Smart Suggestion Ready — </span>
            <span style={{ color:'var(--text)', fontSize:13 }}>
              Tomorrow is <strong style={{color:'#6366f1'}}>{DAY_N[tomorrowDow]}</strong>
              {' '}({DAY_W[tomorrowDow]}× demand). Click to see your predicted order list.
            </span>
          </div>
          <span style={{ color:'#6366f1', fontSize:13, fontWeight:600 }}>View →</span>
        </div>
      )}

      {!readiness?.ready && readiness && (
        <div style={{
          background:'rgba(234,179,8,.06)', border:'1px solid rgba(234,179,8,.2)',
          borderRadius:14, padding:'12px 16px', marginBottom:20,
          display:'flex', alignItems:'center', gap:10
        }}>
          <AlertCircle size={16} style={{color:'#eab308'}}/>
          <span style={{ fontSize:13, color:'var(--text)' }}>
            Smart suggestions unlock after <strong>{readiness.daysRemaining}</strong> more day(s) of orders.
            <span style={{ color:'var(--muted)', marginLeft:4 }}>({readiness.distinctDays}/7 days collected)</span>
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <KPI icon={Package}      label="Today's Orders"  value={sum?.todayTotal}    color="#6366f1"/>
        <KPI icon={Clock}        label="Pending"          value={sum?.pending}       color="#eab308"/>
        <KPI icon={TrendingUp}   label="In Transit"       value={sum?.inTransit}     color="#a78bfa"/>
        <KPI icon={CheckCircle}  label="Delivered Today"  value={sum?.deliveredToday} color="#22c55e"/>
      </div>

      {/* Charts + Recent Orders */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        {/* 14-day trend */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>My Order Trend (14 Days)</h3>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={dailyFmt}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis dataKey="date" tick={{fill:tick,fontSize:10}}/>
              <YAxis tick={{fill:tick,fontSize:10}}/>
              <Tooltip contentStyle={tt}/>
              <Area type="monotone" dataKey="totalIndents" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} name="Orders"/>
              <Area type="monotone" dataKey="delivered" stroke="#22c55e" fill="none" strokeWidth={2} name="Delivered"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Day Heatmap */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Weekly Demand Pattern</h3>
          <p style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>Order intensity by day of week</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {[1,2,3,4,5,6,7].map(d => {
              const w = DAY_W[d]
              const isToday = d === todayDow
              const intensity = (w - 0.9) / (2.0 - 0.9)
              return (
                <div key={d} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color: isToday ? '#6366f1' : 'var(--muted)', marginBottom:3, fontWeight: isToday?800:400 }}>
                    {DAY_N[d]}
                  </div>
                  <div style={{
                    borderRadius:6, height:40, display:'flex', alignItems:'center', justifyContent:'center',
                    background:`rgba(99,102,241,${0.08+intensity*0.85})`,
                    border: isToday ? '2px solid #6366f1' : '1px solid transparent',
                    fontSize:10, fontWeight:800,
                    color: intensity > 0.5 ? '#fff' : 'var(--text)'
                  }}>{w}×</div>
                  <div style={{ fontSize:8, marginTop:2, color: w>=1.8?'#ef4444':w>=1.3?'#eab308':'var(--muted)', fontWeight:700 }}>
                    {w>=1.8?'PEAK':w>=1.3?'HIGH':'BASE'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:14, padding:'8px 10px', borderRadius:8, background:'var(--surface)', fontSize:11, color:'var(--muted)' }}>
            💡 <strong style={{color:'var(--text)'}}>Tip:</strong> Place orders 2 days before peak days (Fri–Sat–Sun) for guaranteed delivery.
          </div>
        </div>
      </div>

      {/* Recent Orders + Top Items */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Recent Orders */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Recent Orders</h3>
            <button onClick={()=>navigate('/history')} style={{ fontSize:12, color:'#6366f1', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
              View All →
            </button>
          </div>
          {(myOrders||[]).length === 0 ? (
            <div style={{ padding:30, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No orders yet. <span style={{color:'#6366f1',cursor:'pointer'}} onClick={()=>navigate('/orders')}>Place your first order →</span>
            </div>
          ) : (myOrders||[]).map((o:any)=>(
            <div key={o.id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'monospace' }}>{o.indentNumber}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                  {o.itemCount} items • {new Date(o.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                background:`${STATUS_COLOR[o.status] || '#6366f1'}18`, color: STATUS_COLOR[o.status]||'#6366f1' }}>
                {o.status}
              </span>
            </div>
          ))}
        </div>

        {/* My Top Items */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:14 }}>My Top Ordered Items</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(top||[]).slice(0,7).map((item:any,i:number)=>{
              const max = top?.[0]?.totalRequested || 1
              return (
                <div key={item.itemId}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                    <span style={{ color:'var(--text)', fontWeight:500 }}>{item.itemName}</span>
                    <span style={{ color:'var(--muted)' }}>{item.totalRequested} {item.unit}</span>
                  </div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${(item.totalRequested/max)*100}%`, background:C[i%C.length] }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
