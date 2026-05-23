'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { attendanceApi } from '@/lib/api/client'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import {
  AttendanceEntry,
  SessionConfig,
  getStorageKey,
  savePersistedAttendanceState,
  clearPersistedAttendanceState,
} from '@/components/AttendanceEntry'
import type { AttendanceSession } from '@/lib/api/client'

export default function AttendanceSessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isLoggedIn, isLoading, selectedCenter, selectedCenterDetails } = useAuth()
  const centerLabel = selectedCenterDetails?.name || selectedCenter || 'Unknown Center'

  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionVolunteers, setSessionVolunteers] = useState<Array<{ phone: string; name: string }>>([])

  const storageKey = selectedCenter ? getStorageKey(selectedCenter) : ''

  const { showLongSyncNotice, showOfflineWarning } = useSyncStatus({ isSyncing: loading })

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/')
    }
  }, [isLoading, isLoggedIn, router])

  useEffect(() => {
    if (!selectedCenter || !id) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    const loadSession = async () => {
      try {
        const sessions = await attendanceApi.listSessions(selectedCenter)
        if (cancelled) return
        const found = sessions.find(s => s.id === id)
        if (!found) {
          setLoadError('Session not found or you do not have access to it.')
          setLoading(false)
          return
        }
        setSession(found)
        setSessionVolunteers(found.volunteers)
        setLoading(false)
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'Failed to load attendance session.')
          setLoading(false)
        }
      }
    }

    void loadSession()
    return () => { cancelled = true }
  }, [selectedCenter, id])

  if (isLoading || loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #666)' }}>
        Loading session…
      </div>
    )
  }

  if (!isLoggedIn) return null

  if (!selectedCenter) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #666)' }}>
        Please select a center first.{' '}
        <button
          onClick={() => router.push('/')}
          style={{ color: '#0d6efd', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Go home
        </button>
      </div>
    )
  }

  if (loadError || !session) {
    return (
      <div style={{ padding: 40, maxWidth: 500, margin: '0 auto' }}>
        <p style={{ color: '#842029', marginBottom: 16 }}>{loadError ?? 'Session not found.'}</p>
        <button
          onClick={() => router.push('/attendance')}
          style={{ color: '#0d6efd', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Back to attendance
        </button>
      </div>
    )
  }

  const sessionConfig: SessionConfig = {
    name: session.name,
    activities: session.activities,
    areas: session.areas,
    programs: session.programs,
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--background, #f8f9fa)',
        color: 'var(--text-primary, #000)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #fff)',
          borderBottom: '1px solid var(--border-color, #dee2e6)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/attendance')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            padding: '0 4px',
            color: 'var(--text-secondary, #555)',
          }}
          title="Back to attendance list"
        >
          ←
        </button>
        <span style={{ fontWeight: 600, fontSize: 16, flex: '1 1 260px' }}>
          {session.name} — {centerLabel}
        </span>
        {session.endedAt && (
          <span style={{
            padding: '2px 10px', borderRadius: 12,
            backgroundColor: '#f8d7da', color: '#842029',
            fontSize: 12, fontWeight: 500,
          }}>
            Session ended
          </span>
        )}
      </div>

      <SyncStatusNotices
        isSyncing={loading}
        syncMessage="Loading session data…"
        showLongSyncNotice={showLongSyncNotice}
        showOfflineWarning={showOfflineWarning}
        offlineMessage="You appear to be offline. Entries will be saved locally and synced when you reconnect."
      />

      <AttendanceEntry
        sessionId={session.id}
        centerId={selectedCenter}
        session={sessionConfig}
        storageKey={storageKey}
        volunteers={sessionVolunteers}
        onAddVolunteer={async (volunteerPhone, volunteerName) => {
          const updated = volunteerName
            ? await attendanceApi.addSessionVolunteer(session.id, volunteerPhone, selectedCenter, volunteerName)
            : await attendanceApi.addSessionVolunteer(session.id, volunteerPhone, selectedCenter)
          setSessionVolunteers(updated.volunteers)
        }}
        onEndSession={async () => {
          await attendanceApi.endSession(session.id, selectedCenter)
          clearPersistedAttendanceState(storageKey)
          router.push('/attendance')
        }}
      />
    </div>
  )
}
