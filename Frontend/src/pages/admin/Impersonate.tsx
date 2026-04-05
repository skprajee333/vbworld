import { useEffect, useMemo, useState } from 'react'
import { getAllUsers, impersonateUser } from '../../api'
import { useAuth } from '../../store/auth'
import { UserCheck, AlertTriangle, ShieldOff, Loader2, ArrowRightCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ROLE_C: Record<string, string> = {
  ADMIN: '#a78bfa',
  WAREHOUSE_ADMIN: '#f97316',
  WAREHOUSE_MANAGER: '#06b6d4',
  RESTAURANT_STAFF: '#22c55e',
}

export default function Impersonate() {
  const navigate = useNavigate()
  const { user, isAdmin, isWarehouseAdmin, impersonating, startImpersonate, stopImpersonate } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startingId, setStartingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAllUsers()
      .then(r => setUsers(r.data?.data || []))
      .catch(err => setError(err?.response?.data?.message || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const canAccess = isAdmin() || isWarehouseAdmin()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter((u: any) => {
      if (u.status !== 'APPROVED') return false
      if (u.id === user?.id) return false
      if (isWarehouseAdmin() && !['RESTAURANT_STAFF', 'WAREHOUSE_MANAGER'].includes(u.role)) return false
      if (!isAdmin() && u.role === 'ADMIN') return false
      if (!term) return true
      return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    })
  }, [search, users, user?.id, isAdmin, isWarehouseAdmin])

  async function handleImpersonate(target: any) {
    try {
      setError('')
      setStartingId(target.id)
      const res = await impersonateUser(target.id)
      const data = res.data?.data
      startImpersonate(data.user, data.accessToken, data.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to start impersonation')
    } finally {
      setStartingId(null)
    }
  }

  if (!canAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShieldOff size={48} style={{ color: '#ef4444', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
        <h2 style={{ color: 'var(--text)' }}>Access Denied</h2>
        <p style={{ color: 'var(--muted)' }}>This feature is only available to Admin and Warehouse Admin users.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={20} style={{ color: '#6366f1' }} /> Scoped User Impersonation
        </h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          Start a real backend-issued session to preview another user view without reusing the wrong token.
        </p>
      </div>

      <div style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text)' }}>
        Actions performed during impersonation now use a scoped token for the selected user. Your original {user?.role?.replace(/_/g, ' ')} session is kept locally and can be restored with one click.
      </div>

      {impersonating && (
        <div style={{ background: 'rgba(245,158,11,.12)', border: '2px solid #f59e0b', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#f59e0b' }}>Impersonation active</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              You are currently viewing the app as {impersonating.name}.
            </div>
          </div>
          <button
            onClick={() => {
              stopImpersonate()
              navigate('/dashboard')
            }}
            style={{ padding: '7px 16px', borderRadius: 8, background: '#f59e0b', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            Restore My Session
          </button>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', color: '#ef4444', fontSize: 12 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search approved users..."
          style={{ flex: 1, maxWidth: 320, padding: '8px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading users...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {filtered.map((u: any) => (
            <div key={u.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, background: `linear-gradient(135deg,${ROLE_C[u.role] || '#6366f1'},#a78bfa)` }}>
                  {u.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${ROLE_C[u.role] || '#6366f1'}18`, color: ROLE_C[u.role] || '#6366f1' }}>
                  {u.role?.replace(/_/g, ' ')}
                </span>
                {u.branchName && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    {u.branchName}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
              </div>

              <button
                onClick={() => handleImpersonate(u)}
                disabled={startingId === u.id}
                style={{ width: '100%', padding: '8px', borderRadius: 10, background: '#6366f1', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: startingId === u.id ? 0.8 : 1 }}
              >
                {startingId === u.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRightCircle size={13} />}
                Start Session
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              No approved users available for your scope
            </div>
          )}
        </div>
      )}
    </div>
  )
}
