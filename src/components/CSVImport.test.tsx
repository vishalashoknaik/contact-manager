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

  describe('phone import — multi-step flow', () => {
    it('shows Import Phones button initially; no textarea visible', () => {
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Paste phone numbers')).not.toBeInTheDocument()
    })

    it('clicking Import Phones opens the text input', async () => {
      const user = userEvent.setup()
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Import Phones' }))

      expect(screen.getByLabelText('Paste phone numbers')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Import Phones' })).not.toBeInTheDocument()
    })

    it('Preview button is disabled when textarea is empty', async () => {
      const user = userEvent.setup()
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled()
    })

    it('Preview shows a table of parsed phones with status', async () => {
      const user = userEvent.setup()
      const existing = [{ id: 1, name: 'Alice', phone: '9876543210' } as any]
      const previewResult = [
        { id: 1, name: 'Alice', phone: '9876543210', selected: true, activities: {}, areas: {}, programs: {}, gender: 'Male', lastUpdated: '' },
        { id: 9999, name: '', phone: '1112223333', selected: true, activities: {}, areas: {}, programs: {}, gender: 'Male', lastUpdated: '' }
      ]
      vi.mocked(CSVService.importPhoneList).mockReturnValue(previewResult as never)

      render(<CSVImport contacts={existing} onImport={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210 1112223333')
      await user.click(screen.getByRole('button', { name: 'Preview' }))

      // Table should appear
      expect(screen.getByRole('columnheader', { name: 'Phone' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
      expect(screen.getByText('9876543210')).toBeInTheDocument()
      expect(screen.getByText('1112223333')).toBeInTheDocument()
      expect(screen.getByText('Existing')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('Import button in preview calls onImport and returns to idle', async () => {
      const user = userEvent.setup()
      const onImport = vi.fn()
      const previewResult = [{ id: 1, name: '', phone: '9876543210', selected: true, activities: {}, areas: {}, programs: {}, gender: 'Male', lastUpdated: '' }]
      vi.mocked(CSVService.importPhoneList).mockReturnValue(previewResult as never)

      render(<CSVImport contacts={[]} onImport={onImport} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210')
      await user.click(screen.getByRole('button', { name: 'Preview' }))
      await user.click(screen.getByRole('button', { name: 'Import' }))

      expect(onImport).toHaveBeenCalledWith(previewResult)
      // Returns to idle — Import Phones button visible again
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeInTheDocument()
    })

    it('Cancel from entering phase returns to idle', async () => {
      const user = userEvent.setup()
      render(<CSVImport contacts={[]} onImport={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      expect(screen.getByLabelText('Paste phone numbers')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Paste phone numbers')).not.toBeInTheDocument()
    })

    it('Back button from preview returns to entering phase', async () => {
      const user = userEvent.setup()
      vi.mocked(CSVService.importPhoneList).mockReturnValue([{ id: 1, name: '', phone: '9876543210', selected: true, activities: {}, areas: {}, programs: {}, gender: 'Male', lastUpdated: '' }] as never)

      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210')
      await user.click(screen.getByRole('button', { name: 'Preview' }))
      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(screen.getByLabelText('Paste phone numbers')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
    })

    it('Cancel from preview phase returns to idle', async () => {
      const user = userEvent.setup()
      vi.mocked(CSVService.importPhoneList).mockReturnValue([{ id: 1, name: '', phone: '9876543210', selected: true, activities: {}, areas: {}, programs: {}, gender: 'Male', lastUpdated: '' }] as never)

      render(<CSVImport contacts={[]} onImport={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Import Phones' }))
      await user.type(screen.getByLabelText('Paste phone numbers'), '9876543210')
      await user.click(screen.getByRole('button', { name: 'Preview' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByRole('button', { name: 'Import Phones' })).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })
})