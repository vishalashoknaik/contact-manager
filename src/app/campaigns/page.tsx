'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { campaignsApi, Campaign, CallLog, NextContactResult } from '@/lib/api/client'
import { VolunteerPanel } from '@/components/VolunteerPanel'
import { CampaignCallScreen } from '@/components/CampaignCallScreen'
import { CallLogsTable } from '@/components/CallLogsTable'

type View = 'list' | 'detail' | 'call'

export default function CampaignsPage() {
  const { user, selectedCenter, isLoggedIn } = useAuth()
  const router = useRouter()
  const [view, setView] = useState<View>('list')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [nextPending, setNextPending] = useState<NextContactResult | null>(null)
  const [nextSkipped, setNextSkipped] = useState<NextContactResult | null>(null)
  const [callMode, setCallMode] = useState<'pending' | 'skipped'>('pending')
  const [showFilters, setShowFilters] = useState(false)
  const [campaignQuery, setCampaignQuery] = useState('')
  const [campaignStateFilter, setCampaignStateFilter] = useState('')
  const [campaignVolunteerFilter, setCampaignVolunteerFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!selectedCenter) return
    loadCampaigns()
  }, [selectedCenter])

  const loadCampaigns = async () => {
    if (!selectedCenter) return
    setIsLoading(true)
    setError(null)
    try {
      const list = await campaignsApi.getAll(selectedCenter)
      setCampaigns(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const openCampaign = async (campaign: Campaign) => {
    if (!selectedCenter) return
    setIsLoading(true)
    setError(null)
    try {
      const [logs, pending, skipped] = await Promise.all([
        campaignsApi.getCallLogs(campaign.id, selectedCenter),
        campaignsApi.getNextContact(campaign.id, selectedCenter, 'pending').catch(() => null),
        campaignsApi.getNextContact(campaign.id, selectedCenter, 'skipped').catch(() => null)
      ])
      setCallLogs(logs)
      setNextPending(pending)
      setNextSkipped(skipped)
      setSelectedCampaign(campaign)
      setView('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const startCalling = (mode: 'pending' | 'skipped') => {
    setCallMode(mode)
    setView('call')
  }

  const refreshCampaign = async () => {
    if (!selectedCampaign || !selectedCenter) return
    try {
      const [updated, logs, pending, skipped] = await Promise.all([
        campaignsApi.getById(selectedCampaign.id, selectedCenter),
        campaignsApi.getCallLogs(selectedCampaign.id, selectedCenter),
        campaignsApi.getNextContact(selectedCampaign.id, selectedCenter, 'pending').catch(() => null),
        campaignsApi.getNextContact(selectedCampaign.id, selectedCenter, 'skipped').catch(() => null)
      ])
      setSelectedCampaign(updated)
      setCallLogs(logs)
      setNextPending(pending)
      setNextSkipped(skipped)
    } catch {
      // silent refresh failure
    }
  }

  const container: React.CSSProperties = {
    padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'var(--bg-primary, #fff)', color: 'var(--text-primary, #000)',
    minHeight: '100vh'
  }
  const backBtn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'transparent', color: 'var(--text-primary, #000)',
    marginBottom: 16
  }
  const card: React.CSSProperties = {
    border: '1px solid var(--border-color, #ddd)', borderRadius: 8,
    padding: 16, marginBottom: 12, cursor: 'pointer',
    backgroundColor: 'var(--panel-bg, #f8f9fa)'
  }
  const statBadge = (label: string, count: number, color: string) => (
    <span key={label} style={{
      marginRight: 8, padding: '2px 8px', borderRadius: 10, fontSize: 12,
      backgroundColor: color + '22', color: color, fontWeight: 'bold'
    }}>
      {label}: {count}
    </span>
  )

  const filteredCampaigns = campaigns.filter(c =>
    (!campaignQuery.trim() || c.name.toLowerCase().includes(campaignQuery.trim().toLowerCase())) &&
    (!campaignVolunteerFilter.trim() ||
      c.volunteers.some(v =>
        `${v.name} ${v.phone}`.toLowerCase().includes(campaignVolunteerFilter.trim().toLowerCase())
      )) &&
    (!campaignStateFilter ||
      (campaignStateFilter === 'HAS_PENDING' && c.pendingContacts > 0) ||
      (campaignStateFilter === 'HAS_SKIPPED' && c.skippedContacts > 0) ||
      (campaignStateFilter === 'ALL_COMPLETED' && c.pendingContacts === 0))
  )

  const filterInput: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)'
  }

  const clearFilters = () => {
    setCampaignQuery('')
    setCampaignStateFilter('')
    setCampaignVolunteerFilter('')
  }

  if (!isLoggedIn) return null

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ marginBottom: 20, borderBottom: '1px solid var(--border-color, #ddd)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={backBtn}>← Home</button>
        <h2 style={{ margin: 0 }}>📣 Campaigns</h2>
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            borderRadius: 14,
            border: '1px solid var(--border-color, #ddd)',
            backgroundColor: 'transparent',
            color: 'var(--text-primary, #000)',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {showFilters && view === 'list' && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: 8,
            backgroundColor: 'var(--panel-bg, #f8f9fa)'
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Campaign name"
              value={campaignQuery}
              onChange={e => setCampaignQuery(e.target.value)}
              style={filterInput}
            />
            <select
              value={campaignStateFilter}
              onChange={e => setCampaignStateFilter(e.target.value)}
              style={filterInput}
            >
              <option value="">All campaign states</option>
              <option value="HAS_PENDING">Has Pending</option>
              <option value="HAS_SKIPPED">Has Skipped</option>
              <option value="ALL_COMPLETED">All Pending Done</option>
            </select>
            <input
              type="text"
              placeholder="Volunteer name/phone"
              value={campaignVolunteerFilter}
              onChange={e => setCampaignVolunteerFilter(e.target.value)}
              style={filterInput}
            />

            <button
              onClick={clearFilters}
              style={{ ...filterInput, cursor: 'pointer', color: '#dc3545' }}
            >
              Clear
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
              {`${filteredCampaigns.length} of ${campaigns.length} campaigns`}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '10px 12px', borderRadius: 4, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* CALL VIEW */}
      {view === 'call' && selectedCampaign && (
        <div>
          <button
            onClick={() => { setView('detail'); refreshCampaign() }}
            style={backBtn}
          >
            ← Back to Campaign
          </button>
          <h3 style={{ margin: '0 0 16px 0' }}>{selectedCampaign.name}</h3>
          <CampaignCallScreen
            campaignId={selectedCampaign.id}
            centerId={selectedCenter!}
            initialNext={(callMode === 'pending' ? nextPending : nextSkipped) as any}
            mode={callMode}
            onDone={() => { setView('detail'); refreshCampaign() }}
          />
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedCampaign && (
        <div>
          <button onClick={() => setView('list')} style={backBtn}>← All Campaigns</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>{selectedCampaign.name}</h3>
            {statBadge('Total', selectedCampaign.totalContacts, '#0d6efd')}
            {statBadge('Pending', selectedCampaign.pendingContacts, '#fd7e14')}
            {statBadge('Completed', selectedCampaign.completedContacts, '#198754')}
            {statBadge('Skipped', selectedCampaign.skippedContacts, '#6c757d')}
          </div>

          {/* Volunteers panel - admins/users can see and edit */}
          <div style={{ marginBottom: 24 }}>
            <VolunteerPanel
              campaign={selectedCampaign}
              centerId={selectedCenter!}
              currentUserPhone={user!.phone}
              onUpdated={updated => setSelectedCampaign(updated)}
            />
          </div>

          {/* Call buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {nextPending && !nextPending.done && (
              <button
                onClick={() => startCalling('pending')}
                style={{
                  padding: '12px 24px', borderRadius: 4, cursor: 'pointer',
                  border: 'none', backgroundColor: '#198754', color: '#fff',
                  fontWeight: 'bold', fontSize: 15
                }}
              >
                📞 Call New Contacts
              </button>
            )}
            {nextSkipped && !nextSkipped.done && (
              <button
                onClick={() => startCalling('skipped')}
                style={{
                  padding: '12px 24px', borderRadius: 4, cursor: 'pointer',
                  border: 'none', backgroundColor: '#fd7e14', color: '#fff',
                  fontWeight: 'bold', fontSize: 15
                }}
              >
                🔄 Revisit Skipped ({selectedCampaign.skippedContacts})
              </button>
            )}
          </div>
          {nextPending?.done && (!nextSkipped || nextSkipped.done) && (
            <div style={{
              padding: '12px 16px', borderRadius: 4, marginBottom: 24,
              backgroundColor: '#d4edda', color: '#155724', fontWeight: 500
            }}>
              ✅ All contacts have been called in this campaign.
            </div>
          )}
          {nextPending?.done && nextSkipped && !nextSkipped.done && (
            <div style={{
              padding: '12px 16px', borderRadius: 4, marginBottom: 24,
              backgroundColor: '#fff3cd', color: '#856404', fontWeight: 500
            }}>
              ✅ All new contacts called. Use “Revisit Skipped” to follow up on skipped contacts.
            </div>
          )}

          {/* Call Logs table */}
          <div>
            <h4 style={{ marginBottom: 12 }}>Call Log ({callLogs.length})</h4>
            <CallLogsTable logs={callLogs} />
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {isLoading && <p>Loading campaigns...</p>}
          {!isLoading && filteredCampaigns.length === 0 && (
            <p style={{ color: 'var(--text-secondary, #888)' }}>
              {campaigns.length === 0
                ? 'No campaigns yet. Select contacts on the home page and click “Create Campaign”.'
                : 'No campaigns match the current filters.'}
            </p>
          )}
          {filteredCampaigns.map(c => (
            <div
              key={c.id}
              style={card}
              onClick={() => openCampaign(c)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && openCampaign(c)}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>{c.name}</div>
              <div>
                {statBadge('Total', c.totalContacts, '#0d6efd')}
                {statBadge('Pending', c.pendingContacts, '#fd7e14')}
                {statBadge('Completed', c.completedContacts, '#198754')}
                {statBadge('Skipped', c.skippedContacts, '#6c757d')}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary, #888)' }}>
                {c.volunteers.length} volunteer{c.volunteers.length !== 1 ? 's' : ''} · Created {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
