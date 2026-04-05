import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getItems, getCategories, createIndent, getTemplates, useTemplate, saveTemplate, getBranchList, getBranchSlotAvailability } from '../../api'
import { useAuth } from '../../store/auth'
import { Search, Plus, Minus, Trash2, ShoppingCart, BookmarkPlus, Check, Loader2 } from 'lucide-react'

interface CartItem { itemId:string; itemName:string; unit:string; category:string; quantity:number }

export default function RestaurantOrders() {
  const { effectiveUser } = useAuth()
  const user = effectiveUser()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number|undefined>()
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [requestedDeliverySlot, setRequestedDeliverySlot] = useState('MORNING')
  const [submitted, setSubmitted] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)

  const { data: categories } = useQuery({ queryKey:['cats'], queryFn:getCategories, select:r=>r.data.data })
  const { data: branches } = useQuery({ queryKey:['branches'], queryFn:getBranchList, select:r=>r.data.data || [] })
  const { data: items } = useQuery({
    queryKey:['items',search,categoryId], enabled: search.length>1 || !!categoryId,
    queryFn:()=>getItems({search,categoryId,size:20}), select:r=>r.data.data?.content||[]
  })
  const { data: templates } = useQuery({ queryKey:['tmpl',user?.branchId], queryFn:()=>getTemplates(user?.branchId), select:r=>r.data.data||[] })

  const branch = (branches || []).find((row:any) => row.id === user?.branchId)
  const cutoff = branch?.orderCutoffTime || '17:00:00'
  const leadDays = branch?.orderLeadDays ?? 1
  const now = new Date()
  const [cutoffHour, cutoffMinute] = String(cutoff).split(':').map((part:string) => Number(part))
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffHour || 17, cutoffMinute || 0, 0, 0)
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + leadDays + (now >= cutoffDate ? 1 : 0))
  const minDateValue = minDate.toISOString().split('T')[0]
  const selectedDate = expectedDate || minDateValue
  const { data: slotAvailability } = useQuery({
    queryKey:['slot-availability', user?.branchId, selectedDate],
    enabled: !!user?.branchId && !!selectedDate,
    queryFn:()=>getBranchSlotAvailability(user!.branchId!, selectedDate),
    select:r=>r.data.data || {}
  })
  const slotInfo = slotAvailability?.[requestedDeliverySlot]
  const slotFull = slotInfo ? !slotInfo.available : false

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const createOrder = useMutation({
    mutationFn: () => createIndent({
      branchId: user?.branchId, notes, expectedDate: expectedDate||undefined, requestedDeliverySlot,
      items: cart.map(c=>({itemId:c.itemId, quantity:c.quantity}))
    }),
    onSuccess: () => {
      setSubmitted(true)
      setCart([])
      setNotes('')
      setExpectedDate('')
      setRequestedDeliverySlot(branch?.defaultDeliverySlot || 'MORNING')
      qc.invalidateQueries({queryKey:['myorders']})
      qc.invalidateQueries({queryKey:['tmpl', user?.branchId]})
    }
  })

  const saveOrderTemplate = useMutation({
    mutationFn: () => saveTemplate({
      branchId: user?.branchId,
      name: templateName.trim(),
      items: cart.map(c => ({
        itemId: c.itemId,
        itemName: c.itemName,
        unit: c.unit,
        quantity: c.quantity,
      })),
    }),
    onSuccess: () => {
      setSavingTemplate(false)
      setTemplateName('')
      qc.invalidateQueries({ queryKey:['tmpl', user?.branchId] })
    },
  })

  const loadTemplate = useMutation({
    mutationFn: (id:string) => useTemplate(id, user?.branchId),
    onSuccess: (res) => {
      const tmpl = res.data?.data
      if (tmpl?.items) {
        const newItems = (tmpl.items as any[]).map((i:any)=>({ itemId:i.itemId, itemName:i.itemName, unit:i.unit, category:i.category||'', quantity:i.quantity }))
        setCart(newItems); setShowTemplates(false)
      }
    }
  })

  const addToCart = (item:any) => {
    setCart(prev => {
      const e = prev.find(c=>c.itemId===item.id)
      if (e) return prev.map(c=>c.itemId===item.id?{...c,quantity:c.quantity+1}:c)
      return [...prev, { itemId:item.id, itemName:item.name, unit:item.unit, category:item.category||'', quantity:1 }]
    })
  }

  const updateQty = (id:string, delta:number) => {
    setCart(prev=>prev.map(c=>c.itemId===id?{...c,quantity:Math.max(0.5,parseFloat((c.quantity+delta).toFixed(1)))}:c))
  }

  const removeItem = (id:string) => setCart(prev=>prev.filter(c=>c.itemId!==id))

  if (submitted) return (
    <div style={{ maxWidth:500, margin:'80px auto', textAlign:'center' }}>
      <div style={{ fontSize:60, marginBottom:16 }}>Order submitted</div>
      <h2 style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:8 }}>Order Submitted!</h2>
      <p style={{ color:'var(--muted)', marginBottom:24 }}>Your indent has been sent to the warehouse for approval.</p>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <button onClick={()=>setSubmitted(false)} style={{ padding:'10px 20px', borderRadius:12, background:'#6366f1', border:'none', color:'#fff', fontWeight:700, cursor:'pointer' }}>
          Place Another Order
        </button>
        <a href="/history" style={{ padding:'10px 20px', borderRadius:12, background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center' }}>
          View Orders
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 340px', gap:20, maxWidth:1200 }}>
      <div>
        <div style={{ display:'flex', alignItems:isMobile ? 'flex-start' : 'center', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Place Order</h1>
            <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Search and add items to your cart</p>
          </div>
          <button onClick={()=>setShowTemplates(!showTemplates)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
            borderRadius:10, border:'1px solid var(--border)', background:'var(--card)',
            color:'var(--text)', fontSize:12, cursor:'pointer', fontWeight:600
          }}>
            <BookmarkPlus size={14}/> Templates {templates?.length > 0 && `(${templates.length})`}
          </button>
        </div>

        {branch && (
          <div style={{ background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.18)', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:12, color:'var(--muted)' }}>
            <strong style={{ color:'#6366f1' }}>{branch.name}</strong> cutoff is {String(cutoff).slice(0,5)}.
            Earliest delivery after this cutoff is <strong style={{ color:'var(--text)' }}>{minDate.toLocaleDateString('en-IN')}</strong>.
            Default slot: <strong style={{ color:'var(--text)' }}>{branch.defaultDeliverySlot || 'MORNING'}</strong>.
          </div>
        )}

        {showTemplates && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Saved Templates</div>
            {(!templates||templates.length===0) ? (
              <div style={{ color:'var(--muted)', fontSize:12 }}>No templates yet. Save your cart as a template below.</div>
            ) : templates.map((t:any)=>(
              <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{t.items?.length} items - Used {t.useCount}x</div>
                </div>
                <button onClick={()=>loadTemplate.mutate(t.id)} disabled={loadTemplate.isPending}
                  style={{ padding:'5px 12px', borderRadius:8, background:'#6366f1', border:'none', color:'#fff', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                  {loadTemplate.isPending?'Loading...':'Load'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:isMobile ? '100%' : 220 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search items... (e.g. oil, rice, paneer)"
              style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <select value={categoryId||''} onChange={e=>setCategoryId(e.target.value?Number(e.target.value):undefined)}
            style={{ padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', width:isMobile ? '100%' : 'auto' }}>
            <option value="">All Categories</option>
            {(categories||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {(items||[]).length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:isMobile ? 'repeat(auto-fill,minmax(145px,1fr))' : 'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
            {(items||[]).map((item:any)=>{
              const inCart = cart.find(c=>c.itemId===item.id)
              return (
                <div key={item.id} onClick={()=>addToCart(item)}
                  style={{ padding:12, borderRadius:12, background:'var(--card)', border:`1px solid ${inCart?'#6366f1':'var(--border)'}`,
                    cursor:'pointer', transition:'border-color .15s', position:'relative' }}>
                  {inCart && (
                    <div style={{ position:'absolute', top:8, right:8, width:20, height:20, borderRadius:'50%',
                      background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Check size={11} style={{color:'#fff'}}/>
                    </div>
                  )}
                  <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4 }}>{item.category}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.3, marginBottom:4 }}>{item.name}</div>
                  <div style={{ fontSize:11, color:'#6366f1', fontWeight:700 }}>{item.unit}</div>
                  {inCart && <div style={{ fontSize:11, color:'#22c55e', marginTop:4, fontWeight:700 }}>Added: {inCart.quantity}</div>}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding:40, textAlign:'center', color:'var(--muted)', background:'var(--card)', border:'1px solid var(--border)', borderRadius:14 }}>
            {search.length > 1 ? 'No items found' : 'Search for items above to add to your order'}
          </div>
        )}
      </div>

      <div style={{ position:isMobile ? 'static' : 'sticky', top:isMobile ? undefined : 0 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={16} style={{color:'#6366f1'}}/>
            <span style={{ fontWeight:700, color:'var(--text)', fontSize:14 }}>Cart</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'var(--muted)' }}>{cart.length} items</span>
          </div>

          {cart.length === 0 ? (
            <div style={{ padding:30, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              <ShoppingCart size={32} style={{ margin:'0 auto 8px', opacity:.3, display:'block' }}/>
              Add items from the left panel
            </div>
          ) : (
            <div style={{ maxHeight:isMobile ? 260 : 340, overflowY:'auto' }}>
              {cart.map(item=>(
                <div key={item.itemId} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.itemName}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>{item.unit}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <button onClick={()=>updateQty(item.itemId,-0.5)} style={{ width:22,height:22,borderRadius:6,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Minus size={10}/>
                    </button>
                    <span style={{ width:32, textAlign:'center', fontSize:12, fontWeight:700, color:'var(--text)' }}>{item.quantity}</span>
                    <button onClick={()=>updateQty(item.itemId,0.5)} style={{ width:22,height:22,borderRadius:6,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Plus size={10}/>
                    </button>
                  </div>
                  <button onClick={()=>removeItem(item.itemId)} style={{ background:'none',border:'none',cursor:'pointer',color:'#ef4444',padding:2 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div style={{ padding:14, borderTop:'1px solid var(--border)' }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:4 }}>Expected Delivery Date</label>
                <input type="date" value={expectedDate} onChange={e=>setExpectedDate(e.target.value)}
                  min={minDateValue}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:4 }}>Delivery Slot</label>
                <select value={requestedDeliverySlot} onChange={e=>setRequestedDeliverySlot(e.target.value)}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', boxSizing:'border-box' }}>
                  <option value="MORNING" disabled={slotAvailability?.MORNING && !slotAvailability.MORNING.available}>Morning</option>
                  <option value="AFTERNOON" disabled={slotAvailability?.AFTERNOON && !slotAvailability.AFTERNOON.available}>Afternoon</option>
                  <option value="EVENING" disabled={slotAvailability?.EVENING && !slotAvailability.EVENING.available}>Evening</option>
                </select>
              </div>
              {slotAvailability && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Slot capacity for {new Date(selectedDate).toLocaleDateString('en-IN')}</div>
                  <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(3, 1fr)', gap:6 }}>
                    {(['MORNING','AFTERNOON','EVENING'] as const).map(slot => {
                      const info = slotAvailability?.[slot]
                      const active = requestedDeliverySlot === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => info?.available && setRequestedDeliverySlot(slot)}
                          disabled={!info?.available}
                          style={{
                            padding:'8px 6px',
                            borderRadius:10,
                            border:`1px solid ${active ? '#6366f1' : 'var(--border)'}`,
                            background: active ? '#6366f118' : 'var(--surface)',
                            color: info?.available ? 'var(--text)' : '#ef4444',
                            cursor: info?.available ? 'pointer' : 'not-allowed',
                            fontSize:11
                          }}>
                          <div style={{ fontWeight:700 }}>{slot}</div>
                          <div style={{ color:'var(--muted)', marginTop:2 }}>
                            {info ? `${info.booked}/${info.capacity}` : '-'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {slotInfo && (
                    <div style={{ marginTop:6, fontSize:11, color: slotFull ? '#ef4444' : 'var(--muted)' }}>
                      {slotFull
                        ? `This slot is full on ${new Date(selectedDate).toLocaleDateString('en-IN')}. Choose another slot or date.`
                        : `${slotInfo.remaining} slot${slotInfo.remaining === 1 ? '' : 's'} remaining in ${requestedDeliverySlot.toLowerCase()}.`}
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:4 }}>Notes</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Any special instructions..."
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', resize:'none', boxSizing:'border-box' }}/>
              </div>

              <button onClick={()=>createOrder.mutate()} disabled={createOrder.isPending || slotFull}
                style={{ width:'100%', padding:11, borderRadius:12, background:'#6366f1', border:'none', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:createOrder.isPending ? 0.7 : 1 }}>
                {createOrder.isPending?<><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>Submitting...</>:<><ShoppingCart size={15}/>Submit Order</>}
              </button>

              <div style={{ marginTop:10 }}>
                {!savingTemplate ? (
                  <button onClick={()=>setSavingTemplate(true)} style={{ width:'100%', padding:'8px', borderRadius:10, background:'none', border:'1px solid var(--border)', color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <BookmarkPlus size={13}/> Save as Template
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:6 }}>
                    <input value={templateName} onChange={e=>setTemplateName(e.target.value)}
                      placeholder="Template name..." style={{ flex:1, padding:'7px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none' }}/>
                    <button
                      onClick={()=>saveOrderTemplate.mutate()}
                      disabled={!templateName.trim() || saveOrderTemplate.isPending}
                      style={{ padding:'7px 10px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', fontSize:12 }}>
                      {saveOrderTemplate.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={()=>{ setSavingTemplate(false); setTemplateName('') }} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--muted)', cursor:'pointer', fontSize:12 }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
