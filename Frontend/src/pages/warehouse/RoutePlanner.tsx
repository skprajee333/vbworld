import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDeliveryRoute,
  getDeliveryRoutes,
  getOptimizedDeliveryRoutes,
  getRoutePlan,
  rescheduleIndent,
  updateDeliveryRouteStatus,
} from '../../api'
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Sparkles,
  Route,
  Shuffle,
  Truck,
  TruckIcon,
} from 'lucide-react'

const SLOT_ORDER = ['MORNING', 'AFTERNOON', 'EVENING'] as const

type SlotKey = (typeof SLOT_ORDER)[number]

type RoutePlanItem = {
  id: string
  indentNumber: string
  branchName: string
  branchId: string
  status: string
  itemCount: number
  createdAt: string
  cutoffApplied?: boolean
  notes?: string
  scheduledDate: string
  promisedSlot?: string
  requestedSlot?: string
}

type RouteOptimization = {
  recommendationId: string
  routeDate: string
  deliverySlot: string
  suggestedRouteName: string
  suggestedVehicleType: string
  suggestedVehicleCapacityKg: number
  estimatedLoadKg: number
  estimatedStops: number
  branches: string[]
  indents: Array<{
    indentId: string
    indentNumber: string
    branchId: string
    branchName: string
    itemCount: number
    estimatedLoadKg: number
  }>
}

type DeliveryRouteItem = {
  id: string
  routeName: string
  routeStatus: string
  routeDate: string
  deliverySlot: string
  driverName: string
  driverPhone?: string
  vehicleNumber: string
  vehicleType?: string
  notes?: string
  assignedByName?: string
  dispatchedAt?: string
  completedAt?: string
  indents: Array<{
    indentId: string
    indentNumber: string
    branchName: string
    stopOrder: number
    status: string
    itemCount: number
  }>
}

function fmtDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN')
}

function fmtDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-IN')
}

export default function RoutePlanner() {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [editing, setEditing] = useState<RoutePlanItem | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState<SlotKey>('MORNING')
  const [reason, setReason] = useState('')

  const [selectedIndents, setSelectedIndents] = useState<string[]>([])
  const [routeName, setRouteName] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [routeNotes, setRouteNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['route-plan', selectedDate],
    queryFn: () => getRoutePlan(selectedDate),
    select: r => (r.data.data || []) as RoutePlanItem[],
  })

  const { data: recommendations = [] } = useQuery({
    queryKey: ['delivery-routes-optimized', selectedDate],
    queryFn: () => getOptimizedDeliveryRoutes(selectedDate),
    select: r => (r.data.data || []) as RouteOptimization[],
  })

  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['delivery-routes', selectedDate],
    queryFn: () => getDeliveryRoutes(selectedDate),
    select: r => (r.data.data || []) as DeliveryRouteItem[],
  })

  const assignedIndentIds = useMemo(() => {
    const ids = new Set<string>()
    ;(routes || []).forEach(route => {
      route.indents.forEach(indent => ids.add(indent.indentId))
    })
    return ids
  }, [routes])

  const groups = useMemo(() => {
    const bucket: Record<string, RoutePlanItem[]> = { MORNING: [], AFTERNOON: [], EVENING: [] }
    ;(data || []).forEach(item => {
      const key = (item.promisedSlot || item.requestedSlot || 'MORNING') as SlotKey
      if (!bucket[key]) bucket[key] = []
      bucket[key].push(item)
    })
    return bucket
  }, [data])

  const selectableGroups = useMemo(() => {
    const bucket: Record<string, RoutePlanItem[]> = { MORNING: [], AFTERNOON: [], EVENING: [] }
    SLOT_ORDER.forEach(slot => {
      bucket[slot] = (groups[slot] || []).filter(item => !assignedIndentIds.has(item.id))
    })
    return bucket
  }, [assignedIndentIds, groups])

  const totals = useMemo(() => {
    const out: Record<string, { orders: number; items: number; assigned: number }> = {}
    SLOT_ORDER.forEach(slot => {
      out[slot] = {
        orders: groups[slot]?.length || 0,
        items: (groups[slot] || []).reduce((sum, row) => sum + (row.itemCount || 0), 0),
        assigned: (groups[slot] || []).filter(row => assignedIndentIds.has(row.id)).length,
      }
    })
    return out
  }, [assignedIndentIds, groups])

  const selectedOrders = useMemo(() => {
    const lookup = new Map((data || []).map(item => [item.id, item]))
    return selectedIndents
      .map(id => lookup.get(id))
      .filter(Boolean) as RoutePlanItem[]
  }, [data, selectedIndents])

  const selectedSlot = useMemo(() => {
    if (selectedOrders.length === 0) return null
    const slots = new Set(selectedOrders.map(order => order.promisedSlot || order.requestedSlot || 'MORNING'))
    return slots.size === 1 ? (Array.from(slots)[0] as SlotKey) : null
  }, [selectedOrders])

  const createDisabled =
    selectedOrders.length === 0 ||
    !selectedSlot ||
    !routeName.trim() ||
    !driverName.trim() ||
    !vehicleNumber.trim()

  const reschedule = useMutation({
    mutationFn: () => rescheduleIndent(editing!.id, { scheduledDate: newDate, deliverySlot: newSlot, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-plan'] })
      qc.invalidateQueries({ queryKey: ['wh-orders'] })
      qc.invalidateQueries({ queryKey: ['delivery-routes'] })
      setEditing(null)
      setReason('')
    },
  })

  const createRouteMutation = useMutation({
    mutationFn: () =>
      createDeliveryRoute({
        routeDate: selectedDate,
        deliverySlot: selectedSlot,
        routeName,
        driverName,
        driverPhone: driverPhone || null,
        vehicleNumber,
        vehicleType: vehicleType || null,
        notes: routeNotes || null,
        indentIds: selectedIndents,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-plan'] })
      qc.invalidateQueries({ queryKey: ['delivery-routes'] })
      setSelectedIndents([])
      setRouteName('')
      setDriverName('')
      setDriverPhone('')
      setVehicleNumber('')
      setVehicleType('')
      setRouteNotes('')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateDeliveryRouteStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-routes'] })
    },
  })

  const toggleIndent = (indentId: string) => {
    setSelectedIndents(current =>
      current.includes(indentId) ? current.filter(id => id !== indentId) : [...current, indentId]
    )
  }

  const applyRecommendation = (recommendation: RouteOptimization) => {
    setSelectedIndents(recommendation.indents.map(indent => indent.indentId))
    setRouteName(recommendation.suggestedRouteName)
    setVehicleType(recommendation.suggestedVehicleType)
    setRouteNotes(`Optimized load ${recommendation.estimatedLoadKg}kg / capacity ${recommendation.suggestedVehicleCapacityKg}kg`)
  }

  return (
    <div style={{ maxWidth: 1240, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Route Planner</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Balance scheduled branch deliveries, assign drivers, and move runs from plan to completion.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={16} style={{ color: '#6366f1' }} />
          <input
            type="date"
            value={selectedDate}
            onChange={e => {
              setSelectedDate(e.target.value)
              setSelectedIndents([])
            }}
            style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {SLOT_ORDER.map(slot => (
          <div key={slot} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{slot}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{totals[slot]?.orders || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{totals[slot]?.items || 0} items scheduled</div>
            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 6 }}>{totals[slot]?.assigned || 0} already routed</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} style={{ color: '#6366f1' }} /> Route Optimization</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Suggested clusters by slot, estimated load, and smallest recommended vehicle fit.</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{recommendations.length} suggestions</div>
            </div>
            {recommendations.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>No route recommendations available for this date.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {recommendations.map(recommendation => {
                  const utilization = recommendation.suggestedVehicleCapacityKg > 0
                    ? Math.round((recommendation.estimatedLoadKg / recommendation.suggestedVehicleCapacityKg) * 100)
                    : 0
                  return (
                    <div key={recommendation.recommendationId} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)', display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text)' }}>{recommendation.suggestedRouteName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{recommendation.deliverySlot} • {recommendation.estimatedStops} stops • {recommendation.branches.join(', ')}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 999, background: '#6366f118', color: '#6366f1', fontWeight: 800 }}>{recommendation.suggestedVehicleType}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                        <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}><div style={{ fontSize: 10, color: 'var(--muted)' }}>Load</div><div style={{ marginTop: 4, fontWeight: 800, color: 'var(--text)' }}>{recommendation.estimatedLoadKg} kg</div></div>
                        <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}><div style={{ fontSize: 10, color: 'var(--muted)' }}>Capacity</div><div style={{ marginTop: 4, fontWeight: 800, color: 'var(--text)' }}>{recommendation.suggestedVehicleCapacityKg} kg</div></div>
                        <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}><div style={{ fontSize: 10, color: 'var(--muted)' }}>Use</div><div style={{ marginTop: 4, fontWeight: 800, color: utilization > 90 ? '#f59e0b' : 'var(--text)' }}>{utilization}%</div></div>
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {recommendation.indents.map(indent => (
                          <div key={indent.indentId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--text)' }}>
                            <span>{indent.indentNumber} • {indent.branchName}</span>
                            <span style={{ color: 'var(--muted)' }}>{indent.estimatedLoadKg} kg</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => applyRecommendation(recommendation)} style={{ padding: '9px 12px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                        Use Recommendation
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, color: 'var(--text)' }}>Scheduled Stops</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select same-slot orders to build a dispatch run.</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedIndents.length} selected</div>
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={22} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {SLOT_ORDER.map(slot => (
                  <div key={slot} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>{slot}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{groups[slot]?.length || 0} orders</div>
                    </div>
                    {(groups[slot] || []).length === 0 ? (
                      <div style={{ padding: 18, color: 'var(--muted)', fontSize: 12 }}>No deliveries planned for this slot.</div>
                    ) : (
                      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
                        {(groups[slot] || []).map(row => {
                          const assigned = assignedIndentIds.has(row.id)
                          const selected = selectedIndents.includes(row.id)
                          return (
                            <div key={row.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: selected ? '#6366f10d' : 'var(--card)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#6366f1', fontFamily: 'monospace', fontSize: 12 }}>{row.indentNumber}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{row.branchName}</div>
                                </div>
                                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#6366f118', color: '#6366f1', height: 'fit-content' }}>{row.status}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{row.itemCount} items • Created {fmtDate(row.createdAt)}</div>
                              {row.cutoffApplied && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Cutoff rule applied</div>}
                              {assigned && <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Already attached to a delivery route</div>}
                              {row.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{row.notes}</div>}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                                <button
                                  onClick={() => toggleIndent(row.id)}
                                  disabled={assigned}
                                  style={{ padding: '8px 10px', borderRadius: 10, background: selected ? '#6366f1' : 'none', border: selected ? 'none' : '1px solid var(--border)', color: selected ? '#fff' : 'var(--text)', cursor: assigned ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, opacity: assigned ? 0.55 : 1 }}
                                >
                                  {selected ? 'Selected' : 'Select'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditing(row)
                                    setNewDate(row.scheduledDate)
                                    setNewSlot((row.promisedSlot || row.requestedSlot || 'MORNING') as SlotKey)
                                    setReason('')
                                  }}
                                  style={{ borderRadius: 10, background: 'none', border: '1px solid var(--border)', color: 'var(--text)', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                >
                                  <Shuffle size={13} /> Reschedule
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 900, color: 'var(--text)' }}>Assigned Routes</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Driver, vehicle, and stop sequence for {fmtDate(selectedDate)}.</div>
              </div>
              <Route size={18} style={{ color: '#6366f1' }} />
            </div>

            {routesLoading ? (
              <div style={{ padding: 30, textAlign: 'center' }}><Loader2 size={22} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
            ) : (routes || []).length === 0 ? (
              <div style={{ padding: 18, color: 'var(--muted)', fontSize: 12 }}>No delivery routes created for this date yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {(routes || []).map(route => (
                  <div key={route.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, color: 'var(--text)' }}>{route.routeName}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{route.deliverySlot} • {route.driverName} • {route.vehicleNumber}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '4px 9px', borderRadius: 999, background: '#6366f118', color: '#6366f1' }}>{route.routeStatus}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                      <div>Driver phone: {route.driverPhone || '-'}</div>
                      <div>Vehicle type: {route.vehicleType || '-'}</div>
                      <div>Assigned by: {route.assignedByName || '-'}</div>
                      <div>Stops: {route.indents.length}</div>
                      <div>Dispatched: {fmtDateTime(route.dispatchedAt)}</div>
                      <div>Completed: {fmtDateTime(route.completedAt)}</div>
                    </div>
                    {route.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{route.notes}</div>}
                    <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                      {route.indents.map(stop => (
                        <div key={stop.indentId} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--text)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                          <span>{stop.stopOrder}. {stop.branchName}</span>
                          <span style={{ color: 'var(--muted)' }}>{stop.indentNumber} • {stop.itemCount} items</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {route.routeStatus === 'PLANNED' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: route.id, status: 'DISPATCHED' })}
                          disabled={statusMutation.isPending}
                          style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                        >
                          <TruckIcon size={14} /> Dispatch Route
                        </button>
                      )}
                      {route.routeStatus === 'DISPATCHED' && (
                        <button
                          onClick={() => statusMutation.mutate({ id: route.id, status: 'COMPLETED' })}
                          disabled={statusMutation.isPending}
                          style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                        >
                          <CheckCircle2 size={14} /> Complete Route
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 14, position: 'sticky', top: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900, color: 'var(--text)' }}>Create Delivery Route</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Assign a driver and vehicle to the selected branch stops.</div>
            </div>
            <Truck size={18} style={{ color: '#6366f1' }} />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Selected slot</div>
              <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{selectedSlot || 'Select same-slot orders'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{selectedOrders.length} stops selected for {fmtDate(selectedDate)}</div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Route Name</label>
              <input value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Anna Nagar Morning Run" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Driver Name</label>
              <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Murugan" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Driver Phone</label>
                <input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="9876543210" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Vehicle Number</label>
                <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} placeholder="TN 10 AB 1234" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Vehicle Type</label>
              <input value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="Mini truck / Van" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Route Notes</label>
              <textarea value={routeNotes} onChange={e => setRouteNotes(e.target.value)} rows={3} placeholder="Special loading or delivery instructions" style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} />
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Selected stops</div>
              {selectedOrders.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Choose orders from the schedule board to build a route.</div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {selectedOrders.map((order, index) => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--text)' }}>
                      <span>{index + 1}. {order.branchName}</span>
                      <span style={{ color: 'var(--muted)' }}>{order.indentNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!selectedSlot && selectedOrders.length > 0 && (
              <div style={{ fontSize: 11, color: '#f59e0b' }}>Only orders from the same delivery slot can be grouped into one route.</div>
            )}

            <button
              onClick={() => createRouteMutation.mutate()}
              disabled={createDisabled || createRouteMutation.isPending}
              style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: createDisabled ? 'not-allowed' : 'pointer', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: createDisabled ? 0.6 : 1 }}
            >
              {createRouteMutation.isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Route size={15} />}
              Create Route Assignment
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 70 }}>
          <div style={{ width: '100%', maxWidth: 460, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>Reschedule {editing.indentNumber}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{editing.branchName}</div>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>New Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>New Slot</label>
                <select value={newSlot} onChange={e => setNewSlot(e.target.value as SlotKey)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="EVENING">Evening</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Reason</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'none' }} placeholder="Why is this order being moved?" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(null)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => reschedule.mutate()}
                  disabled={!newDate || !reason.trim() || reschedule.isPending}
                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700 }}
                >
                  {reschedule.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={14} />}
                  Save Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

