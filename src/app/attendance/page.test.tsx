import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

// Mutable config state so individual tests can override isLoaded / error
const configState = vi.hoisted(() => ({
  activities: ['Walkathon'] as string[],
  areas: ['Downtown'] as string[],
  programs: ['Youth Program'] as string[],
  isLoaded: true,
  error: null as string | null
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
  useConfig: () => configState
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

    // Reset config state to defaults
    configState.activities = ['Walkathon']
    configState.areas = ['Downtown']
    configState.programs = ['Youth Program']
    configState.isLoaded = true
    configState.error = null

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
    await waitFor(() => {
      expect(screen.queryByText(/Saved offline\. Attendance will sync automatically when online\./i)).not.toBeInTheDocument()
    })

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
    await user.type(screen.getByPlaceholderText('Full name'), 'Offline Person Updated')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    // Should show an info notice (not an error), record is updated not duplicated
    await waitFor(() => {
      expect(screen.getByText(/attendance record.*already existed.*updated/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /session attendees/i }))
    // Still only one entry for this phone
    expect(screen.getAllByText('9999999999').length).toBe(1)
  })

  it('re-submitting same phone updates the record and shows a notice, not an error', async () => {
    const user = userEvent.setup()

    const attendeeAfterFirst = [{ id: 'e1', name: 'Alice', phone: '9000000001', submittedAt: new Date().toISOString() }]
    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])               // initial load
      .mockResolvedValueOnce(attendeeAfterFirst) // after first submit
      .mockResolvedValue(attendeeAfterFirst)     // subsequent calls

    await renderAndResumeSession(user)

    // First submit
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9000000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Alice')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Downtown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))

    // Second submit with same phone — should go through and show info notice
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9000000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Alice Updated')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      // Info notice shown, not an error
      expect(screen.getByText(/attendance record.*already existed.*updated/i)).toBeInTheDocument()
    })

    // Both submits hit the server — backend upsert ensures no duplicate DB row
    expect(mocks.submit).toHaveBeenCalledTimes(2)
  })

  it('person appears exactly once in session attendees after online submit', async () => {
    // Regression: previously pending record was dropped BEFORE listSessionAttendees resolved.
    // During that window the person was in neither list → a concurrent re-submit could slip through.
    // The fix: always refresh server list BEFORE removing the optimistic pending record.
    const user = userEvent.setup()

    const attendee = { id: 'e2', name: 'Bob', phone: '8000000001', submittedAt: new Date().toISOString() }
    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])      // initial load
      .mockResolvedValue([attendee])  // after submit and any background retries

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '8000000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Bob')
    await user.selectOptions(screen.getByRole('combobox'), 'Male')
    await user.type(screen.getByPlaceholderText('IE Date'), '2025 Batch')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'Uptown')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())

    // After submit resolves, Bob should appear in the attendees panel exactly once
    const attendeesBtn = await screen.findByRole('button', { name: /session attendees/i })
    await user.click(attendeesBtn)
    await waitFor(() => {
      const panel = attendeesBtn.closest('aside') ?? attendeesBtn.parentElement!
      expect(within(panel).getAllByText('Bob').length).toBe(1)
    })
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

describe('AttendancePage - error surfacing', () => {
  it('shows an error message when listSessions fails on load', async () => {
    mocks.listSessions.mockRejectedValueOnce(new Error('DB connection lost'))

    const { render, screen, act, waitFor } = await import('@testing-library/react')
    const React = await import('react')
    const { default: AttendancePage } = await import('./page')

    render(React.createElement(AttendancePage))

    await act(async () => { await new Promise(r => setTimeout(r, 50)) })

    await waitFor(() => {
      expect(screen.getByText(/DB connection lost|Failed to load attendance sessions/i)).toBeInTheDocument()
    })
  })
})

describe('AttendancePage - session creation', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.listSessions.mockReset()
    mocks.startSession.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()
    configState.isLoaded = true
    configState.error = null
    mocks.listSessions.mockResolvedValue([])
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.startSession.mockResolvedValue({
      id: 'session-new',
      name: 'My Session',
      centerId: 'center-1',
      activities: ['Walkathon'],
      areas: [],
      programs: [],
      createdAt: new Date().toISOString(),
      endedAt: null,
      volunteers: [{ phone: '1111111111', name: 'Primary Volunteer' }]
    })
  })

  it('creates a new session when a name is typed and an activity is selected', async () => {
    const user = userEvent.setup()

    render(<AttendancePage />)

    await waitFor(() => expect(screen.getByLabelText(/session name/i)).toBeInTheDocument())

    await user.clear(screen.getByLabelText(/session name/i))
    await user.type(screen.getByLabelText(/session name/i), 'My Session')
    await user.click(screen.getByRole('checkbox', { name: 'Walkathon' }))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

    await waitFor(() => {
      expect(mocks.startSession).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Session', activities: ['Walkathon'] }),
        'center-1'
      )
    })

    expect(screen.getByPlaceholderText('Enter phone and press Enter')).toBeInTheDocument()
  })

  it('shows an error when startSession API call fails', async () => {
    const user = userEvent.setup()

    mocks.startSession.mockRejectedValueOnce(new Error('Database unavailable'))

    render(<AttendancePage />)

    await waitFor(() => expect(screen.getByLabelText(/session name/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/session name/i), 'Failed Session')
    await user.click(screen.getByRole('checkbox', { name: 'Walkathon' }))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

    await waitFor(() => {
      expect(screen.getByText(/Database unavailable/i)).toBeInTheDocument()
    })

    expect(screen.queryByPlaceholderText('Enter phone and press Enter')).not.toBeInTheDocument()
  })

  it('Start Attendance button is disabled until at least one program/area/activity is checked', async () => {
    const user = userEvent.setup()

    render(<AttendancePage />)

    await waitFor(() => expect(screen.getByRole('button', { name: /start attendance/i })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /start attendance/i })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'Downtown' }))

    expect(screen.getByRole('button', { name: /start attendance/i })).not.toBeDisabled()
  })

  it('shows "No programs, areas, or activities configured" when config is empty', async () => {
    configState.activities = []
    configState.areas = []
    configState.programs = []

    render(<AttendancePage />)

    await waitFor(() => {
      expect(screen.getByText(/no programs, areas, or activities configured yet/i)).toBeInTheDocument()
    })
  })

  it('shows config error banner when configLoaded=true and configError is set', async () => {
    configState.error = 'Could not connect to config server'

    render(<AttendancePage />)

    await waitFor(() => {
      expect(screen.getByText(/could not connect to config server/i)).toBeInTheDocument()
    })
  })

  it('shows loading placeholder when config is not yet loaded', async () => {
    configState.isLoaded = false

    render(<AttendancePage />)

    await waitFor(() => {
      expect(screen.getByText(/loading configuration/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /start attendance/i })).not.toBeInTheDocument()
  })

  it('shows reopen error in setup screen when reopen API call fails', async () => {
    const user = userEvent.setup()

    mocks.listSessions.mockResolvedValueOnce([
      {
        ...{ id: 'session-ended', name: 'Ended Session', centerId: 'center-1', activities: ['Walkathon'], areas: ['Downtown'], programs: ['Youth Program'], createdAt: new Date().toISOString(), volunteers: [{ phone: '1111111111', name: 'V' }] },
        endedAt: new Date().toISOString()
      }
    ])
    mocks.reopenSession.mockRejectedValueOnce(new Error('Session locked'))

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /reopen/i }))

    await waitFor(() => {
      expect(screen.getByText(/session locked/i)).toBeInTheDocument()
    })
  })

  it('delete is skipped when user cancels the confirmation dialog', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    mocks.listSessions.mockResolvedValueOnce([{ id: 'session-keep', name: 'Keep Me', centerId: 'center-1', activities: ['Walkathon'], areas: [], programs: [], createdAt: new Date().toISOString(), endedAt: null, volunteers: [{ phone: '1111111111', name: 'V' }] }])

    render(<AttendancePage />)

    await user.click(await screen.findByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(mocks.deleteSession).not.toHaveBeenCalled()
    })

    expect(screen.getByText('Keep Me')).toBeInTheDocument()
  })
})

describe('AttendancePage - contact lookup', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.listSessions.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()
    mocks.endSession.mockReset()
    mocks.listSessions.mockResolvedValue([])
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.endSession.mockResolvedValue({ success: true })
    configState.isLoaded = true
    configState.error = null
  })

  it('auto-fills form fields when a known contact is found on lookup', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValueOnce({
      found: true,
      contact: { id: 'c1', name: 'Jane Doe', phone: '9000000001', gender: 'Female', ieDate: '2025 Batch', areaOfStay: 'North End' }
    })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9000000001')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Full name')).toHaveValue('Jane Doe')
    })

    expect(screen.getByPlaceholderText('IE Date')).toHaveValue('2025 Batch')
    expect(screen.getByPlaceholderText('Neighbourhood / area')).toHaveValue('North End')
    expect(screen.getByText(/contact found/i)).toBeInTheDocument()
  })

  it('falls back to new-contact mode when lookup API throws an error', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockRejectedValueOnce(new Error('Network timeout'))

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9111111111')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      // 'New contact' badge (orange span next to phone input) should be present
      expect(screen.getAllByText(/new contact/i).length).toBeGreaterThan(0)
    })

    expect(screen.queryByText(/contact found/i)).not.toBeInTheDocument()
  })

  it('does not require gender/IE Date/area for a contact already in the session', async () => {
    const user = userEvent.setup()

    // Existing contact — already in server attendees list
    mocks.listSessionAttendees
      .mockResolvedValueOnce([{ id: 'e1', name: 'Bob', phone: '9222222222', submittedAt: new Date().toISOString() }])
      .mockResolvedValue([{ id: 'e1', name: 'Bob', phone: '9222222222', submittedAt: new Date().toISOString() }])
    mocks.lookup.mockResolvedValue({ found: true, contact: { id: 'c2', name: 'Bob', phone: '9222222222', gender: 'Male', ieDate: '2024', areaOfStay: 'West' } })
    mocks.submit.mockResolvedValue({ success: true })

    await renderAndResumeSession(user)

    // Wait for attendees to load
    await waitFor(() => expect(mocks.listSessionAttendees).toHaveBeenCalled())

    // Type the already-in-session phone and submit without filling required fields
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9222222222')
    await user.type(screen.getByPlaceholderText('Full name'), 'Bob')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    // Should not show the "required" error
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())
    expect(screen.queryByText(/gender, ie date, and area of stay are required/i)).not.toBeInTheDocument()
  })
})

describe('AttendancePage - submit behavior', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.listSessions.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()
    mocks.endSession.mockReset()
    mocks.listSessions.mockResolvedValue([])
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.endSession.mockResolvedValue({ success: true })
    configState.isLoaded = true
    configState.error = null
  })

  it('shows success flash and clears form after a successful submit', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })
    mocks.listSessionAttendees.mockResolvedValue([])

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9300000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Carol')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'South')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      // Success flash: "✅ Carol recorded — next person ready" (name is in <strong>)
      const strong = document.querySelector('strong')
      expect(strong?.textContent).toBe('Carol')
    })

    // Form should be cleared
    expect(screen.getByPlaceholderText('Full name')).toHaveValue('')
    expect(screen.getByPlaceholderText('Enter phone and press Enter')).toHaveValue('')
  })

  it('shows error banner and marks pending record on submit network error', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockRejectedValue(new Error('Connection refused'))

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9400000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Dave')
    await user.selectOptions(screen.getByRole('combobox'), 'Male')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'East')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/connection refused/i)).toBeInTheDocument()
    })

    // Open attendees to verify the record is marked as pending with error
    await user.click(screen.getByRole('button', { name: /session attendees/i }))
    await waitFor(() => {
      expect(screen.getByText(/Pending sync: Connection refused/i)).toBeInTheDocument()
    })
  })

  it('phones with punctuation are treated as duplicates of the same digits-only phone', async () => {
    const user = userEvent.setup()

    // Server returns the attendee with a formatted phone
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 'e1', name: 'Eve', phone: '9500000001', submittedAt: new Date().toISOString() }])
    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })

    await renderAndResumeSession(user)

    // First submit with plain digits
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9500000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Eve')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'North')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))

    // Second submit with formatted number — should be recognised as same person
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9500000001')
    await user.type(screen.getByPlaceholderText('Full name'), 'Eve Again')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/attendance record.*already existed.*updated/i)).toBeInTheDocument()
    })
  })

  it('ends session cleanly and returns to setup when no pending records remain', async () => {
    const user = userEvent.setup()

    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.endSession.mockResolvedValue({ success: true })

    await renderAndResumeSession(user)

    await user.click(screen.getByRole('button', { name: /end session/i }))

    await waitFor(() => {
      expect(mocks.endSession).toHaveBeenCalledWith('session-1', 'center-1')
    })

    await waitFor(() => {
      expect(screen.getByText('Attendance Setup - Center One')).toBeInTheDocument()
    })
  })
})

describe('AttendancePage - volunteer management', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.listSessions.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.addSessionVolunteer.mockReset()
    mocks.listSessions.mockResolvedValue([])
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.addSessionVolunteer.mockResolvedValue({
      id: 'session-1',
      name: 'Test Session',
      centerId: 'center-1',
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date().toISOString(),
      endedAt: null,
      volunteers: [
        { phone: '1111111111', name: 'Primary Volunteer' },
        { phone: '2222222222', name: 'New Volunteer' }
      ]
    })
    configState.isLoaded = true
    configState.error = null
  })

  it('adds a second volunteer via the attendance takers panel', async () => {
    const user = userEvent.setup()

    await renderAndResumeSession(user)

    await user.click(screen.getByRole('button', { name: /\+ attendance takers/i }))

    const volunteerInput = screen.getByPlaceholderText('Attendance taker phone')
    await user.type(volunteerInput, '2222222222')
    await user.click(screen.getByRole('button', { name: /\+ Add/i }))

    await waitFor(() => {
      expect(mocks.addSessionVolunteer).toHaveBeenCalledWith('session-1', '2222222222', 'center-1')
    })

    // Input cleared after success
    expect(volunteerInput).toHaveValue('')
  })

  it('shows an error when the add volunteer API call fails', async () => {
    const user = userEvent.setup()

    mocks.addSessionVolunteer.mockRejectedValueOnce(new Error('Volunteer not found in this center'))

    await renderAndResumeSession(user)

    await user.click(screen.getByRole('button', { name: /\+ attendance takers/i }))
    await user.type(screen.getByPlaceholderText('Attendance taker phone'), '9999999999')
    await user.click(screen.getByRole('button', { name: /\+ Add/i }))

    await waitFor(() => {
      expect(screen.getByText(/Volunteer not found in this center/i)).toBeInTheDocument()
    })
  })
})

describe('AttendancePage - phone normalization', () => {
  beforeEach(() => {
    window.dispatchEvent(new Event('online'))
    localStorage.clear()
    mocks.listSessions.mockReset()
    mocks.listSessionAttendees.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()
    mocks.endSession.mockReset()
    mocks.listSessions.mockResolvedValue([])
    mocks.listSessionAttendees.mockResolvedValue([])
    mocks.endSession.mockResolvedValue({ success: true })
    configState.isLoaded = true
    configState.error = null
  })

  it('strips dashes from phone before calling lookup API', async () => {
    const user = userEvent.setup()
    mocks.lookup.mockResolvedValue({ found: false })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '123-456-7890')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      expect(mocks.lookup).toHaveBeenCalledWith('1234567890')
    })
    expect(mocks.lookup).not.toHaveBeenCalledWith('123-456-7890')
  })

  it('strips spaces and parentheses from phone before calling lookup API', async () => {
    const user = userEvent.setup()
    mocks.lookup.mockResolvedValue({ found: false })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '(098) 765-4321')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      expect(mocks.lookup).toHaveBeenCalledWith('0987654321')
    })
  })

  it('strips dots from phone before calling lookup API', async () => {
    const user = userEvent.setup()
    mocks.lookup.mockResolvedValue({ found: false })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '987.654.3210')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      expect(mocks.lookup).toHaveBeenCalledWith('9876543210')
    })
  })

  it('fills form fields from lookup when formatted phone matches stored normalized phone', async () => {
    const user = userEvent.setup()
    mocks.lookup.mockResolvedValueOnce({
      found: true,
      contact: { id: 'c1', name: 'Normalised Person', phone: '9876543210', gender: 'Female', ieDate: '2025', areaOfStay: 'East' }
    })

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '987-654-3210')
    fireEvent.blur(screen.getByPlaceholderText('Enter phone and press Enter'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Full name')).toHaveValue('Normalised Person')
    })
    expect(screen.getByText(/contact found/i)).toBeInTheDocument()
  })

  it('submits normalised phone in payload regardless of how the user typed it', async () => {
    const user = userEvent.setup()
    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })
    mocks.listSessionAttendees.mockResolvedValue([])

    await renderAndResumeSession(user)

    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '123-456-7890')
    await user.type(screen.getByPlaceholderText('Full name'), 'Formatted Person')
    await user.selectOptions(screen.getByRole('combobox'), 'Male')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'West')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(mocks.submit).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '1234567890' }),
        'center-1'
      )
    })
  })

  it('deduplicates same person entered with different phone formats', async () => {
    const user = userEvent.setup()
    const attendee = { id: 'e1', name: 'Dup Person', phone: '9500000002', submittedAt: new Date().toISOString() }
    mocks.lookup.mockResolvedValue({ found: false })
    mocks.submit.mockResolvedValue({ success: true })
    mocks.listSessionAttendees
      .mockResolvedValueOnce([])
      .mockResolvedValue([attendee])

    await renderAndResumeSession(user)

    // First: plain digits
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '9500000002')
    await user.type(screen.getByPlaceholderText('Full name'), 'Dup Person')
    await user.selectOptions(screen.getByRole('combobox'), 'Female')
    await user.type(screen.getByPlaceholderText('IE Date'), '2026')
    await user.type(screen.getByPlaceholderText('Neighbourhood / area'), 'North')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))

    // Second: formatted — must resolve as same person
    await user.type(screen.getByPlaceholderText('Enter phone and press Enter'), '950-000-0002')
    await user.type(screen.getByPlaceholderText('Full name'), 'Dup Person Again')
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => {
      expect(screen.getByText(/attendance record.*already existed.*updated/i)).toBeInTheDocument()
    })
  })
})