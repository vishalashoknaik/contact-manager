'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { campaignsApi, Campaign, CallLog, contactsApi } from '@/lib/api/client'
import type { NextContactResult } from '@/lib/api/client'
import { Contact } from '@/lib/types'
import { VolunteerPanel } from '@/components/VolunteerPanel'
import { CallLogsTable } from '@/components/CallLogsTable'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}

type CampaignTab = 'overview' | 'contacts' | 'logs' | 'templates'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fd7e14',
  COMPLETED: '#198754',
  SKIPPED: '#6c757d',
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isLoggedIn, user, selectedCenter, selectedCenterDetails } = useAuth()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [nextPending, setNextPending] = useState<NextContactResult | null>(null)
  const [nextSkipped, setNextSkipped] = useState<NextContactResult | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Template editing state
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<{
    index: number; name: string; smsContent: string; whatsappContent: string
  } | null>(null)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const templateSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Call log editing state
  const [editingLog, setEditingLog] = useState<CallLog | null>(null)
  const [editFeedback, setEditFeedback] = useState<'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'>('COMPLETED')
  const [editCenterChange, setEditCenterChange] = useState(false)
  const [editDnd, setEditDnd] = useState(false)
  const [editNotInterested, setEditNotInterested] = useState(false)
  const [editRemarks, setEditRemarks] = useState('')
  const [isSavingLog, setIsSavingLog] = useState(false)

  const canEditTemplates =
    selectedCenterDetails?.role === 'USER' || selectedCenterDetails?.role === 'ADMIN'

  useEffect(() => {
    if (!isLoggedIn) { router.push('/'); return }
    if (!selectedCenter || !id) return
    loadAll()
    contactsApi.getAll(selectedCenter).then(d => setContacts(d as Contact[])).catch(() => {})
  }, [isLoggedIn, selectedCenter, id])

  // Sync templates from campaign data
  useEffect(() => {
    if (!campaign) { setMessageTemplates([]); return }
    const t = campaign.messageTemplates
    setMessageTemplates(Array.isArray(t) ? (t as MessageTemplate[]) : [])
    setSelectedTemplateIndex(0)
  }, [campaign?.id])

  const loadAll = async () => {
    if (!selectedCenter || !id) return
    setIsLoading(true)
    setError(null)
    try {
      const [c, logs, pending, skipped] = await Promise.all([
        campaignsApi.getById(id, selectedCenter),
        campaignsApi.getCallLogs(id, selectedCenter),
        campaignsApi.getNextContact(id, selectedCenter, 'pending').catch(() => null),
        campaignsApi.getNextContact(id, selectedCenter, 'skipped').catch(() => null),
      ])
      setCampaign(c)
      setCallLogs(logs)
      setNextPending(pending)
      setNextSkipped(skipped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const saveTemplates = (updated: MessageTemplate[]) => {
    setMessageTemplates(updated)
    if (!campaign || !selectedCenter) return
    if (templateSaveTimeout.current) clearTimeout(templateSaveTimeout.current)
    templateSaveTimeout.current = setTimeout(async () => {
      setIsSavingTemplates(true)
      try {
        const saved = await campaignsApi.updateTemplates(campaign.id, updated, selectedCenter)
        setCampaign(saved)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save templates')
      } finally {
        setIsSavingTemplates(false)
      }
    }, 800)
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
    if (!editingLog || !campaign || !selectedCenter) return
    setIsSavingLog(true)
    try {
      await campaignsApi.submitCallLog(
        campaign.id,
        {
          campaignContactId: editingLog.campaignContactId,
          feedback: editFeedback,
          centerChange: editCenterChange,
          doNotDisturb: editDnd,
          notInterestedToVolunteer: editNotInterested,
          remarks: editRemarks.trim() || undefined,
          action: editingLog.status === 'SKIPPED' ? 'skip' : 'submit',
          mode: editingLog.status === 'SKIPPED' ? 'skipped' : 'pending',
        },
        selectedCenter
      )
      setEditingLog(null)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update call log')
    } finally {
      setIsSavingLog(false)
    }
  }

  if (!isLoggedIn) return null

  const container: React.CSSProperties = {
    padding: 'clamp(16px, 3vw, 28px)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: 'var(--bg-primary, #fff)',
    color: 'var(--text-primary, #000)',
    minHeight: '100dvh',
  }

  if (isLoading) {
    return (
      <div style={container}>
        <div style={{ color: 'var(--text-secondary)', padding: 32, textAlign: 'center' }}>
          Loading campaign…
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div style={container}>
        <Link href="/campaigns" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
          ← All Campaigns
        </Link>
        {error && <Alert variant="error" style={{ marginTop: 16 }}>{error}</Alert>}
        {!error && <p style={{ marginTop: 16 }}>Campaign not found.</p>}
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts', badge: campaign.totalContacts },
    { id: 'logs', label: 'Call Logs', badge: callLogs.length },
    { id: 'templates', label: 'Templates', badge: messageTemplates.length },
  ]

  const hasPendingCalls = nextPending && !nextPending.done
  const hasSkippedCalls = nextSkipped && !nextSkipped.done

  return (
    <div style={container}>
      {/* Breadcrumb */}
      <Link
        href="/campaigns"
        style={{ color: 'var(--text-secondary, #666)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}
      >
        ← All Campaigns
      </Link>

      {/* Campaign Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800 }}>{campaign.name}</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
            Created {new Date(campaign.createdAt).toLocaleDateString()} ·{' '}
            {campaign.volunteers.length} volunteer{campaign.volunteers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Primary CTA */}
        {hasPendingCalls && (
          <Link
            href={`/campaigns/${id}/call?mode=pending`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: 'var(--color-success, #198754)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 'var(--radius-md, 6px)',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            📞 Start Calling
          </Link>
        )}
      </div>

      {error && <Alert variant="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 10,
        marginBottom: 28,
      }}>
        {[
          { label: 'Total', value: campaign.totalContacts, color: 'var(--color-primary, #0d6efd)' },
          { label: 'Pending', value: campaign.pendingContacts, color: '#fd7e14' },
          { label: 'Completed', value: campaign.completedContacts, color: '#198754' },
          { label: 'Skipped', value: campaign.skippedContacts, color: '#6c757d' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '14px 16px',
            borderRadius: 10,
            backgroundColor: 'var(--panel-bg, #f8f9fa)',
            border: '1px solid var(--border-color, #e0e0e0)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={id => setActiveTab(id as CampaignTab)} style={{ marginBottom: 24 }} />

      {/* ── Overview tab ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div>
          {/* Volunteer panel */}
          <div style={{ marginBottom: 24 }}>
            <VolunteerPanel
              campaign={campaign}
              centerId={selectedCenter!}
              currentUserPhone={user!.phone}
              onUpdated={updated => setCampaign(updated)}
              contacts={contacts}
            />
          </div>

          {/* Call action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            {hasPendingCalls && (
              <Link
                href={`/campaigns/${id}/call?mode=pending`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', backgroundColor: 'var(--color-success, #198754)',
                  color: '#fff', textDecoration: 'none', borderRadius: 6,
                  fontWeight: 700, fontSize: 14,
                }}
              >
                📞 Call New Contacts ({campaign.pendingContacts})
              </Link>
            )}
            {hasSkippedCalls && (
              <Link
                href={`/campaigns/${id}/call?mode=skipped`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', border: '1px solid #fd7e14',
                  color: '#fd7e14', textDecoration: 'none', borderRadius: 6,
                  fontWeight: 700, fontSize: 14, backgroundColor: 'transparent',
                }}
              >
                🔄 Revisit Skipped ({campaign.skippedContacts})
              </Link>
            )}
            {!hasPendingCalls && !hasSkippedCalls && (
              <Alert variant="success">All contacts have been called in this campaign. 🎉</Alert>
            )}
          </div>

          {/* Full report (admins/users) */}
          {(selectedCenterDetails?.role === 'USER' || selectedCenterDetails?.role === 'ADMIN') && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, padding: '8px 0', userSelect: 'none', color: 'var(--text-secondary, #666)' }}>
                ▶ Show Full Report (all contacts including pending)
              </summary>
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
                    {campaign.contacts.map(cc => {
                      const log = callLogs.find(l => l.campaignContactId === cc.campaignContactId)
                      const statusColor = STATUS_COLORS[cc.status] ?? '#000'
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
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>{log?.volunteerPhone ?? '—'}</td>
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>{log?.feedback ?? '—'}</td>
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>{log?.notInterestedToVolunteer ? '✓' : '—'}</td>
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>{log?.centerChange ? '✓' : '—'}</td>
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px', textAlign: 'center' }}>{log?.doNotDisturb ? '✓' : '—'}</td>
                          <td style={{ border: '1px solid var(--border-color, #eee)', padding: '5px 10px' }}>{log?.remarks ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Contacts tab ──────────────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--th-bg, #f5f5f5)' }}>
                {['Name', 'Phone', 'Status'].map(h => (
                  <th key={h} style={{ border: '1px solid var(--border-color, #ddd)', padding: '8px 12px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaign.contacts.map(cc => (
                <tr key={cc.campaignContactId}>
                  <td style={{ border: '1px solid var(--border-color, #eee)', padding: '7px 12px', fontWeight: 500 }}>{cc.contact.name}</td>
                  <td style={{ border: '1px solid var(--border-color, #eee)', padding: '7px 12px', color: 'var(--color-primary, #0d6efd)' }}>{cc.contact.phone}</td>
                  <td style={{ border: '1px solid var(--border-color, #eee)', padding: '7px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: (STATUS_COLORS[cc.status] ?? '#000') + '22',
                      color: STATUS_COLORS[cc.status] ?? '#000',
                    }}>
                      {cc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Call Logs tab ─────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)', marginBottom: 10 }}>
            Click a row to edit feedback and flags.
          </div>
          <CallLogsTable logs={callLogs} onLogClick={openLogEditor} />
        </div>
      )}

      {/* ── Templates tab ─────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
              Use placeholders: {'{name}'}, {'{phone}'}, {'{campaign}'}
            </p>
            {isSavingTemplates && <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>Syncing…</span>}
            {canEditTemplates && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setEditingTemplate({ index: -1, name: 'New Template', smsContent: '', whatsappContent: '' })}
                style={{ marginLeft: 'auto' }}
              >
                + Add Template
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messageTemplates.length === 0 && (
              <p style={{ color: 'var(--text-secondary, #666)', fontStyle: 'italic' }}>
                No templates yet. Add one to get started.
              </p>
            )}
            {messageTemplates.map((template, index) => (
              <div key={index} style={{
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${selectedTemplateIndex === index ? 'var(--color-primary, #0d6efd)' : 'var(--border-color, #ddd)'}`,
                backgroundColor: selectedTemplateIndex === index ? 'var(--selected-item-bg, #f0f7ff)' : 'var(--panel-bg, #f9f9f9)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
                onClick={() => setSelectedTemplateIndex(index)}
              >
                <input
                  type="radio"
                  name="template"
                  checked={selectedTemplateIndex === index}
                  onChange={() => setSelectedTemplateIndex(index)}
                  style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{template.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)', marginTop: 3 }}>
                    SMS: {template.smsContent.substring(0, 60)}{template.smsContent.length > 60 ? '…' : ''}
                  </div>
                </div>
                {canEditTemplates && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setEditingTemplate({ index, name: template.name, smsContent: template.smsContent, whatsappContent: template.whatsappContent }) }}>
                    Edit
                  </Button>
                )}
                {canEditTemplates && messageTemplates.length > 1 && (
                  <Button variant="danger" size="sm" onClick={e => {
                    e.stopPropagation()
                    const updated = messageTemplates.filter((_, i) => i !== index)
                    setSelectedTemplateIndex(Math.min(selectedTemplateIndex, updated.length - 1))
                    saveTemplates(updated)
                  }}>
                    Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Call Log modal ───────────────────────────────────────── */}
      {editingLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: 500, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 10, padding: 20 }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>Edit Call Log — {editingLog.contact.name}</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Feedback</label>
              <select value={editFeedback} onChange={e => setEditFeedback(e.target.value as 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER')}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)' }}>
                <option value="COMPLETED">Completed</option>
                <option value="NO_RESPONSE">No Response</option>
                <option value="CONNECT_LATER">Connect Later</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editCenterChange} onChange={e => setEditCenterChange(e.target.checked)} />
                Center Change
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editDnd} onChange={e => setEditDnd(e.target.checked)} />
                Do Not Disturb
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editNotInterested} onChange={e => setEditNotInterested(e.target.checked)} />
                Not Interested to Volunteer
              </label>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Remarks</label>
              <textarea value={editRemarks} onChange={e => setEditRemarks(e.target.value)} rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }} />
            </div>
            {error && <Alert variant="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setEditingLog(null)} disabled={isSavingLog}>Cancel</Button>
              <Button variant="success" size="sm" onClick={saveLogEdit} loading={isSavingLog}>Save Feedback</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Template modal ───────────────────────────────────────── */}
      {canEditTemplates && editingTemplate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1001 }}>
          <div style={{ width: '100%', maxWidth: 500, backgroundColor: 'var(--bg-primary, #fff)', border: '1px solid var(--border-color, #ddd)', borderRadius: 10, padding: 20 }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>
              {editingTemplate.index === -1 ? 'Add Template' : 'Edit Template'}
            </h4>
            {(['name', 'smsContent', 'whatsappContent'] as const).map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {field === 'name' ? 'Template Name' : field === 'smsContent' ? 'SMS Content' : 'WhatsApp Content'}
                </label>
                {field === 'name' ? (
                  <input value={editingTemplate[field]} onChange={e => setEditingTemplate({ ...editingTemplate, [field]: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }}
                    placeholder="e.g., Friendly, Professional" />
                ) : (
                  <textarea value={editingTemplate[field]} onChange={e => setEditingTemplate({ ...editingTemplate, [field]: e.target.value })}
                    rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-color, #ddd)', boxSizing: 'border-box' }}
                    placeholder="Use {name}, {phone}, {campaign} placeholders" />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button variant="success" size="sm" onClick={() => {
                if (!editingTemplate.name.trim() || !editingTemplate.smsContent.trim() || !editingTemplate.whatsappContent.trim()) {
                  setError('All template fields are required'); return
                }
                const updated = [...messageTemplates]
                const entry = { name: editingTemplate.name.trim(), smsContent: editingTemplate.smsContent.trim(), whatsappContent: editingTemplate.whatsappContent.trim() }
                if (editingTemplate.index === -1) updated.push(entry)
                else updated[editingTemplate.index] = entry
                saveTemplates(updated)
                setEditingTemplate(null)
                setError(null)
              }}>Save Template</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
