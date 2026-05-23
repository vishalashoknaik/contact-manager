import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ServerWarmupBanner } from './ServerWarmupBanner'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  ping: vi.fn()
}))

vi.mock('@/lib/api/client', () => ({
  authApi: { ping: mocks.ping }
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderBanner() {
  return render(
    <ServerWarmupBanner>
      <div>App content</div>
    </ServerWarmupBanner>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ServerWarmupBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.ping.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('always renders children', async () => {
    mocks.ping.mockResolvedValue(undefined)
    renderBanner()
    expect(screen.getByText('App content')).toBeInTheDocument()
  })

  it('shows no banner when server responds immediately', async () => {
    mocks.ping.mockResolvedValue(undefined)
    renderBanner()

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.queryByTestId('server-warmup-banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows no banner during the 3-second grace period after first failed ping', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))
    renderBanner()

    await act(async () => {
      await Promise.resolve() // let the ping settle
    })

    // Just under 3 seconds — banner must not appear yet
    await act(async () => {
      vi.advanceTimersByTime(2999)
    })

    expect(screen.queryByTestId('server-warmup-banner')).not.toBeInTheDocument()
  })

  it('shows the "starting" banner after 3 seconds of server being unreachable', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))
    renderBanner()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByTestId('server-warmup-banner')).toBeInTheDocument()
    expect(screen.getByText(/application is starting/i)).toBeInTheDocument()
  })

  it('banner disappears as soon as the server responds after being visible', async () => {
    // First ping fails → banner appears; second ping (after 5s retry) succeeds
    mocks.ping
      .mockRejectedValueOnce(new Error('Cold'))
      .mockResolvedValue(undefined)

    renderBanner()

    // Let the first (failing) ping settle
    await act(async () => { await Promise.resolve() })

    // Advance past the 3-second show-notice delay
    await act(async () => { vi.advanceTimersByTime(3000) })

    expect(screen.getByTestId('server-warmup-banner')).toBeInTheDocument()

    // Advance past the 5-second retry interval; advanceTimersByTimeAsync flushes
    // the async ping callback so the state update is processed inside act
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(screen.queryByTestId('server-warmup-banner')).not.toBeInTheDocument()
  })

  it('banner role is "status" (polite) while checking, not "alert"', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))
    renderBanner()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    const banner = screen.getByTestId('server-warmup-banner')
    expect(banner).toHaveAttribute('role', 'status')
  })

  it('shows the timeout/error banner after 2 minutes of no server response', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))
    renderBanner()

    await act(async () => {
      await Promise.resolve()
    })

    // Advance to just past the 2-minute global timeout
    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000 + 100)
    })

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText(/could not be reached/i)).toBeInTheDocument()
  })

  it('timeout banner has a Retry button', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))
    renderBanner()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000 + 100)
    })

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('Retry button clears timeout banner and re-pings the server', async () => {
    mocks.ping.mockRejectedValue(new Error('Network error'))

    renderBanner()

    await act(async () => { await Promise.resolve() })

    // Let it time out
    await act(async () => { vi.advanceTimersByTime(2 * 60 * 1000 + 100) })

    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Now make future pings succeed
    mocks.ping.mockResolvedValue(undefined)

    // Click Retry — the handler calls pingServer() which calls authApi.ping()
    // Use advanceTimersByTimeAsync(0) to flush the microtask chain
    await act(async () => {
      screen.getByRole('button', { name: /retry/i }).click()
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('server-warmup-banner')).not.toBeInTheDocument()
  })

  it('retries ping on a 5-second interval until server responds', async () => {
    // Fail twice then succeed on third call
    mocks.ping
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue(undefined)

    renderBanner()

    // First ping fails
    await act(async () => { await Promise.resolve() })

    // Retry 1 fires at 5s and fails — banner becomes visible at 3s
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    // Retry 2 fires at 10s total and succeeds
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(screen.queryByTestId('server-warmup-banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('cleans up timers when component unmounts', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    mocks.ping.mockRejectedValue(new Error('Network error'))

    const { unmount } = renderBanner()
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
