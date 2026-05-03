import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CallLogsTable } from './CallLogsTable'

const sampleLog = {
  id: 'log-1',
  campaignContactId: 'cc-1',
  calledAt: new Date('2026-05-03T10:00:00.000Z').toISOString(),
  volunteerPhone: '9000000009',
  contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' },
  status: 'COMPLETED' as const,
  feedback: 'COMPLETED' as const,
  centerChange: false,
  doNotDisturb: false,
  notInterestedToVolunteer: false,
  remarks: 'All good'
}

describe('CallLogsTable', () => {
  it('renders call logs and allows row click callback for editing', async () => {
    const user = userEvent.setup()
    const onLogClick = vi.fn()

    render(<CallLogsTable logs={[sampleLog]} onLogClick={onLogClick} />)

    const rowCell = screen.getByText('Alice')
    await user.click(rowCell)

    expect(onLogClick).toHaveBeenCalledTimes(1)
    expect(onLogClick).toHaveBeenCalledWith(sampleLog)
  })

  it('shows empty state with no logs', () => {
    render(<CallLogsTable logs={[]} />)

    expect(screen.getByText('No calls logged yet.')).toBeInTheDocument()
  })
})
