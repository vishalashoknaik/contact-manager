'use client'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: React.CSSProperties
}

const variantMap: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success-fg)',
    border: '1px solid var(--color-success-border)',
  },
  danger: {
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger-fg)',
    border: '1px solid var(--color-danger-border)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning-fg)',
    border: '1px solid var(--color-warning-border)',
  },
  info: {
    backgroundColor: 'var(--color-info-bg)',
    color: 'var(--color-info-fg)',
    border: '1px solid var(--color-info-border)',
  },
  neutral: {
    backgroundColor: 'var(--color-muted-bg)',
    color: 'var(--color-muted-fg)',
    border: '1px solid var(--color-muted-border)',
  },
  purple: {
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    border: '1px solid #c4b5fd',
  },
}

export function Badge({ variant = 'neutral', children, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
        ...variantMap[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
