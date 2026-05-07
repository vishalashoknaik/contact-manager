import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AttendancePage from './page'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  listSessions: vi.fn(),
  getActiveSession: vi.fn(),
  startSession: vi.fn(),
  addSessionVolunteer: vi.fn(),
  endSession: vi.fn(),
  reopenSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessionAttendees: vi.fn(),
  lookup: vi.fn(),
  submit: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace })
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isLoading: false,
    selectedCenter: 'center-1',
    selectedCenterDetails: {
      id: 'center-1',
      name: 'Center One',
      role: 'ADMIN',
      capabilities: {
        canManageAccess: true,
        canManageCenterConfig: true,
        canViewContacts: true,
        canTakeAttendance: true,
        grantableRoles: ['ADMIN', 'USER', 'ATTENDANCE_TAKER']
      }
    }
  })
}))

vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    activities: ['Walkathon'],
    areas: ['Downtown'],
    programs: ['Youth Program']
  })
}))

vi.mock('@/lib/api/client', () => ({
  attendanceApi: {
    listSessions: mocks.listSessions,
    getActiveSession: mocks.getActiveSession,
    startSession: mocks.startSession,
    addSessionVolunteer: mocks.addSessionVolunteer,
    endSession: mocks.endSession,
    reopenSession: mocks.reopenSession,
    deleteSession: mocks.deleteSession,
    listSessionAttendees: mocks.listSessionAttendees,
    lookup: mocks.lookup,
    submit: mocks.submit
  }
}))

function createSession(id = 'session-1', name = 'Test Session') {
  return {
    id,
    name,
    centerId: 'center-1',
    activities: ['Walkathon'],
    areas: ['Downtown'],
    programs: ['Youth Program'],
    createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
    endedAt: null,
    volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
  }
}

async function renderAndResumeSession(user: ReturnType<typeof userEvent.setup>) {
  mocks.listSessions.mockResolvedValueOnce([createSession()])
  render(<AttendancePage />)
  await user.click(await screen.findByRole('button', { name: /continue/i }))
  await waitFor(() => expect(screen.getByPlaceholderText('Enter phone and press Enter')).toBeInTheDocument())
}

describe('AttendancePage', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.push.mockReset()
    mocks.replace.mockReset()
    mocks.listSessions.mockReset()
    mocks.getActiveSession.mockReset()
    mocks.startSession.mockReset()
    mocks.addSessionVolunteer.mockReset()
    mocks.endSession.mockReset()
    mocks.reopenSession.mockReset()
    mocks.deleteSession.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()

    mocks.listSessions.mockResolvedValue([])
    mocks.getActiveSession.mockResolvedValue({ active: false })
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.startSession.mockResolvedValue({
      id: 'session-1',
      name: 'Test Session',
      centerId: 'center-1',
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
      endedAt: null,
      volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
    })
    mocks.addSessionVolunteer.mockResolvedValue({
      id: 'session-1',
      name: 'Test Session',
      centerId: 'center-1',
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
      endedAt: null,
      volunteers: [
        { phone: '1111111111', name: 'Primary Volunteer' },
        { phone: '2222222222', name: 'Second Volunteer' }
      ]
    })
    mocks.endSession.mockResolvedValue({ success: true })
    mocks.reopenSession.mockResolvedValue(createSession())
    mocks.deleteSession.mockResolvedValue({ success: true })
  })

  it('shows the selected center name on the attendance page', () => {
    render(<AttendancePage />)

    expect(screen.getByText('Attendance Setup - Center One')).toBeInTheDocument()
  })

  it('shows existing sessions before the create new session section', async () => {
    mocks.listSessions.mockResolvedValueOnce([
      {
        id: 'session-1',
        name: 'Existing Session',
        centerId: 'center-1',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
        endedAt: null,
        volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
      }
    ])

    render(<AttendancePage />)

    const sessionsHeading = await screen.findByText('Your Available Sessions')
    const createHeading = await screen.findByText('Create New Session')

    expect(sessionsHeading.compareDocumentPosition(createHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('uses the IE Date placeholder and does not render helper copy under session attendees', async () => {
    const user = userEvent.setup()

    await renderAndResumeSession(user)

    expect(screen.getByPlaceholderText('IE Date')).toBeInTheDocument()
    expect(screen.queryByText('Remarks')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/notes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hidden by default/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Expand only to confirm/i)).not.toBeInTheDocument()
  })

  it('requires gender, IE Date, and area of stay for new contacts', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValueOnce({ found: false })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '8888888888')
    await user.type(screen.getByPlaceholderText('Full name'), 'New Contact')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/Gender, IE Date, and Area of Stay are required for new contacts/)).toBeInTheDocument()
    })

    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it('keeps session attendees collapsed until expanded and shows submitted attendees on demand', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValueOnce({ found: false })
    mocks.submit.mockResolvedValueOnce({ success: true, contactId: 'contact-1' })
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'entry-1',
          name: 'Alice',
          phone: '9999999999',
          submittedAt: new Date('2026-05-02T10:05:00.000Z').toISOString()
        }
      ])

    await renderAndResumeSession(user)

    expect(screen.queryByText('No attendance recorded in this session yet.')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9999999999')
    await user.type(screen.getByPlaceholderText('Full name'), 'Alice')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())

    expect(screen.queryByText('9999999999')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getByText('9999999999')).toBeInTheDocument()
  })

  it('collapses session attendees when the next person starts entering a phone number', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValueOnce({ found: false })
    mocks.submit.mockResolvedValueOnce({ success: true, contactId: 'contact-1' })
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'entry-1',
          name: 'Alice',
          phone: '9999999999',
          submittedAt: new Date('2026-05-02T10:05:00.000Z').toISOString()
        }
      ])

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9999999999')
    await user.type(screen.getByPlaceholderText('Full name'), 'Alice')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /session attendees/i }))
    expect(screen.getByText('9999999999')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '8')

    expect(screen.queryByText('9999999999')).not.toBeInTheDocument()
  })

  it('alerts and keeps persisted pending records when ending a session with sync failures', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    mocks.lookup.mockResolvedValueOnce({ found: false })
    mocks.submit.mockRejectedValue(new Error('Network error'))

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '7777777777')
    await user.type(screen.getByPlaceholderText('Full name'), 'Pending Person')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /end session/i }))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Some attendance records are still not synced. Please retry before ending the session.'
      )
    })

    expect(mocks.push).not.toHaveBeenCalled()
    expect(localStorage.getItem('attendance-session:center-1')).toContain('Pending Person')
  })

  it('restores a persisted session with attendee records from local storage', async () => {
    mocks.listSessions.mockResolvedValueOnce([
      {
        id: 'session-1',
        name: 'Saved Session',
        centerId: 'center-1',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
        endedAt: null,
        volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
      }
    ])

    localStorage.setItem(
      'attendance-session:center-1',
      JSON.stringify({
        session: {
          activities: ['Walkathon'],
          areas: ['Downtown'],
          programs: ['Youth Program']
        },
        records: [
          {
            id: 'record-1',
            name: 'Saved Person',
            phone: '6666666666',
            submittedAt: '10:30 AM',
            payload: {
              name: 'Saved Person',
              phone: '6666666666',
              gender: 'Female',
              ieDate: '2026 Batch',
              areaOfStay: 'Downtown',
              activities: ['Walkathon'],
              areas: ['Downtown'],
              programs: ['Youth Program']
            },
            status: 'pending',
            error: 'Network error'
          }
        ]
      })
    )

    render(<AttendancePage />)

    await userEvent.click(await screen.findByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Saved Session - Center One')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /session attendees/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.getByRole('button', { name: /session attendees/i })).toBeInTheDocument()
  })

  it('retries pending records and clears persisted session when ending succeeds', async () => {
    const user = userEvent.setup()

    mocks.listSessions.mockResolvedValueOnce([
      {
        id: 'session-1',
        name: 'Saved Session',
        centerId: 'center-1',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
        endedAt: null,
        volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
      }
    ])

    localStorage.setItem(
      'attendance-session:center-1',
      JSON.stringify({
        session: {
          activities: ['Walkathon'],
          areas: ['Downtown'],
          programs: ['Youth Program']
        },
        records: [
          {
            id: 'record-1',
            name: 'Saved Person',
            phone: '6666666666',
            submittedAt: '10:30 AM',
            payload: {
              name: 'Saved Person',
              phone: '6666666666',
              gender: 'Female',
              ieDate: '2026 Batch',
              areaOfStay: 'Downtown',
              activities: ['Walkathon'],
              areas: ['Downtown'],
              programs: ['Youth Program']
            },
            status: 'pending'
          }
        ]
      })
    )

    mocks.submit.mockResolvedValueOnce({ success: true, contactId: 'contact-1' })

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Saved Session - Center One')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /end session/i }))

    await waitFor(() => {
      expect(mocks.submit).toHaveBeenCalledWith({
        name: 'Saved Person',
        phone: '6666666666',
        gender: 'Female',
        ieDate: '2026 Batch',
        areaOfStay: 'Downtown',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        sessionId: 'session-1'
      }, 'center-1')
    })

    expect(localStorage.getItem('attendance-session:center-1')).toBeNull()
    expect(screen.getByText('Attendance Setup - Center One')).toBeInTheDocument()
  })

  it('syncs pending records once online and updates their status', async () => {
    const user = userEvent.setup()

    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })

    mocks.listSessions.mockResolvedValueOnce([
      {
        id: 'session-1',
        name: 'Saved Session',
        centerId: 'center-1',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        createdAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
        endedAt: null,
        volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
      }
    ])

    localStorage.setItem(
      'attendance-session:center-1',
      JSON.stringify({
        session: {
          activities: ['Walkathon'],
          areas: ['Downtown'],
          programs: ['Youth Program']
        },
        records: [
          {
            id: 'record-1',
            name: 'Retry Person',
            phone: '5555555555',
            submittedAt: '10:35 AM',
            payload: {
              name: 'Retry Person',
              phone: '5555555555',
              gender: 'Male',
              ieDate: '2026 Batch',
              areaOfStay: 'Downtown',
              activities: ['Walkathon'],
              areas: ['Downtown'],
              programs: ['Youth Program']
            },
            status: 'pending',
            error: 'Network error'
          }
        ]
      })
    )

    mocks.submit.mockResolvedValueOnce({ success: true, contactId: 'contact-1' })

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Saved Session - Center One')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.queryByText(/Pending sync:/)).not.toBeInTheDocument()
  })

  it('reopens an ended session from setup', async () => {
    const user = userEvent.setup()

    mocks.listSessions.mockResolvedValueOnce([
      {
        ...createSession('session-ended', 'Ended Session'),
        endedAt: new Date('2026-05-02T11:00:00.000Z').toISOString()
      }
    ])
    mocks.reopenSession.mockResolvedValueOnce(
      createSession('session-ended', 'Ended Session')
    )

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /reopen/i }))

    await waitFor(() => {
      expect(mocks.reopenSession).toHaveBeenCalledWith('session-ended', 'center-1')
    })
    expect(screen.getByText('Ended Session - Center One')).toBeInTheDocument()
  })

  it('shows setup sync notice immediately and escalates after 5 seconds', async () => {
    try {
      vi.useFakeTimers()
      mocks.listSessions.mockImplementation(() => new Promise(() => {}))

      render(<AttendancePage />)

      await act(async () => {
        await Promise.resolve()
      })

      expect(screen.getByText('Sync has not happened yet. Fetching latest session details...')).toBeInTheDocument()
      expect(screen.queryByText('Sync has not happened for more than 5 seconds.')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(4999)
      })
      expect(screen.queryByText('Sync has not happened for more than 5 seconds.')).not.toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })
      expect(screen.getByText('Sync has not happened for more than 5 seconds.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows attendee sync notice immediately and escalates after 5 seconds in entry screen', async () => {
    const user = userEvent.setup()

    mocks.listSessions.mockResolvedValueOnce([createSession()])
    mocks.listSessionAttendees.mockImplementation(() => new Promise(() => {}))

    render(<AttendancePage />)
    await user.click(await screen.findByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('Enter phone and press Enter')).toBeInTheDocument())

    expect(screen.getByText('Sync has not happened yet. Fetching latest attendee details...')).toBeInTheDocument()
    expect(screen.queryByText('Sync has not happened for more than 5 seconds.')).not.toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByText('Sync has not happened for more than 5 seconds.')).toBeInTheDocument()
      },
      { timeout: 7000 }
    )
  }, 10000)

  it('supports offline attendance and counts duplicate phone entries only once', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValue({ found: false })

    await renderAndResumeSession(user)

    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9999999999')
    await user.type(screen.getByPlaceholderText('Full name'), 'Offline Person')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/Saved offline\. Attendance will sync automatically when online\./i)).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9999999999')
    await user.type(screen.getByPlaceholderText('Full name'), 'Offline Person')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/already counted in this session/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /session attendees/i }))
    expect(screen.getAllByText('9999999999').length).toBe(1)
  })

  it('deletes a session from setup after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    mocks.listSessions.mockResolvedValueOnce([
      createSession('session-delete', 'Delete Me')
    ])

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(mocks.deleteSession).toHaveBeenCalledWith('session-delete', 'center-1')
    })

    expect(screen.queryByText('Delete Me')).not.toBeInTheDocument()
  })
})