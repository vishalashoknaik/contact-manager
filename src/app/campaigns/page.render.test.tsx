import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CampaignsPage from './page'

const routerPush = vi.fn()

const campaignApiMocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  getCallLogs: vi.fn(),
  getNextContact: vi.fn(),
  getById: vi.fn(),
  submitCallLog: vi.fn(),
  updateTemplates: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() })
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      phone: '9999999999',
      name: 'Campaign User'
    },
    selectedCenter: 'center-1',
    selectedCenterDetails: {
      id: 'center-1',
      name: 'Center One',
      role: 'USER'
    },
    isLoggedIn: true
  })
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: campaignApiMocks
}))

describe('CampaignsPage rendering warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    })
  })

  it('warns when campaigns are still syncing while offline', async () => {
    try {
      vi.useFakeTimers()
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false
      })

      campaignApiMocks.getAll.mockImplementationOnce(() => new Promise(() => {}))

      render(<CampaignsPage />)

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByText('Internet is disconnected. Campaigns could not be refreshed yet, so the current list may be incomplete.')).toBeInTheDocument()
      expect(screen.queryByText('Internet is disconnected or campaigns are still loading. Existing campaigns may be temporarily unavailable until sync completes.')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(screen.getByText('Internet is disconnected or campaigns are still loading. Existing campaigns may be temporarily unavailable until sync completes.')).toBeInTheDocument()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true
      })
      vi.useRealTimers()
    }
  })
})