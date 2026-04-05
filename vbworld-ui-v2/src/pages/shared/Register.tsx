import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, getBranchList } from '../../api'

type Step = 'role' | 'details' | 'branch' | 'done'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]         = useState<Step>('role')
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name:'', email:'', phone:'', password:'', role:'',
    branchId:'', restaurantName:'', area:'', city:'Chennai',
    branchMode:'existing' as 'existing'|'new'
  })

  useEffect(() => {
    getBranchList().then(r => setBranches(r.data?.data || [])).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const needsBranch = form.role === 'RESTAURANT_STAFF'
  const isWarehouse = form.role === 'WAREHOUSE_MANAGER' || form.role === 'WAREHOUSE_ADMIN'

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (needsBranch) {
      if (form.branchMode === 'existing' && !form.branchId) { setError('Select a branch'); return }
      if (form.branchMode === 'new' && !form.restaurantName) { setError('Enter your restaurant name'); return }
    }
    setLoading(true)
    try {
      await register({
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
        branchId: needsBranch && form.branchMode === 'existing' ? form.branchId || undefined : undefined,
        restaurantName: needsBranch && form.branchMode === 'new' ? form.restaurantName : undefined,
        area: form.area || undefined,
        city: form.city || undefined,
      })
      setStep('done')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Registration failed. Try again.')
    }
    setLoading(false)
  }

  if (step === 'done') return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={{ fontSize:52, textAlign:'center', marginBottom:14 }}>✅</div>
        <h2 style={{ ...S.title, textAlign:'center' }}>Registration Successful!</h2>
        <p style={{ color:'#94a3b8', textAlign:'center', marginBottom:8, fontSize:14 }}>
          Your account is <strong style={{color:'#eab308'}}>pending admin approval</strong>
        </p>
        <p style={{ color:'#64748b', textAlign:'center', marginBottom:24, fontSize:13 }}>
          You'll be able to login once an admin approves your request.
        </p>
        <button style={S.btn} onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    </div>
  )

  const roleOptions = [
    { role:'RESTAURANT_STAFF',  icon:'🏪', label:'Restaurant Staff',     desc:'Place and track grocery orders for my branch' },
    { role:'WAREHOUSE_MANAGER', icon:'🏭', label:'Warehouse Manager',    desc:'Manage stock and fulfil branch orders' },
    { role:'WAREHOUSE_ADMIN',   icon:'🛡️', label:'Warehouse Admin',      desc:'Warehouse access + manage users and approvals' },
  ]

  return (
    <div style={S.page}>
      <div style={S.box}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:30, marginBottom:8 }}>🛒</div>
          <h2 style={S.title}>Create Account</h2>
          <p style={{ color:'#64748b', fontSize:12 }}>VB World Supply Chain</p>
        </div>

        {error && <div style={S.err}>{error}</div>}

        {/* STEP 1: Role */}
        {step === 'role' && (
          <div>
            <p style={{ color:'#94a3b8', fontSize:13, marginBottom:14 }}>I am joining as:</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {roleOptions.map(opt => (
                <button key={opt.role} onClick={() => { set('role', opt.role); setStep('details') }}
                  style={{ ...S.roleCard, border:`1px solid ${form.role === opt.role ? '#6366f1' : '#2a2f45'}` }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{opt.icon}</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:14 }}>{opt.label}</div>
                    <div style={{ color:'#64748b', fontSize:11, marginTop:2 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ color:'#64748b', fontSize:13, textAlign:'center' }}>
              Already have an account?{' '}
              <span style={{ color:'#6366f1', cursor:'pointer', fontWeight:600 }} onClick={() => navigate('/login')}>Login</span>
            </p>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 'details' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <button onClick={() => setStep('role')} style={S.back}>← Back</button>
              <span style={{ color:'#94a3b8', fontSize:13 }}>
                {roleOptions.find(r => r.role === form.role)?.icon} {roleOptions.find(r => r.role === form.role)?.label}
              </span>
            </div>

            {([
              { k:'name',     label:'Full Name *', type:'text',     ph:'Ravi Kumar' },
              { k:'email',    label:'Email *',      type:'email',    ph:'ravi@example.com' },
              { k:'phone',    label:'Phone',        type:'tel',      ph:'+91 98765 43210' },
              { k:'password', label:'Password *',   type:'password', ph:'Min 8 characters' },
            ] as any[]).map(({ k, label, type, ph }) => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={S.label}>{label}</label>
                <input type={type} placeholder={ph} value={(form as any)[k]}
                  onChange={e => set(k, e.target.value)}
                  style={S.input}/>
              </div>
            ))}

            <button style={{ ...S.btn, opacity:loading?.7:1 }} disabled={loading}
              onClick={() => {
                if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); return }
                if (form.password.length < 8) { setError('Password min 8 characters'); return }
                setError('')
                needsBranch ? setStep('branch') : handleSubmit()
              }}>
              {isWarehouse ? (loading ? 'Registering...' : 'Register') : 'Next →'}
            </button>
          </div>
        )}

        {/* STEP 3: Branch (restaurant only) */}
        {step === 'branch' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <button onClick={() => setStep('details')} style={S.back}>← Back</button>
              <span style={{ color:'#94a3b8', fontSize:13 }}>Select your restaurant</span>
            </div>

            {/* Toggle */}
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[
                { mode:'existing', label:'Existing Branch' },
                { mode:'new',      label:'New Restaurant' },
              ].map(opt => (
                <button key={opt.mode} onClick={() => set('branchMode', opt.mode)}
                  style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                    background: form.branchMode === opt.mode ? '#6366f1' : '#2a2f45',
                    color:'#fff' }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {form.branchMode === 'existing' ? (
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Select Branch *</label>
                <select value={form.branchId} onChange={e => set('branchId', e.target.value)} style={S.input}>
                  <option value="">— Choose branch —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:12 }}>
                  <label style={S.label}>Restaurant Name *</label>
                  <input placeholder="e.g. Anna Nagar Branch" value={form.restaurantName}
                    onChange={e => set('restaurantName', e.target.value)} style={S.input}/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={S.label}>Area / Address</label>
                  <input placeholder="12th Main Road, Anna Nagar" value={form.area}
                    onChange={e => set('area', e.target.value)} style={S.input}/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={S.label}>City</label>
                  <input placeholder="Chennai" value={form.city}
                    onChange={e => set('city', e.target.value)} style={S.input}/>
                </div>
              </>
            )}

            <button style={{ ...S.btn, opacity:loading?.7:1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Registering...' : 'Submit Registration'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const S: any = {
  page:     { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117', padding:16 },
  box:      { width:'100%', maxWidth:440, background:'#1e2235', border:'1px solid #2a2f45', borderRadius:20, padding:30 },
  title:    { color:'#f1f5f9', fontSize:22, fontWeight:900, marginBottom:4 },
  label:    { display:'block', color:'#94a3b8', fontSize:12, marginBottom:5, fontWeight:600 },
  input:    { width:'100%', padding:'9px 12px', borderRadius:10, background:'#161921', border:'1px solid #2a2f45', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box' },
  btn:      { width:'100%', padding:13, borderRadius:12, border:'none', background:'#6366f1', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:4 },
  err:      { background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'10px 14px', color:'#ef4444', fontSize:13, marginBottom:14 },
  back:     { background:'none', border:'1px solid #2a2f45', color:'#94a3b8', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:12 },
  roleCard: { display:'flex', alignItems:'center', gap:14, padding:'13px 16px', borderRadius:12, background:'#161921', cursor:'pointer', width:'100%', textAlign:'left' },
}
