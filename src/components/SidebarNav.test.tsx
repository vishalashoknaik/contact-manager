import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SidebarNav } from './SidebarNav'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const makeAuthMock = (overrides: Record<string, unknown> = {}) => ({
  isLoggedIn: true,
  user: {
    phone: '9999999999',
    name: 'Test User',
    canAccessAllCenters: false,
    centers: ['center-1'],
    centerDetails: [{ id: 'center-1', name: 'Main Center', role: 'ADMIN' as const }],
  },
  selectedCenter: 'center-1',
  selectedCenterDetails: { id: 'center-1', name: 'Main Center', role: 'ADMIN' as const },
  selectCenter: vi.fn(),
  logout: vi.fn(),
  canManageSelectedCenterConfig: false,
  canManageSelectedCenterAccess: false,
  ...overrides,
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SidebarNav', () => {
  describe('when logged out', () => {
    it('renders nothing', () => {
      vi.mocked(useAuth).mockReturnValue(makeAuthMock({ isLoggedIn: false }) as any)
      const { container } = render(<SidebarNav />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('when logged in', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue(makeAuthMock() as any)
    })

    it('shows the app brand in the sidebar', () => {
      render(<SidebarNav />)
      // Multiple "Volunteers" texts may exist (sidebar + mobile header)
      const brandEls = screen.getAllByText('Volunteers')
      expect(brandEls.length).toBeGreaterThanOrEqual(1)
    })

    it('shows the version number', () => {
      render(<SidebarNav />)
      const versionEls = screen.getAllByText(/v3\.1\.0/i)
      expect(versionEls.length).toBeGreaterThanOrEqual(1)
    })

    it('shows the version in both the sidebar footer and mobile header', () => {
      render(<SidebarNav />)
      const versionEls = screen.getAllByText(/v3\.1\.0/i)
      expect(versionEls.length).toBe(2)
    })

    it('renders all main nav links', () => {
      render(<SidebarNav />)
      expect(screen.getAllByRole('link', { name: /Dashboard/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole('link', { name: /Contacts/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole('link', { name: /Campaigns/i }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByRole('link', { name: /Attendance/i }).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the logged-in user name', () => {
      render(<SidebarNav />)
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('calls logout when the logout button is clicked', async () => {
      const user = userEvent.setup()
      const logoutFn = vi.fn()
      vi.mocked(useAuth).mockReturnValue(makeAuthMock({ logout: logoutFn }) as any)

      render(<SidebarNav />)
      // Two logout buttons: sidebar footer + mobile header — click the first one
      const logoutBtns = screen.getAllByRole('button', { name: /logout/i })
      expect(logoutBtns.length).toBeGreaterThanOrEqual(1)
      await user.click(logoutBtns[0])
      expect(logoutFn).toHaveBeenCalledTimes(1)
    })

    it('does not show the center selector for a single-center user', () => {
      render(<SidebarNav />)
      expect(screen.queryByRole('combobox', { name: /center/i })).not.toBeInTheDocument()
    })

    it('shows the center selector for a multi-center user', () => {
      vi.mocked(useAuth).mockReturnValue(
        makeAuthMock({
          user: {
            phone: '9999999999',
            name: 'Multi User',
            canAccessAllCenters: true,
            centers: ['center-1', 'center-2'],
            centerDetails: [
              { id: 'center-1', name: 'Center One', role: 'ADMIN' as const },
              { id: 'center-2', name: 'Center Two', role: 'USER' as const },
            ],
          },
        }) as any
      )
      render(<SidebarNav />)
      const selector = screen.getByRole('combobox', { name: /center/i })
      expect(selector).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Center One' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Center Two' })).toBeInTheDocument()
    })

    it('calls selectCenter when the center dropdown changes', async () => {
      const user = userEvent.setup()
      const selectCenterFn = vi.fn()
      vi.mocked(useAuth).mockReturnValue(
        makeAuthMock({
          selectCenter: selectCenterFn,
          user: {
            phone: '9999999999',
            name: 'Multi User',
            canAccessAllCenters: true,
            centers: ['center-1', 'center-2'],
            centerDetails: [
              { id: 'center-1', name: 'Center One', role: 'ADMIN' as const },
              { id: 'center-2', name: 'Center Two', role: 'USER' as const },
            ],
          },
        }) as any
      )
      render(<SidebarNav />)
      await user.selectOptions(screen.getByRole('combobox', { name: /center/i }), 'center-2')
      expect(selectCenterFn).toHaveBeenCalledWith('center-2')
    })

    it('shows the Settings link when user can manage config', () => {
      vi.mocked(useAuth).mockReturnValue(
        makeAuthMock({ canManageSelectedCenterConfig: true }) as any
      )
      render(<SidebarNav />)
      expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThanOrEqual(1)
    })

    it('hides the Settings link when user has no admin access', () => {
      render(<SidebarNav />)
      expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
    })

    it('logout buttons all show visible Logout text (not icon-only)', () => {
      render(<SidebarNav />)
      const logoutBtns = screen.getAllByRole('button', { name: /logout/i })
      logoutBtns.forEach(btn => {
        expect(btn.textContent?.toLowerCase()).toContain('logout')
      })
    })

    it('has exactly 2 logout buttons — desktop sidebar footer and mobile header', () => {
      render(<SidebarNav />)
      expect(screen.getAllByRole('button', { name: /logout/i })).toHaveLength(2)
    })

    it('both logout buttons call logout when clicked', async () => {
      const user = userEvent.setup()
      const logoutFn = vi.fn()
      vi.mocked(useAuth).mockReturnValue(makeAuthMock({ logout: logoutFn }) as any)

      render(<SidebarNav />)
      const logoutBtns = screen.getAllByRole('button', { name: /logout/i })
      expect(logoutBtns).toHaveLength(2)

      // Click desktop sidebar logout
      await user.click(logoutBtns[0])
      expect(logoutFn).toHaveBeenCalledTimes(1)

      // Click mobile header logout
      logoutFn.mockClear()
      await user.click(logoutBtns[1])
      expect(logoutFn).toHaveBeenCalledTimes(1)
    })
  })
})
