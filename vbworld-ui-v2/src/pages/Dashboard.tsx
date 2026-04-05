import { useQuery } from '@tanstack/react-query'
import { getSummary, getDaily, getBranches, getTopItems } from '../api'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#6366f1','#06b6d4','#22c55e','#f97316','#a78bfa']

function KPI({ label, value, color }: any) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
      <div style={{ fontSize:32, fontWeight:900, color: color || 'var(--accent,#6366f1)' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{label}</div>
    </div>
  )
}

function LoadingBox({ height = 200 }) {
  return (
    <div style={{
      height,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted)'
    }}>
      Loading...
    </div>
  )
}

export default function Dashboard() {

  const {
    data: sum,
    isLoading: sumLoading,
    error: sumError
  } = useQuery({
    queryKey:['summary'],
    queryFn: getSummary,
    select: r => r.data.data,
    refetchInterval: 30000 // 🔄 auto refresh every 30s
  })

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey:['daily',14],
    queryFn: () => getDaily(14),
    select: r => r.data.data
  })

  const { data: br, isLoading: brLoading } = useQuery({
    queryKey:['branches'],
    queryFn: getBranches,
    select: r => r.data.data
  })

  const { data: top, isLoading: topLoading } = useQuery({
    queryKey:['topItems'],
    queryFn: () => getTopItems(30,8),
    select: r => r.data.data
  })

  const dailyFmt = (daily || []).map((d: any) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'})
  }))

  const grid = 'rgba(255,255,255,.05)'
  const tick = '#64748b'
  const tt = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)' }

  if (sumError) {
    return <div style={{ color: 'red' }}>Failed to load dashboard</div>
  }

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:4 }}>
        Dashboard
      </h1>
      <p style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>
        Live supply chain overview
      </p>

      {/* KPI */}
      {sumLoading ? (
        <LoadingBox height={120} />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:20 }}>
          <KPI label="Today's Orders"  value={sum?.todayTotal}/>
          <KPI label="Pending"         value={sum?.pending}/>
          <KPI label="In Transit"      value={sum?.inTransit}/>
          <KPI label="Delivered Today" value={sum?.deliveredToday}/>
          <KPI label="Low Stock"       value={sum?.lowStockCount}/>
          <KPI label="Fulfilment %"    value={sum?.fulfilmentPct ? `${sum.fulfilmentPct}%` : '—'}/>
        </div>
      )}

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>

        {/* Trend */}
        {dailyLoading ? (
          <LoadingBox />
        ) : (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700 }}>14-Day Trend</h3>

            {dailyFmt.length === 0 ? (
              <div style={{ color:'var(--muted)' }}>No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyFmt}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
                  <XAxis dataKey="date" tick={{fill:tick,fontSize:11}}/>
                  <YAxis tick={{fill:tick,fontSize:11}}/>
                  <Tooltip contentStyle={tt}/>
                  <Area type="monotone" dataKey="totalIndents" stroke="#6366f1" fillOpacity={0.2}/>
                  <Area type="monotone" dataKey="delivered" stroke="#22c55e"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Branch Pie */}
        {brLoading ? (
          <LoadingBox />
        ) : (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700 }}>Branches</h3>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={br||[]} dataKey="totalIndents" nameKey="branchName" outerRadius={70}>
                  {(br||[]).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={tt}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Branch Performance */}
        {brLoading ? (
          <LoadingBox />
        ) : (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700 }}>Branch Performance</h3>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={br||[]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
                <XAxis type="number" tick={{fill:tick,fontSize:11}}/>
                <YAxis dataKey="branchName" type="category" tick={{fill:tick,fontSize:11}}/>
                <Tooltip contentStyle={tt}/>
                <Bar dataKey="totalIndents" fill="#6366f1"/>
                <Bar dataKey="delivered" fill="#22c55e"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Items */}
        {topLoading ? (
          <LoadingBox />
        ) : (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:700 }}>Top Items</h3>

            {(top||[]).length === 0 ? (
              <div style={{ color:'var(--muted)' }}>No items found</div>
            ) : (
              (top||[]).slice(0,6).map((item: any, i: number) => (
                <div key={item.itemId} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>{item.itemName}</span>
                    <span>{item.totalRequested}</span>
                  </div>
                  <div style={{ height:5, background:'var(--border)' }}>
                    <div style={{
                      height:'100%',
                      width:`${(item.totalRequested/(top[0]?.totalRequested||1))*100}%`,
                      background:COLORS[i%COLORS.length]
                    }}/>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}