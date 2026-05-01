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
  gender: Gender
  ieDate: string
  areaOfStay: string
  remarks: string
}

const EMPTY_FORM: AttendeeForm = {
  phone: '',
  name: '',
  gender: 'Male',
  ieDate: '',
  areaOfStay: '',
  remarks: ''
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
        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#444' }}>{label}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <label
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: `1px solid ${selected[category].includes(item) ? '#0d6efd' : '#ccc'}`,
                borderRadius: 20,
                cursor: 'pointer',
                backgroundColor: selected[category].includes(item) ? '#e8f0fe' : '#fff',
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
      <p style={{ color: '#666', marginBottom: 32 }}>
        Choose which programs, areas, or activities to track attendance for.
      </p>

      <CheckGroup label="Programs" items={programs} category="programs" />
      <CheckGroup label="Areas" items={areas} category="areas" />
      <CheckGroup label="Activities" items={activities} category="activities" />

      {activities.length === 0 && areas.length === 0 && programs.length === 0 && (
        <p style={{ color: '#888', fontStyle: 'italic' }}>
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
  onEndSession
}: {
  session: SessionConfig
  onEndSession: () => void
}) {
  const [form, setForm] = useState<AttendeeForm>(EMPTY_FORM)
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'new'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Focus phone field on mount and after each submission
  useEffect(() => {
    phoneRef.current?.focus()
  }, [count])

  function setField<K extends keyof AttendeeForm>(key: K, value: AttendeeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handlePhoneLookup() {
    const phone = form.phone.trim()
    if (!phone) return

    setLookupStatus('loading')
    try {
      const result = await attendanceApi.lookup(phone)
      if (result.found) {
        setForm(prev => ({
          ...prev,
          name: result.contact.name,
          gender: (result.contact.gender as Gender) || 'Male',
          ieDate: result.contact.ieDate || '',
          areaOfStay: result.contact.areaOfStay || '',
          remarks: '' // always blank for new attendance entry
        }))
        setLookupStatus('found')
      } else {
        setLookupStatus('new')
      }
    } catch {
      setLookupStatus('new')
    }

    // Move focus to name field
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await attendanceApi.submit({
        name: form.name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        ieDate: form.ieDate || undefined,
        areaOfStay: form.areaOfStay || undefined,
        remarks: form.remarks || undefined,
        activities: session.activities,
        areas: session.areas,
        programs: session.programs
      })

      setLastSubmitted(form.name.trim())
      setCount(c => c + 1)
      setForm(EMPTY_FORM)
      setLookupStatus('idle')
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to record attendance')
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
    border: '1px solid #ced4da',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 4,
    fontSize: 14,
    color: '#333'
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>
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
          <div style={{ fontSize: 12, color: '#666' }}>attended</div>
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
          <label style={labelStyle}>Gender</label>
          <select
            value={form.gender}
            onChange={e => setField('gender', e.target.value as Gender)}
            style={inputStyle}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* IE Date */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>IE Date</label>
          <input
            type="date"
            value={form.ieDate}
            onChange={e => setField('ieDate', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Area of Stay */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Area of Stay</label>
          <input
            type="text"
            value={form.areaOfStay}
            onChange={e => setField('areaOfStay', e.target.value)}
            placeholder="Neighbourhood / area"
            style={inputStyle}
          />
        </div>

        {/* Remarks — always blank, fresh entry */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Remarks</label>
          <textarea
            value={form.remarks}
            onChange={e => setField('remarks', e.target.value)}
            placeholder="Optional notes for this visit"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

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
            onClick={onEndSession}
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
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const router = useRouter()
  const { isLoggedIn, isLoading, selectedCenter } = useAuth()
  const { activities, areas, programs } = useConfig()
  const [session, setSession] = useState<SessionConfig | null>(null)

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/')
    }
  }, [isLoading, isLoggedIn, router])

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading…</div>
    )
  }

  if (!isLoggedIn) return null

  if (!selectedCenter) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
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
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Top bar */}
      <div
        style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #dee2e6',
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
            color: '#555'
          }}
          title="Back"
        >
          ←
        </button>
        <span style={{ fontWeight: 600, fontSize: 16 }}>
          {session ? 'Attendance Entry' : 'Session Setup'}
        </span>
      </div>

      {session ? (
        <AttendanceEntry session={session} onEndSession={() => setSession(null)} />
      ) : (
        <SetupScreen
          activities={activities}
          areas={areas}
          programs={programs}
          onStart={cfg => setSession(cfg)}
        />
      )}
    </div>
  )
}
