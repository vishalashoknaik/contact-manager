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
})