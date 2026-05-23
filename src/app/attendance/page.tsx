'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { attendanceApi } from '@/lib/api/client'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { Button } from '@/components/ui/Button'
import {
  AttendanceEntry,
  SessionConfig,
  getStorageKey,
  savePersistedAttendanceState,
  clearPersistedAttendanceState,
} from '@/components/AttendanceEntry'
import type { AttendanceSession } from '@/lib/api/client'

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({
  activities,
  areas,
  programs,
  sessions,
  onStart,
  onResume,
  onReopen,
  onDelete
}: {
  activities: string[]
  areas: string[]
  programs: string[]
  sessions: AttendanceSession[]
  onStart: (config: SessionConfig) => void | Promise<void>
  onResume: (session: AttendanceSession) => void
  onReopen: (session: AttendanceSession) => void | Promise<void>
  onDelete: (session: AttendanceSession) => void | Promise<void>
}) {
  const [selected, setSelected] = useState<SessionConfig>({
    name: 'Attendance Session',
    activities: [],
    areas: [],
    programs: []
  })

  function toggle(
    category: Exclude<keyof SessionConfig, 'name'>,
    value: string,
    checked: boolean
  ) {
    setSelected(prev => ({
      ...prev,
      [category]: checked
        ? [...prev[category], value]
        : prev[category].filter(v => v !== value)
    }))
  }

  const noneSelected =
    selected.activities.length === 0 &&
    selected.areas.length === 0 &&
    selected.programs.length === 0

  function CheckGroup({
    label,
    items,
    category
  }: {
    label: string
    items: string[]
    category: Exclude<keyof SessionConfig, 'name'>
  }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary, #000)' }}>{label}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => {
            const inputId = `${category}-${item}`
            return (
            <label
              key={item}
              htmlFor={inputId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: `1px solid ${selected[category].includes(item) ? '#0d6efd' : 'var(--border-color, #ccc)'}`,
                borderRadius: 20,
                cursor: 'pointer',
                backgroundColor: selected[category].includes(item) ? 'rgba(13, 110, 253, 0.18)' : 'var(--panel-bg, #fff)',
                color: 'var(--text-primary, #000)',
                fontSize: 14,
                userSelect: 'none'
              }}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={selected[category].includes(item)}
                onChange={e => toggle(category, item, e.target.checked)}
                style={{ accentColor: '#0d6efd' }}
              />
              {item}
            </label>
          )})}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Attendance</h1>
      <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 16 }}>
        Give a session name and choose which programs, areas, or activities to track attendance for.
      </p>

      {sessions.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary, #000)' }}>
            Your Available Sessions
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {sessions.map(session => (
              <div
                key={session.id}
                style={{
                  border: '1px solid var(--border-color, #ddd)',
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: 'var(--panel-bg, #fff)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{session.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginTop: 2 }}>
                      {new Date(session.createdAt).toLocaleString()} · {session.attendeeCount ?? 0} attendee{(session.attendeeCount ?? 0) !== 1 ? 's' : ''} · {(session.attendanceTakerCount ?? session.volunteers.length)} attendance taker{(session.attendanceTakerCount ?? session.volunteers.length) !== 1 ? 's' : ''} · {session.endedAt ? 'Ended' : 'Active'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {session.endedAt ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => { void onReopen(session) }}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onResume(session)}
                      >
                        Continue
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { void onDelete(session) }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--text-primary, #000)' }}>
        Create New Session
      </h3>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }} htmlFor="attendance-session-name">
          Session Name
        </label>
        <input
          id="attendance-session-name"
          type="text"
          value={selected.name}
          onChange={e => setSelected(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Morning Walkathon"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border-color, #ced4da)',
            borderRadius: 6,
            fontSize: 15,
            boxSizing: 'border-box',
            backgroundColor: 'var(--input-bg, #fff)',
            color: 'var(--text-primary, #000)'
          }}
        />
      </div>

      <CheckGroup label="Programs" items={programs} category="programs" />
      <CheckGroup label="Areas" items={areas} category="areas" />
      <CheckGroup label="Activities" items={activities} category="activities" />

      {activities.length === 0 && areas.length === 0 && programs.length === 0 && (
        <p style={{ color: 'var(--text-secondary, #888)', fontStyle: 'italic' }}>
          No programs, areas, or activities configured yet. Add them in the Admin panel first.
        </p>
      )}

      <div style={{ marginTop: 32, display: 'flex', gap: 12, marginBottom: 24 }}>
        <Button
          variant="success"
          size="md"
          disabled={noneSelected}
          onClick={() => { void onStart(selected) }}
          style={{ width: '100%' }}
        >
          ▶ Start Attendance
        </Button>
      </div>
    </div>
  )
}
// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const router = useRouter()
  const { isLoggedIn, isLoading, selectedCenter, selectedCenterDetails } = useAuth()
  const { activities, areas, programs, isLoaded: configLoaded, error: configError } = useConfig()
  const centerLabel = selectedCenterDetails?.name || selectedCenter || 'Unknown Center'
  const storageKey = selectedCenter ? getStorageKey(selectedCenter) : ''
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionVolunteers, setSessionVolunteers] = useState<Array<{ phone: string; name: string }>>([])
  const [session, setSession] = useState<SessionConfig | null>(null)
  const [availableSessions, setAvailableSessions] = useState<AttendanceSession[]>([])
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionDataSyncing, setSessionDataSyncing] = useState(true)
  const [hasLoadedSessionsOnce, setHasLoadedSessionsOnce] = useState(false)
  const {
    isOnline: isSessionOnline,
    showLongSyncNotice: showSessionLongSyncNotice,
    showOfflineWarning: showSessionOfflineWarning
  } = useSyncStatus({ isSyncing: sessionDataSyncing })

  useEffect(() => {
    if (!selectedCenter) return
    let cancelled = false
    let refreshTimer: number | null = null
    let refreshInterval: number | null = null

    setSessionDataSyncing(true)
    setHasLoadedSessionsOnce(false)
    setSession(null)
    setSessionId(null)
    setSessionVolunteers([])
    setAvailableSessions([])

    const loadSessions = async () => {
      setSessionDataSyncing(true)
      try {
        const sessions = await attendanceApi.listSessions(selectedCenter)
        if (cancelled) return

        setAvailableSessions(sessions)
        setHasLoadedSessionsOnce(true)
        setSessionDataSyncing(false)
      } catch (err) {
        if (cancelled) return
        setSessionError(err instanceof Error ? err.message : 'Failed to load attendance sessions. Please refresh.')
        setAvailableSessions([])
        setSessionDataSyncing(false)
      }
    }

    void loadSessions()
    refreshTimer = window.setTimeout(() => {
      void loadSessions()
    }, 2000)

    refreshInterval = window.setInterval(() => {
      // Skip polling while the tab is backgrounded to avoid unnecessary server load
      if (!document.hidden) void loadSessions()
    }, 15000)

    return () => {
      cancelled = true
      if (refreshTimer) window.clearTimeout(refreshTimer)
      if (refreshInterval) window.clearInterval(refreshInterval)
    }
  }, [selectedCenter])

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/')
    }
  }, [isLoading, isLoggedIn, router])

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #666)' }}>Loading…</div>
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
          Go back
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--background, #f8f9fa)',
        color: 'var(--text-primary, #000)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
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
          zIndex: 10
        }}
      >
        <button
          onClick={() => (session ? setSession(null) : router.push('/'))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            padding: '0 4px',
            color: 'var(--text-secondary, #555)'
          }}
          title="Back"
        >
          ←
        </button>
        <span style={{ fontWeight: 600, fontSize: 16, flex: '1 1 260px' }}>
          {(session ? session.name : 'Attendance Setup') + ` - ${centerLabel}`}
        </span>
      </div>

      <SyncStatusNotices
        isSyncing={sessionDataSyncing && !hasLoadedSessionsOnce}
        syncMessage={isSessionOnline
          ? 'Sync has not happened yet. Fetching latest session details...'
          : 'Internet is disconnected. Existing sessions could not be refreshed yet and may be missing until sync completes.'}
        showLongSyncNotice={showSessionLongSyncNotice}
        showOfflineWarning={showSessionOfflineWarning}
        offlineMessage="Internet is disconnected or sessions are still loading. Existing sessions may not be visible until the connection returns and sync completes."
      />

      {session && sessionId ? (
        <AttendanceEntry
          sessionId={sessionId}
          centerId={selectedCenter}
          session={session}
          storageKey={storageKey}
          volunteers={sessionVolunteers}
          onAddVolunteer={async (volunteerPhone, volunteerName) => {
            if (!selectedCenter || !sessionId) {
              throw new Error('Attendance session is not ready yet. Please try again.')
            }
            const updated = volunteerName
              ? await attendanceApi.addSessionVolunteer(sessionId, volunteerPhone, selectedCenter, volunteerName)
              : await attendanceApi.addSessionVolunteer(sessionId, volunteerPhone, selectedCenter)
            setSessionVolunteers(updated.volunteers)
          }}
          onEndSession={async () => {
            if (selectedCenter && sessionId) {
              await attendanceApi.endSession(sessionId, selectedCenter)
            }
            setAvailableSessions(prev => prev.map(item => (
              item.id === sessionId ? { ...item, endedAt: new Date().toISOString() } : item
            )))
            clearPersistedAttendanceState(storageKey)
            setSession(null)
            setSessionId(null)
            setSessionVolunteers([])
            setSessionError(null)
            router.replace('/attendance')
          }}
        />
      ) : (
        <>
          {!configLoaded && (
            <div style={{ padding: '16px 20px', color: 'var(--text-secondary, #666)', fontSize: 14 }}>
              Loading configuration…
            </div>
          )}
          {configLoaded && configError && (
            <div style={{ margin: '12px 16px', padding: '10px 14px', borderRadius: 6, backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', fontSize: 14 }}>
              ⚠️ {configError} Programs, areas, and activities may not be up to date.
            </div>
          )}
          {configLoaded && (
            <SetupScreen
              activities={activities}
              areas={areas}
              programs={programs}
              sessions={availableSessions}
              onResume={selected => {
                const resumedSession = {
                  name: selected.name,
                  activities: selected.activities,
                  areas: selected.areas,
                  programs: selected.programs
                }
                setSession(resumedSession)
                setSessionId(selected.id)
                setSessionVolunteers(selected.volunteers)
                router.replace(`/attendance/${encodeURIComponent(selected.id)}`)
              }}
              onReopen={async selected => {
                if (!selectedCenter) return
                setSessionError(null)
                try {
                  const reopened = await attendanceApi.reopenSession(selected.id, selectedCenter)
                  const reopenedSession = {
                    name: reopened.name,
                    activities: reopened.activities,
                    areas: reopened.areas,
                    programs: reopened.programs
                  }
                  setSession(reopenedSession)
                  setSessionId(reopened.id)
                  setSessionVolunteers(reopened.volunteers)
                  setAvailableSessions(prev => [reopened, ...prev.filter(item => item.id !== reopened.id)])
                  if (storageKey) {
                    savePersistedAttendanceState(storageKey, { session: reopenedSession, records: [] })
                  }
                  router.replace(`/attendance/${encodeURIComponent(reopened.id)}`)
                } catch (err: any) {
                  setSessionError(err?.message || 'Failed to reopen attendance session')
                }
              }}
              onDelete={async selected => {
                if (!selectedCenter) return
                const shouldDelete = window.confirm(`Delete attendance session "${selected.name}"? This cannot be undone.`)
                if (!shouldDelete) return

                setSessionError(null)
                try {
                  await attendanceApi.deleteSession(selected.id, selectedCenter)
                  setAvailableSessions(prev => prev.filter(item => item.id !== selected.id))
                  if (sessionId === selected.id) {
                    clearPersistedAttendanceState(storageKey)
                    setSession(null)
                    setSessionId(null)
                    setSessionVolunteers([])
                  }
                } catch (err: any) {
                  setSessionError(err?.message || 'Failed to delete attendance session')
                }
              }}
              onStart={async cfg => {
                if (!selectedCenter) return
                setSessionError(null)
                try {
                  const started = await attendanceApi.startSession({
                    name: cfg.name,
                    activities: cfg.activities,
                    areas: cfg.areas,
                    programs: cfg.programs
                  }, selectedCenter)
                  const nextSession = {
                    name: started.name,
                    activities: started.activities,
                    areas: started.areas,
                    programs: started.programs
                  }
                  setSession(nextSession)
                  setSessionId(started.id)
                  setSessionVolunteers(started.volunteers)
                  setAvailableSessions(prev => [started, ...prev.filter(item => item.id !== started.id)])
                  if (storageKey) {
                    savePersistedAttendanceState(storageKey, { session: nextSession, records: [] })
                  }
                  router.replace(`/attendance/${encodeURIComponent(started.id)}`)
                } catch (err: any) {
                  setSessionError(err?.message || 'Failed to start attendance session')
                }
              }}
            />
          )}
        </>
      )}
      {sessionError && (
        <div style={{ padding: '0 20px 20px', color: '#842029', fontSize: 14 }}>
          {sessionError}
        </div>
      )}
    </div>
  )
}
