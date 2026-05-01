import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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
    selectedCenter: 'center-1'
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
  it('uses the IE Date placeholder and does not render helper copy under session attendees', async () => {
    const user = userEvent.setup()

    render(<AttendancePage />)

    await user.click(screen.getByLabelText('Walkathon'))
    await user.click(screen.getByRole('button', { name: /start attendance/i }))

    expect(screen.getByPlaceholderText('IE Date')).toBeInTheDocument()
    expect(screen.queryByText(/Hidden by default/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Expand only to confirm/i)).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /submit & next/i }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalled())

    expect(screen.queryByText('9999999999')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /session attendees/i }))

    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getByText('9999999999')).toBeInTheDocument()
  })
})