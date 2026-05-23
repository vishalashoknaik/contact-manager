'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { authApi } from '@/lib/api/client'

/** Milliseconds before the notice becomes visible after a failed ping. */
const SHOW_NOTICE_DELAY_MS = 3_000
/** Milliseconds between each re-try ping while the server is unreachable. */
const RETRY_INTERVAL_MS = 5_000
/** Maximum time to keep retrying before switching to the timeout state. */
const WARMUP_TIMEOUT_MS = 2 * 60 * 1_000

type Status = 'checking' | 'online' | 'timeout'

interface ServerWarmupBannerProps {
  children: ReactNode
}

/**
 * ServerWarmupBanner
 *
 * Pings the backend once on mount. If the server does not respond within
 * SHOW_NOTICE_DELAY_MS a sticky green banner is shown at the top of every
 * page telling the user the application is starting. The banner disappears
 * the moment the server responds. After WARMUP_TIMEOUT_MS it turns red and
 * offers a Retry button.
 *
 * The component renders its children unconditionally so cached content
 * remains visible beneath the banner while the server warms up.
 */
export function ServerWarmupBanner({ children }: ServerWarmupBannerProps) {
  const [status, setStatus] = useState<Status>('checking')
  const [showBanner, setShowBanner] = useState(false)

  const cancelledRef = useRef(false)
  const statusRef = useRef<Status>('checking')
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearAllTimers() {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
  }

  function markOnline() {
    statusRef.current = 'online'
    setStatus('online')
    setShowBanner(false)
    clearAllTimers()
  }

  async function pingServer() {
    try {
      await authApi.ping()
      if (!cancelledRef.current) markOnline()
    } catch {
      if (cancelledRef.current) return

      // Schedule the visible notice only once
      if (!noticeTimerRef.current) {
        noticeTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current && statusRef.current !== 'online') {
            setShowBanner(true)
          }
        }, SHOW_NOTICE_DELAY_MS)
      }

      // Retry after a short interval
      retryTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current && statusRef.current !== 'online') {
          void pingServer()
        }
      }, RETRY_INTERVAL_MS)
    }
  }

  function handleRetry() {
    statusRef.current = 'checking'
    setStatus('checking')
    setShowBanner(false)
    cancelledRef.current = false
    clearAllTimers()
    noticeTimerRef.current = null
    void pingServer()
    // Restart the global timeout
    timeoutTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current && statusRef.current !== 'online') {
        statusRef.current = 'timeout'
        setStatus('timeout')
        setShowBanner(true)
      }
    }, WARMUP_TIMEOUT_MS)
  }

  useEffect(() => {
    cancelledRef.current = false

    // Global timeout — switch to hard-fail state if server never responds
    timeoutTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current && statusRef.current !== 'online') {
        statusRef.current = 'timeout'
        setStatus('timeout')
        setShowBanner(true)
      }
    }, WARMUP_TIMEOUT_MS)

    void pingServer()

    return () => {
      cancelledRef.current = true
      clearAllTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bannerBase: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
  }

  return (
    <>
      {children}

      {showBanner && status === 'timeout' && (
        <div
          role="alert"
          aria-live="assertive"
          style={{ ...bannerBase, backgroundColor: '#dc3545', color: '#fff' }}
        >
          <span>⚠️ Server could not be reached after 2 minutes. Some features may not work.</span>
          <button
            onClick={handleRetry}
            style={{
              marginLeft: 'auto',
              padding: '5px 14px',
              backgroundColor: '#fff',
              color: '#dc3545',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Retry
          </button>
        </div>
      )}

      {showBanner && status === 'checking' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="server-warmup-banner"
          style={{ ...bannerBase, backgroundColor: '#198754', color: '#fff' }}
        >
          <span
            style={{ display: 'inline-block', animation: 'warmup-spin 1.2s linear infinite' }}
            aria-hidden="true"
          >
            🌿
          </span>
          <span>Application is starting, please wait…</span>
          <style>{`
            @keyframes warmup-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
