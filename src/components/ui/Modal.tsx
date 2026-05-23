'use client'

import { ReactNode, useEffect, useRef } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Max width of the dialog box, default 480px */
  maxWidth?: number | string
  /** If true the backdrop click and Escape key do not close the modal */
  disableDismiss?: boolean
}

/**
 * Modal — accessible dialog overlay.
 *
 * Traps focus within the dialog while open, restores focus on close,
 * and closes on Escape key press (unless disableDismiss is set).
 * Locks body scroll while open.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 480,
  disableDismiss = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Lock body scroll and capture focus when modal opens
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog after paint
    const raf = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen || disableDismiss) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, disableDismiss, onClose])

  if (!isOpen) return null

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  }

  const dialog: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'var(--bg-primary, #fff)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth,
    maxHeight: '90dvh',
    overflowY: 'auto',
    padding: '24px',
  }

  return (
    <div
      style={overlay}
      onClick={disableDismiss ? undefined : (e) => { if (e.target === e.currentTarget) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div ref={dialogRef} style={dialog}>
        {title && (
          <h2
            id="modal-title"
            style={{
              margin: '0 0 16px 0',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * ConfirmModal — styled replacement for window.confirm().
 *
 * Shows a message and two buttons: Cancel (ghost) and a configurable
 * Confirm button whose variant defaults to 'danger'.
 */
interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary' | 'success'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  const variantColour: Record<string, string> = {
    danger:  'var(--color-danger)',
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth={420} disableDismiss={isLoading}>
      <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: variantColour[confirmVariant],
            color: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
            opacity: isLoading ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isLoading && (
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 13,
                height: 13,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          )}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
