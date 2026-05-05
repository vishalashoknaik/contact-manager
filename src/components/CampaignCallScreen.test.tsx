import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { CampaignCallScreen } from './CampaignCallScreen'

const mocks = vi.hoisted(() => ({
  submitCallLog: vi.fn()
}))

vi.mock('@/lib/api/client', () => ({
  campaignsApi: {
    submitCallLog: mocks.submitCallLog
  }
}))

describe('CampaignCallScreen', () => {
  beforeEach(() => {
    mocks.submitCallLog.mockReset()
  })

  it('submits feedback and shows done state when no next contact exists', async () => {
    const user = userEvent.setup()

    mocks.submitCallLog.mockResolvedValueOnce({
      success: true,
      next: { done: true }
    })

    render(
      <CampaignCallScreen
        campaignId="campaign-1"
        centerId="center-1"
        initialNext={{
          done: false,
          campaignContactId: 'cc-1',
          contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
        }}
        campaignName="Morning Campaign"
        messageTemplates={[
          { name: 'Default', smsContent: 'Hi {name} from {campaign}', whatsappContent: 'WA {name} {phone}' }
        ]}
        selectedTemplateIndex={0}
        onSelectedTemplateChange={vi.fn()}
        onDone={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByLabelText('Feedback'), 'NO_RESPONSE')
    await user.click(screen.getByLabelText('Center Change'))
    await user.type(screen.getByLabelText('Remarks'), 'Will try tomorrow')
    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))

    await waitFor(() => {
      expect(mocks.submitCallLog).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({
          campaignContactId: 'cc-1',
          feedback: 'NO_RESPONSE',
          centerChange: true,
          action: 'submit'
        }),
        'center-1'
      )
    })

    expect(await screen.findByText('All done!')).toBeInTheDocument()
  })

  it('skips current contact and loads next contact card', async () => {
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
        campaignId="campaign-1"
        centerId="center-1"
        initialNext={{
          done: false,
          campaignContactId: 'cc-1',
          contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
        }}
        campaignName="Morning Campaign"
        messageTemplates={[
          { name: 'Default', smsContent: 'Hi {name} from {campaign}', whatsappContent: 'WA {name} {phone}' }
        ]}
        selectedTemplateIndex={0}
        onSelectedTemplateChange={vi.fn()}
        onDone={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Skip & Get Next' }))

    await waitFor(() => {
      expect(mocks.submitCallLog).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({
          campaignContactId: 'cc-1',
          action: 'skip'
        }),
        'center-1'
      )
    })

    expect(await screen.findByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('9000000002')).toBeInTheDocument()
  })

  it('allows going back to previous contact after moving to next', async () => {
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
        campaignId="campaign-1"
        centerId="center-1"
        initialNext={{
          done: false,
          campaignContactId: 'cc-1',
          contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
        }}
        campaignName="Morning Campaign"
        messageTemplates={[
          { name: 'Default', smsContent: 'Hi {name} from {campaign}', whatsappContent: 'WA {name} {phone}' }
        ]}
        selectedTemplateIndex={0}
        onSelectedTemplateChange={vi.fn()}
        onDone={vi.fn()}
      />
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous Contact' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Submit & Get Next' }))
    expect(await screen.findByText('Bob')).toBeInTheDocument()

    const previousButton = screen.getByRole('button', { name: 'Previous Contact' })
    expect(previousButton).toBeEnabled()
    await user.click(previousButton)

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous Contact' })).toBeDisabled()
  })

  it('builds call, whatsapp and sms links with prefilled template content', () => {
    render(
      <CampaignCallScreen
        campaignId="campaign-1"
        centerId="center-1"
        initialNext={{
          done: false,
          campaignContactId: 'cc-1',
          contact: { id: 'contact-1', name: 'Alice', phone: '+91 90000 00001' }
        }}
        campaignName="Morning Campaign"
        messageTemplates={[
          { name: 'Default', smsContent: 'Hi {name}, from {campaign}. Call {phone}', whatsappContent: 'WA hello {name} in {campaign} ({phone})' }
        ]}
        selectedTemplateIndex={0}
        onSelectedTemplateChange={vi.fn()}
        onDone={vi.fn()}
      />
    )

    const callLink = screen.getByRole('link', { name: 'Call' })
    const whatsappLink = screen.getByRole('link', { name: 'WhatsApp' })
    const smsLink = screen.getByRole('link', { name: 'SMS' })

    expect(callLink).toHaveAttribute('href', 'tel:+91 90000 00001')
    expect(whatsappLink).toHaveAttribute(
      'href',
      'https://wa.me/919000000001?text=WA%20hello%20Alice%20in%20Morning%20Campaign%20(%2B91%2090000%2000001)'
    )
    expect(smsLink).toHaveAttribute(
      'href',
      'sms:+91 90000 00001?body=Hi%20Alice%2C%20from%20Morning%20Campaign.%20Call%20%2B91%2090000%2000001'
    )
  })

  it('allows selecting different message templates and uses correct content', () => {
    const onSelectedTemplateChange = vi.fn()

    render(
      <CampaignCallScreen
        campaignId="campaign-1"
        centerId="center-1"
        initialNext={{
          done: false,
          campaignContactId: 'cc-1',
          contact: { id: 'contact-1', name: 'Alice', phone: '+91 90000 00001' }
        }}
        campaignName="Morning Campaign"
        messageTemplates={[
          { name: 'Friendly', smsContent: 'Hey {name}!', whatsappContent: 'Hey {name}! 😊' },
          { name: 'Professional', smsContent: 'Dear {name},', whatsappContent: 'Dear {name},' }
        ]}
        selectedTemplateIndex={0}
        onSelectedTemplateChange={onSelectedTemplateChange}
        onDone={vi.fn()}
      />
    )

    // Message Template dropdown should be visible when there are multiple templates
    const templateSelect = screen.getByLabelText('Message Template')
    expect(templateSelect).toBeInTheDocument()
    expect(templateSelect).toHaveValue('0')

    // SMS link should use first template
    const smsLink = screen.getByRole('link', { name: 'SMS' })
    expect(smsLink).toHaveAttribute('href', expect.stringContaining('Hey%20Alice'))
  })
})
