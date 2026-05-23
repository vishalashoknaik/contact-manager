'use client'

import { useEffect, useState } from 'react'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { ContactSearchInput } from '@/components/ContactSearchInput'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { campaignsApi, Campaign, CampaignVolunteer } from '@/lib/api/client'
import { Contact } from '@/lib/types'

interface VolunteerPanelProps {
  campaign: Campaign
  centerId: string
  currentUserPhone: string
  onUpdated: (campaign: Campaign) => void
  contacts?: Contact[]
}

export function VolunteerPanel({ campaign, centerId, currentUserPhone, onUpdated, contacts }: VolunteerPanelProps) {
  const [addPhone, setAddPhone] = useState('')
  const [volunteers, setVolunteers] = useState<CampaignVolunteer[]>(campaign.volunteers)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // When a typed phone is not found in contacts, pendingNewPhone holds it so the user can supply a name
  const [pendingNewPhone, setPendingNewPhone] = useState<string | null>(null)
  const [pendingNewName, setPendingNewName] = useState('')
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({ isSyncing: isLoading })

  useEffect(() => {
    setVolunteers(campaign.volunteers)
  }, [campaign.id, campaign.volunteers])

  const commitAdd = async (phone: string, nameOverride?: string) => {
    const already = volunteers.some(v => v.phone === phone)
    if (already) { setError('This person is already a volunteer'); return }

    const previousVolunteers = volunteers
    setError(null)
    setVolunteers([...volunteers, { phone, name: nameOverride ?? (phone === currentUserPhone ? 'You' : '') }])
    setAddPhone('')
    setIsLoading(true)
    try {
      const phones = [...previousVolunteers.map(v => v.phone), phone]
      const newDetails = nameOverride ? [{ phone, name: nameOverride }] : undefined
      const updated = await campaignsApi.setVolunteers(campaign.id, phones, centerId, newDetails)
      setVolunteers(updated.volunteers)
      onUpdated(updated)
      setPendingNewPhone(null)
      setPendingNewName('')
    } catch (err) {
      setVolunteers(previousVolunteers)
      setAddPhone(phone)
      setError(err instanceof Error ? err.message : 'Failed to add volunteer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVolunteer = (phoneOverride?: string) => {
    const phone = (phoneOverride ?? addPhone).trim()
    if (!phone) return
    // If contacts are loaded and this phone is not among them, ask for a name first
    if (contacts && contacts.length > 0 && !contacts.some(c => c.phone === phone)) {
      setPendingNewPhone(phone)
      setAddPhone('')
      setError(null)
      return
    }
    void commitAdd(phone)
  }

  const handleCreateAndAdd = () => {
    if (!pendingNewPhone) return
    const name = pendingNewName.trim()
    if (!name) { setError('Name is required'); return }
    void commitAdd(pendingNewPhone, name)
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
        {!pendingNewPhone && (
          <>
            {contacts && contacts.length > 0 ? (
              <ContactSearchInput
                contacts={contacts}
                placeholder="Search volunteer by name or phone"
                disabled={isLoading}
                onSelect={c => handleAddVolunteer(c.phone)}
                onQueryChange={v => setAddPhone(v)}
                onRawAdd={v => handleAddVolunteer(v)}
              />
            ) : (
              <input
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
                placeholder="Volunteer phone number"
                style={{ ...inputStyle, flex: '1 1 220px' }}
                onKeyDown={e => e.key === 'Enter' && handleAddVolunteer()}
              />
            )}
            <button onClick={() => handleAddVolunteer()} disabled={isLoading} style={btn('#0d6efd')}>
              Add
            </button>
          </>
        )}

        {pendingNewPhone && (
          <div style={{ width: '100%', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, padding: 12, backgroundColor: 'var(--panel-bg, #f8f9fa)' }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>{pendingNewPhone}</strong> is not in your contacts. Enter their name to add them as a volunteer.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input
                value={pendingNewName}
                onChange={e => setPendingNewName(e.target.value)}
                placeholder="Full name *"
                style={{ ...inputStyle, flex: '1 1 200px' }}
                onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateAndAdd} disabled={isLoading} style={btn('#198754')}>
                Create &amp; Add
              </button>
              <button
                onClick={() => { setPendingNewPhone(null); setPendingNewName(''); setError(null) }}
                disabled={isLoading}
                style={btn('#6c757d')}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <div style={{ color: '#dc3545', marginTop: 8, fontSize: 13 }}>{error}</div>}
    </div>
  )
}
