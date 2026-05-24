'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api/client'

// Primary navigation items — icon (emoji), label, route, exact-match flag
const BASE_NAV_ITEMS = [
  { href: '/',           label: 'Dashboard',  icon: '⌂',  exact: true  },
  { href: '/contacts',   label: 'Contacts',   icon: '👥', exact: true  },
  { href: '/campaigns',  label: 'Campaigns',  icon: '📣', exact: false },
  { href: '/attendance', label: 'Attendance', icon: '📋', exact: false },
] as const

const SETTINGS_ITEM = { href: '/settings', label: 'Settings', icon: '⚙', exact: false } as const

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
  const { isLoggedIn, user, selectedCenter, selectedCenterDetails, selectCenter, logout, canManageSelectedCenterConfig, canManageSelectedCenterAccess } = useAuth()
  const pathname = usePathname()

  // Fetch pending access requests count for the badge on the Settings link
  const [pendingAccessCount, setPendingAccessCount] = useState(0)
  useEffect(() => {
    if (!canManageSelectedCenterAccess || !selectedCenter) return
    authApi.getUsers(selectedCenter)
      .then(users => setPendingAccessCount(users.filter(u => !u.isApproved).length))
      .catch(() => {})
  }, [canManageSelectedCenterAccess, selectedCenter])

  const showSettings = canManageSelectedCenterConfig || canManageSelectedCenterAccess
  const navItems = showSettings
    ? [...BASE_NAV_ITEMS, SETTINGS_ITEM]
    : [...BASE_NAV_ITEMS]

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
          {navItems.map(item => {
            const active = isActive(item.href, item.exact)
            const badge = item.href === '/settings' ? pendingAccessCount : 0
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge > 0 && (
                  <span style={{
                    background: 'var(--color-danger, #e53e3e)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    textAlign: 'center',
                  }}>
                    {badge}
                  </span>
                )}
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
          {/* Compact center selector — only shown for multi-center users */}
          {user && user.centers.length > 1 && (
            <div style={{ padding: '0 4px' }}>
              <label
                htmlFor="sidebar-center-select"
                style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}
              >
                Center
              </label>
              <select
                id="sidebar-center-select"
                value={selectedCenter || ''}
                onChange={e => selectCenter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {user.centerDetails?.map(center => (
                  <option key={center.id} value={center.id} style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                color: 'rgba(255,255,255,0.65)',
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 4,
                flexShrink: 0,
                lineHeight: 1,
                minHeight: 'unset',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 14 }}>↩</span>
              <span>Logout</span>
            </button>
          </div>

          {/* Version */}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2, textAlign: 'center' }}>
            v3.0.0
          </div>
        </div>
      </aside>

      {/* ── Mobile top header bar ────────────────────────────────────── */}
      <header className="mobile-header-bar">
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🌿</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Volunteers</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coordination</div>
          </div>
        </div>
        {/* Right: version + logout */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>v3.0.0</span>
          <button
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 11,
              padding: '4px 8px',
              lineHeight: 1,
              minHeight: 'unset',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>↩</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ───────────────────────────────────── */}
      <nav className="bottom-nav-mobile" aria-label="Main navigation">
        {navItems.map(item => {
          const active = isActive(item.href, item.exact)
          const badge = item.href === '/settings' ? pendingAccessCount : 0
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
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {item.icon}
                {badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    background: 'var(--color-danger, #e53e3e)',
                    borderRadius: 99,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    padding: '0 4px',
                    minWidth: 14,
                    textAlign: 'center',
                    lineHeight: '14px',
                  }}>
                    {badge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
