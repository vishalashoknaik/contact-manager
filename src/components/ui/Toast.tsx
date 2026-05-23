'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
  exiting: boolean
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION_MS = 4000
const EXIT_MS = 300

const variantStyles: Record<ToastVariant, React.CSSProperties> = {
  success: { backgroundColor: 'var(--color-success)',   color: '#fff' },
  error:   { backgroundColor: 'var(--color-danger)',    color: '#fff' },
  warning: { backgroundColor: 'var(--color-warning)',   color: '#fff' },
  info:    { backgroundColor: 'var(--color-primary)',   color: '#fff' },
}

const variantIcon: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

let nextId = 1

/**
 * ToastProvider — place this near the root layout.
 * All children can call useToast() to fire toast notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    // Trigger exit animation first
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, EXIT_MS)
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, variant, exiting: false }])

    const timer = setTimeout(() => removeToast(id), DURATION_MS)
    timersRef.current.set(id, timer)

    return () => {
      const t = timersRef.current.get(id)
      if (t) { clearTimeout(t); timersRef.current.delete(id) }
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack — bottom-right on desktop, bottom-center on mobile */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 10,
          maxWidth: 360,
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              fontSize: 14,
              fontWeight: 500,
              pointerEvents: 'all',
              animation: toast.exiting
                ? `toast-out ${EXIT_MS}ms ease forwards`
                : 'toast-in 0.25s ease forwards',
              ...variantStyles[toast.variant],
            }}
          >
            <span aria-hidden="true" style={{ fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {variantIcon[toast.variant]}
            </span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                opacity: 0.8,
                cursor: 'pointer',
                padding: '0 2px',
                minHeight: 0,
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Hook to fire toast notifications from any client component. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
