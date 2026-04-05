import { useQuery } from '@tanstack/react-query'
import { getSummary, getDaily, getBranches, getTopItems, getIndents } from '../../api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Users, Package, Truck, CheckCircle, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

const C = ['#6366f1','#06b6d4','#22c55e','#f97316','#a78bfa','#ec4899']

const STATUS_C: Record<string,string> = {
  SUBMITTED:'#eab308',APPROVED:'#06b6d4',DISPATCHED:'#a78bfa',DELIVERED:'#22c55e',CANCELLED:'#ef4444'
}

function KPI({ icon:Icon, label, value, color, sub }: any) {
  return (
    <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
      <div style={{ width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:`${color}18`,marginBottom:10 }}>
        <Icon size={18} style={{ color }}/>
      </div>
      <div style={{ fontSize:28,fontWeight:900,color,lineHeight:1 }}>{value??'—'}</div>
      <div style={{ fontSize:12,color:'var(--muted)',marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11,color,marginTop:3,fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const dark = document.documentElement.classList.contains('dark')
  const grid = dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'
  const tick = '#64748b'
  const tt = { background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)' }

  const { data: sum }    = useQuery({ queryKey:['sum'],      queryFn:getSummary,           select:r=>r.data.data, refetchInterval:20000 })
  const { data: daily }  = useQuery({ queryKey:['daily',14], queryFn:()=>getDaily(14),     select:r=>r.data.data })
  const { data: br }     = useQuery({ queryKey:['branches'], queryFn:getBranches,          select:r=>r.data.data||[] })
  const { data: top }    = useQuery({ queryKey:['top',30],   queryFn:()=>getTopItems(30,8),select:r=>r.data.data||[] })
  const { data: live }   = useQuery({ queryKey:['live-orders'],
    queryFn:()=>getIndents({size:8,status:'SUBMITTED'}), select:r=>r.data.data?.content||[], refetchInterval:15000 })
  const { data: inTransit } = useQuery({ queryKey:['in-transit'],
    queryFn:()=>getIndents({size:5,status:'DISPATCHED'}), select:r=>r.data.data?.content||[], refetchInterval:15000 })

  const dailyFmt = (daily||[]).map((d:any)=>({
    ...d, date:new Date(d.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'})
  }))

  return (
    <div style={{ maxWidth:1300 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22,fontWeight:900,color:'var(--text)',margin:0,display:'flex',alignItems:'center',gap:8 }}>
          <Activity size={22} style={{color:'#6366f1'}}/> Admin Dashboard
        </h1>
        <p style={{ fontSize:13,color:'var(--muted)',marginTop:2 }}>
          Full system overview — live data, auto-refreshes every 20s
          <span style={{ marginLeft:8,display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite',verticalAlign:'middle' }}/>
        </p>
      </div>

      {/* Alert banner if high pending */}
      {(sum?.pending||0) > 5 && (
        <div style={{ background:'rgba(234,179,8,.07)',border:'1px solid rgba(234,179,8,.25)',borderRadius:12,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:8,fontSize:13 }}>
          <AlertTriangle size={15} style={{color:'#eab308'}}/>
          <span style={{ color:'var(--text)' }}><strong style={{color:'#eab308'}}>{sum?.pending} orders</strong> waiting for warehouse approval — follow up if delayed.</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20 }}>
        <KPI icon={Package}      label="Today's Orders"    value={sum?.todayTotal}     color="#6366f1"/>
        <KPI icon={AlertTriangle}label="Pending Approval"  value={sum?.pending}        color="#eab308"/>
        <KPI icon={Truck}        label="In Transit"         value={sum?.inTransit}      color="#a78bfa"/>
        <KPI icon={CheckCircle}  label="Delivered Today"    value={sum?.deliveredToday} color="#22c55e"/>
        <KPI icon={TrendingUp}   label="Fulfilment Rate"    value={sum?.fulfilmentPct?`${sum.fulfilmentPct}%`:'—'} color="#06b6d4"/>
        <KPI icon={AlertTriangle}label="Low Stock Items"    value={sum?.lowStockCount}  color="#ef4444"/>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16 }}>
        {/* 14-day trend */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4 }}>System-Wide Order Trend (14 Days)</h3>
          <p style={{ fontSize:11,color:'var(--muted)',marginBottom:14 }}>Total orders vs delivered across all branches</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyFmt}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis dataKey="date" tick={{fill:tick,fontSize:10}}/>
              <YAxis tick={{fill:tick,fontSize:10}}/>
              <Tooltip contentStyle={tt}/>
              <Area type="monotone" dataKey="totalIndents" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} name="Total Orders"/>
              <Area type="monotone" dataKey="delivered"    stroke="#22c55e" fill="url(#g2)" strokeWidth={2} name="Delivered"/>
              <Area type="monotone" dataKey="pending"      stroke="#eab308" fill="none"     strokeWidth={1.5} strokeDasharray="4 2" name="Pending"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Branch performance */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4 }}>Branch Activity</h3>
          <p style={{ fontSize:11,color:'var(--muted)',marginBottom:12 }}>Orders this week by branch</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={br} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis type="number" tick={{fill:tick,fontSize:10}}/>
              <YAxis dataKey="branchName" type="category" tick={{fill:tick,fontSize:10}} width={75}/>
              <Tooltip contentStyle={tt}/>
              <Bar dataKey="totalIndents" name="Orders" radius={[0,6,6,0]}>
                {(br||[]).map((_:any,i:number)=><Cell key={i} fill={C[i%C.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feed + Top Items */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        {/* Live Order Feed */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden' }}>
          <div style={{ padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
            <h3 style={{ fontSize:13,fontWeight:700,color:'var(--text)',margin:0 }}>Live — Awaiting Approval</h3>
            <span style={{ marginLeft:'auto',fontSize:11,color:'var(--muted)' }}>auto-refreshes</span>
          </div>
          {(live||[]).length===0 ? (
            <div style={{ padding:24,textAlign:'center',color:'var(--muted)',fontSize:13 }}>
              <CheckCircle size={24} style={{margin:'0 auto 6px',opacity:.3,display:'block'}}/>
              All orders processed
            </div>
          ) : (live||[]).map((o:any)=>(
            <div key={o.id} style={{ padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ fontFamily:'monospace',fontSize:11,color:'#6366f1',fontWeight:700 }}>{o.indentNumber}</span>
                  <span style={{ fontSize:10,color:'var(--muted)' }}>—</span>
                  <span style={{ fontSize:11,fontWeight:600,color:'var(--text)' }}>{o.branchName}</span>
                </div>
                <div style={{ fontSize:10,color:'var(--muted)',marginTop:1 }}>
                  {o.itemCount} items • {new Date(o.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <span style={{ padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:'rgba(234,179,8,.12)',color:'#eab308' }}>
                PENDING
              </span>
            </div>
          ))}
        </div>

        {/* In Transit */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden' }}>
          <div style={{ padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
            <Truck size={14} style={{color:'#a78bfa'}}/>
            <h3 style={{ fontSize:13,fontWeight:700,color:'var(--text)',margin:0 }}>In Transit</h3>
            <span style={{ marginLeft:'auto',fontSize:11,color:'var(--muted)' }}>{inTransit?.length||0} active</span>
          </div>
          {(inTransit||[]).length===0 ? (
            <div style={{ padding:24,textAlign:'center',color:'var(--muted)',fontSize:13 }}>
              <Truck size={24} style={{margin:'0 auto 6px',opacity:.3,display:'block'}}/>
              Nothing in transit
            </div>
          ) : (inTransit||[]).map((o:any)=>(
            <div key={o.id} style={{ padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                  <span style={{ fontFamily:'monospace',fontSize:11,color:'#a78bfa',fontWeight:700 }}>{o.indentNumber}</span>
                  <span style={{ fontSize:11,fontWeight:600,color:'var(--text)' }}>{o.branchName}</span>
                </div>
                <div style={{ fontSize:10,color:'var(--muted)',marginTop:1 }}>
                  Dispatched {o.dispatchedAt ? new Date(o.dispatchedAt).toLocaleDateString('en-IN') : '—'}
                </div>
              </div>
              <span style={{ padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,background:'rgba(167,139,250,.12)',color:'#a78bfa' }}>
                DISPATCHED
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Items + Branch Fulfilment */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:14 }}>Top 8 Ordered Items (30 Days)</h3>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {(top||[]).map((item:any,i:number)=>{
              const max = top?.[0]?.totalRequested||1
              return (
                <div key={item.itemId}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2 }}>
                    <span style={{ color:'var(--text)',fontWeight:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8 }}>{item.itemName}</span>
                    <span style={{ color:'var(--muted)',flexShrink:0 }}>{item.totalRequested} {item.unit}</span>
                  </div>
                  <div style={{ height:4,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',background:C[i%C.length],borderRadius:3,width:`${(item.totalRequested/max)*100}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:14 }}>Branch Fulfilment Rates</h3>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            {(br||[]).map((b:any,i:number)=>{
              const pct = b.fulfilmentPct||0
              return (
                <div key={b.branchId}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4 }}>
                    <span style={{ color:'var(--text)',fontWeight:600 }}>{b.branchName}</span>
                    <span style={{ fontWeight:800,color:pct>=80?'#22c55e':pct>=50?'#eab308':'#ef4444' }}>{pct}%</span>
                  </div>
                  <div style={{ height:6,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:3,background:pct>=80?'#22c55e':pct>=50?'#eab308':'#ef4444',width:`${pct}%`,transition:'width .5s' }}/>
                  </div>
                  <div style={{ fontSize:10,color:'var(--muted)',marginTop:2 }}>
                    {b.delivered} of {b.totalIndents} delivered this week
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
