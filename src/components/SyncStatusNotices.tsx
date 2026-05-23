'use client'

import { Alert } from '@/components/ui/Alert'

interface SyncStatusNoticesProps {
  isSyncing?: boolean
  syncMessage?: string
  showLongSyncNotice?: boolean
  longSyncMessage?: string
  showOfflineWarning?: boolean
  offlineMessage?: string
  margin?: string
}

export function SyncStatusNotices({
  isSyncing = false,
  syncMessage = 'Sync has not happened yet.',
  showLongSyncNotice = false,
  longSyncMessage = 'Sync has not happened for more than 5 seconds.',
  showOfflineWarning = false,
  offlineMessage = 'Internet connection is unavailable. Latest data may be outdated until connection returns.',
  margin = '12px 16px 0'
}: SyncStatusNoticesProps) {
  return (
    <>
      {isSyncing && (
        <Alert variant="warning" style={{ margin }}>{syncMessage}</Alert>
      )}
      {showLongSyncNotice && (
        <Alert variant="error" style={{ margin }}>{longSyncMessage}</Alert>
      )}
      {showOfflineWarning && (
        <Alert variant="warning" style={{ margin }}>{offlineMessage}</Alert>
      )}
    </>
  )
}