'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { campaignsApi, Campaign } from '@/lib/api/client'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export default function CampaignsPage() {
  const { selectedCenter, isLoggedIn } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [campaignQuery, setCampaignQuery] = useState('')
  const [campaignStateFilter, setCampaignStateFilter] = useState('')
  const [campaignVolunteerFilter, setCampaignVolunteerFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedCampaignsOnce, setHasLoadedCampaignsOnce] = useState(false)
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({ isSyncing: isLoading })

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
      setHasLoadedCampaignsOnce(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const container: React.CSSProperties = {
    padding: 'clamp(12px, 3vw, 20px)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'var(--bg-primary, #fff)',
    color: 'var(--text-primary, #000)',
    minHeight: '100dvh',
  }

  const card: React.CSSProperties = {
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    cursor: 'pointer',
    backgroundColor: 'var(--panel-bg, #f8f9fa)',
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  }

  const statBadge = (label: string, count: number, color: string) => (
    <span key={label} style={{
      marginRight: 8, padding: '2px 8px', borderRadius: 10, fontSize: 12,
      backgroundColor: color + '22', color: color, fontWeight: 'bold',
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
    padding: '10px 12px',
    borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #000)',
    flex: '1 1 180px',
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
      <div style={{ marginBottom: 20, borderBottom: '1px solid var(--border-color, #ddd)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Campaigns</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(v => !v)}
          style={{ marginLeft: 'auto' }}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border-color, #ddd)', borderRadius: 8, backgroundColor: 'var(--panel-bg, #f8f9fa)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="Campaign name" value={campaignQuery}
              onChange={e => setCampaignQuery(e.target.value)} style={filterInput} />
            <select value={campaignStateFilter} onChange={e => setCampaignStateFilter(e.target.value)} style={filterInput}>
              <option value="">All campaign states</option>
              <option value="HAS_PENDING">Has Pending</option>
              <option value="HAS_SKIPPED">Has Skipped</option>
              <option value="ALL_COMPLETED">All Pending Done</option>
            </select>
            <input type="text" placeholder="Volunteer name/phone" value={campaignVolunteerFilter}
              onChange={e => setCampaignVolunteerFilter(e.target.value)} style={filterInput} />
            <Button variant="ghost" size="sm" onClick={clearFilters}
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
              Clear
            </Button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
              {`${filteredCampaigns.length} of ${campaigns.length} campaigns`}
            </span>
          </div>
        </div>
      )}

      {error && <Alert variant="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      <SyncStatusNotices
        isSyncing={isLoading}
        syncMessage={isOnline
          ? 'Sync has not happened yet. Fetching latest campaign details...'
          : 'Internet is disconnected. Campaigns could not be refreshed yet, so the current list may be incomplete.'}
        showLongSyncNotice={showLongSyncNotice}
        showOfflineWarning={showOfflineWarning || (!hasLoadedCampaignsOnce && !!error)}
        offlineMessage="Internet is disconnected or campaigns are still loading. Existing campaigns may be temporarily unavailable until sync completes."
        margin="0 0 16px"
      />

      {isLoading && <p>Loading campaigns...</p>}

      {!isLoading && filteredCampaigns.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', marginTop: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📣</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match the filters'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.6 }}>
            {campaigns.length === 0
              ? 'Select contacts on the Contacts page and click "Create Campaign" to get started.'
              : 'Try adjusting the search or filter options.'}
          </p>
          {campaigns.length === 0 && (
            <a href="/contacts" style={{
              display: 'inline-block', padding: '10px 20px',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              textDecoration: 'none', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: 14,
            }}>
              Go to Contacts
            </a>
          )}
        </div>
      )}

      {filteredCampaigns.map(c => (
        <Link key={c.id} href={`/campaigns/${c.id}`} style={card}>
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
        </Link>
      ))}
    </div>
  )
}
