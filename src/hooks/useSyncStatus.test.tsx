import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSyncStatus } from './useSyncStatus'

describe('useSyncStatus', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    })
  })

  it('tracks online and offline browser events', () => {
    const { result } = renderHook(() => useSyncStatus({ isSyncing: false }))

    expect(result.current.isOnline).toBe(true)
    expect(result.current.showOfflineWarning).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOnline).toBe(true)
  })

  it('shows the long sync notice after 5 seconds and clears it when syncing finishes', () => {
    try {
      vi.useFakeTimers()
      const { result, rerender } = renderHook(
        ({ isSyncing }) => useSyncStatus({ isSyncing }),
        { initialProps: { isSyncing: true } }
      )

      expect(result.current.showLongSyncNotice).toBe(false)

      act(() => {
        vi.advanceTimersByTime(4999)
      })

      expect(result.current.showLongSyncNotice).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(result.current.showLongSyncNotice).toBe(true)

      rerender({ isSyncing: false })

      expect(result.current.showLongSyncNotice).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the offline warning only after the configured delay and clears it when online again', () => {
    try {
      vi.useFakeTimers()
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false
      })

      const { result } = renderHook(() => useSyncStatus({ isSyncing: false, offlineWarningDelayMs: 1200 }))

      expect(result.current.isOnline).toBe(false)
      expect(result.current.showOfflineWarning).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1199)
      })

      expect(result.current.showOfflineWarning).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(result.current.showOfflineWarning).toBe(true)

      act(() => {
        window.dispatchEvent(new Event('online'))
      })

      expect(result.current.isOnline).toBe(true)
      expect(result.current.showOfflineWarning).toBe(false)
    } finally {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true
      })
      vi.useRealTimers()
    }
  })

  it('is already online on mount — no offline warning ever appears', () => {
    try {
      vi.useFakeTimers()
      const { result } = renderHook(() => useSyncStatus({ isSyncing: false, offlineWarningDelayMs: 500 }))

      expect(result.current.isOnline).toBe(true)

      act(() => vi.advanceTimersByTime(1000))

      expect(result.current.showOfflineWarning).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('isSyncing starts false — long sync notice never fires', () => {
    try {
      vi.useFakeTimers()
      const { result } = renderHook(() => useSyncStatus({ isSyncing: false }))

      act(() => vi.advanceTimersByTime(10000))

      expect(result.current.showLongSyncNotice).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('multiple rapid offline/online cycles do not leave stale warning', () => {
    try {
      vi.useFakeTimers()
      const { result } = renderHook(() => useSyncStatus({ isSyncing: false, offlineWarningDelayMs: 500 }))

      // Go offline
      act(() => window.dispatchEvent(new Event('offline')))
      expect(result.current.isOnline).toBe(false)

      // Advance only partway — no warning yet
      act(() => vi.advanceTimersByTime(300))
      expect(result.current.showOfflineWarning).toBe(false)

      // Come back online before delay expires
      act(() => window.dispatchEvent(new Event('online')))
      expect(result.current.isOnline).toBe(true)

      // Advance past original delay — warning must NOT fire
      act(() => vi.advanceTimersByTime(500))
      expect(result.current.showOfflineWarning).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('long sync notice resets when isSyncing toggles false then true', () => {
    try {
      vi.useFakeTimers()
      const { result, rerender } = renderHook(
        ({ isSyncing }) => useSyncStatus({ isSyncing }),
        { initialProps: { isSyncing: true } }
      )

      act(() => vi.advanceTimersByTime(5000))
      expect(result.current.showLongSyncNotice).toBe(true)

      rerender({ isSyncing: false })
      expect(result.current.showLongSyncNotice).toBe(false)

      // Start syncing again — notice should reappear after 5s
      rerender({ isSyncing: true })
      expect(result.current.showLongSyncNotice).toBe(false)

      act(() => vi.advanceTimersByTime(5000))
      expect(result.current.showLongSyncNotice).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})