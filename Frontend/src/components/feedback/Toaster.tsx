import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useUi, type ToastTone } from '../../store/ui'

const TONE_STYLES: Record<ToastTone, { icon: any; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: '#2563eb', bg: 'rgba(37,99,235,.12)', border: 'rgba(37,99,235,.28)' },
  success: { icon: CheckCircle2, color: '#16a34a', bg: 'rgba(22,163,74,.12)', border: 'rgba(22,163,74,.28)' },
  warning: { icon: TriangleAlert, color: '#d97706', bg: 'rgba(217,119,6,.12)', border: 'rgba(217,119,6,.28)' },
  error: { icon: AlertCircle, color: '#dc2626', bg: 'rgba(220,38,38,.12)', border: 'rgba(220,38,38,.28)' },
}

export default function Toaster() {
  const { toasts, dismissToast } = useUi()

  if (!toasts.length) return null

  return (
    <div aria-live="polite" aria-atomic="false" style={{ position:'fixed', right:16, bottom:16, zIndex:1200, display:'grid', gap:10, width:'min(360px, calc(100vw - 24px))' }}>
      {toasts.map((toast) => {
        const tone = TONE_STYLES[toast.tone]
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            style={{
              display:'flex',
              gap:10,
              alignItems:'flex-start',
              padding:'12px 12px 12px 13px',
              borderRadius:14,
              background:'var(--card)',
              border:`1px solid ${tone.border}`,
              boxShadow:'0 16px 40px rgba(15,23,42,.18)',
            }}
          >
            <div style={{ width:32, height:32, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:tone.bg }}>
              <Icon size={16} style={{ color: tone.color }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {toast.title && <div style={{ fontSize:12, fontWeight:800, color:'var(--text)', marginBottom:2 }}>{toast.title}</div>}
              <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.45 }}>{toast.message}</div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{ border:'none', background:'transparent', color:'var(--muted)', cursor:'pointer', padding:2, display:'flex' }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
