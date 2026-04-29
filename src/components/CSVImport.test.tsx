import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CSVImport } from './CSVImport'
import { CSVService } from '@/lib/services/CSVService'

vi.mock('@/lib/services/CSVService', () => ({
  CSVService: {
    handleFileImport: vi.fn()
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
})