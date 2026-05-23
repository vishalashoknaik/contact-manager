import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CSVImport } from './CSVImport'
import { CSVService } from '@/lib/services/CSVService'

vi.mock('@/lib/services/CSVService', () => ({
  CSVService: {
    handleFileImport: vi.fn(),
    importPhoneList: vi.fn()
  }
}))

describe('CSVImport', () => {
  it('imports a selected file and forwards parsed contacts', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    const importedContacts = [{ id: 1, name: 'Ravi' }]
    vi.mocked(CSVService.handleFileImport).mockResolvedValue(importedContacts as never)

    const { container } = render(<CSVImport contacts={[]} onImport={onImport} />)

    await user.click(screen.getByRole('button', { name: 'Import CSV' }))

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['name,phone\nRavi,123'], 'contacts.csv', { type: 'text/csv' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(CSVService.handleFileImport).toHaveBeenCalledWith(file, [])
      expect(onImport).toHaveBeenCalledWith(importedContacts)
    })
  })

  describe('phone paste textarea', () => {
    it('renders the phone paste textarea and Import Phones button', () => {
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      expect(screen.getByLabelText('Paste phone numbers')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeInTheDocument()
    })

    it('Import Phones button is disabled when textarea is empty', () => {
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeDisabled()
    })

    it('Import Phones button becomes enabled when text is typed', async () => {
      const user = userEvent.setup()
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)

      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210')
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeEnabled()
    })

    it('calls importPhoneList with typed text and existing contacts', async () => {
      const user = userEvent.setup()
      const onImport = vi.fn()
      const resultContacts = [{ id: 'x1', name: '', phone: '9876543210' }]
      vi.mocked(CSVService.importPhoneList).mockReturnValue(resultContacts as never)

      const existingContacts = [{ id: 1, name: 'Alice', phone: '1111111111' }] as any[]
      render(<CSVImport contacts={existingContacts} onImport={onImport} />)

      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210')
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))

      expect(CSVService.importPhoneList).toHaveBeenCalledWith('9876543210', existingContacts)
      expect(onImport).toHaveBeenCalledWith(resultContacts)
    })

    it('clears the textarea after a successful import', async () => {
      const user = userEvent.setup()
      vi.mocked(CSVService.importPhoneList).mockReturnValue([])

      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      const textarea = screen.getByLabelText('Paste phone numbers')

      await user.type(textarea, '9876543210')
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))

      expect(textarea).toHaveValue('')
    })

    it('does not call importPhoneList when textarea is blank', async () => {
      const user = userEvent.setup()
      vi.mocked(CSVService.importPhoneList).mockReturnValue([])
      const onImport = vi.fn()

      render(<CSVImport contacts={[]} onImport={onImport} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))

      expect(CSVService.importPhoneList).not.toHaveBeenCalled()
      expect(onImport).not.toHaveBeenCalled()
    })
  })
})