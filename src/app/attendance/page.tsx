'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { attendanceApi } from '@/lib/api/client'
import type { Gender } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionConfig = {
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

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({
  activities,
  areas,
  programs,
  onStart
}: {
  activities: string[]
  areas: string[]
  programs: string[]
  onStart: (config: SessionConfig) => void
}) {
  const [selected, setSelected] = useState<SessionConfig>({
    activities: [],
    areas: [],
    programs: []
  })

  function toggle(
    category: keyof SessionConfig,
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
    category: keyof SessionConfig
  }) {
    if (items.length === 0) return null
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary, #000)' }}>{label}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <label
              key={item}
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
                type="checkbox"
                checked={selected[category].includes(item)}
                onChange={e => toggle(category, item, e.target.checked)}
                style={{ accentColor: '#0d6efd' }}
              />
              {item}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ marginBottom: 8 }}>📋 Attendance Session Setup</h2>
      <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 32 }}>
        Choose which programs, areas, or activities to track attendance for.
      </p>

      <CheckGroup label="Programs" items={programs} category="programs" />
      <CheckGroup label="Areas" items={areas} category="areas" />
      <CheckGroup label="Activities" items={activities} category="activities" />

      {activities.length === 0 && areas.length === 0 && programs.length === 0 && (
        <p style={{ color: 'var(--text-secondary, #888)', fontStyle: 'italic' }}>
          No programs, areas, or activities configured yet. Add them in the Admin panel first.
        </p>
      )}

      <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
        <button
          onClick={() => onStart(selected)}
          disabled={noneSelected}
          style={{
            padding: '12px 28px',
            backgroundColor: noneSelected ? '#adb5bd' : '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: noneSelected ? 'not-allowed' : 'pointer'
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
  session,
  storageKey,
  onEndSession
}: {
  session: SessionConfig
  storageKey: string
  onEndSession: () => void
}) {
  const [form, setForm] = useState<AttendeeForm>(EMPTY_FORM)
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'new'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)
  const [records, setRecords] = useState<PersistedAttendanceRecord[]>(() => {
    const persisted = loadPersistedAttendanceState(storageKey)
    return persisted?.records || []
  })
  const [persistEnabled, setPersistEnabled] = useState(true)
  const [showSessionAttendees, setShowSessionAttendees] = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const lookupRequestRef = useRef<Promise<'found' | 'new' | undefined> | null>(null)
  const lastLookupPhoneRef = useRef('')

  const count = records.length
  const sessionAttendees = records
  const pendingCount = records.filter(record => record.status === 'pending').length

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

  function setField<K extends keyof AttendeeForm>(key: K, value: AttendeeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function performPhoneLookup(phone: string) {
    if (!phone) return

    if (lookupRequestRef.current && lastLookupPhoneRef.current === phone) {
      return lookupRequestRef.current
    }

    lastLookupPhoneRef.current = phone

    const request = (async () => {
      setLookupStatus('loading')
      try {
        const result = await attendanceApi.lookup(phone)
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

    try {
      const effectiveLookupStatus =
        lookupStatus === 'found' ? 'found' : await performPhoneLookup(form.phone.trim())

      if (
        effectiveLookupStatus === 'new' &&
        (!form.gender || !form.ieDate.trim() || !form.areaOfStay.trim())
      ) {
        setSubmitError('Gender, IE Date, and Area of Stay are required for new contacts')
        return
      }

      const payload: AttendancePayload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender || undefined,
        ieDate: form.ieDate || undefined,
        areaOfStay: form.areaOfStay || undefined,
        activities: session.activities,
        areas: session.areas,
        programs: session.programs
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

      setRecords(prev => [optimisticRecord, ...prev])

      await attendanceApi.submit(payload)

      setRecords(prev => prev.map(record => (
        record.id === recordId
          ? { ...record, status: 'synced', error: undefined }
          : record
      )))

      setLastSubmitted(form.name.trim())
      setForm(EMPTY_FORM)
      setLookupStatus('idle')
      setShowSessionAttendees(false)
      lastLookupPhoneRef.current = ''
    } catch (err: any) {
      const message = err?.message || 'Failed to record attendance'
      setSubmitError(message)
      setRecords(prev => prev.map(record => (
        record.phone === form.phone.trim() && record.name === form.name.trim() && record.status === 'pending'
          ? { ...record, error: message }
          : record
      )))
    } finally {
      setSubmitting(false)
    }
  }

  async function retryPendingRecords() {
    let hasFailure = false

    for (const record of records.filter(item => item.status === 'pending')) {
      try {
        await attendanceApi.submit(record.payload)
        setRecords(prev => prev.map(item => (
          item.id === record.id ? { ...item, status: 'synced', error: undefined } : item
        )))
      } catch (err: any) {
        hasFailure = true
        const message = err?.message || 'Failed to record attendance'
        setRecords(prev => prev.map(item => (
          item.id === record.id ? { ...item, error: message } : item
        )))
      }
    }

    return !hasFailure
  }

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
      onEndSession()
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
            <h2 style={{ margin: 0, fontSize: 20 }}>📝 Taking Attendance</h2>
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
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
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
                      {attendee.submittedAt}
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
  const { activities, areas, programs } = useConfig()
  const centerLabel = selectedCenterDetails?.name || selectedCenter || 'Unknown Center'
  const storageKey = selectedCenter ? getStorageKey(selectedCenter) : ''
  const [session, setSession] = useState<SessionConfig | null>(() => {
    if (!selectedCenter) return null
    return loadPersistedAttendanceState(getStorageKey(selectedCenter))?.session || null
  })

  useEffect(() => {
    if (!selectedCenter) return
    setSession(loadPersistedAttendanceState(getStorageKey(selectedCenter))?.session || null)
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
        minHeight: '100vh',
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
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
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
        <span style={{ fontWeight: 600, fontSize: 16 }}>
          {(session ? 'Taking Attendance' : 'Attendance Setup') + ` - ${centerLabel}`}
        </span>
      </div>

      {session ? (
        <AttendanceEntry
          session={session}
          storageKey={storageKey}
          onEndSession={() => router.push('/')}
        />
      ) : (
        <SetupScreen
          activities={activities}
          areas={areas}
          programs={programs}
          onStart={cfg => {
            setSession(cfg)
            if (storageKey) {
              savePersistedAttendanceState(storageKey, { session: cfg, records: [] })
            }
          }}
        />
      )}
    </div>
  )
}
