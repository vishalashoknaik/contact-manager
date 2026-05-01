'use client'

import { useState, useCallback } from 'react'
import { campaignsApi, CallLogSubmit } from '@/lib/api/client'

type Feedback = 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'

interface CurrentContact {
  done: false
  campaignContactId: string
  contact: { id: string; name: string; phone: string }
}

interface CampaignCallScreenProps {
  campaignId: string
  centerId: string
  initialNext: CurrentContact | { done: true }
  onDone: () => void
}

const feedbackOptions: { value: Feedback; label: string }[] = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_RESPONSE', label: 'No Response' },
  { value: 'CONNECT_LATER', label: 'Connect Later' }
]

export function CampaignCallScreen({ campaignId, centerId, initialNext, onDone }: CampaignCallScreenProps) {
  const [current, setCurrent] = useState<CurrentContact | { done: true }>(initialNext)
  const [feedback, setFeedback] = useState<Feedback>('COMPLETED')
  const [centerChange, setCenterChange] = useState(false)
  const [doNotDisturb, setDoNotDisturb] = useState(false)
  const [notInterested, setNotInterested] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      action
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await campaignsApi.submitCallLog(campaignId, payload, centerId)
      resetForm()
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
    borderRadius: 8, padding: 24, maxWidth: 540, margin: '0 auto'
  }
  const label: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 6 }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)',
    boxSizing: 'border-box'
  }
  const checkboxRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }

  if (current.done) {
    return (
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3>All done!</h3>
          <p style={{ color: 'var(--text-secondary, #666)' }}>All contacts in this campaign have been called.</p>
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

  return (
    <div style={card}>
      {/* Contact info */}
      <div style={{
        backgroundColor: 'var(--bg-primary, #fff)',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: 6, padding: 16, marginBottom: 20
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)', marginBottom: 4 }}>Contact</div>
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>{cc.contact.name}</div>
        <div style={{ fontSize: 16, color: 'var(--text-secondary, #555)', marginTop: 4 }}>{cc.contact.phone}</div>
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
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => submit('submit')}
          disabled={isSubmitting}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 4, cursor: isSubmitting ? 'not-allowed' : 'pointer',
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
            flex: 1, padding: '12px 0', borderRadius: 4, cursor: isSubmitting ? 'not-allowed' : 'pointer',
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
