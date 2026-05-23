import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const contactsApiMocks = vi.hoisted(() => ({
  getAll: vi.fn().mockResolvedValue([])
}))

// Mutable so individual tests can override the role
let mockRole: string = 'USER'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() })
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { phone: '9999999999', name: 'Campaign User' },
    selectedCenter: 'center-1',
    selectedCenterDetails: {
      id: 'center-1',
      name: 'Center One',
      role: mockRole
    },
    isLoggedIn: true
  })
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: campaignApiMocks,
  contactsApi: contactsApiMocks
}))

// Minimal campaign fixture — no templates (for empty-state tests)
const mockCampaign = {
  id: 'camp-1',
  name: 'Test Campaign',
  totalContacts: 2,
  pendingContacts: 1,
  completedContacts: 0,
  skippedContacts: 0,
  volunteers: [],
  createdAt: new Date().toISOString(),
  messageTemplates: null
}

// Campaign fixture with one template (for role/edit tests)
const mockCampaignWithTemplate = {
  ...mockCampaign,
  messageTemplates: [{ name: 'Friendly', smsContent: 'Hi {name}', whatsappContent: 'WA {name}' }]
}

async function renderWithCampaignDetail(role: string, useTemplates = true) {
  mockRole = role
  campaignApiMocks.getAll.mockResolvedValue([useTemplates ? mockCampaignWithTemplate : mockCampaign])
  campaignApiMocks.getCallLogs.mockResolvedValue([])
  campaignApiMocks.getNextContact.mockResolvedValue({ done: true })

  render(<CampaignsPage />)

  // Wait for campaign list to load
  await act(async () => { await Promise.resolve() })

  // Click into the campaign detail view
  await userEvent.click(screen.getByText('Test Campaign'))
  await act(async () => { await Promise.resolve() })
}

describe('CampaignsPage rendering warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contactsApiMocks.getAll.mockResolvedValue([])
    mockRole = 'USER'
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

describe('CampaignsPage - role-based template UI visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contactsApiMocks.getAll.mockResolvedValue([])
    mockRole = 'USER'
  })

  it('USER role sees "+ Add Template" button in campaign detail', async () => {
    await renderWithCampaignDetail('USER', true)
    expect(screen.getByRole('button', { name: /\+ Add Template/i })).toBeInTheDocument()
  })

  it('ADMIN role sees "+ Add Template" button in campaign detail', async () => {
    await renderWithCampaignDetail('ADMIN', true)
    expect(screen.getByRole('button', { name: /\+ Add Template/i })).toBeInTheDocument()
  })

  it('ATTENDANCE_TAKER role does NOT see "+ Add Template" button', async () => {
    await renderWithCampaignDetail('ATTENDANCE_TAKER', true)
    expect(screen.queryByRole('button', { name: /\+ Add Template/i })).not.toBeInTheDocument()
  })

  it('ATTENDANCE_TAKER role does NOT see "Edit" button on templates', async () => {
    await renderWithCampaignDetail('ATTENDANCE_TAKER', true)
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument()
  })

  it('USER role sees "Edit" button on templates', async () => {
    await renderWithCampaignDetail('USER', true)
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument()
  })
})

describe('CampaignsPage - empty templates state (no defaults)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contactsApiMocks.getAll.mockResolvedValue([])
    mockRole = 'USER'
  })

  it('shows no template radio buttons when campaign has no templates', async () => {
    await renderWithCampaignDetail('USER', false)
    // mockCampaign has messageTemplates: null → no defaults injected → no radio buttons
    const radios = document.querySelectorAll('input[type="radio"][name="template"]')
    expect(radios.length).toBe(0)
  })

  it('still shows "+ Add Template" button so user can configure templates', async () => {
    await renderWithCampaignDetail('USER', false)
    expect(screen.getByRole('button', { name: /\+ Add Template/i })).toBeInTheDocument()
  })

  it('shows error when saveTemplates backend call fails', async () => {
    campaignApiMocks.updateTemplates.mockRejectedValue(new Error('Network error'))
    await renderWithCampaignDetail('USER', false)

    await userEvent.click(screen.getByRole('button', { name: /\+ Add Template/i }))
    await act(async () => { await Promise.resolve() })

    // Fill name, SMS, WhatsApp fields
    const textareas = document.querySelectorAll('textarea')
    const nameInput = document.querySelector('input[placeholder*="Friendly"]') as HTMLInputElement
    if (nameInput) await userEvent.type(nameInput, 'Test')
    if (textareas[0]) await userEvent.type(textareas[0], 'SMS text here')
    if (textareas[1]) await userEvent.type(textareas[1], 'WA text here')

    await userEvent.click(screen.getByRole('button', { name: /^Add Template$/i }))

    // Debounce + async save
    await act(async () => { await new Promise(r => setTimeout(r, 1000)) })

    expect(screen.getByText(/Network error|Failed to save templates/i)).toBeInTheDocument()
  })
})