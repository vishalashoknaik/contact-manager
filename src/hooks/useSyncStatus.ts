'use client'

import { useEffect, useState } from 'react'

interface UseSyncStatusOptions {
  isSyncing: boolean
  offlineWarningDelayMs?: number
}

export function useSyncStatus({
  isSyncing,
  offlineWarningDelayMs = 5000
}: UseSyncStatusOptions) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [showLongSyncNotice, setShowLongSyncNotice] = useState(false)
  const [showOfflineWarning, setShowOfflineWarning] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!isSyncing) {
      setShowLongSyncNotice(false)
      return
    }

    const timer = window.setTimeout(() => {
      setShowLongSyncNotice(true)
    }, 5000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isSyncing])

  useEffect(() => {
    if (isOnline) {
      setShowOfflineWarning(false)
      return
    }

    const timer = window.setTimeout(() => {
      setShowOfflineWarning(true)
    }, offlineWarningDelayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isOnline, offlineWarningDelayMs])

  return {
    isOnline,
    showLongSyncNotice,
    showOfflineWarning
  }
}