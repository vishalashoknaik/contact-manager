'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { attendanceApi, contactsApi } from '@/lib/api/client'
import { ContactSearchInput } from '@/components/ContactSearchInput'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import type { AttendanceSession } from '@/lib/api/client'
import type { AttendanceSessionAttendee } from '@/lib/api/client'
import type { Contact, Gender } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionConfig = {
  name: string
  activities: string[]
  areas: string[]
  programs: string[]
}

type AttendeeForm = {
  phone: string
  name: string
  gender: Gender | ''
  ieDate: string
  areaOfStay: string
}

type SessionAttendee = {
  name: string
  phone: string
  submittedAt: string
}

type AttendancePayload = {
  name: string
  phone: string
  gender?: Gender
  ieDate?: string
  areaOfStay?: string
  activities: string[]
  areas: string[]
  programs: string[]
}

type PersistedAttendanceRecord = SessionAttendee & {
  id: string
  payload: AttendancePayload
  status: 'synced' | 'pending'
  error?: string
}

type PersistedAttendanceState = {
  session: SessionConfig
  records: PersistedAttendanceRecord[]
}

const EMPTY_FORM: AttendeeForm = {
  phone: '',
  name: '',
  gender: '',
  ieDate: '',
  areaOfStay: ''
}

const OFFLINE_SAVED_MESSAGE = 'Saved offline. Attendance will sync automatically when online.'

function getStorageKey(centerId: string) {
  return `attendance-session:${centerId}`
}

function loadPersistedAttendanceState(storageKey: string): PersistedAttendanceState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as PersistedAttendanceState
  } catch {
    return null
  }
}

function savePersistedAttendanceState(storageKey: string, state: PersistedAttendanceState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey, JSON.stringify(state))
}

function clearPersistedAttendanceState(storageKey: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey)
}

function normalizePhoneKey(phone: string) {
  return phone.replace(/\D/g, '')
}

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
      <h2 style={{ marginBottom: 8 }}>📋 Attendance Session Setup</h2>
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
                      <button
                        type="button"
                        onClick={() => {
                          void onReopen(session)
                        }}
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: 6,
                          backgroundColor: '#198754',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResume(session)}
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: 6,
                          backgroundColor: '#0d6efd',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Continue
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void onDelete(session)
                      }}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: 6,
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
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
        <button
          onClick={() => {
            void onStart(selected)
          }}
          disabled={noneSelected}
          style={{
            padding: '14px 20px',
            backgroundColor: noneSelected ? '#adb5bd' : '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: noneSelected ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          ▶ Start Attendance
        </button>
      </div>
    </div>
  )
}

// ─── Attendance Entry Screen ───────────────────────────────────────────────────

function AttendanceEntry({
  sessionId,
  centerId,
  session,
  storageKey,
  volunteers,
  onAddVolunteer,
  onEndSession
}: {
  sessionId: string
  centerId: string
  session: SessionConfig
  storageKey: string
  volunteers: Array<{ phone: string; name: string }>
  onAddVolunteer: (phone: string) => Promise<void>
  onEndSession: () => Promise<void>
}) {
  const [form, setForm] = useState<AttendeeForm>(EMPTY_FORM)
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'new'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)
  const [records, setRecords] = useState<PersistedAttendanceRecord[]>(() => {
    const persisted = loadPersistedAttendanceState(storageKey)
    return persisted?.records || []
  })
  const [persistEnabled, setPersistEnabled] = useState(true)
  const [showSessionAttendees, setShowSessionAttendees] = useState(false)
  const [showAddVolunteer, setShowAddVolunteer] = useState(false)
  const [newVolunteerPhone, setNewVolunteerPhone] = useState('')
  const [addingVolunteer, setAddingVolunteer] = useState(false)
  const [sessionAccessError, setSessionAccessError] = useState<string | null>(null)
  const [serverAttendees, setServerAttendees] = useState<AttendanceSessionAttendee[]>([])
  const [attendeeDataSyncing, setAttendeeDataSyncing] = useState(true)
  const [hasLoadedAttendeesOnce, setHasLoadedAttendeesOnce] = useState(false)
  const [contactList, setContactList] = useState<Contact[]>([])
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const lookupRequestRef = useRef<Promise<'found' | 'new' | undefined> | null>(null)
  const syncingPendingRef = useRef(false)
  const lastLookupPhoneRef = useRef('')
  const {
    isOnline,
    showLongSyncNotice: showAttendeeLongSyncNotice,
    showOfflineWarning
  } = useSyncStatus({ isSyncing: attendeeDataSyncing })

  const pendingRecords = records.filter(record => record.status === 'pending')
  const uniquePendingRecords = pendingRecords.filter((record, index, list) => {
    const normalized = normalizePhoneKey(record.phone)
    return list.findIndex(item => normalizePhoneKey(item.phone) === normalized) === index
  })
  const sessionAttendees: Array<SessionAttendee | PersistedAttendanceRecord> = (() => {
    const merged: Array<SessionAttendee | PersistedAttendanceRecord> = []
    const seenPhones = new Set<string>()

    for (const record of uniquePendingRecords) {
      const normalized = normalizePhoneKey(record.phone)
      if (!normalized || seenPhones.has(normalized)) continue
      seenPhones.add(normalized)
      merged.push(record)
    }

    for (const attendee of serverAttendees) {
      const normalized = normalizePhoneKey(attendee.phone)
      if (!normalized || seenPhones.has(normalized)) continue
      seenPhones.add(normalized)
      merged.push(attendee)
    }

    return merged
  })()
  const count = sessionAttendees.length
  const pendingCount = uniquePendingRecords.length

  // Focus phone field on mount and after each submission
  useEffect(() => {
    phoneRef.current?.focus()
  }, [count])

  useEffect(() => {
    if (!persistEnabled) {
      return
    }
    savePersistedAttendanceState(storageKey, { session, records })
  }, [persistEnabled, records, session, storageKey])

  // Load contacts once on mount for the name-search feature
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await contactsApi.getAll(centerId)
        if (!cancelled && Array.isArray(data)) setContactList(data as Contact[])
      } catch { /* non-critical — search just won't have suggestions */ }
    })()
    return () => { cancelled = true }
  }, [centerId])

  useEffect(() => {
    let cancelled = false

    const loadAttendees = async () => {
      setAttendeeDataSyncing(true)
      try {
        const attendees = await attendanceApi.listSessionAttendees(sessionId, centerId)
        if (!cancelled) {
          setServerAttendees(attendees)
          setHasLoadedAttendeesOnce(true)
          setSessionAccessError(null)
          setAttendeeDataSyncing(false)
        }
      } catch {
        if (!cancelled) {
          setSessionAccessError('Unable to refresh attendee list right now. Retrying...')
          setAttendeeDataSyncing(false)
        }
      }
    }

    void loadAttendees()
    const interval = window.setInterval(() => {
      void loadAttendees()
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [centerId, sessionId])

  function setField<K extends keyof AttendeeForm>(key: K, value: AttendeeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function performPhoneLookup(phone: string) {
    if (!phone) return

    const normalized = normalizePhoneKey(phone)

    if (lookupRequestRef.current && lastLookupPhoneRef.current === normalized) {
      return lookupRequestRef.current
    }

    lastLookupPhoneRef.current = normalized

    const request = (async () => {
      setLookupStatus('loading')
      try {
        const result = await attendanceApi.lookup(normalized)
        if (result.found) {
          setForm(prev => ({
            ...prev,
            name: result.contact.name,
            gender: (result.contact.gender as Gender) || 'Male',
            ieDate: result.contact.ieDate || '',
            areaOfStay: result.contact.areaOfStay || ''
          }))
          setLookupStatus('found')
          return 'found' as const
        }

        setForm(prev => ({
          ...prev,
          gender: prev.gender || '',
          ieDate: prev.ieDate || '',
          areaOfStay: prev.areaOfStay || ''
        }))
        setLookupStatus('new')
        return 'new' as const
      } catch {
        setLookupStatus('new')
        return 'new' as const
      } finally {
        lookupRequestRef.current = null
      }
    })()

    lookupRequestRef.current = request
    return request
  }

  async function handlePhoneLookup() {
    const phone = form.phone.trim()
    const result = await performPhoneLookup(phone)
    if (!result) return

    // Move focus to name field
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return

    setSubmitting(true)
    setSubmitError(null)
    setSubmitNotice(null)

    try {
      const effectiveLookupStatus =
        lookupStatus === 'found' ? 'found' : await performPhoneLookup(form.phone.trim())

      const payload: AttendancePayload = {
        name: form.name.trim(),
        phone: normalizePhoneKey(form.phone.trim()),
        gender: form.gender || undefined,
        ieDate: form.ieDate || undefined,
        areaOfStay: form.areaOfStay || undefined,
        activities: session.activities,
        areas: session.areas,
        programs: session.programs
      }

      const normalizedPhone = normalizePhoneKey(payload.phone)
      const existingEntry = sessionAttendees.find(item => normalizePhoneKey(item.phone) === normalizedPhone)
      const isUpdate = !!existingEntry

      // Only enforce required fields for brand-new contacts not already in the session.
      // Re-submissions of an existing attendee are allowed without all fields.
      if (
        !isUpdate &&
        effectiveLookupStatus === 'new' &&
        (!form.gender || !form.ieDate.trim() || !form.areaOfStay.trim())
      ) {
        setSubmitError('Gender, IE Date, and Area of Stay are required for new contacts')
        return
      }

      const recordId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const submittedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      const optimisticRecord: PersistedAttendanceRecord = {
        id: recordId,
        name: payload.name,
        phone: payload.phone,
        submittedAt,
        payload,
        status: 'pending'
      }

      // For re-submissions of the same person: replace the existing pending record
      // rather than prepending a new one, so the list count stays the same.
      if (isUpdate) {
        setRecords(prev => {
          const filtered = prev.filter(r => normalizePhoneKey(r.phone) !== normalizedPhone)
          return [optimisticRecord, ...filtered]
        })
      } else {
        setRecords(prev => [optimisticRecord, ...prev])
      }

      if (isOnline) {
        await attendanceApi.submit({ ...payload, sessionId }, centerId)

        // Mark as synced immediately so retryPendingRecords never re-submits
        // this record even if the subsequent listSessionAttendees call fails.
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'synced' } : r))

        // Refresh server attendees list, then remove the now-synced record.
        const attendees = await attendanceApi.listSessionAttendees(sessionId, centerId)
        setServerAttendees(attendees)
        setRecords(prev => prev.filter(record => record.id !== recordId))
      }

      setLastSubmitted(form.name.trim())
      setForm(EMPTY_FORM)
      setLookupStatus('idle')
      setShowSessionAttendees(false)
      lastLookupPhoneRef.current = ''

      if (isUpdate) {
        setSubmitNotice(`Attendance record for ${payload.name} already existed — updated with the latest details provided.`)
      } else if (!isOnline) {
        setSubmitError(OFFLINE_SAVED_MESSAGE)
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to record attendance'
      setSubmitError(message)
      const normalizedPhone = normalizePhoneKey(form.phone.trim())
      setRecords(prev => prev.map(record => (
        normalizePhoneKey(record.phone) === normalizedPhone && record.status === 'pending'
          ? { ...record, error: message }
          : record
      )))
    } finally {
      setSubmitting(false)
    }
  }

  async function retryPendingRecords() {
    if (!isOnline) return false
    let hasFailure = false

    for (const record of uniquePendingRecords) {
      try {
        await attendanceApi.submit({ ...record.payload, sessionId }, centerId)
        const normalized = normalizePhoneKey(record.phone)
        setRecords(prev => prev.filter(item => normalizePhoneKey(item.phone) !== normalized || item.status !== 'pending'))
      } catch (err: any) {
        hasFailure = true
        const message = err?.message || 'Failed to record attendance'
        const normalized = normalizePhoneKey(record.phone)
        setRecords(prev => prev.map(item => (
          normalizePhoneKey(item.phone) === normalized && item.status === 'pending'
            ? { ...item, error: message }
            : item
        )))
      }
    }

    try {
      const attendees = await attendanceApi.listSessionAttendees(sessionId, centerId)
      setServerAttendees(attendees)
    } catch (err) {
      setSessionAccessError('Attendee list could not be refreshed after sync. The count above may be stale.')
    }

    return !hasFailure
  }

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncingPendingRef.current) return

    syncingPendingRef.current = true
    void retryPendingRecords().finally(() => {
      syncingPendingRef.current = false
    })
  }, [isOnline, pendingCount])

  useEffect(() => {
    if (!isOnline || pendingCount > 0) return

    setSubmitError(prev => (prev === OFFLINE_SAVED_MESSAGE ? null : prev))
  }, [isOnline, pendingCount])

  async function handleEndSession() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const synced = await retryPendingRecords()
      if (!synced) {
        setSubmitError('Some attendance records are still not synced. Please retry before ending the session.')
        window.alert('Some attendance records are still not synced. Please retry before ending the session.')
        return
      }

      setPersistEnabled(false)
      clearPersistedAttendanceState(storageKey)
      await onEndSession()
    } finally {
      setSubmitting(false)
    }
  }

  const sessionTags = [
    ...session.programs.map(p => ({ label: p, color: '#0d6efd' })),
    ...session.areas.map(a => ({ label: a, color: '#198754' })),
    ...session.activities.map(a => ({ label: a, color: '#fd7e14' }))
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color, #ced4da)',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 4,
    fontSize: 14,
    color: 'var(--text-primary, #333)'
  }

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary, #fff)',
    border: '1px solid var(--border-color, #dee2e6)',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)'
  }

  async function handleAddVolunteer() {
    if (!newVolunteerPhone.trim()) return
    setAddingVolunteer(true)
    setSessionAccessError(null)
    try {
      await onAddVolunteer(newVolunteerPhone.trim())
      setNewVolunteerPhone('')
    } catch (err: any) {
      setSessionAccessError(err?.message || 'Failed to add volunteer to this attendance session')
    } finally {
      setAddingVolunteer(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ flex: '1 1 560px', minWidth: 320 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>📝 {session.name || 'Taking Attendance'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {sessionTags.map(tag => (
                <span
                  key={tag.label}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 12,
                    backgroundColor: tag.color,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
              Attendance Takers: {volunteers.length} assigned
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddVolunteer(value => !value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-secondary, #888)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {showAddVolunteer ? '▲ hide attendance takers' : '+ attendance takers'}
              </button>
            </div>
            {showAddVolunteer && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: 'var(--panel-bg, #f8f9fa)',
                  border: '1px solid var(--border-color, #dee2e6)',
                  borderRadius: 6
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #000)' }}>
                    Assigned Attendance Takers
                  </h4>
                  {volunteers.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
                      No attendance takers assigned yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {volunteers.map(v => (
                        <div key={v.phone} style={{ fontSize: 12, color: 'var(--text-primary, #000)' }}>
                          <strong>{v.name}</strong> · {v.phone}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color, #dee2e6)', paddingTop: 12, marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary, #000)' }}>
                    Add Attendance Taker by Phone
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="tel"
                      placeholder="Attendance taker phone"
                      value={newVolunteerPhone}
                      onChange={e => setNewVolunteerPhone(e.target.value)}
                      style={{ ...inputStyle, maxWidth: 180, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddVolunteer}
                      disabled={addingVolunteer || !newVolunteerPhone.trim()}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: addingVolunteer || !newVolunteerPhone.trim() ? '#adb5bd' : '#198754',
                        color: '#fff',
                        cursor: addingVolunteer || !newVolunteerPhone.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {addingVolunteer ? 'Adding…' : '+ Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {sessionAccessError && (
              <div style={{ marginTop: 8, color: '#842029', fontSize: 12 }}>
                {sessionAccessError}
              </div>
            )}
            <SyncStatusNotices
              isSyncing={attendeeDataSyncing && !hasLoadedAttendeesOnce}
              syncMessage="Sync has not happened yet. Fetching latest attendee details..."
              showLongSyncNotice={showAttendeeLongSyncNotice}
              showOfflineWarning={showOfflineWarning}
              offlineMessage="Internet connection has been unavailable for more than 5 seconds. Showing last known attendee data and syncing pending entries when the connection returns."
              margin="8px 0 0"
            />
            {!isOnline && (
              <div style={{ marginTop: 6, color: '#856404', fontSize: 12 }}>
                Offline mode enabled. Entries are saved locally and will sync automatically once online.
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#198754' }}>{count}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>attended</div>
          </div>
        </div>

        {/* Success flash */}
        {lastSubmitted && (
          <div
            style={{
              backgroundColor: '#d1e7dd',
              border: '1px solid #a3cfbb',
              color: '#0f5132',
              padding: '8px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14
            }}
          >
            ✅ <strong>{lastSubmitted}</strong> recorded — next person ready
          </div>
        )}

        {/* Error */}
        {submitError && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c2c7',
              color: '#842029',
              padding: '8px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14
            }}
          >
            ⚠️ {submitError}
          </div>
        )}

        {/* Update notice (re-submission of existing attendee) */}
        {submitNotice && (
          <div
            style={{
              backgroundColor: '#cff4fc',
              border: '1px solid #9eeaf9',
              color: '#055160',
              padding: '8px 14px',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14
            }}
          >
            ℹ️ {submitNotice}
          </div>
        )}

        {/* Name search — pre-fills form from existing contact */}
        {contactList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 6 }}>🔍 Search by name (optional)</label>
            <ContactSearchInput
              contacts={contactList}
              placeholder="Type name or phone to find existing contact"
              onSelect={(contact: Contact) => {
                setForm({
                  phone: contact.phone,
                  name: contact.name,
                  gender: (contact.gender as Gender) || 'Male',
                  ieDate: contact.ieDate ?? '',
                  areaOfStay: contact.areaOfStay ?? ''
                })
                setLookupStatus('found')
                setShowSessionAttendees(false)
                setSubmitNotice(null)
                lastLookupPhoneRef.current = contact.phone.replace(/\D/g, '')
              }}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Phone — lookup trigger */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Phone Number <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={phoneRef}
                type="tel"
                value={form.phone}
                onChange={e => {
                  setField('phone', e.target.value)
                  setLookupStatus('idle')
                  setShowSessionAttendees(false)
                  setSubmitNotice(null)
                  lastLookupPhoneRef.current = ''
                }}
                onBlur={handlePhoneLookup}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handlePhoneLookup()
                  }
                }}
                placeholder="Enter phone and press Enter"
                style={inputStyle}
                required
                autoComplete="off"
              />
              {lookupStatus === 'loading' && (
                <span style={{ alignSelf: 'center', fontSize: 20 }}>⏳</span>
              )}
              {lookupStatus === 'found' && (
                <span style={{ alignSelf: 'center', fontSize: 20, color: '#198754' }}>✅</span>
              )}
              {lookupStatus === 'new' && (
                <span style={{ alignSelf: 'center', fontSize: 13, color: '#fd7e14', whiteSpace: 'nowrap' }}>
                  New contact
                </span>
              )}
            </div>
            {lookupStatus === 'found' && (
              <div style={{ fontSize: 12, color: '#198754', marginTop: 4 }}>
                Contact found — details filled in. You may edit before submitting.
              </div>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Name <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Full name"
              style={inputStyle}
              required
            />
          </div>

          {/* Gender */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Gender{lookupStatus === 'new' ? ' *' : ''}
            </label>
            <select
              value={form.gender}
              onChange={e => setField('gender', e.target.value as Gender | '')}
              style={inputStyle}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* IE Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              IE Date{lookupStatus === 'new' ? ' *' : ''}
            </label>
            <input
              type="text"
              value={form.ieDate}
              onChange={e => setField('ieDate', e.target.value)}
              placeholder="IE Date"
              style={inputStyle}
            />
          </div>

          {/* Area of Stay */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Area of Stay{lookupStatus === 'new' ? ' *' : ''}
            </label>
            <input
              type="text"
              value={form.areaOfStay}
              onChange={e => setField('areaOfStay', e.target.value)}
              placeholder="Neighbourhood / area"
              style={inputStyle}
            />
          </div>

          {lookupStatus === 'new' && (
            <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-secondary, #666)' }}>
              New contacts must include gender, IE Date, and Area of Stay.
            </div>
          )}

          {pendingCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={retryPendingRecords}
                disabled={!isOnline}
                style={{
                  padding: '8px 12px',
                  backgroundColor: isOnline ? '#ffc107' : '#adb5bd',
                  color: '#212529',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isOnline ? 'pointer' : 'not-allowed'
                }}
              >
                Retry Pending Sync ({pendingCount})
              </button>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={submitting || !form.name.trim() || !form.phone.trim()}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor:
                    submitting || !form.name.trim() || !form.phone.trim() ? '#adb5bd' : '#0d6efd',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600,
                cursor:
                  submitting || !form.name.trim() || !form.phone.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? '⏳ Saving…' : '✔ Submit & Next'}
            </button>
            <button
              type="button"
              onClick={handleEndSession}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                cursor: 'pointer'
              }}
            >
              End Session
            </button>
          </div>
        </form>
      </div>

      <aside style={{ flex: '0 1 320px', minWidth: 280, width: '100%' }}>
        <div style={{ ...panelStyle, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowSessionAttendees(value => !value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #000)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'left'
            }}
            aria-expanded={showSessionAttendees}
          >
            <span>Session Attendees</span>
            <span style={{ color: 'var(--text-secondary, #666)', fontWeight: 500 }}>
              {count} total {showSessionAttendees ? '▲' : '▼'}
            </span>
          </button>

          {showSessionAttendees && (
            <div
              style={{
                borderTop: '1px solid var(--border-color, #dee2e6)',
                maxHeight: 360,
                overflowY: 'auto'
              }}
            >
              {sessionAttendees.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--text-secondary, #666)', fontSize: 14 }}>
                  No attendance recorded in this session yet.
                </div>
              ) : (
                sessionAttendees.map(attendee => (
                  <div
                    key={`${attendee.phone}-${attendee.submittedAt}`}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color, #eee)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-primary, #000)', fontWeight: 600, fontSize: 14 }}>
                        {attendee.name}
                      </div>
                      <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13 }}>
                        {attendee.phone}
                      </div>
                      {'status' in attendee && attendee.status === 'pending' && (
                        <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                          Pending sync{attendee.error ? `: ${attendee.error}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-secondary, #666)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {'status' in attendee
                        ? attendee.submittedAt
                        : new Date(attendee.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
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
  const [availableSessions, setAvailableSessions] = useState<AttendanceSession[]>([])
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionConfig | null>(null)
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
      void loadSessions()
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
          onAddVolunteer={async volunteerPhone => {
            if (!selectedCenter || !sessionId) {
              throw new Error('Attendance session is not ready yet. Please try again.')
            }
            const updated = await attendanceApi.addSessionVolunteer(sessionId, volunteerPhone, selectedCenter)
            setSessionVolunteers(updated.volunteers)
          }}
          onEndSession={async () => {
            if (selectedCenter && sessionId) {
              await attendanceApi.endSession(sessionId, selectedCenter)
            }
            setAvailableSessions(prev => prev.map(item => (
              item.id === sessionId ? { ...item, endedAt: new Date().toISOString() } : item
            )))
            setSession(null)
            setSessionId(null)
            setSessionVolunteers([])
            setSessionError(null)
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
            } catch (err: any) {
              setSessionError(err?.message || 'Failed to reopen attendance session')
            }
          }}
          onDelete={async selected => {
            if (!selectedCenter) return
            const shouldDelete = window.confirm(`Delete attendance session \"${selected.name}\"? This cannot be undone.`)
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
