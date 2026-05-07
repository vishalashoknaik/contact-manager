'use client'

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
        <div
          style={{
            margin,
            padding: '8px 12px',
            borderRadius: 6,
            backgroundColor: '#fff3cd',
            border: '1px solid #ffe69c',
            color: '#856404',
            fontSize: 13
          }}
        >
          {syncMessage}
        </div>
      )}

      {showLongSyncNotice && (
        <div
          style={{
            margin: margin === '12px 16px 0' ? '8px 16px 0' : margin,
            padding: '8px 12px',
            borderRadius: 6,
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c2c7',
            color: '#842029',
            fontSize: 13
          }}
        >
          {longSyncMessage}
        </div>
      )}

      {showOfflineWarning && (
        <div
          style={{
            margin: margin === '12px 16px 0' ? '8px 16px 0' : margin,
            padding: '8px 12px',
            borderRadius: 6,
            backgroundColor: '#fff3cd',
            border: '1px solid #ffe69c',
            color: '#856404',
            fontSize: 13
          }}
        >
          {offlineMessage}
        </div>
      )}
    </>
  )
}