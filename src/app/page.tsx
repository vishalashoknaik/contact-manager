'use client'

// Dashboard page — entry point for the app.
// Quick-access cards link to the three main sections.
// The full contacts page lives at /contacts.

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/components/LoginPage'

// These imports were replaced with the sidebar — kept as anchor-comment so
// search tools can still locate migrated code if needed.
// OLD: import { useContacts } from '../hooks/useContacts'
// OLD: import { useAdmin } from '@/hooks/useAdmin'

const QUICK_LINKS = [
  {
    href: '/contacts',
    icon: '👥',
    label: 'Contacts',
    description: 'View, filter, and manage volunteer contacts',
    color: '#4a9eff',
    bg: 'rgba(74,158,255,0.08)',
    border: 'rgba(74,158,255,0.25)',
  },
  {
    href: '/campaigns',
    icon: '📣',
    label: 'Campaigns',
    description: 'Run call campaigns and track progress',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
  },
  {
    href: '/attendance',
    icon: '📋',
    label: 'Attendance',
    description: 'Record and review session attendance',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
] as const

function DashboardContent() {
  const { user, selectedCenterDetails } = useAuth()

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const centerName = selectedCenterDetails?.centerName ?? 'your center'

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      style={{
        padding: '32px 24px',
        maxWidth: 860,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary, #ffffff)',
        color: 'var(--text-primary, #000000)',
        minHeight: '100vh',
      }}
    >
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700 }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary, #666)' }}>
          {centerName} &mdash; Volunteers Coordination
        </p>
      </div>

      {/* Section label */}
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary, #666)',
        }}
      >
        Quick access
      </p>

      {/* Quick-access cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}
      >
        {QUICK_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'block',
              padding: '20px 18px',
              borderRadius: 12,
              border: `1px solid ${link.border}`,
              backgroundColor: link.bg,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'box-shadow 0.15s, transform 0.12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.boxShadow = `0 4px 20px ${link.bg}`
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.boxShadow = 'none'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10, lineHeight: 1 }}>{link.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: link.color, marginBottom: 6 }}>
              {link.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)', lineHeight: 1.4 }}>
              {link.description}
            </div>
          </Link>
        ))}
      </div>

      {/* Tips section */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 10,
          backgroundColor: 'var(--panel-bg, #f8f9fa)',
          border: '1px solid var(--border-color, #e9ecef)',
        }}
      >
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13 }}>💡 Tips</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary, #666)', lineHeight: 1.7 }}>
          <li>Use <strong>Contacts</strong> to add, filter, and bulk-update volunteer records.</li>
          <li>Create a <strong>Campaign</strong> by selecting contacts and clicking <em>Create Campaign</em>.</li>
          <li>Record today&apos;s attendance under <strong>Attendance</strong> to keep a live count.</li>
        </ul>
      </div>
    </div>
  )
}

export default function Home() {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn) {
    return <LoginPage />
  }

  return <DashboardContent />
}

