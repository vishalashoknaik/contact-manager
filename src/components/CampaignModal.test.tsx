import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CampaignModal } from './CampaignModal'

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  addContacts: vi.fn()
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: {
    getAll: mocks.getAll,
    create: mocks.create,
    addContacts: mocks.addContacts
  }
}))

describe('CampaignModal', () => {
  beforeEach(() => {
    mocks.getAll.mockReset()
    mocks.create.mockReset()
    mocks.addContacts.mockReset()
  })

  it('creates a new campaign from selected contacts', async () => {
    const user = userEvent.setup()

    mocks.getAll.mockResolvedValueOnce([])
    mocks.create.mockResolvedValueOnce({ id: 'campaign-1', name: 'Test', contacts: [], volunteers: [] })

    const onCreated = vi.fn()

    render(
      <CampaignModal
        isOpen
        selectedContactIds={['1', '2']}
        centerId="center-1"
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    )

    await user.type(screen.getByPlaceholderText('Enter campaign name'), 'May Campaign')
    await user.click(screen.getByRole('button', { name: 'Create Campaign' }))

    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('May Campaign', ['1', '2'], 'center-1')
    })
    expect(onCreated).toHaveBeenCalled()
  })

  it('adds contacts to an existing campaign', async () => {
    const user = userEvent.setup()

    mocks.getAll.mockResolvedValueOnce([
      {
        id: 'campaign-existing',
        name: 'Existing',
        pendingContacts: 3,
        contacts: [],
        volunteers: []
      }
    ])
    mocks.addContacts.mockResolvedValueOnce({ id: 'campaign-existing', name: 'Existing', contacts: [], volunteers: [] })

    render(
      <CampaignModal
        isOpen
        selectedContactIds={['11']}
        centerId="center-1"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    )

    await user.click(await screen.findByRole('button', { name: 'Add to Existing' }))
    await user.selectOptions(screen.getByRole('combobox'), 'campaign-existing')
    await user.click(screen.getByRole('button', { name: 'Add to Campaign' }))

    await waitFor(() => {
      expect(mocks.addContacts).toHaveBeenCalledWith('campaign-existing', ['11'], 'center-1')
    })
  })
})
