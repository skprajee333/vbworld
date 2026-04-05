import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFeedback, updateFeedbackStatus, submitFeedback } from '../../api'
import { MessageSquare, Check, Clock, AlertCircle, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../../store/auth'

const TYPE_C: Record<string, any> = {
  BUG:       { color:'#ef4444', bg:'rgba(239,68,68,.12)',  label:'🐛 Bug' },
  QUERY:     { color:'#06b6d4', bg:'rgba(6,182,212,.12)',  label:'❓ Query' },
  FEEDBACK:  { color:'#6366f1', bg:'rgba(99,102,241,.12)', label:'💬 Feedback' },
  COMPLAINT: { color:'#f97316', bg:'rgba(249,115,22,.12)', label:'⚠️ Complaint' },
}
const STATUS_C: Record<string, any> = {
  OPEN:        { color:'#eab308', bg:'rgba(234,179,8,.12)',  label:'Open' },
  IN_PROGRESS: { color:'#06b6d4', bg:'rgba(6,182,212,.12)', label:'In Progress' },
  RESOLVED:    { color:'#22c55e', bg:'rgba(34,197,94,.12)', label:'Resolved' },
}

export default function FeedbackPanel() {
  const { user, canManageUsers } = useAuth()
  const qc = useQueryClient()
  const isManager = canManageUsers()

  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [selected, setSelected]         = useState<any>(null)
  const [showForm, setShowForm]         = useState(false)
  const [adminNote, setAdminNote]       = useState('')
  const [fForm, setFForm] = useState({ type:'FEEDBACK', subject:'', message:'' })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedback', statusFilter],
    queryFn:  () => getFeedback(statusFilter || undefined),
    select:   r => r.data?.data || []
  })

  const submitMutation = useMutation({
    mutationFn: () => submitFeedback(fForm),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['feedback'] })
      setShowForm(false)
      setFForm({ type:'FEEDBACK', subject:'', message:'' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status, note }: any) => updateFeedbackStatus(id, status, note),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['feedback'] })
      if (selected?.id === vars.id) setSelected((p: any) => ({ ...p, status: vars.status }))
    }
  })

  const filtered = items.filter((i: any) => {
    if (typeFilter && i.type !== typeFilter) return false
    return true
  })

  const counts = {
    OPEN:        items.filter((i: any) => i.status === 'OPEN').length,
    IN_PROGRESS: items.filter((i: any) => i.status === 'IN_PROGRESS').length,
    RESOLVED:    items.filter((i: any) => i.status === 'RESOLVED').length,
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>
            {isManager ? 'Feedback & Queries' : 'My Feedback'}
          </h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            {isManager ? 'Track and respond to all user queries and feedback'
                       : 'Submit and track your queries to the admin team'}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, background:'#6366f1', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Send size={14}/> Submit Feedback
        </button>
      </div>

      {/* KPI row (managers only) */}
      {isManager && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { k:'OPEN',        label:'Open',        icon:AlertCircle, color:'#eab308' },
            { k:'IN_PROGRESS', label:'In Progress', icon:Clock,       color:'#06b6d4' },
            { k:'RESOLVED',    label:'Resolved',    icon:Check,       color:'#22c55e' },
          ].map(({ k, label, icon: Icon, color }) => (
            <div key={k} onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
              style={{ background:'var(--card)', border:`1px solid ${statusFilter===k ? color : 'var(--border)'}`, borderRadius:14, padding:16, cursor:'pointer', transition:'border-color .15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Icon size={18} style={{ color }}/>
                <span style={{ fontSize:24, fontWeight:900, color }}>{(counts as any)[k]}</span>
              </div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {['', ...Object.keys(TYPE_C)].map(k => (
          <button key={k} onClick={() => setTypeFilter(k)}
            style={{ padding:'6px 12px', borderRadius:20, border:`1px solid ${typeFilter===k ? '#6366f1' : 'var(--border)'}`,
              background: typeFilter===k ? 'rgba(99,102,241,.1)' : 'var(--card)',
              color: typeFilter===k ? '#6366f1' : 'var(--muted)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {k ? TYPE_C[k].label : 'All Types'}
          </button>
        ))}
        {statusFilter && (
          <button onClick={() => setStatusFilter('')}
            style={{ padding:'6px 12px', borderRadius:20, background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.3)', color:'#6366f1', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            ✕ {statusFilter}
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:16 }}>

        {/* List */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {isLoading ? (
            <div style={{ padding:40, textAlign:'center' }}><Loader2 size={22} style={{ color:'#6366f1', animation:'spin 1s linear infinite' }}/></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>
              <MessageSquare size={32} style={{ margin:'0 auto 8px', opacity:.3, display:'block' }}/>
              <p style={{ fontSize:13 }}>No feedback items found</p>
            </div>
          ) : filtered.map((item: any) => {
            const tc = TYPE_C[item.type] || {}
            const sc = STATUS_C[item.status] || {}
            return (
              <div key={item.id}
                onClick={() => { setSelected(selected?.id === item.id ? null : item); setAdminNote(item.adminNote || '') }}
                style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: selected?.id === item.id ? 'rgba(99,102,241,.05)' : 'transparent',
                  transition:'background .1s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:tc.bg, color:tc.color }}>
                        {tc.label || item.type}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:sc.bg, color:sc.color }}>
                        {sc.label || item.status}
                      </span>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {item.subject}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:3, display:'flex', gap:8 }}>
                      {isManager && <span style={{ fontWeight:600 }}>{item.userName}</span>}
                      {isManager && item.branchName && <span>• {item.branchName}</span>}
                      <span>• {new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', alignSelf:'start' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, color:'var(--text)', fontSize:13 }}>Detail</span>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><X size={16}/></button>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10,
                  background: TYPE_C[selected.type]?.bg, color: TYPE_C[selected.type]?.color }}>
                  {TYPE_C[selected.type]?.label || selected.type}
                </span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10,
                  background: STATUS_C[selected.status]?.bg, color: STATUS_C[selected.status]?.color }}>
                  {STATUS_C[selected.status]?.label || selected.status}
                </span>
              </div>

              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{selected.subject}</h3>

              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>
                {isManager ? (
                  <><strong style={{color:'var(--text)'}}>{selected.userName}</strong>
                  {selected.branchName && <> — {selected.branchName}</>}
                  </>
                ) : 'Your submission'}
                {' '}• {new Date(selected.createdAt).toLocaleString('en-IN')}
              </div>

              <div style={{ background:'var(--surface)', borderRadius:8, padding:12, fontSize:13, color:'var(--text)', lineHeight:1.6, marginBottom:16, whiteSpace:'pre-wrap' }}>
                {selected.message}
              </div>

              {selected.adminNote && (
                <div style={{ background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)', borderRadius:8, padding:12, fontSize:12, color:'var(--text)', marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#6366f1', marginBottom:4 }}>ADMIN RESPONSE</div>
                  {selected.adminNote}
                </div>
              )}

              {/* Status update (managers only) */}
              {isManager && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Update Status</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                    {[
                      { k:'OPEN',        label:'Open',        color:'#eab308' },
                      { k:'IN_PROGRESS', label:'In Progress', color:'#06b6d4' },
                      { k:'RESOLVED',    label:'✓ Resolve',   color:'#22c55e' },
                    ].map(({ k, label, color }) => (
                      <button key={k}
                        onClick={() => updateMutation.mutate({ id: selected.id, status: k, note: adminNote || undefined })}
                        disabled={selected.status === k || updateMutation.isPending}
                        style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                          background: selected.status===k ? `${color}20` : 'var(--surface)',
                          color: selected.status===k ? color : 'var(--muted)',
                          border: `1px solid ${selected.status===k ? color : 'var(--border)'}` }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Admin Note / Response</label>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                      placeholder="Add a note or response to the user..."
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, outline:'none', resize:'none', boxSizing:'border-box' as const }}/>
                    <button onClick={() => updateMutation.mutate({ id: selected.id, status: selected.status, note: adminNote })}
                      disabled={updateMutation.isPending}
                      style={{ marginTop:6, width:'100%', padding:'8px', borderRadius:8, border:'1px solid #6366f1', background:'rgba(99,102,241,.1)', color:'#6366f1', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      Save Note
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit form modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:440, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:'var(--text)', margin:0 }}>Submit Feedback / Query</h3>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}><X size={18}/></button>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4, fontWeight:600 }}>Type</label>
              <select value={fForm.type} onChange={e => setFForm(p => ({ ...p, type: e.target.value }))}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none' }}>
                <option value="FEEDBACK">💬 Feedback</option>
                <option value="QUERY">❓ Query</option>
                <option value="BUG">🐛 Bug Report</option>
                <option value="COMPLAINT">⚠️ Complaint</option>
              </select>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4, fontWeight:600 }}>Subject *</label>
              <input value={fForm.subject} onChange={e => setFForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Brief description..."
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', boxSizing:'border-box' as const }}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, color:'var(--muted)', marginBottom:4, fontWeight:600 }}>Message *</label>
              <textarea value={fForm.message} onChange={e => setFForm(p => ({ ...p, message: e.target.value }))}
                rows={4} placeholder="Describe in detail..."
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, outline:'none', resize:'none', boxSizing:'border-box' as const }}/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !fForm.subject || !fForm.message}
                style={{ flex:1, padding:11, borderRadius:10, background:'#6366f1', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, opacity: submitMutation.isPending ? 0.7 : 1 }}>
                {submitMutation.isPending ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Submitting...</> : <><Send size={14}/> Submit</>}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding:'11px 16px', borderRadius:10, border:'1px solid var(--border)', background:'none', color:'var(--text)', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
