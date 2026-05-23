'use client'

import { CSSProperties } from 'react'

interface ProgressRingProps {
  /** 0–total */
  completed: number
  /** 0–total */
  pending: number
  /** 0–total */
  skipped: number
  size?: number
  strokeWidth?: number
  style?: CSSProperties
}

/**
 * Circular SVG progress ring for campaigns.
 * Segments: green = completed, amber = skipped, light-grey = pending/remaining.
 */
export function ProgressRing({
  completed,
  pending,
  skipped,
  size = 56,
  strokeWidth = 6,
  style,
}: ProgressRingProps) {
  const total = completed + pending + skipped
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2

  function arc(fraction: number) {
    return fraction * circumference
  }

  // Draw arcs: completed (green) first, then skipped (amber), then pending (grey)
  const completedDash = arc(total > 0 ? completed / total : 0)
  const skippedDash = arc(total > 0 ? skipped / total : 0)
  // pending fills the rest

  // Each segment starts where the previous one ended
  const skippedOffset = circumference - completedDash
  const pendingOffset = circumference - completedDash - skippedDash

  // The SVG uses strokeDashoffset to position arcs.
  // We rotate -90deg so segments start at the top.
  const commonProps = {
    cx, cy, r,
    fill: 'none',
    strokeWidth,
    strokeLinecap: 'butt' as const,
  }

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle {...commonProps} stroke="var(--border-color, #e0e0e0)" strokeDasharray={circumference} />
        {/* Skipped segment (amber) */}
        {skipped > 0 && (
          <circle
            {...commonProps}
            stroke="#fd7e14"
            strokeDasharray={`${skippedDash} ${circumference - skippedDash}`}
            strokeDashoffset={skippedOffset}
          />
        )}
        {/* Completed segment (green) */}
        {completed > 0 && (
          <circle
            {...commonProps}
            stroke="#198754"
            strokeDasharray={`${completedDash} ${circumference - completedDash}`}
            strokeDashoffset={0}
          />
        )}
      </svg>
      <span style={{
        position: 'absolute',
        fontSize: size < 48 ? 10 : 12,
        fontWeight: 700,
        color: 'var(--text-primary, #000)',
      }}>
        {pct}%
      </span>
    </div>
  )
}
