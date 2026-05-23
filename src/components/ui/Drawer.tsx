'use client'

import { ReactNode, useEffect, CSSProperties } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: number
}

/**
 * Right-side slide-in drawer panel.
 * Closes on Escape key or overlay click. Does not unmount children when closed
 * so form state is preserved while the animation plays.
 */
export function Drawer({ open, onClose, title, children, width = 420 }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          width,
          maxWidth: '100vw',
          backgroundColor: 'var(--bg-primary, #fff)',
          borderLeft: '1px solid var(--border-color, #e0e0e0)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 201,
          transform: open ? 'translateX(0)' : `translateX(${width}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #e0e0e0)',
          flexShrink: 0,
        }}>
          {title && (
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          )}
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 20,
              color: 'var(--text-secondary, #666)',
              padding: '4px 8px',
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
