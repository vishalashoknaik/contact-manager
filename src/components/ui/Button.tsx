'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'purple'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary:   { backgroundColor: 'var(--color-primary)',   color: 'var(--color-primary-text)',   border: 'none' },
  secondary: { backgroundColor: 'var(--color-secondary)', color: 'var(--color-secondary-text)', border: 'none' },
  danger:    { backgroundColor: 'var(--color-danger)',    color: 'var(--color-danger-text)',    border: 'none' },
  success:   { backgroundColor: 'var(--color-success)',   color: 'var(--color-success-text)',   border: 'none' },
  ghost:     { backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' },
  purple:    { backgroundColor: 'var(--color-purple)',    color: '#ffffff',                     border: 'none' },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 10px',  fontSize: 13, minHeight: 32, borderRadius: 'var(--radius-sm)' },
  md: { padding: '8px 16px',  fontSize: 14, minHeight: 40, borderRadius: 'var(--radius-md)' },
  lg: { padding: '11px 22px', fontSize: 15, minHeight: 48, borderRadius: 'var(--radius-md)' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontWeight: 600,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.65 : 1,
    transition: 'opacity 0.15s, background-color 0.15s',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  }

  return (
    <button disabled={isDisabled} style={base} {...rest}>
      {loading && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  )
}
