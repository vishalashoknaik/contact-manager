'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: React.CSSProperties
  /** Padding preset: sm=12px, md=16px, lg=24px. Defaults to md. */
  padding?: 'sm' | 'md' | 'lg'
}

const paddingMap = { sm: 12, md: 16, lg: 24 }

export function Card({ children, style, padding = 'md' }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: paddingMap[padding],
        ...style,
      }}
    >
      {children}
    </div>
  )
}
