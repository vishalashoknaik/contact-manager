'use client'

import { useState, useCallback } from 'react'
import { campaignsApi, CallLogSubmit } from '@/lib/api/client'

type Feedback = 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}

interface CurrentContact {
  done: false
  campaignContactId: string
  contact: { id: string; name: string; phone: string }
}

interface CampaignCallScreenProps {
  campaignId: string
  centerId: string
  initialNext: CurrentContact | { done: true }
  mode: 'pending' | 'skipped'
  campaignName: string
  messageTemplates: MessageTemplate[]
  selectedTemplateIndex: number
  onSelectedTemplateChange: (index: number) => void
  onDone: () => void
  initialCompleted?: number
  initialPending?: number
  initialSkipped?: number
}

function applyTemplate(template: string, context: { name: string; phone: string; campaign: string }) {
  return template
    .replaceAll('{name}', context.name)
    .replaceAll('{phone}', context.phone)
    .replaceAll('{campaign}', context.campaign)
}

const feedbackOptions: { value: Feedback; label: string }[] = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_RESPONSE', label: 'No Response' },
  { value: 'CONNECT_LATER', label: 'Connect Later' }
]

export function CampaignCallScreen({ campaignId, centerId, initialNext, mode, campaignName, messageTemplates, selectedTemplateIndex, onSelectedTemplateChange, onDone, initialCompleted = 0, initialPending = 0, initialSkipped = 0 }: CampaignCallScreenProps) {
  const [current, setCurrent] = useState<CurrentContact | { done: true }>(initialNext)
  const [previous, setPrevious] = useState<CurrentContact | null>(null)
  const [feedback, setFeedback] = useState<Feedback>('COMPLETED')
  const [centerChange, setCenterChange] = useState(false)
  const [doNotDisturb, setDoNotDisturb] = useState(false)
  const [notInterested, setNotInterested] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedCount, setCompletedCount] = useState(initialCompleted)
  const [pendingCount, setPendingCount] = useState(initialPending)
  const [skippedCount, setSkippedCount] = useState(initialSkipped)

  const selectedTemplate = messageTemplates.length > 0
    ? (messageTemplates[selectedTemplateIndex] ?? messageTemplates[0])
    : null

  const resetForm = useCallback(() => {
    setFeedback('COMPLETED')
    setCenterChange(false)
    setDoNotDisturb(false)
    setNotInterested(false)
    setRemarks('')
    setError(null)
  }, [])

  const submit = async (action: 'submit' | 'skip') => {
    if (current.done) return
    const cc = current as CurrentContact

    const payload: CallLogSubmit = {
      campaignContactId: cc.campaignContactId,
      feedback,
      centerChange,
      doNotDisturb,
      notInterestedToVolunteer: notInterested,
      remarks: remarks.trim() || undefined,
      action,
      mode
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await campaignsApi.submitCallLog(campaignId, payload, centerId)
      setPrevious(cc)
      resetForm()
      // Update local counts based on what just happened
      if (action === 'submit') {
        setCompletedCount(n => n + 1)
        if (mode === 'pending') setPendingCount(n => Math.max(0, n - 1))
        else setSkippedCount(n => Math.max(0, n - 1))
      } else {
        // skip action only possible in pending mode
        setSkippedCount(n => n + 1)
        setPendingCount(n => Math.max(0, n - 1))
      }
      if (result.next.done) {
        setCurrent({ done: true })
      } else {
        setCurrent(result.next as CurrentContact)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const card: React.CSSProperties = {
    backgroundColor: 'var(--panel-bg, #f8f9fa)',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 8, padding: 'clamp(16px, 4vw, 24px)', maxWidth: 540, margin: '0 auto'
  }
  const label: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 6 }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)',
    boxSizing: 'border-box'
  }
  const checkboxRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }

  if (current.done) {
    return (
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3>{mode === 'skipped' ? 'All skipped contacts revisited!' : 'All done!'}</h3>
          <p style={{ color: 'var(--text-secondary, #666)' }}>
            {mode === 'skipped'
              ? 'No more skipped contacts to revisit in this campaign.'
              : 'All new contacts in this campaign have been called.'}
          </p>
          <button
            onClick={onDone}
            style={{
              marginTop: 16, padding: '10px 24px', borderRadius: 4,
              border: 'none', backgroundColor: '#0d6efd', color: '#fff',
              fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            Back to Campaign
          </button>
        </div>
      </div>
    )
  }

  const cc = current as CurrentContact
  const normalizedPhone = cc.contact.phone.replace(/\D/g, '')
  const smsHref = selectedTemplate
    ? `sms:${cc.contact.phone}?body=${encodeURIComponent(
        applyTemplate(selectedTemplate.smsContent, { name: cc.contact.name, phone: cc.contact.phone, campaign: campaignName })
      )}`
    : undefined
  const whatsappHref = selectedTemplate
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
        applyTemplate(selectedTemplate.whatsappContent, { name: cc.contact.name, phone: cc.contact.phone, campaign: campaignName })
      )}`
    : undefined

  return (
    <div style={card}>
      {/* Call overview summary bar — Completed and Skipped only */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            { label: 'Completed', count: completedCount, color: '#198754', bg: '#d1e7dd' },
            { label: 'Skipped',   count: skippedCount,   color: '#6c757d', bg: '#e9ecef' }
          ] as const
        ).map(({ label, count, color, bg }) => (
          <div
            key={label}
            data-testid={`call-count-${label.toLowerCase()}`}
            style={{
              flex: '1 1 80px',
              textAlign: 'center',
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: bg,
              border: `1px solid ${color}30`
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div style={{
        backgroundColor: 'var(--bg-primary, #fff)',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: 6, padding: 16, marginBottom: 20
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)', marginBottom: 4 }}>Contact</div>
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>{cc.contact.name}</div>
        <a href={`tel:${cc.contact.phone}`} style={{ fontSize: 16, color: '#0d6efd', marginTop: 6, display: 'inline-block', fontWeight: 600 }}>
          {cc.contact.phone}
        </a>
        
        {messageTemplates.length === 0 && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 4, backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', fontSize: 13 }}>
            ⚠️ No message templates configured for this campaign. WhatsApp and SMS are disabled. Add templates in the campaign detail view.
          </div>
        )}
        {messageTemplates.length > 1 && (
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <label htmlFor="template-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message Template</label>
            <select
              id="template-select"
              value={selectedTemplateIndex}
              onChange={e => onSelectedTemplateChange(Number(e.target.value))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 4,
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
            >
              {messageTemplates.map((t, idx) => (
                <option key={idx} value={idx}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <a
            href={`tel:${cc.contact.phone}`}
            style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#198754', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
          >
            Call
          </a>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
            >
              WhatsApp
            </a>
          ) : (
            <span style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#6c757d', color: '#fff', fontSize: 13, cursor: 'not-allowed', opacity: 0.6 }}>WhatsApp</span>
          )}
          {smsHref ? (
            <a
              href={smsHref}
              style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#0d6efd', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
            >
              SMS
            </a>
          ) : (
            <span style={{ padding: '8px 12px', borderRadius: 4, backgroundColor: '#6c757d', color: '#fff', fontSize: 13, cursor: 'not-allowed', opacity: 0.6 }}>SMS</span>
          )}
        </div>
      </div>

      {/* Feedback */}
      <div style={{ marginBottom: 16 }}>
        <label style={label} htmlFor="feedback">Feedback</label>
        <select
          id="feedback"
          value={feedback}
          onChange={e => setFeedback(e.target.value as Feedback)}
          style={inputStyle}
        >
          {feedbackOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Checkboxes */}
      <div style={{ marginBottom: 16 }}>
        <label style={label}>Flags</label>
        <div style={checkboxRow}>
          <input
            type="checkbox" id="centerChange"
            checked={centerChange}
            onChange={e => setCenterChange(e.target.checked)}
          />
          <label htmlFor="centerChange">Center Change</label>
        </div>
        <div style={checkboxRow}>
          <input
            type="checkbox" id="doNotDisturb"
            checked={doNotDisturb}
            onChange={e => setDoNotDisturb(e.target.checked)}
          />
          <label htmlFor="doNotDisturb">Do Not Disturb</label>
        </div>
        <div style={checkboxRow}>
          <input
            type="checkbox" id="notInterested"
            checked={notInterested}
            onChange={e => setNotInterested(e.target.checked)}
          />
          <label htmlFor="notInterested">Not Interested to Volunteer</label>
        </div>
      </div>

      {/* Remarks */}
      <div style={{ marginBottom: 20 }}>
        <label style={label} htmlFor="remarks">Remarks</label>
        <textarea
          id="remarks"
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Optional remarks..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && (
        <div style={{ color: '#dc3545', marginBottom: 12, fontSize: 14 }}>{error}</div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            if (!previous) return
            setCurrent(previous)
            setPrevious(null)
          }}
          disabled={isSubmitting || !previous}
          style={{
            flex: '1 1 220px', padding: '14px 0', borderRadius: 4,
            cursor: isSubmitting || !previous ? 'not-allowed' : 'pointer',
            border: '1px solid var(--border-color, #ddd)',
            backgroundColor: '#f8f9fa', color: 'var(--text-primary, #000)',
            fontWeight: 'bold', fontSize: 15, opacity: isSubmitting || !previous ? 0.6 : 1
          }}
        >
          Previous Contact
        </button>
        <button
          onClick={() => submit('submit')}
          disabled={isSubmitting}
          style={{
            flex: '1 1 220px', padding: '14px 0', borderRadius: 4, cursor: isSubmitting ? 'not-allowed' : 'pointer',
            border: 'none', backgroundColor: '#198754', color: '#fff',
            fontWeight: 'bold', fontSize: 15, opacity: isSubmitting ? 0.7 : 1
          }}
        >
          Submit &amp; Get Next
        </button>
        <button
          onClick={() => submit('skip')}
          disabled={isSubmitting}
          style={{
            flex: '1 1 220px', padding: '14px 0', borderRadius: 4, cursor: isSubmitting ? 'not-allowed' : 'pointer',
            border: '1px solid var(--border-color, #ddd)',
            backgroundColor: 'transparent', color: 'var(--text-primary, #000)',
            fontWeight: 'bold', fontSize: 15, opacity: isSubmitting ? 0.7 : 1
          }}
        >
          Skip &amp; Get Next
        </button>
      </div>
    </div>
  )
}
