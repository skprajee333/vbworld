import { AlertCircle, Loader2, PackageSearch, RefreshCcw } from 'lucide-react'
import type { ReactNode } from 'react'

type StateProps = {
  title: string
  message: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
  tone?: 'status' | 'alert'
}

function StateCard({ title, message, icon, actionLabel, onAction, compact, tone = 'status' }: StateProps) {
  return (
    <div
      role={tone}
      aria-live={tone === 'alert' ? 'assertive' : 'polite'}
      style={{
        padding: compact ? 18 : 28,
        minHeight: compact ? undefined : 180,
        borderRadius: 16,
        border: '1px dashed var(--border)',
        background: 'linear-gradient(180deg, rgba(99,102,241,.06), rgba(15,23,42,.02))',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6 }}>{message}</div>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            style={{
              marginTop: 14,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RefreshCcw size={14} /> {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function LoadingState({ title = 'Loading...', message = 'Please wait while we bring this section in.' }: Partial<StateProps>) {
  return (
    <StateCard
      title={title}
      message={message}
      icon={<Loader2 size={22} style={{ color: '#6366f1' }} className="spin" />}
      compact
      tone="status"
    />
  )
}

export function EmptyState({ title, message, actionLabel, onAction, compact = true }: StateProps) {
  return (
    <StateCard
      title={title}
      message={message}
      icon={<PackageSearch size={22} style={{ color: '#6366f1' }} />}
      actionLabel={actionLabel}
      onAction={onAction}
      compact={compact}
      tone="status"
    />
  )
}

export function ErrorState({ title, message, actionLabel = 'Try Again', onAction, compact = true }: StateProps) {
  return (
    <StateCard
      title={title}
      message={message}
      icon={<AlertCircle size={22} style={{ color: '#ef4444' }} />}
      actionLabel={actionLabel}
      onAction={onAction}
      compact={compact}
      tone="alert"
    />
  )
}
