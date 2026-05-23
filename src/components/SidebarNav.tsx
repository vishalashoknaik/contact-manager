'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CenterSelector } from '@/components/CenterSelector'

// Primary navigation items — icon (emoji), label, route, exact-match flag
const NAV_ITEMS = [
  { href: '/',           label: 'Dashboard',  icon: '⌂',  exact: true  },
  { href: '/contacts',   label: 'Contacts',   icon: '👥', exact: true  },
  { href: '/campaigns',  label: 'Campaigns',  icon: '📣', exact: false },
  { href: '/attendance', label: 'Attendance', icon: '📋', exact: false },
] as const

const ROLE_LABELS: Record<string, string> = {
  ADMIN:            'Admin',
  USER:             'Manager',
  ATTENDANCE_TAKER: 'Att. Taker',
}

/**
 * SidebarNav — persistent navigation shown on all authenticated pages.
 *
 * Renders two complementary navs:
 *  • A fixed 200px left sidebar on desktop (≥ 769 px).
 *  • A fixed bottom tab bar on mobile (≤ 768 px).
 *
 * Both are hidden when the user is not logged in so the login page
 * gets a clean, full-screen layout.
 */
export function SidebarNav() {
  const { isLoggedIn, user, selectedCenterDetails, logout } = useAuth()
  const pathname = usePathname()

  if (!isLoggedIn) return null

  const roleLabel = selectedCenterDetails?.role
    ? (ROLE_LABELS[selectedCenterDetails.role] ?? selectedCenterDetails.role)
    : ''

  const avatarLetter = (user?.name ?? user?.phone ?? 'U')[0].toUpperCase()

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  // Shared link style factory
  const sidebarLinkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 2,
    textDecoration: 'none',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
    backgroundColor: active ? 'rgba(255,255,255,0.13)' : 'transparent',
    transition: 'background-color 0.15s, color 0.15s',
  })

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className="app-sidebar"
        aria-label="Main navigation"
        style={{
          width: 200,
          flexShrink: 0,
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--nav-bg)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          zIndex: 100,
          overflowY: 'auto',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            padding: '18px 16px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>🌿</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                Volunteers
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 1,
                }}
              >
                Coordination
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav
          role="list"
          style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}
        >
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                role="listitem"
                className="sidebar-nav-link"
                style={sidebarLinkStyle(active)}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  style={{
                    fontSize: 18,
                    width: 22,
                    textAlign: 'center',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer: center selector + user card */}
        <div
          style={{
            padding: '10px 8px 14px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Center selector (handles multi-center users) */}
          <div style={{ padding: '0 4px' }}>
            <CenterSelector />
          </div>

          {/* User card + logout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {/* Avatar */}
            <div
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: 'var(--nav-accent, #4a9eff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {avatarLetter}
            </div>

            {/* Name + role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name ?? user?.phone}
              </div>
              {roleLabel && (
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
                  {roleLabel}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 17,
                padding: '2px 4px',
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
                minHeight: 'unset',
              }}
            >
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ───────────────────────────────────── */}
      <nav className="bottom-nav-mobile" aria-label="Main navigation">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingBlock: 6,
                textDecoration: 'none',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
