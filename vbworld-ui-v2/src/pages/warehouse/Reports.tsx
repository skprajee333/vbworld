import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  Factory,
  FileText,
  Printer,
  ShieldAlert,
  TimerReset,
  Truck,
} from 'lucide-react'
import {
  exportBranchPerformanceReport,
  exportExecutiveSummaryReport,
  exportInventoryRiskReport,
  exportSlaReport,
  exportStockAgingReport,
  getBranchPerformanceReport,
  getExecutiveSummaryReport,
  getInventoryRiskReport,
  getReportSummary,
  getSlaReport,
  getStockAgingReport,
  getTopItems,
  getWastageReport,
} from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/StateBlocks'

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
      <div style={{ width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, marginBottom:10 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ fontSize:28, fontWeight:900, lineHeight:1, color }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function printExecutiveBrief(summary: any, branchReport: any[], slaReport: any[], criticalItems: any[], agingRows: any[]) {
  const html = `
    <html>
      <head>
        <title>VB World Executive Brief</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2 { margin-bottom: 8px; }
          .grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 24px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>VB World Executive Brief</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <div class="grid">
          <div class="card"><strong>Total orders</strong><div>${summary?.totalOrders ?? 0}</div></div>
          <div class="card"><strong>Fulfilment %</strong><div>${summary?.fulfilmentPct ?? 0}%</div></div>
          <div class="card"><strong>On-time %</strong><div>${summary?.onTimeDeliveryPct ?? 0}%</div></div>
          <div class="card"><strong>Avg fulfilment hours</strong><div>${summary?.averageFulfilmentHours ?? '-'}</div></div>
          <div class="card"><strong>Low stock items</strong><div>${summary?.lowStockItems ?? 0}</div></div>
          <div class="card"><strong>Expiring lots</strong><div>${summary?.expiringLots ?? 0}</div></div>
        </div>
        <h2>Branch Performance</h2>
        <table><thead><tr><th>Branch</th><th>Orders</th><th>Delivered</th><th>Open</th><th>Fulfilment %</th></tr></thead><tbody>
          ${branchReport.slice(0, 8).map((row:any) => `<tr><td>${row.branchName}</td><td>${row.totalOrders}</td><td>${row.deliveredOrders}</td><td>${row.openOrders}</td><td>${row.fulfilmentPct ?? 0}%</td></tr>`).join('')}
        </tbody></table>
        <h2>SLA</h2>
        <table><thead><tr><th>Branch</th><th>On-time %</th><th>Avg fulfilment hrs</th><th>Avg approval hrs</th></tr></thead><tbody>
          ${slaReport.slice(0, 8).map((row:any) => `<tr><td>${row.branchName}</td><td>${row.onTimePct ?? '-'}</td><td>${row.averageFulfilmentHours ?? '-'}</td><td>${row.averageApprovalHours ?? '-'}</td></tr>`).join('')}
        </tbody></table>
        <h2>Critical Inventory</h2>
        <table><thead><tr><th>Item</th><th>Stock</th><th>Suggested Order</th><th>Supplier</th></tr></thead><tbody>
          ${criticalItems.slice(0, 8).map((row:any) => `<tr><td>${row.itemName}</td><td>${row.currentStock}</td><td>${row.suggestedOrderQty}</td><td>${row.recommendedSupplierName || 'Unmapped'}</td></tr>`).join('')}
        </tbody></table>
        <h2>Stock Aging</h2>
        <table><thead><tr><th>Item</th><th>Batch</th><th>Age Bucket</th><th>Status</th><th>Remaining Qty</th></tr></thead><tbody>
          ${agingRows.slice(0, 8).map((row:any) => `<tr><td>${row.itemName}</td><td>${row.batchNumber || '-'}</td><td>${row.ageBucket}</td><td>${row.stockStatus}</td><td>${row.remainingQuantity}</td></tr>`).join('')}
        </tbody></table>
      </body>
    </html>`
  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export default function Reports() {
  const [days, setDays] = useState(30)

  const summaryQuery = useQuery({ queryKey: ['report-summary', days], queryFn: () => getReportSummary(days), select: response => response.data.data })
  const executiveQuery = useQuery({ queryKey: ['executive-summary', days], queryFn: () => getExecutiveSummaryReport(days), select: response => response.data.data })
  const branchReportQuery = useQuery({ queryKey: ['branch-report', days], queryFn: () => getBranchPerformanceReport(days), select: response => response.data.data || [] })
  const inventoryRiskQuery = useQuery({ queryKey: ['inventory-risk'], queryFn: getInventoryRiskReport, select: response => response.data.data || [] })
  const topItemsQuery = useQuery({ queryKey: ['top-items-report', days], queryFn: () => getTopItems(days, 6), select: response => response.data.data || [] })
  const wastageQuery = useQuery({ queryKey: ['wastage-report', days], queryFn: () => getWastageReport(days), select: response => response.data.data || [] })
  const slaReportQuery = useQuery({ queryKey: ['sla-report', days], queryFn: () => getSlaReport(days), select: response => response.data.data || [] })
  const stockAgingQuery = useQuery({ queryKey: ['stock-aging-report'], queryFn: getStockAgingReport, select: response => response.data.data || [] })

  const summary = summaryQuery.data
  const executive = executiveQuery.data
  const branchReport = branchReportQuery.data || []
  const inventoryRisk = inventoryRiskQuery.data || []
  const topItems = topItemsQuery.data || []
  const wastageReport = wastageQuery.data || []
  const slaReport = slaReportQuery.data || []
  const stockAging = stockAgingQuery.data || []

  const queriesLoading = [summaryQuery, executiveQuery, branchReportQuery, inventoryRiskQuery, topItemsQuery, wastageQuery, slaReportQuery, stockAgingQuery].some(query => query.isLoading)
  const queriesError = [summaryQuery, executiveQuery, branchReportQuery, inventoryRiskQuery, topItemsQuery, wastageQuery, slaReportQuery, stockAgingQuery].some(query => query.isError)

  async function handleRetry() {
    await Promise.all([
      summaryQuery.refetch(),
      executiveQuery.refetch(),
      branchReportQuery.refetch(),
      inventoryRiskQuery.refetch(),
      topItemsQuery.refetch(),
      wastageQuery.refetch(),
      slaReportQuery.refetch(),
      stockAgingQuery.refetch(),
    ])
  }

  async function handleBranchExport() {
    const response = await exportBranchPerformanceReport(days)
    downloadBlob(response.data, `branch-performance-${days}d.csv`)
  }

  async function handleInventoryExport() {
    const response = await exportInventoryRiskReport()
    downloadBlob(response.data, 'inventory-risk-report.csv')
  }

  async function handleExecutiveExport() {
    const response = await exportExecutiveSummaryReport(days)
    downloadBlob(response.data, `executive-summary-${days}d.csv`)
  }

  async function handleSlaExport() {
    const response = await exportSlaReport(days)
    downloadBlob(response.data, `sla-report-${days}d.csv`)
  }

  async function handleStockAgingExport() {
    const response = await exportStockAgingReport()
    downloadBlob(response.data, 'stock-aging-report.csv')
  }

  const criticalItems = inventoryRisk.filter((item: any) => item.riskLevel === 'CRITICAL')
  const highItems = inventoryRisk.filter((item: any) => item.riskLevel === 'HIGH')
  const totalWastage = wastageReport.reduce((sum: number, row: any) => sum + Number(row.totalWastageQty || 0), 0)
  const totalDeadStock = wastageReport.reduce((sum: number, row: any) => sum + Number(row.deadStockQty || 0), 0)
  const agedLots = useMemo(() => stockAging.filter((row: any) => row.ageBucket === '60+_DAYS' || row.stockStatus !== 'ACTIVE'), [stockAging])
  const hasAnyData = !!summary || !!executive || branchReport.length > 0 || inventoryRisk.length > 0 || topItems.length > 0 || wastageReport.length > 0 || slaReport.length > 0 || stockAging.length > 0

  if (queriesLoading) {
    return (
      <div style={{ maxWidth: 1360 }}>
        <LoadingState title="Building executive reports" message="Crunching fulfilment, stock, wastage, and cashier metrics for the selected window." />
      </div>
    )
  }

  if (queriesError) {
    return (
      <div style={{ maxWidth: 1360 }}>
        <ErrorState title="Reporting data didn't load" message="One or more report feeds failed. Retry to rebuild the reporting dashboard for this date range." onAction={handleRetry} compact={false} />
      </div>
    )
  }

  if (!hasAnyData) {
    return (
      <div style={{ maxWidth: 1360 }}>
        <EmptyState title="No reporting data yet" message="Once branches start ordering and warehouse activity is logged, the executive dashboard will populate here." onAction={handleRetry} actionLabel="Refresh reports" compact={false} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1360 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', margin:0 }}>Executive Reports</h1>
          <p style={{ fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>
            Executive summary, SLA, stock aging, and export-ready operational reporting.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <select value={days} onChange={event => setDays(Number(event.target.value))} style={{ padding:'10px 12px', borderRadius:10, background:'var(--card)', color:'var(--text)', border:'1px solid var(--border)' }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={handleExecutiveExport} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
            <Download size={15} /> Executive CSV
          </button>
          <button onClick={() => printExecutiveBrief(executive, branchReport, slaReport, criticalItems, agedLots)} style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
            <Printer size={15} /> Print Brief
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:18 }}>
        <StatCard icon={Factory} label="Orders In Window" value={summary?.totalOrders ?? 0} sub={`${days} day view`} color="#6366f1" />
        <StatCard icon={Truck} label="Delivered" value={summary?.deliveredOrders ?? 0} sub={`${summary?.fulfilmentPct ?? 0}% fulfilment`} color="#22c55e" />
        <StatCard icon={TimerReset} label="On-time Delivery" value={`${executive?.onTimeDeliveryPct ?? 0}%`} sub={`${executive?.averageFulfilmentHours ?? '-'} avg hrs`} color="#06b6d4" />
        <StatCard icon={ShieldAlert} label="Stock Risk" value={`${criticalItems.length}/${highItems.length}`} sub="Critical / high items" color="#ef4444" />
        <StatCard icon={FileText} label="Expiring / Aged Lots" value={`${executive?.expiringLots ?? 0}/${agedLots.length}`} sub="Expiring lots / aging flags" color="#f59e0b" />
        <StatCard icon={ShieldAlert} label="Losses" value={`${totalWastage}/${totalDeadStock}`} sub="Wastage / dead stock qty" color="#f97316" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr .8fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <div style={{ marginBottom:12 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Executive Summary</h3>
            <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Management-level snapshot across fulfilment, procurement, inventory loss, and route execution.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Fulfilment %', value: executive?.fulfilmentPct != null ? `${executive.fulfilmentPct}%` : '-' },
              { label:'Open POs', value: executive?.openPurchaseOrders ?? 0 },
              { label:'Dispatched Routes', value: executive?.dispatchedRoutes ?? 0 },
              { label:'Completed Routes', value: executive?.completedRoutes ?? 0 },
              { label:'Low Stock Items', value: executive?.lowStockItems ?? 0 },
              { label:'Average Fulfilment Hrs', value: executive?.averageFulfilmentHours ?? '-' },
            ].map(card => (
              <div key={card.label} style={{ border:'1px solid var(--border)', borderRadius:12, padding:14, background:'var(--surface)' }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>{card.label}</div>
                <div style={{ fontSize:22, fontWeight:900, color:'var(--text)' }}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <div style={{ marginBottom:12 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Top Consumption Drivers</h3>
            <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Fastest-moving items in the selected window.</p>
          </div>
          {topItems.length === 0 ? (
            <EmptyState title="No top-item movement yet" message="Once enough order volume is recorded in this window, your consumption leaders will appear here." compact />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {topItems.map((item: any, index: number) => {
                const max = topItems?.[0]?.totalRequested || 1
                const pct = (item.totalRequested / max) * 100
                return (
                  <div key={item.itemId}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginBottom:4, fontSize:12 }}>
                      <span style={{ color:'var(--text)', fontWeight:600 }}>{item.itemName}</span>
                      <span style={{ color:'var(--muted)' }}>{item.totalRequested} {item.unit}</span>
                    </div>
                    <div style={{ height:6, borderRadius:999, background:'var(--border)', overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:index < 2 ? '#ef4444' : index < 4 ? '#f59e0b' : '#6366f1' }} />
                    </div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{item.orderCount} orders in the selected period</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Branch SLA Report</h3>
              <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>On-time delivery and approval-speed comparison by branch.</p>
            </div>
            <button onClick={handleSlaExport} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <Download size={14} /> Export SLA
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr>
                  {['Branch', 'Delivered', 'On-time', 'Late', 'On-time %', 'Avg fulfilment hrs', 'Avg approval hrs'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaReport.map((row: any) => (
                  <tr key={row.branchId} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px', color:'var(--text)', fontWeight:700 }}>{row.branchName}</td>
                    <td style={{ padding:'10px 14px', color:'var(--text)' }}>{row.totalDeliveredOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#22c55e', fontWeight:800 }}>{row.onTimeOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#ef4444', fontWeight:800 }}>{row.lateOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#6366f1', fontWeight:800 }}>{row.onTimePct ?? '-'}%</td>
                    <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{row.averageFulfilmentHours ?? '-'}</td>
                    <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{row.averageApprovalHours ?? '-'}</td>
                  </tr>
                ))}
                {slaReport.length === 0 && <tr><td colSpan={7} style={{ padding:'20px 14px', color:'var(--muted)', textAlign:'center' }}>No SLA rows were produced for this window.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Stock Aging Report</h3>
              <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Aging lots, expiry risk, and stale inventory position.</p>
            </div>
            <button onClick={handleStockAgingExport} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <Download size={14} /> Export Aging
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr>
                  {['Item', 'Batch', 'Age bucket', 'Status', 'Remaining', 'Supplier'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agedLots.slice(0, 12).map((row: any, index: number) => (
                  <tr key={`${row.itemId}-${row.batchNumber || index}`} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontWeight:700, color:'var(--text)' }}>{row.itemName}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{row.itemCode} | {row.unit}</div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{row.batchNumber || '-'}</td>
                    <td style={{ padding:'10px 14px', color:'#f59e0b', fontWeight:800 }}>{row.ageBucket}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'3px 8px', borderRadius:999, background: row.stockStatus === 'EXPIRED' ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)', color: row.stockStatus === 'EXPIRED' ? '#ef4444' : '#f59e0b', fontWeight:800 }}>
                        {row.stockStatus}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'var(--text)' }}>{row.remainingQuantity}</td>
                    <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{row.supplierName || 'Unmapped'}</td>
                  </tr>
                ))}
                {agedLots.length === 0 && <tr><td colSpan={6} style={{ padding:'20px 14px', color:'var(--muted)', textAlign:'center' }}>No aged or expiring lots found right now.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr .8fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Branch Performance Comparison</h3>
              <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Compare fulfilment, open orders, and item volume by branch.</p>
            </div>
            <button onClick={handleBranchExport} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <Download size={14} /> Export Branches
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr>
                  {['Branch', 'Orders', 'Delivered', 'Open', 'Cancelled', 'Fulfilment', 'Avg Items'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchReport.map((branch: any) => (
                  <tr key={branch.branchId} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px', color:'var(--text)', fontWeight:700 }}>{branch.branchName}</td>
                    <td style={{ padding:'10px 14px', color:'var(--text)' }}>{branch.totalOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#22c55e', fontWeight:700 }}>{branch.deliveredOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#f59e0b', fontWeight:700 }}>{branch.openOrders}</td>
                    <td style={{ padding:'10px 14px', color:'#ef4444', fontWeight:700 }}>{branch.cancelledOrders}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(99,102,241,.12)', color:'#6366f1', fontWeight:800 }}>{branch.fulfilmentPct ?? 0}%</span></td>
                    <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{branch.avgItemsPerOrder ?? 0}</td>
                  </tr>
                ))}
                {branchReport.length === 0 && <tr><td colSpan={7} style={{ padding:'20px 14px', color:'var(--muted)', textAlign:'center' }}>No branch comparison rows are available yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Inventory Risk Report</h3>
              <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Risk-ranked stock view using demand and reorder logic.</p>
            </div>
            <button onClick={handleInventoryExport} style={{ padding:'8px 12px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <Download size={14} /> Export Inventory
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead style={{ background:'var(--surface)' }}>
                <tr>
                  {['Item', 'Stock', 'Days Cover', 'Suggested Order', 'Risk'].map(header => (
                    <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryRisk.slice(0, 12).map((row: any) => {
                  const riskColor = row.riskLevel === 'CRITICAL' ? '#ef4444' : row.riskLevel === 'HIGH' ? '#f59e0b' : '#6366f1'
                  return (
                    <tr key={row.itemId} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:700, color:'var(--text)' }}>{row.itemName}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{row.itemCode}</div>
                      </td>
                      <td style={{ padding:'10px 14px', color:'var(--text)' }}>{row.currentStock}</td>
                      <td style={{ padding:'10px 14px', color:'var(--text)' }}>{row.estimatedDaysCover ?? '-'}</td>
                      <td style={{ padding:'10px 14px', color:'#6366f1', fontWeight:800 }}>{row.suggestedOrderQty}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ padding:'3px 8px', borderRadius:999, background:`${riskColor}18`, color:riskColor, fontWeight:800 }}>{row.riskLevel}</span></td>
                    </tr>
                  )
                })}
                {inventoryRisk.length === 0 && <tr><td colSpan={5} style={{ padding:'20px 14px', color:'var(--muted)', textAlign:'center' }}>No inventory risk rows are available right now.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)', margin:0 }}>Wastage And Dead Stock</h3>
            <p style={{ fontSize:11, color:'var(--muted)', margin:'3px 0 0' }}>Track write-offs, spoilage, expired lots, and dead stock by item.</p>
          </div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>{totalWastage} wastage | {totalDeadStock} dead stock</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead style={{ background:'var(--surface)' }}>
              <tr>
                {['Item', 'Category', 'Wastage Qty', 'Dead Stock Qty', 'Events', 'Top Reason'].map(header => (
                  <th key={header} style={{ padding:'10px 14px', textAlign:'left', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wastageReport.map((row: any) => (
                <tr key={row.itemId} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ fontWeight:700, color:'var(--text)' }}>{row.itemName}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>{row.itemCode} | {row.unit}</div>
                  </td>
                  <td style={{ padding:'10px 14px', color:'var(--muted)' }}>{row.category || '-'}</td>
                  <td style={{ padding:'10px 14px', color:'#f97316', fontWeight:800 }}>{row.totalWastageQty}</td>
                  <td style={{ padding:'10px 14px', color:'#94a3b8', fontWeight:800 }}>{row.deadStockQty}</td>
                  <td style={{ padding:'10px 14px', color:'var(--text)' }}>{row.wastageEvents}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ padding:'3px 8px', borderRadius:999, background:'rgba(249,115,22,.12)', color:'#f97316', fontWeight:800 }}>{row.topReasonType}</span></td>
                </tr>
              ))}
              {wastageReport.length === 0 && <tr><td colSpan={6} style={{ padding:'20px 14px', color:'var(--muted)', textAlign:'center' }}>No wastage or dead-stock events logged in this time window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
