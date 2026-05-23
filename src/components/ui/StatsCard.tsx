'use client'

import { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

interface StatsCardProps {
  icon: string
  value: number | string
  label: string
  href?: string
  color?: string
  style?: CSSProperties
}

export function StatsCard({ icon, value, label, href, color = 'var(--color-primary)', style }: StatsCardProps) {
  const inner = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
      padding: '16px 20px',
      borderRadius: 'var(--radius-lg, 12px)',
      backgroundColor: 'var(--panel-bg, #f8f9fa)',
      border: '1px solid var(--border-color, #e0e0e0)',
      minWidth: 120,
      transition: href ? 'box-shadow 0.15s' : undefined,
      cursor: href ? 'pointer' : 'default',
      textDecoration: 'none',
      color: 'inherit',
      ...style,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)', fontWeight: 500 }}>{label}</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </Link>
    )
  }

  return inner
}
