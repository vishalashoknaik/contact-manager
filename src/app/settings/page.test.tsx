import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsPage from './page'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Lightweight AdminPanel stub so tests don't need full panel setup
vi.mock('@/components/AdminPanel', () => ({
  AdminPanel: ({ section, startCollapsed }: { section: string; startCollapsed?: boolean }) => (
    <div data-testid={`admin-panel-${section}`} data-start-collapsed={String(startCollapsed)}>
      AdminPanel:{section}
    </div>
  ),
}))

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    activities: [],
    areas: [],
    programs: [],
    interests: [],
    setActivities: vi.fn(),
    setAreas: vi.fn(),
    setPrograms: vi.fn(),
    setInterests: vi.fn(),
  }),
}))

vi.mock('@/hooks/useContacts', () => ({
  useContacts: () => ({
    contacts: [],
    setContacts: vi.fn(),
  }),
}))

const { authApiMock } = vi.hoisted(() => ({
  authApiMock: { getUsers: vi.fn(async () => []) },
}))

vi.mock('@/lib/api/client', () => ({
  authApi: authApiMock,
}))

const makeAuth = (overrides: Record<string, unknown> = {}) => ({
  isLoggedIn: true,
  selectedCenter: 'center-1',
  canManageSelectedCenterAccess: true,
  canManageSelectedCenterConfig: true,
  ...overrides,
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'

// ── Helpers ────────────────────────────────────────────────────────────────────

function setup(authOverrides: Record<string, unknown> = {}) {
  vi.mocked(useAuth).mockReturnValue(makeAuth(authOverrides) as any)
  return render(<SettingsPage />)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApiMock.getUsers.mockResolvedValue([])
  })

  describe('access control', () => {
    it('redirects to / when user is not logged in', () => {
      setup({ isLoggedIn: false })
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('redirects to / when user has no admin permissions', () => {
      setup({ canManageSelectedCenterAccess: false, canManageSelectedCenterConfig: false })
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('renders when user has access-management permission only', () => {
      setup({ canManageSelectedCenterConfig: false })
      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    })

    it('renders when user has config permission only', () => {
      setup({ canManageSelectedCenterAccess: false })
      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    })
  })

  describe('tab layout', () => {
    it('shows both tabs when user has both permissions', () => {
      setup()
      expect(screen.getByRole('button', { name: /access/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /center config/i })).toBeInTheDocument()
    })

    it('does NOT show tabs when user has only access-management permission', () => {
      setup({ canManageSelectedCenterConfig: false })
      expect(screen.queryByRole('button', { name: /center config/i })).not.toBeInTheDocument()
    })

    it('does NOT show tabs when user has only config permission', () => {
      setup({ canManageSelectedCenterAccess: false })
      expect(screen.queryByRole('button', { name: /access/i })).not.toBeInTheDocument()
    })

    it('Access tab is active by default when user has both permissions', () => {
      setup()
      expect(screen.getByTestId('admin-panel-access')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-panel-settings')).not.toBeInTheDocument()
    })

    it('switching to Center Config tab shows config panel and hides access panel', async () => {
      const user = userEvent.setup()
      setup()

      await user.click(screen.getByRole('button', { name: /center config/i }))

      expect(screen.queryByTestId('admin-panel-access')).not.toBeInTheDocument()
      expect(screen.getByTestId('admin-panel-settings')).toBeInTheDocument()
    })

    it('switching back to Access tab shows access panel', async () => {
      const user = userEvent.setup()
      setup()

      await user.click(screen.getByRole('button', { name: /center config/i }))
      await user.click(screen.getByRole('button', { name: /access/i }))

      expect(screen.getByTestId('admin-panel-access')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-panel-settings')).not.toBeInTheDocument()
    })
  })

  describe('pending access badge', () => {
    it('shows no badge on Access tab when there are no pending users', async () => {
      authApiMock.getUsers.mockResolvedValue([
        { isApproved: true },
        { isApproved: true },
      ])
      setup()
      // Badge should not appear — no count element
      await waitFor(() => expect(authApiMock.getUsers).toHaveBeenCalled())
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
    })

    it('shows pending count badge on Access tab when there are pending users', async () => {
      authApiMock.getUsers.mockResolvedValue([
        { isApproved: false },
        { isApproved: false },
        { isApproved: true },
      ])
      setup()
      await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    })

    it('does not fetch pending count when user has no access-management permission', () => {
      setup({ canManageSelectedCenterAccess: false })
      expect(authApiMock.getUsers).not.toHaveBeenCalled()
    })
  })

  describe('AdminPanel props', () => {
    it('passes startCollapsed={true} to access panel', () => {
      setup({ canManageSelectedCenterConfig: false })
      expect(screen.getByTestId('admin-panel-access')).toHaveAttribute('data-start-collapsed', 'true')
    })

    it('passes startCollapsed={true} to config panel', async () => {
      const user = userEvent.setup()
      setup()
      await user.click(screen.getByRole('button', { name: /center config/i }))
      expect(screen.getByTestId('admin-panel-settings')).toHaveAttribute('data-start-collapsed', 'true')
    })
  })
})
