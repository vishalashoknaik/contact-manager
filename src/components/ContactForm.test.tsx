import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContactForm } from './ContactForm'

describe('ContactForm', () => {
  it('submits contact details and clears the form', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    await user.type(nameInput, 'Ravi')
    await user.type(phoneInput, '9876543210')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).toHaveBeenCalledWith('Ravi', '9876543210', 'Male', undefined, undefined, undefined)
    expect(nameInput).toHaveValue('')
    expect(phoneInput).toHaveValue('')
  })

  it('does not submit incomplete input', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    await user.type(screen.getByPlaceholderText('Name'), 'Ravi')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).not.toHaveBeenCalled()
  })

  it('defaults gender to Male', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const genderSelect = screen.getByDisplayValue('Male')
    expect(genderSelect).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Name'), 'Alice')
    await user.type(screen.getByPlaceholderText('Phone'), '9999999999')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).toHaveBeenCalledWith('Alice', '9999999999', 'Male', undefined, undefined, undefined)
  })

  it('allows changing gender to Female', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const genderSelect = screen.getByDisplayValue('Male') as HTMLSelectElement
    await user.selectOptions(genderSelect, 'Female')

    await user.type(screen.getByPlaceholderText('Name'), 'Priya')
    await user.type(screen.getByPlaceholderText('Phone'), '8888888888')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).toHaveBeenCalledWith('Priya', '8888888888', 'Female', undefined, undefined, undefined)
  })

  it('allows changing gender to Other', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const genderSelect = screen.getByDisplayValue('Male') as HTMLSelectElement
    await user.selectOptions(genderSelect, 'Other')

    expect(genderSelect.value).toBe('Other')
  })

  it('shows optional fields toggle button', () => {
    render(<ContactForm onAddContact={vi.fn()} />)

    const toggleButton = screen.getByRole('button', { name: /▼ More/ })
    expect(toggleButton).toBeInTheDocument()
  })

  it('toggles optional fields visibility', async () => {
    const user = userEvent.setup()

    render(<ContactForm onAddContact={vi.fn()} />)

    // Optional fields should not be visible initially
    expect(screen.queryByPlaceholderText('Area of stay')).not.toBeInTheDocument()

    // Click to show
    const toggleButton = screen.getByRole('button', { name: /▼ More/ })
    await user.click(toggleButton)

    // Optional fields should now be visible
    expect(screen.getByPlaceholderText('Area of stay')).toBeInTheDocument()
    // IE Date field should be present (it's a date input)
    const dateInputs = screen.getAllByRole('textbox')
    expect(dateInputs.length).toBeGreaterThan(2)
    expect(screen.getByPlaceholderText('Remarks')).toBeInTheDocument()

    // Button text should change
    expect(screen.getByRole('button', { name: /▲ Less/ })).toBeInTheDocument()

    // Click to hide
    const hideButton = screen.getByRole('button', { name: /▲ Less/ })
    await user.click(hideButton)

    // Optional fields should be hidden again
    expect(screen.queryByPlaceholderText('Area of stay')).not.toBeInTheDocument()
  })

  it('submits with all optional fields filled', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    // Show optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))

    // Fill required fields
    await user.type(screen.getByPlaceholderText('Name'), 'Complete Contact')
    await user.type(screen.getByPlaceholderText('Phone'), '9111222333')

    // Fill optional fields
    const ieDateInputs = screen.getAllByRole('textbox')
    const ieDateInput = ieDateInputs.find(input => input.getAttribute('type') === 'date')
    if (ieDateInput) {
      await user.type(ieDateInput, '05/01/2026')
    }

    await user.type(screen.getByPlaceholderText('Area of stay'), 'Downtown')
    await user.type(screen.getByPlaceholderText('Remarks'), 'VIP member')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).toHaveBeenCalled()
    const call = onAddContact.mock.calls[0]
    expect(call[0]).toBe('Complete Contact')
    expect(call[1]).toBe('9111222333')
    expect(call[2]).toBe('Male')
    // Date will be auto-formatted, area and remarks should be present
    expect(call[4]).toBe('Downtown')
    expect(call[5]).toBe('VIP member')
  })

  it('clears optional fields when form is reset', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    // Show optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))

    // Fill all fields
    await user.type(screen.getByPlaceholderText('Name'), 'Test')
    await user.type(screen.getByPlaceholderText('Phone'), '1234567890')
    await user.type(screen.getByPlaceholderText('Area of stay'), 'Uptown')
    await user.type(screen.getByPlaceholderText('Remarks'), 'Notes')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Add' }))

    // All visible fields should be cleared
    expect(screen.getByPlaceholderText('Name')).toHaveValue('')
    expect(screen.getByPlaceholderText('Phone')).toHaveValue('')
    
    // Optional fields are hidden after submission, so show them again to verify they're cleared
    await user.click(screen.getByRole('button', { name: /▼ More/ }))
    expect(screen.getByPlaceholderText('Area of stay')).toHaveValue('')
    expect(screen.getByPlaceholderText('Remarks')).toHaveValue('')
  })

  it('collapses optional fields after submission', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    // Show optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))
    expect(screen.getByPlaceholderText('Area of stay')).toBeInTheDocument()

    // Fill and submit
    await user.type(screen.getByPlaceholderText('Name'), 'Test')
    await user.type(screen.getByPlaceholderText('Phone'), '1234567890')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    // Optional fields should be hidden again
    expect(screen.queryByPlaceholderText('Area of stay')).not.toBeInTheDocument()
  })

  it('allows entering special characters in optional fields', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    // Show optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))

    await user.type(screen.getByPlaceholderText('Name'), "O'Brien")
    await user.type(screen.getByPlaceholderText('Phone'), '9876543210')
    await user.type(screen.getByPlaceholderText('Area of stay'), "St. John's Park")
    await user.type(screen.getByPlaceholderText('Remarks'), 'Contact: (555) 1234')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    const call = onAddContact.mock.calls[0]
    expect(call[0]).toBe("O'Brien")
    expect(call[4]).toBe("St. John's Park")
    expect(call[5]).toBe('Contact: (555) 1234')
  })

  it('submits with enter key on required fields', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')

    await user.type(nameInput, 'Test')
    await user.type(phoneInput, '1234567890{Enter}')

    expect(onAddContact).toHaveBeenCalled()
  })

  it('renders gender options correctly', () => {
    render(<ContactForm onAddContact={vi.fn()} />)

    const genderSelect = screen.getByDisplayValue('Male') as HTMLSelectElement
    const options = Array.from(genderSelect.options).map(opt => opt.value)

    expect(options).toContain('Male')
    expect(options).toContain('Female')
    expect(options).toContain('Other')
  })

  it('does not submit with only optional fields filled', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    // Show optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))

    // Fill only optional fields
    await user.type(screen.getByPlaceholderText('Area of stay'), 'Downtown')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).not.toHaveBeenCalled()
  })

  it('handles gender change persisting through optional field toggle', async () => {
    const user = userEvent.setup()
    const onAddContact = vi.fn()

    render(<ContactForm onAddContact={onAddContact} />)

    const genderSelect = screen.getByDisplayValue('Male') as HTMLSelectElement
    await user.selectOptions(genderSelect, 'Female')

    // Toggle optional fields
    await user.click(screen.getByRole('button', { name: /▼ More/ }))
    await user.click(screen.getByRole('button', { name: /▲ Less/ }))

    // Gender should still be Female
    expect((screen.getByDisplayValue('Female') as HTMLSelectElement).value).toBe('Female')

    // Submit and verify
    await user.type(screen.getByPlaceholderText('Name'), 'Test')
    await user.type(screen.getByPlaceholderText('Phone'), '1234567890')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddContact).toHaveBeenCalledWith('Test', '1234567890', 'Female', undefined, undefined, undefined)
  })
})