/**
 * CampaignCallScreen — edge case tests
 * Covers branches missing from CampaignCallScreen.test.tsx:
 *   - doNotDisturb flag included in submitted payload
 *   - notInterestedToVolunteer flag included in submitted payload
 *   - API error displayed in UI
 *   - onDone callback fired when user clicks "Back to Campaign" in done state
 *   - Form fields reset after successful submission
 *   - No-template state: WhatsApp/SMS links disabled
 *   - "mode" prop passed through to payload
 */
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CampaignCallScreen } from './CampaignCallScreen'

const mocks = vi.hoisted(() => ({
  submitCallLog: vi.fn()
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: {
    submitCallLog: mocks.submitCallLog
  }
}))

const defaultProps = {
  campaignId: 'campaign-1',
  centerId: 'center-1',
  initialNext: {
    done: false as const,
    campaignContactId: 'cc-1',
    contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
  },
  mode: 'pending' as const,
  campaignName: 'Morning Campaign',
  messageTemplates: [
    { name: 'Default', smsContent: 'Hi {name}', whatsappContent: 'WA {name}' }
  ],
  selectedTemplateIndex: 0,
  onSelectedTemplateChange: vi.fn(),
  onDone: vi.fn()
}

beforeEach(() => {
  mocks.submitCallLog.mockReset()
  defaultProps.onDone.mockReset?.()
})

describe('CampaignCallScreen — flags in payload', () => {
  it('sends doNotDisturb=true when the checkbox is checked', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: { done: true }
    })

    render(<CampaignCallScreen {...defaultProps} />)

    await user.click(screen.getByLabelText('Do Not Disturb'))
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(mocks.submitCallLog).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({ doNotDisturb: true, notInterestedToVolunteer: false }),
        'center-1'
      )
    })
  })

  it('sends notInterestedToVolunteer=true when the checkbox is checked', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: { done: true }
    })

    render(<CampaignCallScreen {...defaultProps} />)

    await user.click(screen.getByLabelText('Not Interested to Volunteer'))
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(mocks.submitCallLog).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({ doNotDisturb: false, notInterestedToVolunteer: true }),
        'center-1'
      )
    })
  })

  it('passes mode=skipped through to the payload', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: { done: true }
    })

    render(<CampaignCallScreen {...defaultProps} mode="skipped" />)

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(mocks.submitCallLog).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({ mode: 'skipped' }),
        'center-1'
      )
    })
  })
})

describe('CampaignCallScreen — error handling', () => {
  it('displays the API error message when submission fails', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockRejectedValueOnce(new Error('Server is down'))

    render(<CampaignCallScreen {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(screen.getByText('Server is down')).toBeInTheDocument()
    })
  })

  it('displays fallback message for non-Error rejection', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockRejectedValueOnce('string error')

    render(<CampaignCallScreen {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument()
    })
  })

  it('clears previous error on a subsequent successful submission', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ success: true, next: { done: true } })

    render(<CampaignCallScreen {...defaultProps} />)

    // First attempt — fails
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))
    await waitFor(() => expect(screen.getByText('Temporary failure')).toBeInTheDocument())

    // Second attempt — succeeds
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))
    await waitFor(() => expect(screen.queryByText('Temporary failure')).not.toBeInTheDocument())
  })
})

describe('CampaignCallScreen — done state', () => {
  it('shows done message and fires onDone when "Back to Campaign" is clicked', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    mocks.submitCallLog.mockResolvedValueOnce({ success: true, next: { done: true } })

    render(<CampaignCallScreen {...defaultProps} onDone={onDone} />)

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => expect(screen.getByText('All done!')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Back to Campaign' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('shows skipped-mode done message when mode is skipped', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({ success: true, next: { done: true } })

    render(<CampaignCallScreen {...defaultProps} mode="skipped" />)

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() =>
      expect(screen.getByText('All skipped contacts revisited!')).toBeInTheDocument()
    )
  })

  it('renders done state immediately when initialNext is done:true', () => {
    render(
      <CampaignCallScreen
        {...defaultProps}
        initialNext={{ done: true }}
      />
    )

    expect(screen.getByText('All done!')).toBeInTheDocument()
  })
})

describe('CampaignCallScreen — call overview summary bar', () => {
  it('shows initial counts from props', () => {
    render(
      <CampaignCallScreen
        {...defaultProps}
        initialCompleted={3}
        initialPending={7}
        initialSkipped={2}
      />
    )

    expect(within(screen.getByTestId('call-count-completed')).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByTestId('call-count-skipped')).getByText('2')).toBeInTheDocument()
    expect(screen.getByTestId('call-count-completed')).toHaveTextContent('Completed')
    expect(screen.getByTestId('call-count-skipped')).toHaveTextContent('Skipped')
    expect(screen.queryByTestId('call-count-pending')).not.toBeInTheDocument()
  })

  it('defaults counts to 0 when props are omitted', () => {
    render(<CampaignCallScreen {...defaultProps} />)

    expect(within(screen.getByTestId('call-count-completed')).getByText('0')).toBeInTheDocument()
    expect(within(screen.getByTestId('call-count-skipped')).getByText('0')).toBeInTheDocument()
    expect(screen.queryByTestId('call-count-pending')).not.toBeInTheDocument()
  })

  it('increments completed after submit in pending mode', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: {
        done: false,
        campaignContactId: 'cc-2',
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      }
    })

    render(
      <CampaignCallScreen
        {...defaultProps}
        mode="pending"
        initialCompleted={1}
        initialPending={5}
        initialSkipped={0}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(within(screen.getByTestId('call-count-completed')).getByText('2')).toBeInTheDocument()
    })
  })

  it('increments skipped and decrements pending after skip in pending mode', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: {
        done: false,
        campaignContactId: 'cc-2',
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      }
    })

    render(
      <CampaignCallScreen
        {...defaultProps}
        mode="pending"
        initialCompleted={0}
        initialPending={3}
        initialSkipped={1}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Skip & Get Next' }))

    await waitFor(() => {
      expect(within(screen.getByTestId('call-count-skipped')).getByText('2')).toBeInTheDocument()
    })
  })

  it('increments completed and decrements skipped after submit in skipped mode', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: {
        done: false,
        campaignContactId: 'cc-2',
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      }
    })

    render(
      <CampaignCallScreen
        {...defaultProps}
        mode="skipped"
        initialCompleted={2}
        initialPending={0}
        initialSkipped={4}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(within(screen.getByTestId('call-count-completed')).getByText('3')).toBeInTheDocument()
      expect(within(screen.getByTestId('call-count-skipped')).getByText('3')).toBeInTheDocument()
    })
  })
})

describe('CampaignCallScreen — form reset after submit', () => {
  it('resets remarks and flags after a successful submission', async () => {
    const user = userEvent.setup()
    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: {
        done: false,
        campaignContactId: 'cc-2',
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      }
    })

    render(<CampaignCallScreen {...defaultProps} />)

    await user.type(screen.getByLabelText('Remarks'), 'Call again tomorrow')
    await user.click(screen.getByLabelText('Do Not Disturb'))
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())

    const remarksField = screen.getByLabelText('Remarks') as HTMLTextAreaElement
    const dndCheckbox = screen.getByLabelText('Do Not Disturb') as HTMLInputElement

    expect(remarksField.value).toBe('')
    expect(dndCheckbox.checked).toBe(false)
  })
})

describe('CampaignCallScreen — no templates', () => {
  it('shows warning and disables WhatsApp/SMS links when no templates configured', () => {
    render(
      <CampaignCallScreen
        {...defaultProps}
        messageTemplates={[]}
      />
    )

    expect(
      screen.getByText(/No message templates configured for this campaign/)
    ).toBeInTheDocument()

    // Links should be rendered as disabled spans, not <a> tags
    const whatsappElements = screen.getAllByText('WhatsApp')
    const smsElements = screen.getAllByText('SMS')
    // At least one of each should be a non-anchor (disabled span)
    expect(whatsappElements.some(el => el.tagName !== 'A')).toBe(true)
    expect(smsElements.some(el => el.tagName !== 'A')).toBe(true)
  })
})
