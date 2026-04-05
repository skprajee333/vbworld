import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarRange, Loader2, ShoppingBasket, Sparkles, Truck, Wand2 } from 'lucide-react'
import { createAutoDraftPurchaseOrders, createForecastDraft, getNetworkForecast, getProcurementPlan } from '../../api'

function urgencyMeta(urgency: string) {
  switch (urgency) {
    case 'CRITICAL':
      return { color:'#ef4444', bg:'rgba(239,68,68,.12)' }
    case 'HIGH':
      return { color:'#f59e0b', bg:'rgba(245,158,11,.14)' }
    default:
      return { color:'#38bdf8', bg:'rgba(56,189,248,.14)' }
  }
}

function tomorrowIso() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export default function ProcurementPlanner() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [includeMedium, setIncludeMedium] = useState(false)
  const [draftResult, setDraftResult] = useState<any[] | null>(null)
  const [forecastDraftResult, setForecastDraftResult] = useState<any | null>(null)
  const [forecastStartDate, setForecastStartDate] = useState(tomorrowIso())
  const [forecastDays, setForecastDays] = useState(3)

  const { data: plan = [], isLoading } = useQuery({
    queryKey:['procurement-plan'],
    queryFn:getProcurementPlan,
    select:(response:any) => response?.data?.data || [],
    refetchInterval:60000,
  })

  const { data: forecast = [], isLoading: isForecastLoading } = useQuery({
    queryKey:['network-forecast', forecastStartDate, forecastDays],
    queryFn:() => getNetworkForecast(forecastStartDate, forecastDays),
    select:(response:any) => response?.data?.data || [],
    refetchInterval:120000,
  })

  const autoDraftMutation = useMutation({
    mutationFn: () => createAutoDraftPurchaseOrders(includeMedium),
    onSuccess: response => {
      setDraftResult(response?.data?.data || [])
      qc.invalidateQueries({ queryKey:['purchase-orders'] })
      qc.invalidateQueries({ queryKey:['procurement-plan'] })
    },
  })

  const forecastDraftMutation = useMutation({
    mutationFn: (branchId: string) => createForecastDraft({ branchId, targetDate: forecastStartDate, days: forecastDays }),
    onSuccess: response => {
      setForecastDraftResult(response?.data?.data || null)
      qc.invalidateQueries({ queryKey:['indents'] })
      qc.invalidateQueries({ queryKey:['network-forecast'] })
    },
  })

  const summary = useMemo(() => {
    const rows = plan || []
    return {
      total: rows.length,
      critical: rows.filter((row:any) => row.urgency === 'CRITICAL').length,
      mapped: rows.filter((row:any) => row.recommendedSupplierId).length,
      quantity: rows.reduce((sum:number, row:any) => sum + Number(row.suggestedOrderQuantity || 0), 0).toFixed(1),
    }
  }, [plan])

  const forecastSummary = useMemo(() => {
    const rows = forecast || []
    return {
      branches: rows.length,
      ready: rows.filter((row:any) => row.ready).length,
      autoEnabled: rows.filter((row:any) => row.autoReplenishEnabled).length,
      quantity: rows.reduce((sum:number, row:any) => sum + Number(row.totalRecommendedQuantity || 0), 0).toFixed(1),
    }
  }, [forecast])

  return (
    <div style={{ maxWidth:1240 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Procurement Planner</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            Auto-prioritized replenishment suggestions using stock risk, demand trend, preferred vendor rules, and branch demand forecasting.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button
            onClick={() => navigate('/purchase-orders')}
            style={{ padding:'9px 14px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontWeight:700, cursor:'pointer' }}
          >
            Open Purchase Orders
          </button>
          <button
            onClick={() => autoDraftMutation.mutate()}
            disabled={autoDraftMutation.isPending || summary.mapped === 0}
            style={{ padding:'9px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}
          >
            <Wand2 size={14} /> {autoDraftMutation.isPending ? 'Generating...' : 'Generate Draft POs'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:18 }}>
        {[
          { label:'Planned lines', value:summary.total, color:'#6366f1' },
          { label:'Critical items', value:summary.critical, color:'#ef4444' },
          { label:'Forecast-ready branches', value:forecastSummary.ready, color:'#14b8a6' },
          { label:'Forecast qty', value:forecastSummary.quantity, color:'#f59e0b' },
        ].map(card => (
          <div key={card.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{card.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 320px', gap:16, marginBottom:18, alignItems:'stretch' }}>
        <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,.16), rgba(20,184,166,.12))', border:'1px solid rgba(99,102,241,.2)', borderRadius:16, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Sparkles size={16} color="#6366f1" />
            <span style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Why this stands out</span>
          </div>
          <p style={{ fontSize:12, color:'var(--muted)', margin:0 }}>
            This module now links warehouse buying decisions to branch demand forecasting. The team can see which branches are likely to need replenishment, apply confidence thresholds, add safety stock, and create draft indents before shortages become urgent.
          </p>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', marginBottom:10 }}>Draft Rules</div>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text)', marginBottom:10 }}>
            <input type="checkbox" checked={includeMedium} onChange={e => setIncludeMedium(e.target.checked)} />
            Include medium-priority items
          </label>
          <div style={{ fontSize:11, color:'var(--muted)' }}>
            Default mode creates supplier draft POs only for critical and high-priority items with mapped suppliers.
          </div>
        </div>
      </div>

      {draftResult && (
        <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:16, padding:16, marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:900, color:'#22c55e', marginBottom:6 }}>
            {draftResult.length} draft purchase orders created
          </div>
          <div style={{ display:'grid', gap:6, fontSize:12, color:'var(--muted)' }}>
            {draftResult.map((po:any) => (
              <div key={po.id}>
                <strong style={{ color:'var(--text)' }}>{po.poNumber}</strong> for {po.supplierName} • {po.items?.length || 0} lines • expected {po.expectedDate || '-'}
              </div>
            ))}
          </div>
        </div>
      )}

      {forecastDraftResult && (
        <div style={{ background:'rgba(56,189,248,.09)', border:'1px solid rgba(56,189,248,.24)', borderRadius:16, padding:16, marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:900, color:'#38bdf8', marginBottom:6 }}>
            Forecast draft ready: {forecastDraftResult.indentNumber}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>
            {forecastDraftResult.branchName} • {forecastDraftResult.itemCount} items • {forecastDraftResult.scheduledDate} • slot {forecastDraftResult.deliverySlot}
          </div>
        </div>
      )}

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, marginBottom:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Branch Demand Forecast</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Forecast branch replenishment demand and create draft indents from smart suggestions.</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <label style={{ fontSize:11, color:'var(--muted)' }}>
              Start date
              <input type="date" value={forecastStartDate} onChange={e => setForecastStartDate(e.target.value)} style={{ marginLeft:8, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }} />
            </label>
            <label style={{ fontSize:11, color:'var(--muted)' }}>
              Days
              <select value={forecastDays} onChange={e => setForecastDays(Number(e.target.value))} style={{ marginLeft:8, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)' }}>
                {[2,3,5,7].map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
          {[
            { label:'Active branches', value:forecastSummary.branches, color:'#6366f1' },
            { label:'Ready for forecast', value:forecastSummary.ready, color:'#22c55e' },
            { label:'Auto mode enabled', value:forecastSummary.autoEnabled, color:'#f59e0b' },
            { label:'Network qty', value:forecastSummary.quantity, color:'#38bdf8' },
          ].map(card => (
            <div key={card.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{card.label}</div>
              <div style={{ fontSize:22, fontWeight:900, color:card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {isForecastLoading ? (
          <div style={{ padding:30, textAlign:'center' }}>
            <Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} />
          </div>
        ) : forecast.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--muted)' }}>
            <CalendarRange size={30} style={{ opacity:.2, margin:'0 auto 10px', display:'block' }} />
            <div style={{ fontSize:13 }}>No branch forecast is available yet.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(310px, 1fr))', gap:14 }}>
            {forecast.map((branch:any) => (
              <div key={branch.branchId} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:'var(--text)' }}>{branch.branchName}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {branch.forecastDays} day horizon • safety {branch.safetyStockDays} day • slot {branch.recommendedSlot}
                    </div>
                  </div>
                  <span style={{ padding:'4px 9px', borderRadius:999, background: branch.autoReplenishEnabled ? 'rgba(34,197,94,.12)' : 'rgba(148,163,184,.14)', color: branch.autoReplenishEnabled ? '#22c55e' : 'var(--muted)', fontSize:10, fontWeight:800 }}>
                    {branch.autoReplenishEnabled ? 'AUTO' : 'MANUAL'}
                  </span>
                </div>

                {!branch.ready ? (
                  <div style={{ fontSize:12, color:'#f59e0b' }}>
                    Not enough branch order history yet. Need {branch.readiness?.daysRemaining} more active day(s).
                  </div>
                ) : (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>Recommended qty</div>
                        <div style={{ fontSize:18, fontWeight:900, color:'var(--text)' }}>{branch.totalRecommendedQuantity}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>Items</div>
                        <div style={{ fontSize:18, fontWeight:900, color:'#6366f1' }}>{branch.itemCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>Min confidence</div>
                        <div style={{ fontSize:18, fontWeight:900, color:'#14b8a6' }}>{branch.minConfidencePct}%</div>
                      </div>
                    </div>

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                      {(branch.dailyBreakdown || []).map((day:any) => (
                        <div key={day.date} style={{ padding:'6px 8px', borderRadius:10, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.12)' }}>
                          <div style={{ fontSize:10, color:'var(--muted)' }}>{day.dayName} • {day.date}</div>
                          <div style={{ fontSize:11, color:'var(--text)', fontWeight:800 }}>{day.totalSuggestedQuantity}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display:'grid', gap:8, marginBottom:14 }}>
                      {(branch.items || []).slice(0, 4).map((item:any) => (
                        <div key={item.itemId} style={{ border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                            <div>
                              <div style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>{item.itemName}</div>
                              <div style={{ fontSize:10, color:'var(--muted)' }}>{item.itemCode} • {item.category || 'Uncategorized'} • {item.unit}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:12, fontWeight:900, color:'#6366f1' }}>{item.recommendedQuantity}</div>
                              <div style={{ fontSize:10, color:'var(--muted)' }}>buffer {item.bufferQuantity}</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:8, fontSize:10, color:'var(--muted)' }}>
                            <span>{item.averageConfidencePct}% confidence</span>
                            <span>peak {item.peakDay || '-'} {item.peakDayQuantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => forecastDraftMutation.mutate(branch.branchId)}
                      disabled={forecastDraftMutation.isPending || !branch.items?.length}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 12px', borderRadius:10, border:'none', background:'#14b8a6', color:'#fff', fontWeight:800, cursor:'pointer' }}
                    >
                      <Truck size={14} /> {forecastDraftMutation.isPending ? 'Creating draft...' : 'Create Draft Indent'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>Restock Action Queue</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Sorted by urgency, then by order quantity</div>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>Refreshes every 60 seconds</div>
        </div>

        {isLoading ? (
          <div style={{ padding:36, textAlign:'center' }}>
            <Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }} />
          </div>
        ) : plan.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
            <ShoppingBasket size={34} style={{ opacity:.2, margin:'0 auto 10px', display:'block' }} />
            <div style={{ fontSize:13 }}>No replenishment actions needed right now.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Item', 'Stock Position', 'Demand', 'Recommended Supplier', 'Reason', 'Action'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan.map((row:any) => {
                  const meta = urgencyMeta(row.urgency)
                  return (
                    <tr key={row.itemId} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 14px', minWidth:220 }}>
                        <div style={{ fontWeight:800, color:'var(--text)' }}>{row.itemName}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{row.itemCode} • {row.category || 'Uncategorized'} • {row.unit}</div>
                      </td>
                      <td style={{ padding:'12px 14px', minWidth:200 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <span style={{ padding:'3px 9px', borderRadius:20, background:meta.bg, color:meta.color, fontSize:10, fontWeight:800 }}>{row.urgency}</span>
                          {row.urgency === 'CRITICAL' && <AlertTriangle size={14} color="#ef4444" />}
                        </div>
                        <div style={{ fontSize:12, color:'var(--text)' }}>Current: <strong>{row.currentStock}</strong> / Target: <strong>{row.targetStock}</strong></div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Min {row.minLevel} • Reorder {row.reorderLevel} • Suggested {row.suggestedOrderQuantity}</div>
                      </td>
                      <td style={{ padding:'12px 14px', minWidth:160, color:'var(--muted)', fontSize:12 }}>
                        <div>Avg/day: <strong style={{ color:'var(--text)' }}>{row.averageDailyDemand ?? '-'}</strong></div>
                        <div style={{ marginTop:4 }}>Days left: <strong style={{ color:'var(--text)' }}>{row.estimatedDaysRemaining ?? '-'}</strong></div>
                      </td>
                      <td style={{ padding:'12px 14px', minWidth:220 }}>
                        {row.recommendedSupplierName ? (
                          <>
                            <div style={{ fontWeight:700, color:'var(--text)' }}>{row.recommendedSupplierName}</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{row.recommendedSupplierCode} • Lead {row.recommendedLeadTimeDays || '-'} days</div>
                            <div style={{ fontSize:11, color: row.preferredSupplier ? '#f59e0b' : 'var(--muted)', marginTop:4 }}>
                              {row.preferredSupplier ? 'Preferred vendor' : 'Mapped vendor'}
                              {row.recommendedUnitCost != null ? ` • Cost ${row.recommendedUnitCost}` : ''}
                              {row.minOrderQuantity != null ? ` • MOQ ${row.minOrderQuantity}` : ''}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize:12, color:'#f59e0b' }}>No mapped supplier yet</div>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', minWidth:220, fontSize:12, color:'var(--muted)' }}>
                        {row.recommendationReason}
                        {row.suggestedExpectedDate && (
                          <div style={{ marginTop:4, color:'var(--text)' }}>Expected by {row.suggestedExpectedDate}</div>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', minWidth:150 }}>
                        <button
                          onClick={() => navigate('/purchase-orders')}
                          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontWeight:700, cursor:'pointer' }}
                        >
                          <Truck size={12} /> Create PO
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
