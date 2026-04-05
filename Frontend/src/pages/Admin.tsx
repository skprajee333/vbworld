import { useState, useEffect } from 'react'
import { getAllUsers, getPendingUsers, approveUser, rejectUser, createUser, getBranchList } from '../api'

type Tab = 'pending' | 'all' | 'create'

const ROLE_COLOR: any = {
  ADMIN: '#a78bfa', WAREHOUSE_MANAGER: '#06b6d4', RESTAURANT_STAFF: '#22c55e'
}
const STATUS_STYLE: any = {
  PENDING:  { background: 'rgba(234,179,8,.12)',  color: '#eab308'  },
  APPROVED: { background: 'rgba(34,197,94,.12)',  color: '#22c55e'  },
  REJECTED: { background: 'rgba(239,68,68,.12)',  color: '#ef4444'  },
}

export default function Admin() {
  const [tab, setTab]         = useState<Tab>('pending')
  const [users, setUsers]     = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  // Create user form
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'RESTAURANT_STAFF', branchId:'' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = tab === 'pending'
        ? await getPendingUsers()
        : await getAllUsers()
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
    try { await approveUser(id); load() } catch (e: any) { alert(e?.response?.data?.message || 'Failed') }
    setActionId(null)
  }

  const handleReject = async (id: string) => {
    if (!confirm('Reject this user?')) return
    setActionId(id)
    try { await rejectUser(id); load() } catch (e: any) { alert(e?.response?.data?.message || 'Failed') }
    setActionId(null)
  }

  const handleCreate = async () => {
    setCreateError(''); setCreateSuccess('')
    if (!form.name || !form.email || !form.password) { setCreateError('Fill all required fields'); return }
    setCreating(true)
    try {
      await createUser({ ...form, branchId: form.branchId || undefined })
      setCreateSuccess('User created successfully!')
      setForm({ name:'', email:'', phone:'', password:'', role:'RESTAURANT_STAFF', branchId:'' })
    } catch (e: any) { setCreateError(e?.response?.data?.message || 'Failed to create user') }
    setCreating(false)
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
        User Management
      </h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Approve registrations and manage user access
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border)' }}>
        {([
          { key: 'pending', label: '⏳ Pending Approvals' },
          { key: 'all',     label: '👥 All Users' },
          { key: 'create',  label: '➕ Create User' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.key ? '#6366f1' : 'transparent',
            color: tab === t.key ? '#fff' : 'var(--muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* PENDING / ALL USERS TABLE */}
      {(tab === 'pending' || tab === 'all') && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              {tab === 'pending' ? '✅ No pending approvals' : 'No users found'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {['User', 'Role', 'Branch', 'Status', 'Registered', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, ${ROLE_COLOR[u.role] || '#6366f1'}, #a78bfa)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 13,
                          }}>
                            {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 11 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[u.role] || 'var(--muted)' }}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>
                        {u.branchName || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          ...STATUS_STYLE[u.status] || {}
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 11 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.status === 'PENDING' && (
                            <>
                              <button
                                disabled={actionId === u.id}
                                onClick={() => handleApprove(u.id)}
                                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(34,197,94,.15)', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>
                                ✅ Approve
                              </button>
                              <button
                                disabled={actionId === u.id}
                                onClick={() => handleReject(u.id)}
                                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,.15)', color: '#ef4444', fontSize: 12, fontWeight: 700 }}>
                                ❌ Reject
                              </button>
                            </>
                          )}
                          {u.status === 'APPROVED' && (
                            <button
                              onClick={() => handleReject(u.id)}
                              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'none', color: 'var(--muted)', fontSize: 12 }}>
                              Deactivate
                            </button>
                          )}
                          {u.status === 'REJECTED' && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #6366f1', cursor: 'pointer', background: 'none', color: '#6366f1', fontSize: 12 }}>
                              Re-approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE USER FORM */}
      {tab === 'create' && (
        <div style={{ maxWidth: 480 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ color: 'var(--text)', marginBottom: 16, fontWeight: 700 }}>Create User Directly</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Users created here are automatically approved and can login immediately.
            </p>

            {createError && (
              <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 12px', color: '#ef4444', fontSize: 13, marginBottom: 14 }}>
                {createError}
              </div>
            )}
            {createSuccess && (
              <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, padding: '10px 12px', color: '#22c55e', fontSize: 13, marginBottom: 14 }}>
                {createSuccess}
              </div>
            )}

            {[
              { k:'name',     label:'Full Name *',  type:'text',     ph:'Ravi Kumar' },
              { k:'email',    label:'Email *',       type:'email',    ph:'ravi@vbworld.in' },
              { k:'phone',    label:'Phone',         type:'tel',      ph:'+91 98765 43210' },
              { k:'password', label:'Password *',    type:'password', ph:'Min 8 characters' },
            ].map(({ k, label, type, ph }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:500 }}>{label}</label>
                <input type={type} placeholder={ph} value={(form as any)[k]}
                  onChange={e => f(k, e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }} />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:500 }}>Role *</label>
              <select value={form.role} onChange={e => f('role', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }}>
                <option value="RESTAURANT_STAFF">Restaurant Staff</option>
                <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display:'block', color:'var(--muted)', fontSize:12, marginBottom:5, fontWeight:500 }}>Branch</label>
              <select value={form.branchId} onChange={e => f('branchId', e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none', boxSizing:'border-box' as const }}>
                <option value="">No branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <button onClick={handleCreate} disabled={creating}
              style={{ width:'100%', padding:12, borderRadius:12, border:'none', background:'#6366f1', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
