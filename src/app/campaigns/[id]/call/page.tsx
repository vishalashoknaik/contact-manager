'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { campaignsApi, Campaign } from '@/lib/api/client'
import type { NextContactResult } from '@/lib/api/client'
import { CampaignCallScreen } from '@/components/CampaignCallScreen'
import { Alert } from '@/components/ui/Alert'

interface MessageTemplate {
  name: string
  smsContent: string
  whatsappContent: string
}

export default function CampaignCallPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, selectedCenter } = useAuth()

  const mode = (searchParams.get('mode') === 'skipped' ? 'skipped' : 'pending') as 'pending' | 'skipped'

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [initialNext, setInitialNext] = useState<NextContactResult | null>(null)
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) { router.push('/'); return }
    if (!selectedCenter || !id) return
    loadData()
  }, [isLoggedIn, selectedCenter, id])

  const loadData = async () => {
    if (!selectedCenter || !id) return
    setIsLoading(true)
    setError(null)
    try {
      const [c, next] = await Promise.all([
        campaignsApi.getById(id, selectedCenter),
        campaignsApi.getNextContact(id, selectedCenter, mode).catch(() => null),
      ])
      setCampaign(c)
      setInitialNext(next)
      const t = c.messageTemplates
      setMessageTemplates(Array.isArray(t) ? (t as MessageTemplate[]) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoggedIn) return null

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    backgroundColor: 'var(--bg-primary, #fff)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'var(--text-primary, #000)',
  }

  if (isLoading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>📞</div>
        <p style={{ color: 'var(--text-secondary, #666)' }}>Loading campaign…</p>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div style={{ ...containerStyle, padding: 24 }}>
        <Link href={`/campaigns/${id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Campaign
        </Link>
        <Alert variant="error" style={{ marginTop: 16 }}>{error ?? 'Campaign not found.'}</Alert>
      </div>
    )
  }

  // No contacts available in this mode
  if (!initialNext || initialNext.done) {
    return (
      <div style={{ ...containerStyle, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>
          {mode === 'pending' ? 'All contacts have been called!' : 'No skipped contacts to revisit.'}
        </h2>
        <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 24 }}>
          Campaign: <strong>{campaign.name}</strong>
        </p>
        <Link
          href={`/campaigns/${id}`}
          style={{
            padding: '10px 24px', backgroundColor: 'var(--color-primary, #0d6efd)',
            color: '#fff', textDecoration: 'none', borderRadius: 6, fontWeight: 700,
          }}
        >
          ← Back to Campaign
        </Link>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Top bar with progress and back link */}
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-primary, #fff)',
        borderBottom: '1px solid var(--border-color, #e0e0e0)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 10,
        flexWrap: 'wrap',
      }}>
        <Link
          href={`/campaigns/${id}`}
          style={{ color: 'var(--text-secondary, #666)', textDecoration: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
        >
          ← {campaign.name}
        </Link>
        <div style={{ flex: 1, height: 6, backgroundColor: 'var(--border-color, #e0e0e0)', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
          {campaign.totalContacts > 0 && (
            <div style={{
              height: '100%',
              width: `${Math.round(((campaign.completedContacts + campaign.skippedContacts) / campaign.totalContacts) * 100)}%`,
              backgroundColor: 'var(--color-success, #198754)',
              transition: 'width 0.4s',
            }} />
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary, #666)', flexShrink: 0 }}>
          {mode === 'pending'
            ? `${campaign.completedContacts + campaign.skippedContacts} / ${campaign.totalContacts} done`
            : `Revisiting ${campaign.skippedContacts} skipped`}
        </span>
      </div>

      {/* Calling screen */}
      <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
        <CampaignCallScreen
          campaignId={campaign.id}
          centerId={selectedCenter!}
          initialNext={initialNext as any}
          mode={mode}
          campaignName={campaign.name}
          messageTemplates={messageTemplates}
          selectedTemplateIndex={selectedTemplateIndex}
          onSelectedTemplateChange={setSelectedTemplateIndex}
          onDone={() => router.push(`/campaigns/${id}`)}
          initialCompleted={campaign.completedContacts}
          initialPending={campaign.pendingContacts}
          initialSkipped={campaign.skippedContacts}
        />
      </div>
    </div>
  )
}
