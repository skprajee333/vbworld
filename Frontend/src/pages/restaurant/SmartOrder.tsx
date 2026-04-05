import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReadiness, getSuggestions, getPatterns, createIndent, saveTemplate, getTemplates, useTemplate as applyTemplate, getItems } from '../../api'
import { useAuth } from '../../store/auth'
import { Sparkles, TrendingUp, TrendingDown, Minus, ShoppingCart, BookmarkPlus, Loader2, AlertCircle, Search, Trash2, X } from 'lucide-react'

// Format date without date-fns
function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}
function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d)
}

const DAY_N = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const CONF_C: Record<string, string> = { HIGH:'#22c55e', MEDIUM:'#eab308', LOW:'#94a3b8' }

export default function SmartOrder() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const qc = useQueryClient()
  const branchId = user?.branchId

  const [targetDate, setTargetDate]     = useState(tomorrow())
  const [cart, setCart]                 = useState<any[]>([])
  const [submitted, setSubmitted]       = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState<'smart'|'browse'|'templates'>('smart')
  const [notes, setNotes]               = useState('')

  const { data: readiness } = useQuery({
    queryKey: ['readiness', branchId],
    queryFn: () => getReadiness(branchId),
    select: r => r.data.data
  })

  const { data: suggestions, isLoading: suggLoading } = useQuery({
    queryKey: ['suggestions', branchId, targetDate],
    enabled: readiness?.ready === true,
    queryFn: () => getSuggestions(branchId, targetDate),
    select: r => r.data.data
  })

  const { data: patterns } = useQuery({
    queryKey: ['patterns', branchId],
    queryFn: () => getPatterns(branchId),
    select: r => r.data.data || []
  })

  const { data: searchItems } = useQuery({
    queryKey: ['items-search', search],
    queryFn: () => getItems({ search, size: 20 }),
    select: r => r.data.data?.content || [],
    enabled: search.length > 1
  })

  const { data: templates } = useQuery({
    queryKey: ['templates', branchId],
    queryFn: () => getTemplates(branchId),
    select: r => r.data.data || []
  })

  const submitMutation = useMutation({
    mutationFn: () => createIndent({
      branchId, expectedDate: targetDate, notes,
      items: cart.map(c => ({ itemId: c.itemId, quantity: c.qty }))
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-indents'] })
      setCart([])
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }
  })

  const saveTemplateMutation = useMutation({
    mutationFn: () => saveTemplate({
      branchId, name: templateName,
      items: cart.map(c => ({ itemId: c.itemId, itemName: c.name, unit: c.unit, quantity: c.qty }))
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setTemplateName('')
      setShowSaveTemplate(false)
    }
  })

  const useTemplateMutation = useMutation({
    mutationFn: (id: string) => applyTemplate(id, branchId),
    onSuccess: (r) => {
      const tmpl = r.data.data
      if (tmpl?.items) {
        setCart(tmpl.items.map((i: any) => ({
          itemId: i.itemId, name: i.itemName, unit: i.unit, qty: i.quantity
        })))
      }
    }
  })

  const addToCart = (item: any, qty?: number) => {
    const id = item.itemId || item.id
    if (cart.find(c => c.itemId === id)) return
    setCart(prev => [...prev, {
      itemId: id, name: item.itemName || item.name,
      unit: item.unit, qty: qty || item.suggestedQty || 1
    }])
  }

  const updateQty = (itemId: string, delta: number) =>
    setCart(prev => prev.map(c => c.itemId === itemId
      ? { ...c, qty: Math.max(0.5, parseFloat((c.qty + delta).toFixed(1))) } : c))

  const removeFromCart = (itemId: string) =>
    setCart(prev => prev.filter(c => c.itemId !== itemId))

  const ready = readiness?.ready
  const daysLeft = readiness?.daysRemaining || 0

  const maxPat = Math.max(...(patterns || []).map((p: any) => p.orderCount || 0), 1)

  const tt = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }

  if (submitted) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:16 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <h2 style={{ color:'var(--text)', fontWeight:900 }}>Order Submitted!</h2>
      <p style={{ color:'var(--muted)' }}>Your indent is pending warehouse approval</p>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
            <Sparkles size={22} style={{ color:'#6366f1' }}/> Smart Order
          </h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>
            AI-powered suggestions based on your order patterns
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Ordering for:</label>
          <input type="date" value={targetDate}
            min={fmtDate(new Date())}
            onChange={e => setTargetDate(e.target.value)}
            style={{ padding:'7px 12px', borderRadius:10, background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none' }}/>
        </div>
      </div>

      {/* Readiness banner */}
      {!ready ? (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:40 }}>📊</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, color:'var(--text)', marginBottom:4 }}>
                Building your intelligence — {readiness?.distinctDays || 0}/7 days collected
              </div>
              <div style={{ fontSize:13, color:'var(--muted)', marginBottom:10 }}>
                Smart suggestions unlock after {daysLeft} more order day{daysLeft !== 1 ? 's' : ''}. Browse items or use templates below.
              </div>
              <div style={{ height:7, background:'var(--border)', borderRadius:4, overflow:'hidden', maxWidth:260 }}>
                <div style={{ height:'100%', borderRadius:4, background:'linear-gradient(90deg,#6366f1,#a78bfa)', width:`${((readiness?.distinctDays || 0) / 7) * 100}%`, transition:'width .5s' }}/>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ borderRadius:14, padding:'10px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10, background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1' }}/>
          <span style={{ fontSize:13, color:'var(--text)' }}>
            <strong style={{ color:'#6366f1' }}>Pattern intelligence active</strong> —
            {suggestions?.dayName && <> {suggestions.dayName} pattern ({suggestions.dayWeight}× demand).</>}
            {' '}Confidence: <strong style={{ color: CONF_C[readiness?.confidence || 'LOW'] }}>
              {readiness?.confidence} ({readiness?.confidencePct || 0}%)
            </strong>
          </span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>
        {/* Left panel */}
        <div>
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:14, background:'var(--surface)', padding:4, borderRadius:12, width:'fit-content', border:'1px solid var(--border)' }}>
            {[
              { key:'smart',     label:'🤖 Smart Suggestions' },
              { key:'browse',    label:'🔍 Browse Items' },
              { key:'templates', label:'📋 Templates' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                style={{ padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: activeTab === t.key ? '#6366f1' : 'transparent',
                  color: activeTab === t.key ? '#fff' : 'var(--muted)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* SMART tab */}
          {activeTab === 'smart' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
              {/* Day heatmap */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Your Order Pattern</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:5 }}>
                  {DAY_N.slice(1).map((day, i) => {
                    const p = (patterns || []).find((x: any) => x.dayOfWeek === i + 1)
                    const intensity = p ? p.orderCount / maxPat : 0
                    return (
                      <div key={day} style={{ textAlign:'center' }}>
                        <div style={{ fontSize:9, color:'var(--muted)', marginBottom:4, fontWeight:600 }}>{day}</div>
                        <div style={{ borderRadius:8, padding:'8px 4px', background:`rgba(99,102,241,${0.07 + intensity * 0.85})`, border:'1px solid rgba(99,102,241,.1)' }}>
                          <div style={{ fontSize:12, fontWeight:800, color: intensity > 0.5 ? '#fff' : 'var(--text)' }}>
                            {p?.orderCount || 0}
                          </div>
                        </div>
                        <div style={{ fontSize:9, marginTop:3, color: (p?.weight||0) >= 1.8 ? '#ef4444' : (p?.weight||0) >= 1.3 ? '#eab308' : 'var(--muted)', fontWeight:700 }}>
                          {p?.weight ? `${p.weight}×` : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Suggestions */}
              {!ready ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'var(--muted)' }}>
                  <Sparkles size={36} style={{ opacity:.2, marginBottom:10 }}/><br/>
                  Suggestions unlock after 7 days of orders
                </div>
              ) : suggLoading ? (
                <div style={{ textAlign:'center', padding:30 }}>
                  <Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }}/>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                      Suggested for {suggestions?.dayName} · {targetDate}
                    </div>
                    {(suggestions?.items || []).length > 0 && (
                      <button onClick={() => (suggestions?.items || []).forEach((i: any) => addToCart(i, i.suggestedQty))}
                        style={{ padding:'5px 12px', borderRadius:8, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.3)', color:'#6366f1', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        Add All
                      </button>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(suggestions?.items || []).map((item: any) => {
                      const inCart = cart.some(c => c.itemId === item.itemId)
                      const trend = item.trendPct || 0
                      return (
                        <div key={item.itemId} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', borderRadius:12,
                          border:`1px solid ${inCart ? 'rgba(99,102,241,.4)' : 'var(--border)'}`,
                          background: inCart ? 'rgba(99,102,241,.05)' : 'var(--surface)', transition:'all .15s' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{item.itemName}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                              <span style={{ fontSize:10, color:'var(--muted)' }}>{item.category}</span>
                              <span style={{ fontSize:10, display:'flex', alignItems:'center', gap:2,
                                color: trend > 5 ? '#22c55e' : trend < -5 ? '#ef4444' : 'var(--muted)' }}>
                                {trend > 5 ? <TrendingUp size={9}/> : trend < -5 ? <TrendingDown size={9}/> : <Minus size={9}/>}
                                {Math.abs(trend).toFixed(0)}%
                              </span>
                              <span style={{ fontSize:9, padding:'1px 6px', borderRadius:8, fontWeight:700,
                                background:`${CONF_C[item.confidence]}18`, color: CONF_C[item.confidence] }}>
                                {item.confidencePct}%
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:16, fontWeight:900, color:'#6366f1' }}>{item.suggestedQty}</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{item.unit}</div>
                          </div>
                          <button onClick={() => inCart ? removeFromCart(item.itemId) : addToCart(item, item.suggestedQty)}
                            style={{ width:32, height:32, borderRadius:9, border:'none', cursor:'pointer',
                              background: inCart ? 'rgba(239,68,68,.12)' : '#6366f1',
                              color: inCart ? '#ef4444' : '#fff', fontSize:16, fontWeight:900, flexShrink:0 }}>
                            {inCart ? '✓' : '+'}
                          </button>
                        </div>
                      )
                    })}
                    {(suggestions?.items || []).length === 0 && (
                      <div style={{ textAlign:'center', padding:'20px 0', color:'var(--muted)', fontSize:13 }}>
                        No suggestions for this date yet
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* BROWSE tab */}
          {activeTab === 'browse' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
              <div style={{ position:'relative', marginBottom:14 }}>
                <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search items — oil, dal, paneer, masala..."
                  style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
              </div>
              {search.length > 1 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {(searchItems || []).length === 0 ? (
                    <div style={{ textAlign:'center', color:'var(--muted)', padding:20, fontSize:13 }}>No items found</div>
                  ) : (
                    (searchItems || []).map((item: any) => {
                      const inCart = cart.some(c => c.itemId === item.id)
                      return (
                        <div key={item.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 13px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{item.name}</div>
                            <div style={{ fontSize:11, color:'var(--muted)' }}>{item.category?.name || ''} · {item.unit}</div>
                          </div>
                          <button onClick={() => addToCart({ itemId: item.id, name: item.name, unit: item.unit }, 1)}
                            disabled={inCart}
                            style={{ padding:'5px 14px', borderRadius:8, border:'none', cursor: inCart ? 'default' : 'pointer', fontSize:12, fontWeight:700,
                              background: inCart ? 'var(--border)' : '#6366f1', color: inCart ? 'var(--muted)' : '#fff' }}>
                            {inCart ? '✓ Added' : '+ Add'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              ) : (
                <div style={{ textAlign:'center', color:'var(--muted)', padding:'30px 0', fontSize:13 }}>
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          )}

          {/* TEMPLATES tab */}
          {activeTab === 'templates' && (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
              {(templates || []).length === 0 ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'var(--muted)' }}>
                  <BookmarkPlus size={36} style={{ opacity:.2, marginBottom:10 }}/>
                  <p style={{ fontSize:13 }}>No saved templates yet</p>
                  <p style={{ fontSize:11, marginTop:4 }}>Build a cart below and save it as a template</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(templates || []).map((t: any) => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--surface)' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{t.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                          {t.items?.length || 0} items · Used {t.useCount || 0}×
                        </div>
                      </div>
                      <button onClick={() => useTemplateMutation.mutate(t.id)}
                        disabled={useTemplateMutation.isPending}
                        style={{ padding:'6px 14px', borderRadius:8, background:'#6366f1', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                        Load Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart */}
        <div style={{ position:'sticky', top:0 }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <ShoppingCart size={15} style={{ color:'#6366f1' }}/>
                <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Cart</span>
              </div>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:'rgba(99,102,241,.1)', color:'#6366f1', fontWeight:700 }}>
                {cart.length} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--muted)', padding:'22px 0' }}>
                <ShoppingCart size={26} style={{ opacity:.2, marginBottom:6 }}/>
                <p style={{ fontSize:12 }}>Cart is empty</p>
                <p style={{ fontSize:11, marginTop:3 }}>Add suggestions or browse</p>
              </div>
            ) : (
              <div style={{ maxHeight:260, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {cart.map(item => (
                  <div key={item.itemId} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 9px', borderRadius:9, background:'var(--surface)', border:'1px solid var(--border)' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{item.unit}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                      <button onClick={() => updateQty(item.itemId, -0.5)} style={{ width:20, height:20, borderRadius:5, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', minWidth:26, textAlign:'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.itemId, 0.5)} style={{ width:20, height:20, borderRadius:5, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.itemId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', display:'flex', flexShrink:0 }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div style={{ marginTop:12 }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', resize:'none', boxSizing:'border-box', marginBottom:8 }}/>

                <button onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  style={{ width:'100%', padding:11, borderRadius:11, border:'none', background:'#6366f1', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity: submitMutation.isPending ? 0.7 : 1, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  {submitMutation.isPending ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> Submitting...</> : <><ShoppingCart size={13}/> Submit Order</>}
                </button>

                <div>
                  {!showSaveTemplate ? (
                    <button onClick={() => setShowSaveTemplate(true)}
                      style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px dashed var(--border)', background:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <BookmarkPlus size={13}/> Save as Template
                    </button>
                  ) : (
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                        placeholder="Template name..."
                        style={{ flex:1, padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none' }}/>
                      <button onClick={() => saveTemplateMutation.mutate()}
                        disabled={!templateName.trim()}
                        style={{ padding:'7px 12px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        Save
                      </button>
                      <button onClick={() => setShowSaveTemplate(false)}
                        style={{ padding:'7px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--muted)', cursor:'pointer' }}>
                        <X size={12}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
