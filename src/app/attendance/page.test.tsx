import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AttendancePage from './page'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
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
    lookup: mocks.lookup,
    submit: mocks.submit
  }
}))

describe('AttendancePage', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.push.mockReset()
    mocks.replace.mockReset()
    mocks.lookup.mockReset()
    mocks.submit.mockReset()
    vi.restoreAllMocks()
  })

  it('shows the selected center name on the attendance page', () => {
    render(<AttendancePage />)

    expect(screen.getByText('Attendance Setup - Center One')).toBeInTheDocument()
  })

  it('uses the IE Date placeholder and does not render helper copy under session attendees', async () => {
    const user = userEvent.setup()

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

    expect(screen.getByPlaceholderText('IE Date')).toBeInTheDocument()
    expect(screen.queryByText('Remarks')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/notes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hidden by default/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Expand only to confirm/i)).not.toBeInTheDocument()
  })

  it('requires gender, IE Date, and area of stay for new contacts', async () => {
    const user = userEvent.setup()

    mocks.lookup.mockResolvedValueOnce({ found: false })

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

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

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

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

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

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

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

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

    expect(screen.getByText('Taking Attendance - Center One')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.getByText('Saved Person')).toBeInTheDocument()
    expect(screen.getByText('6666666666')).toBeInTheDocument()
    expect(screen.getByText(/Pending sync: Network error/)).toBeInTheDocument()
  })

  it('retries pending records and clears persisted session when ending succeeds', async () => {
    const user = userEvent.setup()

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
        programs: ['Youth Program']
      })
    })

    expect(localStorage.getItem('attendance-session:center-1')).toBeNull()
    expect(mocks.push).toHaveBeenCalledWith('/')
  })

  it('retries pending records from the retry button and updates their status', async () => {
    const user = userEvent.setup()

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

    await user.click(screen.getByRole('button', { name: /retry pending sync/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.queryByText(/Pending sync:/)).not.toBeInTheDocument()
  })
})