/**
 * Tests for the Campaign Detail Page (/campaigns/[id])
 * These tests are kept in the [id] directory so the relative import ./page works
 * (Vite/tsconfigPaths cannot resolve paths with literal [id] brackets from outside this directory)
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CampaignDetailPage from './page'

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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: 'camp-1' }),
  useSearchParams: () => ({ get: () => null })
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
  contacts: [],
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
  const campaign = useTemplates ? mockCampaignWithTemplate : mockCampaign
  campaignApiMocks.getById.mockResolvedValue(campaign)
  campaignApiMocks.getCallLogs.mockResolvedValue([])
  campaignApiMocks.getNextContact.mockResolvedValue({ done: true })

  render(<CampaignDetailPage />)

  // Wait for campaign detail to load
  await act(async () => { await Promise.resolve() })
  await act(async () => { await Promise.resolve() })

  // Navigate to Templates tab (content is tab-gated)
  await userEvent.click(screen.getByRole('tab', { name: /Templates/i }))
}

describe('CampaignDetailPage - role-based template UI visibility', () => {
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

describe('CampaignDetailPage - empty templates state (no defaults)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contactsApiMocks.getAll.mockResolvedValue([])
    mockRole = 'USER'
  })

  it('shows no template radio buttons when campaign has no templates', async () => {
    await renderWithCampaignDetail('USER', false)
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

    await userEvent.click(screen.getByRole('button', { name: /^Save Template$/i }))

    // Debounce + async save
    await act(async () => { await new Promise(r => setTimeout(r, 1000)) })

    expect(screen.getByText(/Network error|Failed to save templates/i)).toBeInTheDocument()
  })
})
