'use client'

import { useState } from 'react'
import { campaignsApi, Campaign, CampaignVolunteer } from '@/lib/api/client'

interface VolunteerPanelProps {
  campaign: Campaign
  centerId: string
  currentUserPhone: string
  onUpdated: (campaign: Campaign) => void
}

export function VolunteerPanel({ campaign, centerId, currentUserPhone, onUpdated }: VolunteerPanelProps) {
  const [addPhone, setAddPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddVolunteer = async () => {
    const phone = addPhone.trim()
    if (!phone) return
    const already = campaign.volunteers.some(v => v.phone === phone)
    if (already) {
      setError('This person is already a volunteer')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const phones = [...campaign.volunteers.map(v => v.phone), phone]
      const updated = await campaignsApi.setVolunteers(campaign.id, phones, centerId)
      onUpdated(updated)
      setAddPhone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add volunteer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveVolunteer = async (phone: string) => {
    setError(null)
    setIsLoading(true)
    try {
      const phones = campaign.volunteers.map(v => v.phone).filter(p => p !== phone)
      const updated = await campaignsApi.setVolunteers(campaign.id, phones, centerId)
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove volunteer')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)'
  }
  const btn = (color: string): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
    border: 'none', backgroundColor: color, color: '#fff', fontSize: 13
  })

  return (
    <div style={{ border: '1px solid var(--border-color, #ddd)', borderRadius: 6, padding: 16 }}>
      <h4 style={{ margin: '0 0 12px 0' }}>Volunteers ({campaign.volunteers.length})</h4>

      {campaign.volunteers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary, #888)', margin: '0 0 12px 0', fontSize: 14 }}>
          No volunteers assigned yet
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
          {campaign.volunteers.map((v: CampaignVolunteer) => (
            <li key={v.phone} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{v.name} ({v.phone})</span>
              <button
                onClick={() => handleRemoveVolunteer(v.phone)}
                disabled={isLoading}
                style={btn('#dc3545')}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={addPhone}
          onChange={e => setAddPhone(e.target.value)}
          placeholder="Volunteer phone number"
          style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && handleAddVolunteer()}
        />
        <button onClick={handleAddVolunteer} disabled={isLoading} style={btn('#0d6efd')}>
          Add
        </button>
      </div>
      {error && <div style={{ color: '#dc3545', marginTop: 8, fontSize: 13 }}>{error}</div>}
    </div>
  )
}
