import { useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertOctagon, BellRing, CheckCircle2, Save, ShieldAlert } from 'lucide-react'
import {
  escalateGovernanceException,
  getFraudRules,
  getGovernanceExceptions,
  resolveGovernanceException,
  updateFraudRules,
} from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/StateBlocks'

function Pill({ children, color, bg }: any) {
  return <span style={{ padding:'4px 9px', borderRadius:999, background:bg, color, fontSize:11, fontWeight:800 }}>{children}</span>
}

export default function ExceptionsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('OPEN')
  const [riskLevel, setRiskLevel] = useState('')
  const [localRules, setLocalRules] = useState<Record<string, any>>({})
  const [exceptionNotes, setExceptionNotes] = useState<Record<string, string>>({})

  const { data: rules = [], isLoading: rulesLoading, isError: rulesError, refetch: refetchRules } = useQuery({
    queryKey:['fraud-rules'],
    queryFn:getFraudRules,
    select:(response:any) => response.data?.data || [],
  })

  const { data: exceptions = [], isLoading: exceptionsLoading, isError: exceptionsError, refetch: refetchExceptions } = useQuery({
    queryKey:['governance-exceptions', status, riskLevel],
    queryFn:() => getGovernanceExceptions({ status: status || undefined, riskLevel: riskLevel || undefined }),
    select:(response:any) => response.data?.data || [],
    refetchInterval:20000,
  })

  const mergedRules = useMemo(
    () => rules.map((rule:any) => ({ ...rule, ...(localRules[rule.id] || {}) })),
    [rules, localRules]
  )

  const saveRules = useMutation({
    mutationFn:() => updateFraudRules(mergedRules.map((rule:any) => ({
      id: rule.id,
      ruleCode: rule.ruleCode,
      ruleName: rule.ruleName,
      moduleScope: rule.moduleScope,
      riskLevel: rule.riskLevel,
      thresholdValue: rule.thresholdValue === '' ? null : Number(rule.thresholdValue ?? 0),
      thresholdUnit: rule.thresholdUnit,
      enabled: !!rule.enabled,
      autoCreateException: !!rule.autoCreateException,
      escalationRoles: rule.escalationRoles || [],
    }))),
    onSuccess:() => {
      setLocalRules({})
      qc.invalidateQueries({ queryKey:['fraud-rules'] })
      qc.invalidateQueries({ queryKey:['system-monitor'] })
    },
  })

  const escalate = useMutation({
    mutationFn:({ id, note }: any) => escalateGovernanceException(id, note),
    onSuccess:() => {
      setExceptionNotes({})
      qc.invalidateQueries({ queryKey:['governance-exceptions'] })
      qc.invalidateQueries({ queryKey:['system-monitor'] })
    },
  })

  const resolve = useMutation({
    mutationFn:({ id, note, dismissed }: any) => resolveGovernanceException(id, note, dismissed),
    onSuccess:() => {
      setExceptionNotes({})
      qc.invalidateQueries({ queryKey:['governance-exceptions'] })
      qc.invalidateQueries({ queryKey:['system-monitor'] })
    },
  })

  function patchRule(id: string, patch: any) {
    setLocalRules((state) => ({ ...state, [id]: { ...(state[id] || {}), ...patch } }))
  }

  return (
    <div style={{ maxWidth:1320 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:18, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0, display:'flex', alignItems:'center', gap:8 }}>
            <ShieldAlert size={20} style={{ color:'#ef4444' }} /> Exception Center
          </h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Manage fraud-control thresholds, escalation paths, and live operational exceptions.</p>
        </div>
        <button
          onClick={() => saveRules.mutate()}
          disabled={saveRules.isPending || Object.keys(localRules).length === 0}
          style={{ padding:'10px 14px', borderRadius:10, border:'none', background:'#6366f1', color:'#fff', cursor:'pointer', fontWeight:800, display:'flex', alignItems:'center', gap:8, opacity: saveRules.isPending || Object.keys(localRules).length === 0 ? .6 : 1 }}
        >
          <Save size={15} /> Save Rule Changes
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.05fr .95fr', gap:16 }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Fraud-Control Rules</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Tune what gets flagged, how severe it is, and who gets alerted.</div>
          </div>
          {rulesLoading ? (
            <LoadingState title="Loading fraud rules" message="Pulling the current thresholds and escalation rules." />
          ) : rulesError ? (
            <ErrorState title="Couldn't load fraud rules" message="Retry to continue editing thresholds and risk logic." onAction={() => refetchRules()} />
          ) : mergedRules.length === 0 ? (
            <EmptyState title="No fraud rules configured" message="Seed or create governance rules to start auto-flagging risky operations." onAction={() => refetchRules()} actionLabel="Refresh" />
          ) : (
            <div style={{ display:'grid', gap:12, padding:16 }}>
              {mergedRules.map((rule:any) => (
                <div key={rule.id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:14, background:'var(--surface)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', flexWrap:'wrap', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{rule.ruleName}</div>
                      <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{rule.ruleCode} | {rule.moduleScope}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted)' }}>
                        <input type="checkbox" checked={!!rule.enabled} onChange={e => patchRule(rule.id, { enabled: e.target.checked })} />
                        Enabled
                      </label>
                      <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted)' }}>
                        <input type="checkbox" checked={!!rule.autoCreateException} onChange={e => patchRule(rule.id, { autoCreateException: e.target.checked })} />
                        Auto-create
                      </label>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'140px 130px 1fr', gap:10 }}>
                    <select value={rule.riskLevel || 'MEDIUM'} onChange={e => patchRule(rule.id, { riskLevel: e.target.value })} style={inputStyle}>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                    <input value={rule.thresholdValue ?? ''} onChange={e => patchRule(rule.id, { thresholdValue: e.target.value })} placeholder="Threshold" type="number" step="0.01" style={inputStyle} />
                    <input value={rule.thresholdUnit ?? ''} onChange={e => patchRule(rule.id, { thresholdUnit: e.target.value })} placeholder="Threshold unit" style={inputStyle} />
                  </div>
                  <div style={{ marginTop:10 }}>
                    <input
                      value={Array.isArray(rule.escalationRoles) ? rule.escalationRoles.join(', ') : ''}
                      onChange={e => patchRule(rule.id, { escalationRoles: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                      placeholder="Escalation roles (comma separated)"
                      style={inputStyle}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:'var(--text)' }}>Live Exceptions</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Escalate or close governance exceptions raised by risky activity.</div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyleCompact}>
                  <option value="OPEN">Open</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="">All status</option>
                </select>
                <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} style={inputStyleCompact}>
                  <option value="">All risk</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          </div>
          {exceptionsLoading ? (
            <LoadingState title="Loading live exceptions" message="Pulling the latest governance alerts for the selected filters." />
          ) : exceptionsError ? (
            <ErrorState title="Couldn't load live exceptions" message="Retry to continue triaging governance alerts." onAction={() => refetchExceptions()} />
          ) : exceptions.length === 0 ? (
            <EmptyState title="No exceptions for these filters" message="Nothing is currently open for the selected status and risk combination." onAction={() => refetchExceptions()} actionLabel="Refresh feed" />
          ) : (
            <div style={{ display:'grid', gap:12, padding:16 }}>
              {exceptions.map((item:any) => {
                const riskColor = item.riskLevel === 'CRITICAL' ? '#dc2626' : item.riskLevel === 'HIGH' ? '#ef4444' : item.riskLevel === 'MEDIUM' ? '#f59e0b' : '#22c55e'
                const note = exceptionNotes[item.id] || ''
                const closed = item.status === 'RESOLVED' || item.status === 'DISMISSED'
                return (
                  <div key={item.id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:14, background:'var(--surface)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{item.title}</div>
                        <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{item.ruleCode || 'MANUAL'} | {item.moduleName} | {new Date(item.triggeredAt).toLocaleString()}</div>
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Pill color={riskColor} bg={`${riskColor}18`}>{item.riskLevel}</Pill>
                        <Pill color="#6366f1" bg="rgba(99,102,241,.12)">{item.status}</Pill>
                      </div>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text)', marginTop:10 }}>{item.summary}</div>
                    {item.details && <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{item.details}</div>}
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>
                      Triggered by: {item.triggeredByName || 'System'} {item.assignedToName ? `| Assigned: ${item.assignedToName}` : ''}
                    </div>
                    <textarea
                      value={note}
                      onChange={e => setExceptionNotes((state) => ({ ...state, [item.id]: e.target.value }))}
                      rows={3}
                      placeholder="Resolution / escalation note"
                      style={{ ...inputStyle, resize:'vertical', marginTop:10, minHeight:72 }}
                    />
                    {!closed && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                        <button onClick={() => escalate.mutate({ id: item.id, note })} disabled={escalate.isPending} style={secondaryButton}>
                          <BellRing size={14} /> Escalate
                        </button>
                        <button onClick={() => resolve.mutate({ id: item.id, note, dismissed: false })} disabled={resolve.isPending} style={primaryButton}>
                          <CheckCircle2 size={14} /> Resolve
                        </button>
                        <button onClick={() => resolve.mutate({ id: item.id, note, dismissed: true })} disabled={resolve.isPending} style={dangerButton}>
                          <AlertOctagon size={14} /> Dismiss
                        </button>
                      </div>
                    )}
                    {closed && item.resolutionNote && <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>Resolution: {item.resolutionNote}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width:'100%',
  padding:'10px 12px',
  borderRadius:10,
  background:'var(--card)',
  border:'1px solid var(--border)',
  color:'var(--text)',
  fontSize:12,
  outline:'none',
  boxSizing:'border-box',
}

const inputStyleCompact: CSSProperties = {
  ...inputStyle,
  width:'auto',
  minWidth:120,
  padding:'8px 10px',
}

const secondaryButton: CSSProperties = {
  display:'inline-flex',
  alignItems:'center',
  gap:6,
  padding:'8px 10px',
  borderRadius:10,
  border:'1px solid var(--border)',
  background:'var(--card)',
  color:'var(--text)',
  cursor:'pointer',
  fontSize:12,
  fontWeight:700,
}

const primaryButton: CSSProperties = {
  ...secondaryButton,
  border:'none',
  background:'#10b981',
  color:'#fff',
}

const dangerButton: CSSProperties = {
  ...secondaryButton,
  border:'none',
  background:'#ef4444',
  color:'#fff',
}
