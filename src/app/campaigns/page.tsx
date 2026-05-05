'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { campaignsApi, contactsApi, Campaign, CallLog, NextContactResult } from '@/lib/api/client'
import { VolunteerPanel } from '@/components/VolunteerPanel'
import { CampaignCallScreen } from '@/components/CampaignCallScreen'
import { CallLogsTable } from '@/components/CallLogsTable'

type View = 'list' | 'detail' | 'call'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}

const defaultTemplates: MessageTemplate[] = [
  {
    name: 'Default',
    smsContent: 'Hi {name}, this is from {campaign}. Please call us back when convenient.',
    whatsappContent: 'Hi {name}, this is from {campaign}. Please let us know a good time to connect.'
  }
]

function getTemplateStorageKey(centerId: string, campaignId: string) {
  return `campaign-msg-templates:${centerId}:${campaignId}`
}

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
  const [editingContact, setEditingContact] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [contactNameDraft, setContactNameDraft] = useState('')
  const [contactPhoneDraft, setContactPhoneDraft] = useState('')
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [editingLog, setEditingLog] = useState<CallLog | null>(null)
  const [editFeedback, setEditFeedback] = useState<'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'>('COMPLETED')
  const [editCenterChange, setEditCenterChange] = useState(false)
  const [editDnd, setEditDnd] = useState(false)
  const [editNotInterested, setEditNotInterested] = useState(false)
  const [editRemarks, setEditRemarks] = useState('')
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(defaultTemplates)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<{ index: number; name: string; smsContent: string; whatsappContent: string } | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!selectedCenter) return
    loadCampaigns()
  }, [selectedCenter])

  useEffect(() => {
    if (!selectedCenter || !selectedCampaign) {
      setMessageTemplates(defaultTemplates)
      setSelectedTemplateIndex(0)
      return
    }

    const key = getTemplateStorageKey(selectedCenter, selectedCampaign.id)
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (!stored) {
      setMessageTemplates(defaultTemplates)
      setSelectedTemplateIndex(0)
      return
    }

    try {
      const parsed = JSON.parse(stored) as MessageTemplate[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessageTemplates(parsed)
        setSelectedTemplateIndex(0)
      } else {
        setMessageTemplates(defaultTemplates)
        setSelectedTemplateIndex(0)
      }
    } catch {
      setMessageTemplates(defaultTemplates)
      setSelectedTemplateIndex(0)
    }
  }, [selectedCampaign, selectedCenter])

  useEffect(() => {
    if (!selectedCenter || !selectedCampaign) return
    const key = getTemplateStorageKey(selectedCenter, selectedCampaign.id)
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(messageTemplates))
  }, [selectedCenter, selectedCampaign, messageTemplates])

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

  const openContactEditor = (contact: { id: string; name: string; phone: string }) => {
    setEditingContact(contact)
    setContactNameDraft(contact.name)
    setContactPhoneDraft(contact.phone)
  }

  const saveContactEdit = async () => {
    if (!editingContact || !selectedCenter) return

    setIsSavingContact(true)
    setError(null)
    try {
      await contactsApi.update(
        editingContact.id,
        {
          name: contactNameDraft.trim(),
          phone: contactPhoneDraft.trim()
        },
        selectedCenter
      )
      setEditingContact(null)
      await refreshCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
    } finally {
      setIsSavingContact(false)
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
        <button onClick={() => router.push('/')} style={backBtn}>← Home</button>
        <h2 style={{ margin: 0 }}>📣 Campaigns</h2>
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            marginLeft: 'auto',
            padding: '10px 12px',
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
            campaignName={selectedCampaign.name}
            messageTemplates={messageTemplates}
            selectedTemplateIndex={selectedTemplateIndex}
            onSelectedTemplateChange={setSelectedTemplateIndex}
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
                  padding: '14px 18px', borderRadius: 4, cursor: 'pointer',
                  border: 'none', backgroundColor: '#198754', color: '#fff',
                  fontWeight: 'bold', fontSize: 15,
                  flex: '1 1 220px'
                }}
              >
                📞 Call New Contacts
              </button>
            )}
            {nextSkipped && !nextSkipped.done && (
              <button
                onClick={() => startCalling('skipped')}
                style={{
                  padding: '14px 18px', borderRadius: 4, cursor: 'pointer',
                  border: 'none', backgroundColor: '#fd7e14', color: '#fff',
                  fontWeight: 'bold', fontSize: 15,
                  flex: '1 1 220px'
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

          <div style={{ marginBottom: 24, padding: 12, border: '1px solid var(--border-color, #ddd)', borderRadius: 8, backgroundColor: 'var(--panel-bg, #f8f9fa)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>Call Message Templates</h4>
              <button
                onClick={() => setEditingTemplate({ index: -1, name: 'New Template', smsContent: '', whatsappContent: '' })}
                style={{
                  padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)',
                  backgroundColor: '#198754', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}
              >
                + Add Template
              </button>
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
                    border: `1px solid var(--border-color, #ddd)`,
                    backgroundColor: selectedTemplateIndex === index ? '#e7f3ff' : '#fff',
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTemplate({ index, name: template.name, smsContent: template.smsContent, whatsappContent: template.whatsappContent })
                    }}
                    style={{
                      padding: '4px 8px', borderRadius: 3, border: 'none',
                      backgroundColor: '#0d6efd', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600
                    }}
                  >
                    Edit
                  </button>
                  {messageTemplates.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const updated = messageTemplates.filter((_, i) => i !== index)
                        setMessageTemplates(updated)
                        setSelectedTemplateIndex(Math.min(selectedTemplateIndex, updated.length - 1))
                      }}
                      style={{
                        padding: '4px 8px', borderRadius: 3, border: 'none',
                        backgroundColor: '#dc3545', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contacts table */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Contacts ({selectedCampaign.contacts.length})</h4>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginBottom: 8 }}>
              Click a contact row to edit basic info.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid var(--border-color, #ddd)', padding: '6px 8px', textAlign: 'left' }}>Name</th>
                    <th style={{ border: '1px solid var(--border-color, #ddd)', padding: '6px 8px', textAlign: 'left' }}>Phone</th>
                    <th style={{ border: '1px solid var(--border-color, #ddd)', padding: '6px 8px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCampaign.contacts.map(cc => (
                    <tr
                      key={cc.campaignContactId}
                      onClick={() => openContactEditor(cc.contact)}
                      style={{ cursor: 'pointer' }}
                      title="Click to edit contact"
                    >
                      <td style={{ border: '1px solid var(--border-color, #eee)', padding: '6px 8px', fontSize: 13 }}>{cc.contact.name}</td>
                      <td style={{ border: '1px solid var(--border-color, #eee)', padding: '6px 8px', fontSize: 13 }}>{cc.contact.phone}</td>
                      <td style={{ border: '1px solid var(--border-color, #eee)', padding: '6px 8px', fontSize: 13 }}>{cc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {editingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 460, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Edit Contact</h4>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Name</label>
              <input value={contactNameDraft} onChange={e => setContactNameDraft(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Phone</label>
              <input value={contactPhoneDraft} onChange={e => setContactPhoneDraft(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingContact(null)} disabled={isSavingContact} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveContactEdit} disabled={isSavingContact} style={{ padding: '8px 12px', borderRadius: 4, border: 'none', backgroundColor: '#0d6efd', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {isSavingContact ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 520, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 8, padding: 16 }}>
            <h4 style={{ marginTop: 0, marginBottom: 12 }}>Edit Call Log</h4>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginBottom: 12 }}>
              {editingLog.contact.name} · {editingLog.contact.phone}
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

      {editingTemplate && (
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
                  setMessageTemplates(updated)
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
