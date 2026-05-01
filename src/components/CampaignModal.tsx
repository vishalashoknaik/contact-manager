'use client'

import { useState, useEffect } from 'react'
import { campaignsApi, Campaign } from '@/lib/api/client'

interface CampaignModalProps {
  isOpen: boolean
  selectedContactIds: string[]
  centerId: string
  onClose: () => void
  onCreated: (campaign: Campaign) => void
}

export function CampaignModal({ isOpen, selectedContactIds, centerId, onClose, onCreated }: CampaignModalProps) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [newName, setNewName] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setNewName('')
    setSelectedCampaignId('')
    setError(null)
    setMode('new')
    campaignsApi.getAll(centerId).then(list => {
      setCampaigns(list)
      if (list.length === 0) setMode('new')
    }).catch(() => setCampaigns([]))
  }, [isOpen, centerId])

  if (!isOpen) return null

  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)
    try {
      let campaign: Campaign
      if (mode === 'new') {
        if (!newName.trim()) {
          setError('Campaign name is required')
          setIsLoading(false)
          return
        }
        campaign = await campaignsApi.create(newName.trim(), selectedContactIds, centerId)
      } else {
        if (!selectedCampaignId) {
          setError('Please select a campaign')
          setIsLoading(false)
          return
        }
        campaign = await campaignsApi.addContacts(selectedCampaignId, selectedContactIds, centerId)
      }
      onCreated(campaign)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }
  const modal: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary, #fff)', borderRadius: 8, padding: 24,
    width: 420, maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <h3 style={{ margin: '0 0 16px 0' }}>Add to Campaign</h3>
        <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 16 }}>
          {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
        </p>

        {campaigns.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setMode('new')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 4, cursor: 'pointer',
                border: '2px solid',
                borderColor: mode === 'new' ? '#0d6efd' : '#dee2e6',
                backgroundColor: mode === 'new' ? '#0d6efd' : 'transparent',
                color: mode === 'new' ? '#fff' : 'var(--text-primary, #000)',
                fontWeight: mode === 'new' ? 'bold' : 'normal'
              }}
            >
              New Campaign
            </button>
            <button
              onClick={() => setMode('existing')}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 4, cursor: 'pointer',
                border: '2px solid',
                borderColor: mode === 'existing' ? '#0d6efd' : '#dee2e6',
                backgroundColor: mode === 'existing' ? '#0d6efd' : 'transparent',
                color: mode === 'existing' ? '#fff' : 'var(--text-primary, #000)',
                fontWeight: mode === 'existing' ? 'bold' : 'normal'
              }}
            >
              Add to Existing
            </button>
          </div>
        )}

        {mode === 'new' ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Campaign Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter campaign name"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 4,
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)',
                boxSizing: 'border-box'
              }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Select Campaign</label>
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 4,
                border: '1px solid var(--border-color, #ddd)',
                backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)'
              }}
            >
              <option value="">-- Select a campaign --</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.pendingContacts} pending)</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{ color: '#dc3545', marginBottom: 12, fontSize: 14 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--border-color, #ddd)',
              backgroundColor: 'transparent', color: 'var(--text-primary, #000)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: '8px 16px', borderRadius: 4, cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none', backgroundColor: '#0d6efd', color: '#fff', fontWeight: 'bold',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Saving...' : mode === 'new' ? 'Create Campaign' : 'Add to Campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}
