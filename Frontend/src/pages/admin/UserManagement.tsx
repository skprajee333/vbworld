import { useState, useEffect } from 'react'
import { getAllUsers, getPendingUsers, approveUser, rejectUser, createUser, getBranchList } from '../../api'
import { UserCheck, UserX, Users, UserPlus, Search, Shield, Warehouse, Store, ShieldCheck } from 'lucide-react'

type Tab = 'pending' | 'all' | 'create'

const ROLE_C: any = {
  ADMIN:             '#a78bfa',
  WAREHOUSE_ADMIN:   '#f97316',
  WAREHOUSE_MANAGER: '#06b6d4',
  RESTAURANT_STAFF:  '#22c55e'
}
const ROLE_LABEL: any = {
  ADMIN:             'Admin',
  WAREHOUSE_ADMIN:   'Warehouse Admin',
  WAREHOUSE_MANAGER: 'Warehouse',
  RESTAURANT_STAFF:  'Restaurant'
}
const ROLE_ICON: any = {
  ADMIN:             Shield,
  WAREHOUSE_ADMIN:   ShieldCheck,
  WAREHOUSE_MANAGER: Warehouse,
  RESTAURANT_STAFF:  Store
}
const STATUS_S: any = {
  PENDING:  { bg:'rgba(234,179,8,.12)',  color:'#eab308' },
  APPROVED: { bg:'rgba(34,197,94,.12)',  color:'#22c55e' },
  REJECTED: { bg:'rgba(239,68,68,.12)',  color:'#ef4444' },
}

export default function UserManagement() {
  const [tab, setTab]         = useState<Tab>('pending')
  const [users, setUsers]     = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string|null>(null)
  const [search, setSearch]   = useState('')
  const [form, setForm]       = useState({ name:'', email:'', phone:'', password:'', role:'RESTAURANT_STAFF', branchId:'' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg]         = useState({ text:'', ok:true })

  const load = async () => {
    setLoading(true)
    try {
      const res = tab === 'pending' ? await getPendingUsers() : await getAllUsers()
      setUsers(res.data?.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])
  useEffect(() => {
    getBranchList().then(r => setBranches(r.data?.data || [])).catch(() => {})
  }, [])

  const handleApprove = async (id: string) => {
    setActionId(id)
    try { await approveUser(id); load() } catch {}
    setActionId(null)
  }

  const handleReject = async (id: string) => {
    if (!confirm('Reject this user?')) return
    setActionId(id)
    try { await rejectUser(id); load() } catch {}
    setActionId(null)
  }

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setMsg({ text:'Fill all required fields', ok:false }); return
    }
    if (form.password.length < 8) {
      setMsg({ text:'Password must be at least 8 characters', ok:false }); return
    }
    setCreating(true); setMsg({ text:'', ok:true })
    try {
      await createUser({ ...form, branchId: form.branchId || undefined })
      setMsg({ text:'User created successfully!', ok:true })
      setForm({ name:'', email:'', phone:'', password:'', role:'RESTAURANT_STAFF', branchId:'' })
      load()
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.message || 'Failed to create user', ok:false })
    }
    setCreating(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const filtered = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.branchName?.toLowerCase().includes(s)
  })

  const pendingCount = users.filter(u => u.status === 'PENDING').length

  const tabs: { key:Tab; label:string; count?:number }[] = [
    { key:'pending', label:'⏳ Pending',  count: tab === 'pending' ? users.length : pendingCount },
    { key:'all',     label:'👥 All Users', count: tab === 'all' ? users.length : undefined },
    { key:'create',  label:'➕ Create User' },
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'var(--text)', margin:0 }}>User Management</h1>
          <p style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>Approve registrations and manage user access</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:18, background:'var(--surface)', padding:4, borderRadius:12, width:'fit-content', border:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              background: tab === t.key ? '#6366f1' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--muted)' }}>
            {t.label}
            {t.count != null && t.count > 0 && (
              <span style={{ background: tab === t.key ? 'rgba(255,255,255,.25)' : 'rgba(99,102,241,.2)', color: tab === t.key ? '#fff' : '#6366f1', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:800 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {tab !== 'create' && (
        <div style={{ position:'relative', maxWidth:360, marginBottom:16 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or branch..."
            style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const }}/>
        </div>
      )}

      {/* PENDING / ALL tab */}
      {tab !== 'create' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'var(--muted)' }}>
              <Users size={36} style={{ opacity:.2, margin:'0 auto 12px', display:'block' }}/>
              <p style={{ fontSize:13 }}>{tab === 'pending' ? '✅ No pending approvals' : 'No users found'}</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
                    {['User','Role','Branch','Status','Registered','Actions'].map(h => (
                      <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const rc   = ROLE_C[u.role] || '#94a3b8'
                    const ss   = STATUS_S[u.status] || {}
                    const init = u.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() || '?'
                    const busy = actionId === u.id
                    const RoleIcon = ROLE_ICON[u.role] || Users
                    return (
                      <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${rc},#a78bfa)`,
                              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0 }}>
                              {init}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, color:'var(--text)' }}>{u.name}</div>
                              <div style={{ fontSize:11, color:'var(--muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:rc }}>
                            <RoleIcon size={11}/> {ROLE_LABEL[u.role] || u.role}
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:12, color:'var(--muted)' }}>{u.branchName || '—'}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700, background:ss.bg, color:ss.color }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {u.status === 'PENDING' && (
                              <>
                                <button disabled={busy} onClick={() => handleApprove(u.id)}
                                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 11px', borderRadius:8, border:'none', cursor:'pointer',
                                    background:'rgba(34,197,94,.15)', color:'#22c55e', fontSize:12, fontWeight:700, opacity:busy?.6:1 }}>
                                  <UserCheck size={11}/> Approve
                                </button>
                                <button disabled={busy} onClick={() => handleReject(u.id)}
                                  style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 11px', borderRadius:8, border:'none', cursor:'pointer',
                                    background:'rgba(239,68,68,.15)', color:'#ef4444', fontSize:12, fontWeight:700, opacity:busy?.6:1 }}>
                                  <UserX size={11}/> Reject
                                </button>
                              </>
                            )}
                            {u.status === 'APPROVED' && (
                              <button disabled={busy} onClick={() => handleReject(u.id)}
                                style={{ padding:'5px 11px', borderRadius:8, border:'1px solid var(--border)', cursor:'pointer',
                                  background:'none', color:'var(--muted)', fontSize:12 }}>
                                Deactivate
                              </button>
                            )}
                            {u.status === 'REJECTED' && (
                              <button disabled={busy} onClick={() => handleApprove(u.id)}
                                style={{ padding:'5px 11px', borderRadius:8, border:'1px solid #6366f1', cursor:'pointer',
                                  background:'none', color:'#6366f1', fontSize:12, fontWeight:700 }}>
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE tab */}
      {tab === 'create' && (
        <div style={{ maxWidth:480 }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
            <h3 style={{ fontWeight:800, color:'var(--text)', fontSize:16, marginBottom:4 }}>Create User Directly</h3>
            <p style={{ color:'var(--muted)', fontSize:13, marginBottom:20 }}>
              Users created here are <strong>auto-approved</strong> and can login immediately.
            </p>

            {msg.text && (
              <div style={{ padding:'10px 12px', borderRadius:10, marginBottom:14, fontSize:13,
                background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
                color: msg.ok ? '#22c55e' : '#ef4444' }}>
                {msg.text}
              </div>
            )}

            {([
              { k:'name',     label:'Full Name *',  type:'text',     ph:'Ravi Kumar' },
              { k:'email',    label:'Email *',       type:'email',    ph:'ravi@vbworld.in' },
              { k:'phone',    label:'Phone',         type:'tel',      ph:'+91 98765 43210' },
              { k:'password', label:'Password *',    type:'password', ph:'Min 8 characters' },
            ] as any[]).map(({ k, label, type, ph }) => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:600 }}>{label}</label>
                <input type={type} placeholder={ph} value={(form as any)[k]} onChange={e => f(k, e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }}/>
              </div>
            ))}

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:600 }}>Role *</label>
              <select value={form.role} onChange={e => f('role', e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }}>
                <option value="RESTAURANT_STAFF">🏪 Restaurant Staff</option>
                <option value="WAREHOUSE_MANAGER">🏭 Warehouse Manager</option>
                <option value="WAREHOUSE_ADMIN">🛡️ Warehouse Admin (+ User Management)</option>
                <option value="ADMIN">👑 Admin (Full Access)</option>
              </select>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:600 }}>Branch</label>
              <select value={form.branchId} onChange={e => f('branchId', e.target.value)}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }}>
                <option value="">No branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Role description */}
            {form.role === 'WAREHOUSE_ADMIN' && (
              <div style={{ background:'rgba(249,115,22,.08)', border:'1px solid rgba(249,115,22,.2)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#f97316' }}>
                <strong>Warehouse Admin:</strong> Gets all Warehouse Manager access PLUS User Management and Feedback panel. Cannot impersonate (that's Admin-only).
              </div>
            )}

            <button onClick={handleCreate} disabled={creating}
              style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#6366f1', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
                opacity:creating?.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              {creating ? 'Creating...' : <><UserPlus size={15}/> Create User</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
