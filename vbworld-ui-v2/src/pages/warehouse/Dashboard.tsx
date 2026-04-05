import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSummary, getBranches, getTopItems, getIndents, getLowStock } from '../../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { AlertTriangle, Package, Truck, CheckCircle, Clock, TrendingUp } from 'lucide-react'

const C = ['#6366f1','#06b6d4','#22c55e','#f97316','#a78bfa','#ec4899']

function KPI({ icon:Icon, label, value, color, onClick }: any) {
  return (
    <div onClick={onClick} style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18,cursor:onClick?'pointer':'default' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div style={{ width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:`${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize:28,fontWeight:900,color,lineHeight:1 }}>{value??'—'}</div>
      <div style={{ fontSize:12,color:'var(--muted)',marginTop:4 }}>{label}</div>
    </div>
  )
}

export default function WarehouseDashboard() {
  const navigate = useNavigate()
  const dark = document.documentElement.classList.contains('dark')
  const grid = dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'
  const tick = '#64748b'
  const tt = { background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)' }

  const { data: sum } = useQuery({ queryKey:['sum'],queryFn:getSummary,select:r=>r.data.data,refetchInterval:30000 })
  const { data: branches } = useQuery({ queryKey:['branches'],queryFn:getBranches,select:r=>r.data.data||[] })
  const { data: topItems } = useQuery({ queryKey:['topItems',30,10],queryFn:()=>getTopItems(30,10),select:r=>r.data.data||[] })
  const { data: pendingOrders } = useQuery({ queryKey:['pending-orders'],queryFn:()=>getIndents({status:'SUBMITTED',size:5}),select:r=>r.data.data?.content||[],refetchInterval:30000 })
  const { data: lowStock } = useQuery({ queryKey:['lowstock'],queryFn:getLowStock,select:r=>r.data.data||[],refetchInterval:60000 })

  const STATUS_C: Record<string,string> = {SUBMITTED:'#eab308',APPROVED:'#06b6d4',DISPATCHED:'#a78bfa',DELIVERED:'#22c55e'}

  return (
    <div style={{ maxWidth:1200 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22,fontWeight:900,color:'var(--text)',margin:0 }}>Warehouse Dashboard</h1>
        <p style={{ fontSize:13,color:'var(--muted)',marginTop:2 }}>Live overview of all branches and stock status</p>
      </div>

      {/* Critical Alert */}
      {(lowStock||[]).length > 0 && (
        <div onClick={()=>navigate('/stock')} style={{ background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.25)',borderRadius:14,padding:'12px 16px',marginBottom:20,cursor:'pointer',display:'flex',alignItems:'center',gap:10 }}>
          <AlertTriangle size={18} style={{color:'#ef4444',flexShrink:0}}/>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:700,color:'#ef4444' }}>{lowStock.length} items below minimum stock level</span>
            <span style={{ color:'var(--muted)',fontSize:13,marginLeft:8 }}>— Click to manage restock</span>
          </div>
          <span style={{ color:'#ef4444',fontSize:13,fontWeight:600 }}>Manage Stock →</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20 }}>
        <KPI icon={Package}     label="Active Orders"    value={sum?.todayTotal}     color="#6366f1"/>
        <KPI icon={Clock}       label="Pending Approval" value={sum?.pending}        color="#eab308" onClick={()=>navigate('/orders')}/>
        <KPI icon={Truck}       label="In Transit"       value={sum?.inTransit}      color="#a78bfa"/>
        <KPI icon={CheckCircle} label="Delivered Today"  value={sum?.deliveredToday} color="#22c55e"/>
        <KPI icon={AlertTriangle} label="Low Stock Items" value={sum?.lowStockCount} color="#ef4444" onClick={()=>navigate('/stock')}/>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        {/* Branch Order Volume */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4 }}>Branch Order Volume (7 Days)</h3>
          <p style={{ fontSize:11,color:'var(--muted)',marginBottom:14 }}>Which restaurant is ordering most</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={branches||[]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={grid}/>
              <XAxis type="number" tick={{fill:tick,fontSize:10}}/>
              <YAxis dataKey="branchName" type="category" tick={{fill:tick,fontSize:11}} width={90}/>
              <Tooltip contentStyle={tt}/>
              <Bar dataKey="totalIndents" name="Orders" radius={[0,6,6,0]}>
                {(branches||[]).map((_:any,i:number)=><Cell key={i} fill={C[i%C.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fulfilment by Branch */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4 }}>Fulfilment Rate by Branch</h3>
          <p style={{ fontSize:11,color:'var(--muted)',marginBottom:14 }}>Orders delivered vs total this week</p>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {(branches||[]).map((b:any,i:number)=>{
              const pct = b.fulfilmentPct||0
              return (
                <div key={b.branchId}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12 }}>
                    <span style={{ color:'var(--text)',fontWeight:500 }}>{b.branchName}</span>
                    <span style={{ fontWeight:700,color:C[i%C.length] }}>{pct}% ({b.delivered}/{b.totalIndents})</span>
                  </div>
                  <div style={{ height:6,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:3,background:C[i%C.length],width:`${pct}%`,transition:'width .5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        {/* Top Items Demanded */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:18 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:14 }}>
            <div>
              <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',margin:0 }}>Top 10 Most Demanded Items</h3>
              <p style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>Last 30 days — plan your restock</p>
            </div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {(topItems||[]).slice(0,8).map((item:any,i:number)=>{
              const max = topItems?.[0]?.totalRequested||1
              return (
                <div key={item.itemId}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2 }}>
                    <span style={{ color:'var(--text)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,paddingRight:8 }}>{item.itemName}</span>
                    <span style={{ color:'var(--muted)',flexShrink:0 }}>{item.totalRequested} {item.unit}</span>
                  </div>
                  <div style={{ height:4,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:3,background:C[i%C.length],width:`${(item.totalRequested/max)*100}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pending Orders Queue */}
        <div style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden' }}>
          <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:14,fontWeight:700,color:'var(--text)',margin:0 }}>Pending Approval Queue</h3>
              <p style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>Orders waiting for your action</p>
            </div>
            <button onClick={()=>navigate('/orders')} style={{ fontSize:12,color:'#6366f1',background:'none',border:'none',cursor:'pointer',fontWeight:600 }}>
              View All →
            </button>
          </div>
          {(pendingOrders||[]).length===0 ? (
            <div style={{ padding:30,textAlign:'center',color:'var(--muted)',fontSize:13 }}>
              <CheckCircle size={28} style={{margin:'0 auto 6px',opacity:.3,display:'block'}}/>
              No pending orders — all clear!
            </div>
          ) : (pendingOrders||[]).map((o:any)=>(
            <div key={o.id} style={{ padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:'#6366f1',fontFamily:'monospace' }}>{o.indentNumber}</div>
                <div style={{ fontSize:11,color:'var(--muted)',marginTop:1 }}>{o.branchName} • {o.itemCount} items</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:10,color:'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                <button onClick={()=>navigate('/orders')} style={{ padding:'4px 10px',borderRadius:7,background:'#6366f1',border:'none',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:600 }}>
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Alert Table */}
      {(lowStock||[]).length > 0 && (
        <div style={{ background:'var(--card)',border:'1px solid rgba(239,68,68,.2)',borderRadius:14,overflow:'hidden' }}>
          <div style={{ padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <h3 style={{ fontSize:14,fontWeight:700,color:'#ef4444',margin:0 }}>⚠️ Restock Required — {lowStock.length} Items</h3>
            <button onClick={()=>navigate('/stock')} style={{ fontSize:12,color:'#ef4444',background:'none',border:'1px solid #ef4444',padding:'4px 12px',borderRadius:8,cursor:'pointer',fontWeight:600 }}>
              Manage Stock
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Item','Category','Current Stock','Min Level','Status'].map(h=>(
                    <th key={h} style={{ padding:'8px 14px',textAlign:'left',color:'var(--muted)',fontWeight:600,fontSize:11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lowStock||[]).slice(0,8).map((s:any)=>{
                  const pct = Math.min(100,(s.quantity/s.minLevel)*100)
                  return (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 14px',fontWeight:600,color:'var(--text)' }}>{s.itemName}</td>
                      <td style={{ padding:'10px 14px',color:'var(--muted)' }}>{s.category||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ width:60,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                            <div style={{ height:'100%',background:pct<50?'#ef4444':'#eab308',width:`${pct}%` }}/>
                          </div>
                          <span style={{ fontWeight:700,color:pct<50?'#ef4444':'#eab308' }}>{s.quantity} {s.unit}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px',color:'var(--muted)' }}>{s.minLevel} {s.unit}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,
                          background:pct<50?'rgba(239,68,68,.12)':'rgba(234,179,8,.12)',
                          color:pct<50?'#ef4444':'#eab308' }}>
                          {pct<50?'CRITICAL':'LOW'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
