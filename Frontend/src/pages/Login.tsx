import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { login } from '../api'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin() {
    if (!email || !password) { setError('Enter email and password'); return }
    setLoading(true)
    setError('')
    try {
      const res = await login(email, password)
      const d = res.data.data
      setAuth(d.user, d.accessToken, d.refreshToken)
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.message || ''
      // Show friendly messages for pending/rejected
      if (msg.toLowerCase().includes('not approved') || msg.toLowerCase().includes('pending')) {
        setError('⏳ Your account is pending admin approval. Please wait.')
      } else if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('inactive')) {
        setError('❌ Your account has been rejected. Contact support.')
      } else {
        setError('Invalid email or password')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f1117', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:400, background:'#1e2235', border:'1px solid #2a2f45', borderRadius:20, padding:40 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:16, margin:'0 auto 14px', background:'linear-gradient(135deg,#6366f1,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🛒</div>
          <h1 style={{ color:'#f1f5f9', margin:0, fontSize:26, fontWeight:900 }}><span style={{color:'#6366f1'}}>VB</span> World</h1>
          <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>Supply Chain Management</p>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'10px 14px', marginBottom:16, color:'#ef4444', fontSize:13 }}>
            {error}
          </div>
        )}

        <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginBottom:5, fontWeight:500 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="admin@vbworld.in" autoComplete="off"
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'#161921', border:'1px solid #2a2f45', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:14 }} />

        <label style={{ display:'block', color:'#94a3b8', fontSize:12, marginBottom:5, fontWeight:500 }}>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Enter password" autoComplete="new-password"
          style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'#161921', border:'1px solid #2a2f45', color:'#f1f5f9', fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:20 }} />

        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:'#6366f1', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', opacity:loading?0.7:1, marginBottom:12 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p style={{ color:'#64748b', fontSize:13, textAlign:'center' }}>
          Don't have an account?{' '}
          <span style={{ color:'#6366f1', cursor:'pointer', fontWeight:600 }} onClick={() => navigate('/register')}>
            Register
          </span>
        </p>

        <div style={{ marginTop:16, borderTop:'1px solid #2a2f45', paddingTop:14 }}>
          <p style={{ color:'#64748b', fontSize:11, marginBottom:8 }}>Demo credentials:</p>
          <button onClick={() => { setEmail('admin@vbworld.in'); setPassword('password') }}
            style={{ width:'100%', padding:'7px 12px', borderRadius:8, background:'#161921', border:'1px solid #2a2f45', color:'#94a3b8', fontSize:12, cursor:'pointer', textAlign:'left' }}>
            👑 Admin — admin@vbworld.in / password
          </button>
        </div>
      </div>
    </div>
  )
}
