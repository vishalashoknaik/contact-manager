import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { VolunteerPanel } from './VolunteerPanel'

const campaignApiMocks = vi.hoisted(() => ({
  setVolunteers: vi.fn()
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: campaignApiMocks
}))

describe('VolunteerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    })
  })

  it('warns when volunteer changes are still syncing while offline', async () => {
    try {
      vi.useFakeTimers()
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false
      })

      campaignApiMocks.setVolunteers.mockImplementationOnce(() => new Promise(() => {}))

      render(
        <VolunteerPanel
          campaign={{
            id: 'campaign-1',
            name: 'Campaign One',
            createdAt: '2026-05-07T10:00:00.000Z',
            totalContacts: 1,
            pendingContacts: 1,
            completedContacts: 0,
            skippedContacts: 0,
            volunteers: []
          } as any}
          centerId="center-1"
          currentUserPhone="9999999999"
          onUpdated={vi.fn()}
        />
      )

      fireEvent.change(screen.getByPlaceholderText('Volunteer phone number'), {
        target: { value: '8888888888' }
      })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getByText('Internet is disconnected. Volunteer changes cannot be synced yet.')).toBeInTheDocument()
      expect(screen.queryByText('Internet is disconnected or volunteer changes are still syncing. The volunteer list may be outdated until sync completes.')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(screen.getByText('Internet is disconnected or volunteer changes are still syncing. The volunteer list may be outdated until sync completes.')).toBeInTheDocument()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true
      })
      vi.useRealTimers()
    }
  }, 10000)

  it('adds a volunteer optimistically before the backend request resolves', () => {
    campaignApiMocks.setVolunteers.mockImplementationOnce(() => new Promise(() => {}))

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1',
          name: 'Campaign One',
          createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 1,
          pendingContacts: 1,
          completedContacts: 0,
          skippedContacts: 0,
          volunteers: []
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Volunteer phone number'), {
      target: { value: '8888888888' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Volunteers (1)')).toBeInTheDocument()
    expect(screen.getByText('8888888888')).toBeInTheDocument()
  })

  it('removes a volunteer optimistically before the backend request resolves', () => {
    campaignApiMocks.setVolunteers.mockImplementationOnce(() => new Promise(() => {}))

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1',
          name: 'Campaign One',
          createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 1,
          pendingContacts: 1,
          completedContacts: 0,
          skippedContacts: 0,
          volunteers: [{ phone: '8888888888', name: 'Volunteer One' }]
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(screen.getByText('Volunteers (0)')).toBeInTheDocument()
    expect(screen.queryByText('Volunteer One (8888888888)')).not.toBeInTheDocument()
  })

  // ── pendingNewPhone flow ─────────────────────────────────────────────────

  it('shows the name-capture form when an unknown phone is submitted', () => {
    const knownContact = {
      id: 'c1', name: 'Alice', phone: '9876543210', gender: 'Female',
      selected: true, lastUpdated: new Date().toISOString(),
      importOrder: 0, notInterested: false, centerChange: false, doNotDisturb: false,
      activities: {}, areas: {}, programs: {}, interests: {}
    }

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1', name: 'Campaign One', createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 0, pendingContacts: 0, completedContacts: 0, skippedContacts: 0, volunteers: []
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
        contacts={[knownContact as any]}
      />
    )

    // Type an unknown phone into the plain input (contacts present → ContactSearchInput shown,
    // but we can drive addPhone via the search placeholder)
    fireEvent.change(screen.getByPlaceholderText('Search volunteer by name or phone'), {
      target: { value: '7777777777' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    // The phone appears in a <strong> tag and the form appears below it
    expect(screen.getByText('7777777777')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create & Add' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create & Add' })).toBeInTheDocument()
  })

  it('shows an error when "Create & Add" is clicked without entering a name', () => {
    const knownContact = {
      id: 'c1', name: 'Alice', phone: '9876543210', gender: 'Female',
      selected: true, lastUpdated: new Date().toISOString(),
      importOrder: 0, notInterested: false, centerChange: false, doNotDisturb: false,
      activities: {}, areas: {}, programs: {}, interests: {}
    }

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1', name: 'Campaign One', createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 0, pendingContacts: 0, completedContacts: 0, skippedContacts: 0, volunteers: []
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
        contacts={[knownContact as any]}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Search volunteer by name or phone'), {
      target: { value: '7777777777' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create & Add' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(campaignApiMocks.setVolunteers).not.toHaveBeenCalled()
  })

  it('calls setVolunteers with newVolunteerDetails after creating a new volunteer', () => {
    campaignApiMocks.setVolunteers.mockImplementationOnce(() => new Promise(() => {}))

    const knownContact = {
      id: 'c1', name: 'Alice', phone: '9876543210', gender: 'Female',
      selected: true, lastUpdated: new Date().toISOString(),
      importOrder: 0, notInterested: false, centerChange: false, doNotDisturb: false,
      activities: {}, areas: {}, programs: {}, interests: {}
    }

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1', name: 'Campaign One', createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 0, pendingContacts: 0, completedContacts: 0, skippedContacts: 0, volunteers: []
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
        contacts={[knownContact as any]}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Search volunteer by name or phone'), {
      target: { value: '7777777777' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.change(screen.getByPlaceholderText('Full name *'), {
      target: { value: 'New Volunteer' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create & Add' }))

    expect(campaignApiMocks.setVolunteers).toHaveBeenCalledWith(
      'campaign-1',
      ['7777777777'],
      'center-1',
      [{ phone: '7777777777', name: 'New Volunteer' }]
    )
  })

  it('clears the pending form and restores the search input when Cancel is clicked', () => {
    const knownContact = {
      id: 'c1', name: 'Alice', phone: '9876543210', gender: 'Female',
      selected: true, lastUpdated: new Date().toISOString(),
      importOrder: 0, notInterested: false, centerChange: false, doNotDisturb: false,
      activities: {}, areas: {}, programs: {}, interests: {}
    }

    render(
      <VolunteerPanel
        campaign={{
          id: 'campaign-1', name: 'Campaign One', createdAt: '2026-05-07T10:00:00.000Z',
          totalContacts: 0, pendingContacts: 0, completedContacts: 0, skippedContacts: 0, volunteers: []
        } as any}
        centerId="center-1"
        currentUserPhone="9999999999"
        onUpdated={vi.fn()}
        contacts={[knownContact as any]}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Search volunteer by name or phone'), {
      target: { value: '7777777777' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByPlaceholderText('Full name *')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('Full name *')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search volunteer by name or phone')).toBeInTheDocument()
  })
})