'use client'

import { useEffect, useState } from 'react'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { campaignsApi, Campaign, CampaignVolunteer } from '@/lib/api/client'

interface VolunteerPanelProps {
  campaign: Campaign
  centerId: string
  currentUserPhone: string
  onUpdated: (campaign: Campaign) => void
}

export function VolunteerPanel({ campaign, centerId, currentUserPhone, onUpdated }: VolunteerPanelProps) {
  const [addPhone, setAddPhone] = useState('')
  const [volunteers, setVolunteers] = useState<CampaignVolunteer[]>(campaign.volunteers)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({ isSyncing: isLoading })

  useEffect(() => {
    setVolunteers(campaign.volunteers)
  }, [campaign.id, campaign.volunteers])

  const handleAddVolunteer = async () => {
    const phone = addPhone.trim()
    if (!phone) return
    const already = volunteers.some(v => v.phone === phone)
    if (already) {
      setError('This person is already a volunteer')
      return
    }

    const previousVolunteers = volunteers
    const optimisticVolunteer: CampaignVolunteer = {
      phone,
      name: phone === currentUserPhone ? 'You' : ''
    }

    setError(null)
    setVolunteers([...volunteers, optimisticVolunteer])
    setAddPhone('')
    setIsLoading(true)
    try {
      const phones = [...previousVolunteers.map(v => v.phone), phone]
      const updated = await campaignsApi.setVolunteers(campaign.id, phones, centerId)
      setVolunteers(updated.volunteers)
      onUpdated(updated)
    } catch (err) {
      setVolunteers(previousVolunteers)
      setAddPhone(phone)
      setError(err instanceof Error ? err.message : 'Failed to add volunteer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveVolunteer = async (phone: string) => {
    const previousVolunteers = volunteers
    setError(null)
    setVolunteers(volunteers.filter(v => v.phone !== phone))
    setIsLoading(true)
    try {
      const phones = previousVolunteers.map(v => v.phone).filter(p => p !== phone)
      const updated = await campaignsApi.setVolunteers(campaign.id, phones, centerId)
      setVolunteers(updated.volunteers)
      onUpdated(updated)
    } catch (err) {
      setVolunteers(previousVolunteers)
      setError(err instanceof Error ? err.message : 'Failed to remove volunteer')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)'
  }
  const btn = (color: string): React.CSSProperties => ({
    padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
    border: 'none', backgroundColor: color, color: '#fff', fontSize: 13
  })

  return (
    <div style={{ border: '1px solid var(--border-color, #ddd)', borderRadius: 6, padding: 16 }}>
      <h4 style={{ margin: '0 0 12px 0' }}>Volunteers ({volunteers.length})</h4>

      <SyncStatusNotices
        isSyncing={isLoading}
        syncMessage={isOnline
          ? 'Sync has not happened yet. Saving latest volunteer changes...'
          : 'Internet is disconnected. Volunteer changes cannot be synced yet.'}
        showLongSyncNotice={showLongSyncNotice}
        showOfflineWarning={showOfflineWarning}
        offlineMessage="Internet is disconnected or volunteer changes are still syncing. The volunteer list may be outdated until sync completes."
        margin="0 0 12px"
      />

      {volunteers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary, #888)', margin: '0 0 12px 0', fontSize: 14 }}>
          No volunteers assigned yet
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
          {volunteers.map((v: CampaignVolunteer) => (
            <li key={v.phone} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 220px' }}>
                {v.name?.trim() ? `${v.name} (${v.phone})` : v.phone}
              </span>
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

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={addPhone}
          onChange={e => setAddPhone(e.target.value)}
          placeholder="Volunteer phone number"
          style={{ ...inputStyle, flex: '1 1 220px' }}
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
