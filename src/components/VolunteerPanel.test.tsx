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
})