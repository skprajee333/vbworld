import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, getBranchList } from '../api'

type Step = 'role' | 'details' | 'branch' | 'done'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]       = useState<Step>('role')
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', role: '',
    branchId: '', restaurantName: '', area: '', city: 'Chennai',
    branchMode: 'existing' as 'existing' | 'new'
  })

  useEffect(() => {
    getBranchList().then(r => setBranches(r.data?.data || [])).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.email || !form.password) {
      setError('Please fill all required fields'); return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    if (form.role === 'RESTAURANT_STAFF') {
      if (form.branchMode === 'existing' && !form.branchId) {
        setError('Please select a branch'); return
      }
      if (form.branchMode === 'new' && !form.restaurantName) {
        setError('Please enter your restaurant name'); return
      }
    }

    setLoading(true)
    try {
      await register({
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
        branchId: form.branchMode === 'existing' ? form.branchId || undefined : undefined,
        restaurantName: form.branchMode === 'new' ? form.restaurantName : undefined,
        area: form.area || undefined, city: form.city || undefined,
      })
      setStep('done')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Registration failed')
    }
    setLoading(false)
  }

  if (step === 'done') return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>✅</div>
        <h2 style={{ ...S.title, textAlign: 'center' }}>Registration Successful!</h2>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 8, fontSize: 14 }}>
          Your account is <strong style={{ color: '#eab308' }}>pending admin approval</strong>
        </p>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
          You will receive access once an admin reviews your request.
        </p>
        <button style={S.btn} onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.box}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
          <h2 style={S.title}>Create Account</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>VB World Supply Chain</p>
        </div>

        {error && <div style={S.err}>{error}</div>}

        {/* STEP 1: Choose Role */}
        {step === 'role' && (
          <div>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>I am joining as:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { role: 'RESTAURANT_STAFF', icon: '🏪', label: 'Restaurant Staff', desc: 'Manage orders for my restaurant branch' },
                { role: 'WAREHOUSE_MANAGER', icon: '🏭', label: 'Warehouse Manager', desc: 'Manage warehouse stock and fulfil orders' },
              ].map(opt => (
                <button key={opt.role} onClick={() => { set('role', opt.role); setStep('details') }}
                  style={{ ...S.roleCard, border: `1px solid ${form.role === opt.role ? '#6366f1' : '#2a2f45'}` }}>
                  <span style={{ fontSize: 24 }}>{opt.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>
              Already have an account?{' '}
              <span style={{ color: '#6366f1', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
            </p>
          </div>
        )}

        {/* STEP 2: Account Details */}
        {step === 'details' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setStep('role')} style={S.back}>← Back</button>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {form.role === 'RESTAURANT_STAFF' ? '🏪 Restaurant Staff' : '🏭 Warehouse Manager'}
              </span>
            </div>

            <label style={S.label}>Full Name *</label>
            <input style={S.input} placeholder="Ravi Kumar" value={form.name}
              onChange={e => set('name', e.target.value)} />

            <label style={S.label}>Email *</label>
            <input style={S.input} placeholder="ravi@example.com" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} />

            <label style={S.label}>Phone</label>
            <input style={S.input} placeholder="+91 98765 43210" value={form.phone}
              onChange={e => set('phone', e.target.value)} />

            <label style={S.label}>Password * (min 8 characters)</label>
            <input style={S.input} type="password" placeholder="••••••••" value={form.password}
              onChange={e => set('password', e.target.value)} />

            <button style={S.btn} onClick={() => {
              if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); return }
              if (form.password.length < 8) { setError('Password min 8 characters'); return }
              setError('')
              if (form.role === 'RESTAURANT_STAFF') setStep('branch')
              else handleSubmit()
            }}>
              {form.role === 'WAREHOUSE_MANAGER' ? (loading ? 'Registering...' : 'Register') : 'Next →'}
            </button>
          </div>
        )}

        {/* STEP 3: Branch (Restaurant only) */}
        {step === 'branch' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setStep('details')} style={S.back}>← Back</button>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Select your restaurant</span>
            </div>

            {/* Toggle existing vs new */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { mode: 'existing', label: 'Existing Branch' },
                { mode: 'new',      label: 'New Restaurant' },
              ].map(opt => (
                <button key={opt.mode}
                  onClick={() => set('branchMode', opt.mode)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: form.branchMode === opt.mode ? '#6366f1' : '#2a2f45',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {form.branchMode === 'existing' ? (
              <>
                <label style={S.label}>Select Branch *</label>
                <select style={S.input} value={form.branchId} onChange={e => set('branchId', e.target.value)}>
                  <option value="">— Choose branch —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name} {b.city ? `(${b.city})` : ''}</option>)}
                </select>
              </>
            ) : (
              <>
                <label style={S.label}>Restaurant Name *</label>
                <input style={S.input} placeholder="e.g. Anna Nagar Branch" value={form.restaurantName}
                  onChange={e => set('restaurantName', e.target.value)} />

                <label style={S.label}>Area / Address</label>
                <input style={S.input} placeholder="e.g. 12th Main Road, Anna Nagar" value={form.area}
                  onChange={e => set('area', e.target.value)} />

                <label style={S.label}>City</label>
                <input style={S.input} placeholder="Chennai" value={form.city}
                  onChange={e => set('city', e.target.value)} />
              </>
            )}

            <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit} disabled={loading}>
              {loading ? 'Registering...' : 'Submit Registration'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const S: any = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', padding: 16 },
  box:   { width: '100%', maxWidth: 440, background: '#1e2235', border: '1px solid #2a2f45', borderRadius: 20, padding: 32 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: 900, marginBottom: 4 },
  label: { display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 5, marginTop: 4, fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, background: '#161921', border: '1px solid #2a2f45', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 },
  btn:   { width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  err:   { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 14 },
  back:  { background: 'none', border: '1px solid #2a2f45', color: '#94a3b8', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  roleCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: '#161921', cursor: 'pointer', width: '100%', textAlign: 'left' as const },
}
