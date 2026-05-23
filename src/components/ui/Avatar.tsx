'use client'

import { CSSProperties } from 'react'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  style?: CSSProperties
}

/** Derive a stable hue from a name string so each person gets a consistent colour. */
function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const sizeMap = { sm: 28, md: 36, lg: 48 }
const fontMap = { sm: 11, md: 13, lg: 17 }

export function Avatar({ name, size = 'md', style }: AvatarProps) {
  const hue = nameToHue(name)
  const dim = sizeMap[size]
  const fs = fontMap[size]
  const bg = `hsl(${hue}, 55%, 45%)`

  return (
    <div
      aria-label={name}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        backgroundColor: bg,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fs,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    >
      {initials(name)}
    </div>
  )
}
