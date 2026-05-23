'use client'

import { useState, useEffect, useRef } from 'react'
import { attendanceApi, contactsApi } from '@/lib/api/client'
import type { AttendanceSessionAttendee } from '@/lib/api/client'
import { ContactSearchInput } from '@/components/ContactSearchInput'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import type { Contact, Gender } from '@/lib/types'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type SessionConfig = {
  name: string
  activities: string[]
  areas: string[]
  programs: string[]
}

export type AttendeeForm = {
  phone: string
  name: string
  gender: Gender | ''
  ieDate: string
  areaOfStay: string
}

export type SessionAttendee = {
  name: string
  phone: string
  submittedAt: string
}

export type AttendancePayload = {
  name: string
  phone: string
  gender?: Gender
  ieDate?: string
  areaOfStay?: string
  activities: string[]
  areas: string[]
  programs: string[]
}

export type PersistedAttendanceRecord = SessionAttendee & {
  id: string
  payload: AttendancePayload
  status: 'synced' | 'pending'
  error?: string
}

export type PersistedAttendanceState = {
  session: SessionConfig
  records: PersistedAttendanceRecord[]
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

export const EMPTY_FORM: AttendeeForm = {
  phone: '',
  name: '',
  gender: '',
  ieDate: '',
  areaOfStay: '',
}

export const OFFLINE_SAVED_MESSAGE =
  'Saved offline. Attendance will sync automatically when online.'

export function getStorageKey(centerId: string) {
  return `attendance-session:${centerId}`
}

export function normalizePhoneKey(phone: string) {
  return phone.replace(/\D/g, '')
}

export function loadPersistedAttendanceState(
  storageKey: string
): PersistedAttendanceState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as PersistedAttendanceState
  } catch {
    return null
  }
}

export function savePersistedAttendanceState(
  storageKey: string,
  state: PersistedAttendanceState
) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey, JSON.stringify(state))
}

export function clearPersistedAttendanceState(storageKey: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey)
}

// ─── AttendanceEntry Component ────────────────────────────────────────────────

interface AttendanceEntryProps {
  sessionId: string
  centerId: string
  session: SessionConfig
  storageKey: string
  volunteers: Array<{ phone: string; name: string }>
  onAddVolunteer: (phone: string, name?: string) => Promise<void>
  onEndSession: () => Promise<void>
}

export function AttendanceEntry({
  sessionId,
  centerId,
  session,
  storageKey,
  volunteers,
  onAddVolunteer,
  onEndSession,
}: AttendanceEntryProps) {
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
  const [pendingNewVolPhone, setPendingNewVolPhone] = useState<string | null>(null)
  const [pendingNewVolName, setPendingNewVolName] = useState('')
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
    showOfflineWarning,
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

  useEffect(() => {
    phoneRef.current?.focus()
  }, [count])

  useEffect(() => {
    if (!persistEnabled) return
    savePersistedAttendanceState(storageKey, { session, records })
  }, [persistEnabled, records, session, storageKey])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await contactsApi.getAll(centerId)
        if (!cancelled && Array.isArray(data)) setContactList(data as Contact[])
      } catch { /* non-critical */ }
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
      if (!document.hidden) void loadAttendees()
    }, 3000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [centerId, sessionId])

  function setField<K extends keyof AttendeeForm>(key: K, value: AttendeeForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function performPhoneLookup(phone: string) {
    if (!phone) return
    const normalized = normalizePhoneKey(phone)
    if (lookupRequestRef.current && lastLookupPhoneRef.current === normalized)
      return lookupRequestRef.current
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
            areaOfStay: result.contact.areaOfStay || '',
          }))
          setLookupStatus('found')
          return 'found' as const
        }
        setForm(prev => ({ ...prev, gender: prev.gender || '', ieDate: prev.ieDate || '', areaOfStay: prev.areaOfStay || '' }))
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
        programs: session.programs,
      }
      const normalizedPhone = normalizePhoneKey(payload.phone)
      const existingEntry = sessionAttendees.find(
        item => normalizePhoneKey(item.phone) === normalizedPhone
      )
      const isUpdate = !!existingEntry
      if (
        !isUpdate &&
        effectiveLookupStatus === 'new' &&
        (!form.gender || !form.ieDate.trim() || !form.areaOfStay.trim())
      ) {
        setSubmitError('Gender, IE Date, and Area of Stay are required for new contacts')
        return
      }
      const recordId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const submittedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const optimisticRecord: PersistedAttendanceRecord = {
        id: recordId, name: payload.name, phone: payload.phone,
        submittedAt, payload, status: 'pending',
      }
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
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'synced' } : r))
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
        setRecords(prev => prev.filter(item =>
          normalizePhoneKey(item.phone) !== normalized || item.status !== 'pending'
        ))
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
    } catch {
      setSessionAccessError('Attendee list could not be refreshed after sync. The count above may be stale.')
    }
    return !hasFailure
  }

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || syncingPendingRef.current) return
    syncingPendingRef.current = true
    void retryPendingRecords().finally(() => { syncingPendingRef.current = false })
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
    ...session.activities.map(a => ({ label: a, color: '#fd7e14' })),
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border-color, #ced4da)',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 4,
    fontSize: 14,
    color: 'var(--text-primary, #333)',
  }

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary, #fff)',
    border: '1px solid var(--border-color, #dee2e6)',
    borderRadius: 10,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
  }

  async function handleAddVolunteer(phoneOverride?: string, nameOverride?: string) {
    const phone = (phoneOverride ?? newVolunteerPhone).trim()
    if (!phone) return
    if (!nameOverride && contactList.length > 0 && !contactList.some(c => c.phone === phone)) {
      setPendingNewVolPhone(phone)
      setNewVolunteerPhone('')
      setSessionAccessError(null)
      return
    }
    setAddingVolunteer(true)
    setSessionAccessError(null)
    try {
      await onAddVolunteer(phone, nameOverride)
      setNewVolunteerPhone('')
      setPendingNewVolPhone(null)
      setPendingNewVolName('')
    } catch (err: any) {
      setSessionAccessError(err?.message || 'Failed to add volunteer to this attendance session')
    } finally {
      setAddingVolunteer(false)
    }
  }

  async function handleCreateAndAddTaker() {
    if (!pendingNewVolPhone) return
    const name = pendingNewVolName.trim()
    if (!name) { setSessionAccessError('Name is required'); return }
    await handleAddVolunteer(pendingNewVolPhone, name)
  }

  return (
    <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '24px 20px',
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: '1 1 560px', minWidth: 320 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>📝 {session.name || 'Taking Attendance'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {sessionTags.map(tag => (
                <span key={tag.label} style={{
                  padding: '2px 10px', borderRadius: 12,
                  backgroundColor: tag.color, color: '#fff',
                  fontSize: 12, fontWeight: 500,
                }}>
                  {tag.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
              Attendance Takers: {volunteers.length} assigned
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setShowAddVolunteer(v => !v)}
                style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'none', color: 'var(--text-secondary, #888)', cursor: 'pointer', fontSize: 12 }}>
                {showAddVolunteer ? '▲ hide attendance takers' : '+ attendance takers'}
              </button>
            </div>
            {showAddVolunteer && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--panel-bg, #f8f9fa)', border: '1px solid var(--border-color, #dee2e6)', borderRadius: 6 }}>
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Assigned Attendance Takers</h4>
                  {volunteers.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>No attendance takers assigned yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {volunteers.map(v => (
                        <div key={v.phone} style={{ fontSize: 12 }}>
                          <strong>{v.name}</strong> · {v.phone}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color, #dee2e6)', paddingTop: 12, marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Add Attendance Taker</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!pendingNewVolPhone && (
                      <>
                        {contactList.length > 0 ? (
                          <ContactSearchInput
                            contacts={contactList}
                            placeholder="Search by name or phone"
                            disabled={addingVolunteer}
                            onSelect={c => void handleAddVolunteer(c.phone)}
                            onQueryChange={v => setNewVolunteerPhone(v)}
                            onRawAdd={v => void handleAddVolunteer(v)}
                          />
                        ) : (
                          <input type="tel" placeholder="Attendance taker phone"
                            value={newVolunteerPhone}
                            onChange={e => setNewVolunteerPhone(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && void handleAddVolunteer()}
                            style={{ ...inputStyle, maxWidth: 180, flex: 1 }} />
                        )}
                        <Button variant="success" size="sm"
                          onClick={() => void handleAddVolunteer()}
                          disabled={addingVolunteer || !newVolunteerPhone.trim()}>
                          {addingVolunteer ? 'Adding…' : '+ Add'}
                        </Button>
                      </>
                    )}
                    {pendingNewVolPhone && (
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: 13, marginBottom: 8 }}>
                          <strong>{pendingNewVolPhone}</strong> is not in your contacts. Enter their name to add them.
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <input value={pendingNewVolName} onChange={e => setPendingNewVolName(e.target.value)}
                            placeholder="Full name *" style={{ ...inputStyle, flex: '1 1 180px' }}
                            onKeyDown={e => e.key === 'Enter' && void handleCreateAndAddTaker()} autoFocus />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="success" size="sm" onClick={() => void handleCreateAndAddTaker()} disabled={addingVolunteer}>
                            {addingVolunteer ? 'Adding…' : 'Create & Add'}
                          </Button>
                          <Button variant="secondary" size="sm"
                            onClick={() => { setPendingNewVolPhone(null); setPendingNewVolName(''); setSessionAccessError(null) }}
                            disabled={addingVolunteer}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {sessionAccessError && (
              <Alert variant="error" style={{ marginTop: 8, fontSize: 12 }}>{sessionAccessError}</Alert>
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
              <Alert variant="warning" style={{ marginTop: 6, fontSize: 12 }}>
                Offline mode enabled. Entries are saved locally and will sync automatically once online.
              </Alert>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#198754' }}>{count}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>attended</div>
          </div>
        </div>

        {lastSubmitted && (
          <Alert variant="success" style={{ marginBottom: 16 }}>
            <strong>{lastSubmitted}</strong> recorded — next person ready
          </Alert>
        )}
        {submitError && <Alert variant="error" style={{ marginBottom: 16 }}>{submitError}</Alert>}
        {submitNotice && <Alert variant="info" style={{ marginBottom: 16 }}>{submitNotice}</Alert>}

        {contactList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 6 }}>🔍 Search by name (optional)</label>
            <ContactSearchInput
              contacts={contactList}
              placeholder="Type name or phone to find existing contact"
              onSelect={(contact: Contact) => {
                setForm({
                  phone: contact.phone, name: contact.name,
                  gender: (contact.gender as Gender) || 'Male',
                  ieDate: contact.ieDate ?? '', areaOfStay: contact.areaOfStay ?? '',
                })
                setLookupStatus('found')
                setShowSessionAttendees(false)
                setSubmitNotice(null)
                lastLookupPhoneRef.current = contact.phone.replace(/\D/g, '')
              }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone Number <span style={{ color: '#dc3545' }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={phoneRef} type="tel" value={form.phone}
                onChange={e => { setField('phone', e.target.value); setLookupStatus('idle'); setShowSessionAttendees(false); setSubmitNotice(null); lastLookupPhoneRef.current = '' }}
                onBlur={handlePhoneLookup}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePhoneLookup() } }}
                placeholder="Enter phone and press Enter" style={inputStyle} required autoComplete="off" />
              {lookupStatus === 'loading' && <span style={{ alignSelf: 'center', fontSize: 20 }}>⏳</span>}
              {lookupStatus === 'found' && <span style={{ alignSelf: 'center', fontSize: 20, color: '#198754' }}>✅</span>}
              {lookupStatus === 'new' && <span style={{ alignSelf: 'center', fontSize: 13, color: '#fd7e14', whiteSpace: 'nowrap' }}>New contact</span>}
            </div>
            {lookupStatus === 'found' && (
              <div style={{ fontSize: 12, color: '#198754', marginTop: 4 }}>
                Contact found — details filled in. You may edit before submitting.
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Name <span style={{ color: '#dc3545' }}>*</span></label>
            <input ref={nameRef} type="text" value={form.name}
              onChange={e => setField('name', e.target.value)} placeholder="Full name" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Gender{lookupStatus === 'new' ? ' *' : ''}</label>
            <select value={form.gender} onChange={e => setField('gender', e.target.value as Gender | '')} style={inputStyle}>
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>IE Date{lookupStatus === 'new' ? ' *' : ''}</label>
            <input type="text" value={form.ieDate} onChange={e => setField('ieDate', e.target.value)} placeholder="IE Date" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Area of Stay{lookupStatus === 'new' ? ' *' : ''}</label>
            <input type="text" value={form.areaOfStay} onChange={e => setField('areaOfStay', e.target.value)} placeholder="Neighbourhood / area" style={inputStyle} />
          </div>
          {lookupStatus === 'new' && (
            <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-secondary, #666)' }}>
              New contacts must include gender, IE Date, and Area of Stay.
            </div>
          )}
          {pendingCount > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Button variant="ghost" size="sm" onClick={retryPendingRecords} disabled={!isOnline}
                style={{ color: '#856404', borderColor: '#ffc107' }}>
                Retry Pending Sync ({pendingCount})
              </Button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" size="md" type="submit" loading={submitting}
              disabled={submitting || !form.name.trim() || !form.phone.trim()} style={{ flex: 1 }}>
              {submitting ? 'Saving…' : '✔ Submit & Next'}
            </Button>
            <Button variant="secondary" size="md" type="button" onClick={handleEndSession}>
              End Session
            </Button>
          </div>
        </form>
      </div>

      <aside style={{ flex: '0 1 320px', minWidth: 280, width: '100%' }}>
        <div style={{ ...panelStyle, overflow: 'hidden' }}>
          <button type="button" onClick={() => setShowSessionAttendees(v => !v)}
            style={{
              width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', backgroundColor: 'transparent', border: 'none',
              color: 'var(--text-primary, #000)', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left',
            }}
            aria-expanded={showSessionAttendees}>
            <span>Session Attendees</span>
            <span style={{ color: 'var(--text-secondary, #666)', fontWeight: 500 }}>
              {count} total {showSessionAttendees ? '▲' : '▼'}
            </span>
          </button>
          {showSessionAttendees && (
            <div style={{ borderTop: '1px solid var(--border-color, #dee2e6)', maxHeight: 360, overflowY: 'auto' }}>
              {sessionAttendees.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--text-secondary, #666)', fontSize: 14 }}>
                  No attendance recorded in this session yet.
                </div>
              ) : (
                sessionAttendees.map(attendee => (
                  <div key={`${attendee.phone}-${attendee.submittedAt}`}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color, #eee)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text-primary, #000)', fontWeight: 600, fontSize: 14 }}>{attendee.name}</div>
                      <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13 }}>{attendee.phone}</div>
                      {'status' in attendee && attendee.status === 'pending' && (
                        <div style={{ color: '#dc3545', fontSize: 12, marginTop: 4 }}>
                          Pending sync{attendee.error ? `: ${attendee.error}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-secondary, #666)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {'status' in attendee
                        ? attendee.submittedAt
                        : new Date(attendee.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
