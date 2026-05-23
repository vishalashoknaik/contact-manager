'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { campaignsApi, Campaign, CallLog, NextContactResult, contactsApi } from '@/lib/api/client'
import { Contact } from '@/lib/types'
import { SyncStatusNotices } from '@/components/SyncStatusNotices'
import { VolunteerPanel } from '@/components/VolunteerPanel'
import { CampaignCallScreen } from '@/components/CampaignCallScreen'
import { CallLogsTable } from '@/components/CallLogsTable'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

type View = 'list' | 'detail' | 'call'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}


export default function CampaignsPage() {
  const { user, selectedCenter, selectedCenterDetails, isLoggedIn } = useAuth()
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
  const [editingLog, setEditingLog] = useState<CallLog | null>(null)
  const [editFeedback, setEditFeedback] = useState<'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'>('COMPLETED')
  const [editCenterChange, setEditCenterChange] = useState(false)
  const [editDnd, setEditDnd] = useState(false)
  const [editNotInterested, setEditNotInterested] = useState(false)
  const [editRemarks, setEditRemarks] = useState('')
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<{ index: number; name: string; smsContent: string; whatsappContent: string } | null>(null)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const templateSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canEditTemplates = selectedCenterDetails?.role === 'USER' || selectedCenterDetails?.role === 'ADMIN'
  const [hasLoadedCampaignsOnce, setHasLoadedCampaignsOnce] = useState(false)
  const [showFullLog, setShowFullLog] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const { isOnline, showLongSyncNotice, showOfflineWarning } = useSyncStatus({ isSyncing: isLoading })

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!selectedCenter) return
    loadCampaigns()
    contactsApi.getAll(selectedCenter).then(data => setContacts(data as Contact[])).catch(() => {})
  }, [selectedCenter])

  // Load templates from campaign data when a campaign is selected
  useEffect(() => {
    if (!selectedCampaign) {
      setMessageTemplates([])
      setSelectedTemplateIndex(0)
      return
    }
    const templates = selectedCampaign.messageTemplates
    setMessageTemplates(Array.isArray(templates) ? templates as MessageTemplate[] : [])
    setSelectedTemplateIndex(0)
  }, [selectedCampaign?.id])

  // Debounced save of templates to backend whenever they change
  const saveTemplates = (updated: MessageTemplate[]) => {
    setMessageTemplates(updated)
    if (!selectedCampaign || !selectedCenter) return
    if (templateSaveTimeout.current) clearTimeout(templateSaveTimeout.current)
    templateSaveTimeout.current = setTimeout(async () => {
      setIsSavingTemplates(true)
      try {
        const saved = await campaignsApi.updateTemplates(selectedCampaign.id, updated, selectedCenter)
        setSelectedCampaign(saved)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save templates. Please try again.')
      } finally {
        setIsSavingTemplates(false)
      }
    }, 800)
  }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh campaign data. The view may be outdated.')
    }
  }

  const openLogEditor = (log: CallLog) => {
    setEditingLog(log)
    setEditFeedback(log.feedback)
    setEditCenterChange(log.centerChange)
    setEditDnd(log.doNotDisturb)
    setEditNotInterested(log.notInterestedToVolunteer)
    setEditRemarks(log.remarks || '')
  }

  const saveLogEdit = async () => {
    if (!editingLog || !selectedCampaign || !selectedCenter) return

    setIsSavingLog(true)
    setError(null)
    try {
      await campaignsApi.submitCallLog(
        selectedCampaign.id,
        {
          campaignContactId: editingLog.campaignContactId,
          feedback: editFeedback,
          centerChange: editCenterChange,
          doNotDisturb: editDnd,
          notInterestedToVolunteer: editNotInterested,
          remarks: editRemarks.trim() || undefined,
          action: editingLog.status === 'SKIPPED' ? 'skip' : 'submit',
          mode: editingLog.status === 'SKIPPED' ? 'skipped' : 'pending'
        },
        selectedCenter
      )
      setEditingLog(null)
      await refreshCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update call log')
    } finally {
      setIsSavingLog(false)
    }
  }

  const container: React.CSSProperties = {
    padding: 'clamp(12px, 3vw, 20px)', fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'var(--bg-primary, #fff)', color: 'var(--text-primary, #000)',
    minHeight: '100dvh'
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
    padding: '10px 12px', borderRadius: 4,
    border: '1px solid var(--border-color, #ddd)',
    backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-primary, #000)',
    flex: '1 1 180px'
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

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              Clear
            </Button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
              {`${filteredCampaigns.length} of ${campaigns.length} campaigns`}
            </span>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" style={{ marginBottom: 16 }}>{error}</Alert>
      )}

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

      {/* CALL VIEW */}
      {view === 'call' && selectedCampaign && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setView('detail'); refreshCampaign() }}
            style={{ marginBottom: 16 }}
          >
            ← Back to Campaign
          </Button>
          <h3 style={{ margin: '0 0 16px 0' }}>{selectedCampaign.name}</h3>
          <CampaignCallScreen
            campaignId={selectedCampaign.id}
            centerId={selectedCenter!}
            initialNext={(callMode === 'pending' ? nextPending : nextSkipped) as any}
            mode={callMode}
            campaignName={selectedCampaign.name}
            messageTemplates={messageTemplates}
            selectedTemplateIndex={selectedTemplateIndex}
            onSelectedTemplateChange={setSelectedTemplateIndex}
            onDone={() => { setView('detail'); refreshCampaign() }}
            initialCompleted={selectedCampaign.completedContacts}
            initialPending={selectedCampaign.pendingContacts}
            initialSkipped={selectedCampaign.skippedContacts}
          />
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedCampaign && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setView('list')} style={{ marginBottom: 16 }}>
            ← All Campaigns
          </Button>
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
              onUpdated={updated => {
                setSelectedCampaign(updated)
                setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
              }}
              contacts={contacts}
            />
          </div>

          {/* Call buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {nextPending && !nextPending.done && (
              <Button
                variant="success"
                size="md"
                onClick={() => startCalling('pending')}
              >
                📞 Call New Contacts
              </Button>
            )}
            {nextSkipped && !nextSkipped.done && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => startCalling('skipped')}
                style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
              >
                🔄 Revisit Skipped ({selectedCampaign.skippedContacts})
              </Button>
            )}
          </div>
          {nextPending?.done && (!nextSkipped || nextSkipped.done) && (
            <Alert variant="success" style={{ marginBottom: 24 }}>
              All contacts have been called in this campaign.
            </Alert>
          )}
          {nextPending?.done && nextSkipped && !nextSkipped.done && (
            <Alert variant="warning" style={{ marginBottom: 24 }}>
              All new contacts called. Use “Revisit Skipped” to follow up on skipped contacts.
            </Alert>
          )}


          <div style={{ marginBottom: 24, padding: 12, border: '1px solid var(--border-color, #ddd)', borderRadius: 8, backgroundColor: 'var(--panel-bg, #f8f9fa)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Call Message Templates</h4>
              {isSavingTemplates && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #666)' }}>Syncing…</span>
              )}
              {canEditTemplates && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setEditingTemplate({ index: -1, name: 'New Template', smsContent: '', whatsappContent: '' })}
                  style={{
                    padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)',
                    backgroundColor: '#198754', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}
                >
                  + Add Template
                </Button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginBottom: 10 }}>
              Use placeholders: {'{name}'}, {'{phone}'}, {'{campaign}'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messageTemplates.map((template, index) => (
                <div
                  key={index}
                  style={{
                    padding: 10,
                    borderRadius: 4,
                    border: `1px solid ${selectedTemplateIndex === index ? 'var(--text-primary, #000)' : 'var(--border-color, #ddd)'}`,
                    backgroundColor: selectedTemplateIndex === index ? 'var(--selected-item-bg, #f0f7ff)' : 'var(--panel-bg, #f9f9f9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTemplateIndex(index)}
                >
                  <input
                    type="radio"
                    name="template"
                    checked={selectedTemplateIndex === index}
                    onChange={() => setSelectedTemplateIndex(index)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{template.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #666)', marginTop: 2 }}>
                      SMS: {template.smsContent.substring(0, 40)}...
                    </div>
                  </div>
                  {canEditTemplates && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTemplate({ index, name: template.name, smsContent: template.smsContent, whatsappContent: template.whatsappContent })
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {canEditTemplates && messageTemplates.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const updated = messageTemplates.filter((_, i) => i !== index)
                        setSelectedTemplateIndex(Math.min(selectedTemplateIndex, updated.length - 1))
                        saveTemplates(updated)
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Call Logs table */}
          <div>
            <h4 style={{ marginBottom: 12 }}>Call Log ({callLogs.length})</h4>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginBottom: 8 }}>
              Click a call log row to edit feedback and flags.
            </div>
            <CallLogsTable logs={callLogs} onLogClick={openLogEditor} />
          </div>

          {/* Full campaign report — visible to USER/ADMIN roles; shows ALL contacts
              including PENDING, so admins can see the complete picture */}
          {(selectedCenterDetails?.role === 'USER' || selectedCenterDetails?.role === 'ADMIN') && (
            <div style={{ marginTop: 24 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullLog(v => !v)}
              >
                {showFullLog ? '\u25b2 Hide Full Report' : '\u25bc Show Full Report (all contacts)'}
              </Button>

              {showFullLog && (
                <div style={{ marginTop: 12, overflowX: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: 6 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--th-bg, #f5f5f5)' }}>
                        {['Contact', 'Phone', 'Status', 'Called At', 'By (Volunteer)', 'Feedback', 'Not Int.', 'Ctr Chg', 'DND', 'Remarks'].map(h => (
                          <th key={h} style={{ border: '1px solid var(--border-color, #ddd)', padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCampaign.contacts.map(cc => {
                        const log = callLogs.find(l => l.campaignContactId === cc.campaignContactId)
                        const statusColor = cc.status === 'COMPLETED' ? '#198754' : cc.status === 'SKIPPED' ? '#6c757d' : '#fd7e14'
                        return (
                          <tr key={cc.campaignContactId}>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>{cc.contact.name}</td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>{cc.contact.phone}</td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>
                              <span style={{ fontWeight: 600, color: statusColor }}>{cc.status}</span>
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>
                              {log ? new Date(log.calledAt).toLocaleString() : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>
                              {log ? log.volunteerPhone : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>
                              {log ? log.feedback : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>
                              {log?.notInterestedToVolunteer ? '✓' : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>
                              {log?.centerChange ? '✓' : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>
                              {log?.doNotDisturb ? '✓' : '—'}
                            </td>
                            <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>
                              {log?.remarks || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {isLoading && <p>Loading campaigns...</p>}
          {!isLoading && filteredCampaigns.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                marginTop: 16,
              }}
            >
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
                <a
                  href="/"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Go to Contacts
                </a>
              )}
            </div>
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

      {editingLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 520, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Edit Call Log</h4>

            {/* Contact info + action buttons */}
            <div style={{ backgroundColor: 'var(--panel-bg, #f8f9fa)', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, padding: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{editingLog.contact.name}</div>
              <div style={{ fontSize: 14, color: '#0d6efd', marginBottom: 10 }}>{editingLog.contact.phone}</div>
              {messageTemplates.length > 1 && (
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="log-template-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message Template</label>
                  <select
                    id="log-template-select"
                    value={selectedTemplateIndex}
                    onChange={e => setSelectedTemplateIndex(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box', fontSize: 13 }}
                  >
                    {messageTemplates.map((t, idx) => (
                      <option key={idx} value={idx}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={`tel:${editingLog.contact.phone}`}
                  style={{ padding: '7px 12px', borderRadius: 4, backgroundColor: '#198754', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
                >
                  Call
                </a>
                <a
                  href={`https://wa.me/${editingLog.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    (messageTemplates[selectedTemplateIndex]?.whatsappContent || '')
                      .replaceAll('{name}', editingLog.contact.name)
                      .replaceAll('{phone}', editingLog.contact.phone)
                      .replaceAll('{campaign}', selectedCampaign?.name || '')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '7px 12px', borderRadius: 4, backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
                >
                  WhatsApp
                </a>
                <a
                  href={`sms:${editingLog.contact.phone}?body=${encodeURIComponent(
                    (messageTemplates[selectedTemplateIndex]?.smsContent || '')
                      .replaceAll('{name}', editingLog.contact.name)
                      .replaceAll('{phone}', editingLog.contact.phone)
                      .replaceAll('{campaign}', selectedCampaign?.name || '')
                  )}`}
                  style={{ padding: '7px 12px', borderRadius: 4, backgroundColor: '#0d6efd', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
                >
                  SMS
                </a>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Feedback</label>
              <select value={editFeedback} onChange={e => setEditFeedback(e.target.value as 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER')} style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)' }}>
                <option value="COMPLETED">Completed</option>
                <option value="NO_RESPONSE">No Response</option>
                <option value="CONNECT_LATER">Connect Later</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <label><input type="checkbox" checked={editCenterChange} onChange={e => setEditCenterChange(e.target.checked)} /> Center Change</label>
              <label><input type="checkbox" checked={editDnd} onChange={e => setEditDnd(e.target.checked)} /> Do Not Disturb</label>
              <label><input type="checkbox" checked={editNotInterested} onChange={e => setEditNotInterested(e.target.checked)} /> Not Interested to Volunteer</label>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Remarks</label>
              <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingLog(null)} disabled={isSavingLog} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveLogEdit} disabled={isSavingLog} style={{ padding: '8px 12px', borderRadius: 4, border: 'none', backgroundColor: '#198754', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {isSavingLog ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canEditTemplates && editingTemplate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1001 }}>
          <div style={{ width: '100%', maxWidth: 500, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>
              {editingTemplate.index === -1 ? 'Add Message Template' : 'Edit Message Template'}
            </h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Template Name</label>
              <input
                value={editingTemplate.name}
                onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }}
                placeholder="e.g., Friendly, Professional"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>SMS Content</label>
              <textarea
                value={editingTemplate.smsContent}
                onChange={e => setEditingTemplate({ ...editingTemplate, smsContent: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }}
                placeholder="Use {name}, {phone}, {campaign} placeholders"
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>WhatsApp Content</label>
              <textarea
                value={editingTemplate.whatsappContent}
                onChange={e => setEditingTemplate({ ...editingTemplate, whatsappContent: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }}
                placeholder="Use {name}, {phone}, {campaign} placeholders"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingTemplate(null)}
                style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!editingTemplate.name.trim() || !editingTemplate.smsContent.trim() || !editingTemplate.whatsappContent.trim()) {
                    setError('All fields are required')
                    return
                  }
                  const updated = [...messageTemplates]
                  if (editingTemplate.index === -1) {
                    updated.push({
                      name: editingTemplate.name.trim(),
                      smsContent: editingTemplate.smsContent.trim(),
                      whatsappContent: editingTemplate.whatsappContent.trim()
                    })
                  } else {
                    updated[editingTemplate.index] = {
                      name: editingTemplate.name.trim(),
                      smsContent: editingTemplate.smsContent.trim(),
                      whatsappContent: editingTemplate.whatsappContent.trim()
                    }
                  }
                  saveTemplates(updated)
                  setEditingTemplate(null)
                  setError(null)
                }}
                style={{ padding: '8px 12px', borderRadius: 4, border: 'none', backgroundColor: '#198754', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {editingTemplate.index === -1 ? 'Add Template' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
