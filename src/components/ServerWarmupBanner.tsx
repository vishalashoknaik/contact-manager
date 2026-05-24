'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { authApi } from '@/lib/api/client'

/** Milliseconds between each re-try ping while the server is unreachable. */
const RETRY_INTERVAL_MS = 5_000
/** Maximum time to keep retrying before switching to the hard-fail state. */
const WARMUP_TIMEOUT_MS = 2 * 60 * 1_000
/** Interval between progress bar ticks. */
const PROGRESS_TICK_MS = 200
/**
 * Target time (ms) for the bar to reach 90 %.
 * Using elapsed wall-clock time so throttled background tabs still advance correctly.
 */
const PROGRESS_DURATION_MS = 50_000
/** How long to hold the bar at 100 % before revealing the app. */
const REVEAL_DELAY_MS = 700

interface ServerWarmupBannerProps {
  children: ReactNode
}

/**
 * ServerWarmupBanner
 *
 * Shows a full-screen loading overlay that blocks all interaction until the
 * backend is reachable. Children are not mounted until the server responds.
 *
 * Progress bar behaviour:
 *   - Fills from 0 → 90 % linearly over 50 seconds.
 *   - Holds at 90 % if the server is still unreachable after 50 seconds.
 *   - Jumps to 100 % the moment the server responds.
 *
 * After WARMUP_TIMEOUT_MS (2 min) without a response the overlay switches to
 * an error state with a Retry button.
 */
export function ServerWarmupBanner({ children }: ServerWarmupBannerProps) {
  const [serverReady, setServerReady] = useState(false)
  const [timedOut, setTimedOut]       = useState(false)
  const [progress, setProgress]       = useState(0)

  const cancelledRef       = useRef(false)
  const serverReadyRef     = useRef(false)
  const startTimeRef       = useRef(0)
  const retryTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const timeoutTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealTimerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null)

  function clearAllTimers() {
    if (retryTimerRef.current)       { clearTimeout(retryTimerRef.current);        retryTimerRef.current = null }
    if (timeoutTimerRef.current)     { clearTimeout(timeoutTimerRef.current);      timeoutTimerRef.current = null }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
    if (revealTimerRef.current)      { clearTimeout(revealTimerRef.current);       revealTimerRef.current = null }
  }

  function startProgress() {
    if (progressIntervalRef.current) return
    startTimeRef.current = Date.now()
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      setProgress(Math.min(90, (elapsed / PROGRESS_DURATION_MS) * 90))
    }, PROGRESS_TICK_MS)
  }

  function markOnline() {
    serverReadyRef.current = true
    setTimedOut(false)
    // Stop retry/timeout/progress — keep the overlay alive until the bar completes
    if (retryTimerRef.current)       { clearTimeout(retryTimerRef.current);        retryTimerRef.current = null }
    if (timeoutTimerRef.current)     { clearTimeout(timeoutTimerRef.current);      timeoutTimerRef.current = null }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
    // Animate bar to 100 %, hold briefly, then reveal the app
    setProgress(100)
    revealTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current) setServerReady(true)
    }, REVEAL_DELAY_MS)
  }

  async function pingServer() {
    try {
      await authApi.ping()
      if (!cancelledRef.current) markOnline()
    } catch {
      if (cancelledRef.current) return
      retryTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current && !serverReadyRef.current) void pingServer()
      }, RETRY_INTERVAL_MS)
    }
  }

  function handleRetry() {
    serverReadyRef.current = false
    cancelledRef.current   = false
    setTimedOut(false)
    setProgress(0)
    clearAllTimers()
    retryTimerRef.current       = null
    progressIntervalRef.current = null
    startProgress()
    void pingServer()
    timeoutTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current && !serverReadyRef.current) {
        setTimedOut(true)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }
    }, WARMUP_TIMEOUT_MS)
  }

  useEffect(() => {
    cancelledRef.current = false
    startProgress()

    timeoutTimerRef.current = setTimeout(() => {
      if (!cancelledRef.current && !serverReadyRef.current) {
        setTimedOut(true)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }
    }, WARMUP_TIMEOUT_MS)

    void pingServer()

    return () => {
      cancelledRef.current = true
      clearAllTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Server is ready ─────────────────────────────────────────────────────────
  if (serverReady) return <>{children}</>

  // ── Shared overlay styles ───────────────────────────────────────────────────
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1117',
    color: '#fff',
    gap: 24,
    padding: '32px 24px',
    textAlign: 'center',
  }

  // ── Hard-fail / timeout state ───────────────────────────────────────────────
  if (timedOut) {
    return (
      <div role="alert" aria-live="assertive" style={overlayStyle}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
            Server could not be reached
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            The server did not respond after 2 minutes. Check your connection and try again.
          </p>
        </div>
        <button
          onClick={handleRetry}
          style={{
            padding: '10px 28px',
            backgroundColor: '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Loading / warmup state ──────────────────────────────────────────────────
  const displayPct = Math.round(progress)

  return (
    <div
      data-testid="server-warmup-banner"
      role="status"
      aria-live="polite"
      style={overlayStyle}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 40 }} aria-hidden="true">🌿</span>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Volunteers Coordination
        </span>
      </div>

      {/* Status */}
      <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
        Application is starting, please wait…
      </p>

      {/* Progress bar */}
      <div style={{ width: '90%', maxWidth: 360 }}>
        <div
          style={{
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            role="progressbar"
            aria-valuenow={displayPct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#198754',
              borderRadius: 99,
              transition: progress >= 99 ? 'width 0.5s ease-out' : 'width 0.2s linear',
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
          {displayPct >= 90 ? 'Almost ready…' : `${displayPct}%`}
        </p>
      </div>
    </div>
  )
}
