import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Loader2, RefreshCcw, Save, Search, ShieldCheck, UserCog } from 'lucide-react'
import { getAllUsers, getPermissionMatrix, updatePermissionMatrix } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/StateBlocks'

export default function PermissionsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [permissionSourceFilter, setPermissionSourceFilter] = useState('ALL')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [draft, setDraft] = useState<Record<string, boolean>>({})

  const { data: users = [], isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useQuery({
    queryKey:['permission-users'],
    queryFn:getAllUsers,
    select:(r:any) => r.data?.data || [],
  })

  const roleOptions = useMemo(() => ['ALL', ...Array.from(new Set(users.map((user:any) => user.role).filter(Boolean)))], [users])

  const filteredUsers = useMemo(() => users.filter((user:any) => {
    const value = search.toLowerCase()
    const matchesSearch = !search || user.name?.toLowerCase().includes(value) || user.email?.toLowerCase().includes(value) || user.role?.toLowerCase().includes(value)
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    return matchesSearch && matchesRole
  }), [users, search, roleFilter])

  const activeUserId = selectedUserId || filteredUsers[0]?.id || ''

  useEffect(() => {
    if (!filteredUsers.some((user:any) => user.id === activeUserId)) {
      setSelectedUserId(filteredUsers[0]?.id || '')
    }
  }, [filteredUsers, activeUserId])

  const { data: matrix, isLoading: matrixLoading, isError: matrixError, refetch: refetchMatrix } = useQuery({
    queryKey:['permission-matrix', activeUserId],
    queryFn:() => getPermissionMatrix(activeUserId),
    select:(r:any) => r.data?.data || null,
    enabled: !!activeUserId,
  })

  useEffect(() => {
    if (matrix?.permissions) {
      const next: Record<string, boolean> = {}
      matrix.permissions.forEach((permission:any) => {
        next[permission.key] = permission.enabled
      })
      setDraft(next)
    }
  }, [matrix])

  const visiblePermissions = useMemo(() => {
    if (!matrix?.permissions) return []
    const q = permissionSearch.trim().toLowerCase()
    return matrix.permissions.filter((permission:any) => {
      const matchesSearch = !q
        || permission.label?.toLowerCase().includes(q)
        || permission.description?.toLowerCase().includes(q)
        || permission.key?.toLowerCase().includes(q)
      const matchesSource = permissionSourceFilter === 'ALL' || permission.source === permissionSourceFilter
      return matchesSearch && matchesSource
    })
  }, [matrix, permissionSearch, permissionSourceFilter])

  const changedCount = useMemo(() => {
    if (!matrix?.permissions) return 0
    return matrix.permissions.filter((permission:any) => draft[permission.key] !== permission.enabled).length
  }, [matrix, draft])

  const overrideCount = useMemo(() => visiblePermissions.filter((permission:any) => permission.source === 'OVERRIDE').length, [visiblePermissions])

  const saveMutation = useMutation({
    mutationFn: () => updatePermissionMatrix(activeUserId, Object.entries(draft).map(([key, enabled]) => ({ key, enabled }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['permission-matrix', activeUserId] })
    },
  })

  function applyBulk(enabled: boolean) {
    setDraft(prev => {
      const next = { ...prev }
      visiblePermissions.forEach((permission:any) => {
        next[permission.key] = enabled
      })
      return next
    })
  }

  function resetVisible() {
    if (!matrix?.permissions) return
    setDraft(prev => {
      const next = { ...prev }
      visiblePermissions.forEach((permission:any) => {
        next[permission.key] = permission.enabled
      })
      return next
    })
  }

  return (
    <div style={{ maxWidth:1180 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>Permission Matrix</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Apply user-level permission overrides on top of role defaults for governance-sensitive actions.</p>
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.18)', color:'#6366f1', fontSize:12, fontWeight:800 }}>
          <KeyRound size={14} /> Role defaults + overrides
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px minmax(0, 1fr)', gap:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:14 }}>
          <div style={{ position:'relative', marginBottom:10 }}>
            <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, marginBottom:12 }}>
            {roleOptions.map((role:any) => <option key={String(role)} value={String(role)}>{role === 'ALL' ? 'All roles' : String(role).replace(/_/g, ' ')}</option>)}
          </select>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'var(--muted)', marginBottom:10 }}>
            <span>{filteredUsers.length} visible</span>
            <span>{users.length} total users</span>
          </div>

          {usersLoading ? (
            <LoadingState title="Loading users" message="Pulling the user roster for permission management." />
          ) : usersError ? (
            <ErrorState title="Couldn't load users" message="Retry to continue editing permission overrides." onAction={() => refetchUsers()} />
          ) : filteredUsers.length === 0 ? (
            <EmptyState title="No matching users" message="Try a different name, email, or role filter to find the right user." onAction={() => refetchUsers()} actionLabel="Refresh users" />
          ) : filteredUsers.map((user:any) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              style={{ width:'100%', textAlign:'left', background: activeUserId === user.id ? 'rgba(99,102,241,.12)' : 'transparent', border:'1px solid ' + (activeUserId === user.id ? 'rgba(99,102,241,.22)' : 'transparent'), borderRadius:12, padding:'10px 12px', cursor:'pointer', marginBottom:6 }}
            >
              <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{user.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{user.email}</div>
              <div style={{ fontSize:10, color:'#6366f1', marginTop:4 }}>{user.role.replace(/_/g, ' ')}{user.branchName ? ` | ${user.branchName}` : ''}</div>
            </button>
          ))}
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:18 }}>
          {!activeUserId ? (
            <EmptyState title="Select a user" message="Choose a user from the left to review role defaults and permission overrides." compact={false} />
          ) : matrixLoading ? (
            <LoadingState title="Loading permission matrix" message="Fetching role defaults and any user-specific overrides." />
          ) : matrixError ? (
            <ErrorState title="Couldn't load permission matrix" message="Retry to continue editing this user's access controls." onAction={() => refetchMatrix()} compact={false} />
          ) : !matrix ? (
            <EmptyState title="No permission matrix found" message="This user did not return a permission matrix. Refresh and try again." onAction={() => refetchMatrix()} actionLabel="Refresh matrix" compact={false} />
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:'var(--text)' }}>{matrix.userName}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{matrix.role.replace(/_/g, ' ')}{matrix.branchName ? ` | ${matrix.branchName}` : ''}</div>
                </div>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || changedCount === 0}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 12px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', fontWeight:800, cursor:'pointer', opacity: changedCount === 0 ? 0.6 : 1 }}
                >
                  <Save size={14} /> {saveMutation.isPending ? 'Saving...' : `Save Overrides${changedCount ? ` (${changedCount})` : ''}`}
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:10, marginBottom:14 }}>
                <StatCard icon={UserCog} label="Visible permissions" value={visiblePermissions.length} color="#6366f1" />
                <StatCard icon={ShieldCheck} label="Override-sourced" value={overrideCount} color="#f59e0b" />
                <StatCard icon={RefreshCcw} label="Unsaved changes" value={changedCount} color="#22c55e" />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 170px 170px', gap:10, marginBottom:12 }}>
                <div style={{ position:'relative' }}>
                  <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
                  <input value={permissionSearch} onChange={e => setPermissionSearch(e.target.value)} placeholder="Search permissions..." style={{ width:'100%', padding:'9px 12px 9px 30px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <select value={permissionSourceFilter} onChange={e => setPermissionSourceFilter(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13 }}>
                  <option value="ALL">All sources</option>
                  <option value="ROLE">Role defaults</option>
                  <option value="OVERRIDE">Overrides</option>
                </select>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => applyBulk(true)} disabled={visiblePermissions.length === 0} style={bulkButton}>Enable all</button>
                  <button onClick={() => applyBulk(false)} disabled={visiblePermissions.length === 0} style={bulkButtonMuted}>Disable all</button>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--muted)' }}>Showing {visiblePermissions.length} permissions for this user</div>
                <button onClick={resetVisible} disabled={visiblePermissions.length === 0} style={{ ...bulkButtonMuted, padding:'8px 10px' }}>Reset visible to saved</button>
              </div>

              {visiblePermissions.length === 0 ? (
                <EmptyState title="No matching permissions" message="Try a broader permission search or clear the source filter." compact={false} />
              ) : (
                <div style={{ display:'grid', gap:10 }}>
                  {visiblePermissions.map((permission:any) => (
                    <label key={permission.key} style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'center', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{permission.label}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{permission.description}</div>
                        <div style={{ display:'flex', gap:8, marginTop:6, fontSize:10, flexWrap:'wrap' }}>
                          <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(99,102,241,.1)', color:'#6366f1', fontWeight:700 }}>{permission.key}</span>
                          <span style={{ padding:'2px 8px', borderRadius:999, background: permission.source === 'OVERRIDE' ? 'rgba(245,158,11,.12)' : 'rgba(148,163,184,.14)', color: permission.source === 'OVERRIDE' ? '#f59e0b' : 'var(--muted)', fontWeight:700 }}>{permission.source}</span>
                          <span style={{ color:'var(--muted)' }}>default {permission.defaultEnabled ? 'enabled' : 'disabled'}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!draft[permission.key]}
                        onChange={e => setDraft(prev => ({ ...prev, [permission.key]: e.target.checked }))}
                        style={{ width:18, height:18 }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
      <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:`${color}18`, marginBottom:8 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{label}</div>
    </div>
  )
}

const bulkButton: React.CSSProperties = {
  flex:1,
  padding:'9px 12px',
  borderRadius:10,
  border:'none',
  background:'#111827',
  color:'#fff',
  fontWeight:700,
  cursor:'pointer',
}

const bulkButtonMuted: React.CSSProperties = {
  flex:1,
  padding:'9px 12px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'var(--card)',
  color:'var(--text)',
  fontWeight:700,
  cursor:'pointer',
}

