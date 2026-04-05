import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSummary, getDaily, getBranches, getTopItems } from '../api'
import { useAuth } from '../store/auth'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Package, Truck, CheckCircle } from 'lucide-react'

const C = ['#6366f1','#06b6d4','#22c55e','#f97316','#a78bfa','#ec4899','#14b8a6','#f59e0b']

function KPI({ label, value, color, icon: Icon, sub }: any) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={18} style={{ color }}/>
        </div>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{value ?? '—'}</div>
      <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, marginTop:3, fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

export default function Analytics() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const isRestaurant = user?.role === 'RESTAURANT_STAFF'

  const [days, setDays] = useState(30)
  const dark = document.documentElement.classList.contains('dark')
  const grid = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'
  const tick  = '#64748b'
  const tt    = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:12 }

  const { data: sum    } = useQuery({ queryKey:['sum'],          queryFn: getSummary,                   select: r => r.data.data, refetchInterval:30000 })
  const { data: daily  } = useQuery({ queryKey:['daily', days],  queryFn: () => getDaily(days),          select: r => r.data.data })
  const { data: brs    } = useQuery({ queryKey:['brs'],          queryFn: getBranches,                  select: r => r.data.data })
  const { data: top10  } = useQuery({ queryKey:['top10', days],  queryFn: () => getTopItems(days, 10),  select: r => r.data.data })

  const dailyFmt = (daily || []).map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN', { month:'short', day:'numeric' })
  }))

  // Fulfilment % per day
  const fulfilmentData = dailyFmt.map((d: any) => ({
    date: d.date,
    pct: d.totalIndents > 0 ? Math.round((d.delivered / d.totalIndents) * 100) : 0
  }))

  // Status breakdown
  const statusData = sum ? [
    { name:'Pending',    value: sum.pending       || 0, color:'#eab308' },
    { name:'In Transit', value: sum.inTransit      || 0, color:'#06b6d4' },
    { name:'Delivered',  value: sum.deliveredToday || 0, color:'#22c55e' },
  ].filter(d => d.value > 0) : []

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', margin:0 }}>Analytics</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
            {isRestaurant ? 'Your branch performance overview' : 'System-wide supply chain analytics'}
          </p>
        </div>
        {/* Day range selector */}
        <div style={{ display:'flex', gap:4, background:'var(--surface)', padding:4, borderRadius:12, border:'1px solid var(--border)' }}>
          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                background: days === d ? '#6366f1' : 'transparent',
                color: days === d ? '#fff' : 'var(--muted)' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <KPI icon={Package}     label="Today's Orders"  value={sum?.todayTotal}     color="#6366f1" />
        <KPI icon={CheckCircle} label="Delivered Today"  value={sum?.deliveredToday} color="#22c55e" />
        <KPI icon={Truck}       label="In Transit"       value={sum?.inTransit}      color="#06b6d4" />
        <KPI icon={TrendingUp}  label="Fulfilment Rate"  value={sum?.fulfilmentPct ? `${sum.fulfilmentPct}%` : '—'} color="#a78bfa"
             sub={sum?.fulfilmentPct >= 90 ? '↑ On target' : sum?.fulfilmentPct >= 70 ? '→ Average' : '↓ Below target'} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>

        {/* Order trend */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>Order Trend — {days} Days</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Total orders vs delivered</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyFmt}>
              <defs>
                <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis dataKey="date" tick={{fill:tick,fontSize:10}} interval={Math.floor(dailyFmt.length/6)}/>
              <YAxis tick={{fill:tick,fontSize:10}}/>
              <Tooltip contentStyle={tt}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Area type="monotone" dataKey="totalIndents" stroke="#6366f1" fill="url(#ag1)" strokeWidth={2} name="Total Orders"/>
              <Area type="monotone" dataKey="delivered"    stroke="#22c55e" fill="url(#ag2)" strokeWidth={2} name="Delivered"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:14, marginBottom:4 }}>Today's Status</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>Order breakdown right now</div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {statusData.map((d: any, i: number) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={tt}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:8, justifyContent:'center' }}>
                {statusData.map((d: any) => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--muted)' }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:d.color }}/>
                    {d.name}: <strong style={{color:d.color}}>{d.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', color:'var(--muted)', fontSize:12, padding:'30px 0' }}>No orders today yet</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Fulfilment % trend */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:14, marginBottom:4 }}>Fulfilment Rate Trend</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>% of orders successfully delivered</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fulfilmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis dataKey="date" tick={{fill:tick,fontSize:10}} interval={Math.floor(fulfilmentData.length/5)}/>
              <YAxis domain={[0,100]} tick={{fill:tick,fontSize:10}} tickFormatter={v => `${v}%`}/>
              <Tooltip contentStyle={tt} formatter={(v: any) => [`${v}%`, 'Fulfilment']}/>
              <Line type="monotone" dataKey="pct" stroke="#a78bfa" strokeWidth={2.5} dot={false} name="Fulfilment %"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Branch comparison (hidden for restaurant staff) */}
        {!isRestaurant ? (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:14, marginBottom:4 }}>Branch Performance</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>Orders vs delivered last 7 days</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={brs || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
                <XAxis type="number" tick={{fill:tick,fontSize:10}}/>
                <YAxis dataKey="branchName" type="category" tick={{fill:tick,fontSize:10}} width={80}/>
                <Tooltip contentStyle={tt}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="totalIndents" fill="#6366f1" radius={[0,4,4,0]} name="Orders" maxBarSize={14}/>
                <Bar dataKey="delivered"    fill="#22c55e" radius={[0,4,4,0]} name="Delivered" maxBarSize={14}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:14, marginBottom:4 }}>Daily Orders — {days} Days</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>Your order volume over time</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyFmt}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
                <XAxis dataKey="date" tick={{fill:tick,fontSize:10}} interval={Math.floor(dailyFmt.length/6)}/>
                <YAxis tick={{fill:tick,fontSize:10}}/>
                <Tooltip contentStyle={tt}/>
                <Bar dataKey="totalIndents" radius={[4,4,0,0]} name="Orders" maxBarSize={20}>
                  {dailyFmt.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top items */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>Top 10 Most Ordered Items</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Last {days} days across all branches</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {(top10 || []).map((item: any, i: number) => {
            const max = top10?.[0]?.totalRequested || 1
            const pct = Math.round((item.totalRequested / max) * 100)
            return (
              <div key={item.itemId}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:10, fontWeight:800, color: i < 3 ? '#f97316' : 'var(--muted)', minWidth:18 }}>
                      #{i+1}
                    </span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{item.itemName}</span>
                  </div>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>{item.totalRequested} {item.unit}</span>
                </div>
                <div style={{ height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${pct}%`, background: C[i % C.length], transition:'width .5s' }}/>
                </div>
              </div>
            )
          })}
          {(!top10 || top10.length === 0) && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--muted)', padding:'20px 0', fontSize:13 }}>
              No order data yet for this period
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
