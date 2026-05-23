'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CenterSelector } from '@/components/CenterSelector'

/**
 * AppNav — persistent top navigation bar shown on every authenticated page.
 *
 * Renders only when the user is logged in. Shows:
 * - App wordmark (links home)
 * - Page links: Contacts, Campaigns, Attendance — active link is highlighted
 * - CenterSelector (shown inline if user has multiple centers)
 * - Logged-in user name / role chip
 * - Logout button
 */
export function AppNav() {
  const { isLoggedIn, user, selectedCenterDetails, logout } = useAuth()
  const pathname = usePathname()

  if (!isLoggedIn) return null

  const roleLabelMap = {
    ADMIN: 'Admin',
    USER: 'User',
    ATTENDANCE_TAKER: 'Att. Taker',
  } as const

  const navLinks: { href: string; label: string }[] = [
    { href: '/',            label: 'Contacts'   },
    { href: '/campaigns',   label: 'Campaigns'  },
    { href: '/attendance',  label: 'Attendance' },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 'var(--nav-height, 56px)',
        backgroundColor: 'var(--nav-bg)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        aria-label="Volunteers Coordination — Home"
        style={{
          color: 'var(--nav-text-active)',
          fontWeight: 700,
          fontSize: 16,
          textDecoration: 'none',
          marginRight: 16,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}
      >
        🌿 Volunteers
      </Link>

      {/* Nav links */}
      <div
        role="list"
        style={{ display: 'flex', gap: 2, alignItems: 'center', flex: '1 1 auto', overflow: 'hidden' }}
      >
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            role="listitem"
            aria-current={isActive(link.href) ? 'page' : undefined}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: isActive(link.href) ? 700 : 500,
              color: isActive(link.href) ? 'var(--nav-text-active)' : 'var(--nav-text)',
              backgroundColor: isActive(link.href)
                ? 'rgba(255,255,255,0.12)'
                : 'transparent',
              borderBottom: isActive(link.href)
                ? '2px solid var(--nav-accent)'
                : '2px solid transparent',
              transition: 'background-color 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Center selector (compact, inline in nav) */}
      <NavCenterSelector />

      {/* User info */}
      {user && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--nav-text)',
              whiteSpace: 'nowrap',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ color: 'var(--nav-text-active)', fontWeight: 600 }}>{user.name}</span>
            {selectedCenterDetails && (
              <span
                style={{
                  marginLeft: 6,
                  padding: '1px 6px',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 99,
                  fontSize: 11,
                  color: 'var(--nav-accent)',
                  fontWeight: 600,
                }}
              >
                {user.canAccessAllCenters ? 'Super Admin' : roleLabelMap[selectedCenterDetails.role]}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              logout()
              window.location.href = '/'
            }}
            aria-label="Log out"
            style={{
              padding: '5px 12px',
              backgroundColor: 'var(--color-danger)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              minHeight: 32,
              whiteSpace: 'nowrap',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

/**
 * NavCenterSelector — compact CenterSelector variant for the nav bar.
 * Hides when the user only has one center (same logic as CenterSelector).
 */
function NavCenterSelector() {
  const { user, selectedCenter, selectCenter } = useAuth()

  if (!user || user.centers.length <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <label
        htmlFor="nav-center-select"
        style={{ fontSize: 12, color: 'var(--nav-text)', whiteSpace: 'nowrap' }}
      >
        Center:
      </label>
      <select
        id="nav-center-select"
        value={selectedCenter || ''}
        onChange={e => selectCenter(e.target.value)}
        style={{
          padding: '4px 8px',
          minHeight: 32,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255,255,255,0.2)',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'var(--nav-text-active)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {user.centerDetails?.map(center => (
          <option key={center.id} value={center.id}>
            {center.name}
          </option>
        ))}
      </select>
    </div>
  )
}
