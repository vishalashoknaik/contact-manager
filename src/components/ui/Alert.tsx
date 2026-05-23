'use client'

import { ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  style?: React.CSSProperties
  role?: string
}

const icon: Record<AlertVariant, string> = {
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
  success: '✓',
}

const variantStyles: Record<AlertVariant, React.CSSProperties> = {
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    color: 'var(--color-danger-fg)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px solid var(--color-warning-border)',
    color: 'var(--color-warning-fg)',
  },
  info: {
    backgroundColor: 'var(--color-info-bg)',
    border: '1px solid var(--color-info-border)',
    color: 'var(--color-info-fg)',
  },
  success: {
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid var(--color-success-border)',
    color: 'var(--color-success-fg)',
  },
}

export function Alert({ variant = 'info', children, style, role }: AlertProps) {
  return (
    <div
      role={role ?? (variant === 'error' ? 'alert' : 'status')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        lineHeight: 1.5,
        ...variantStyles[variant],
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700, flexShrink: 0, fontSize: 14 }}>
        {icon[variant]}
      </span>
      <span>{children}</span>
    </div>
  )
}
