import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Home from './page'
import { CSVService } from '@/lib/services/CSVService'

vi.mock('@/lib/services/CSVService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/services/CSVService')>()
  return {
    ...actual,
    CSVService: {
      ...actual.CSVService,
      handleFileImport: vi.fn()
    }
  }
})

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('covers admin mode, add contact, filters, sorting, bulk actions, and csv import flow', async () => {
    const user = userEvent.setup()
    vi.mocked(CSVService.handleFileImport).mockResolvedValue([
      {
        id: 200,
        name: 'Imported User',
        phone: '7777777777',
        activities: {},
        areas: {},
        programs: {},
        selected: true,
        lastUpdated: '2026-04-30T12:00:00.000Z',
        importOrder: 0
      },
      {
        id: 1,
        name: 'Ravi',
        phone: '9876543210',
        activities: {},
        areas: {},
        programs: {},
        selected: false,
        lastUpdated: '2026-04-30T10:00:00.000Z'
      }
    ] as never)

    const { container } = render(<Home />)

    expect(screen.getByText(/Contact Manager/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Admin Mode/i }))
    await user.click(screen.getByRole('button', { name: /Show Settings/i }))
    expect(screen.getByText(/Admin Settings/)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('New activity'), 'Prayer')

    const adminPanel = screen.getByText(/Admin Settings/).closest('div') as HTMLElement
    await user.click(within(adminPanel).getAllByRole('button', { name: 'Add' })[0])

    expect(within(adminPanel).getByText('Prayer')).toBeInTheDocument()

    const nameInput = screen.getByPlaceholderText('Name')
    const phoneInput = screen.getByPlaceholderText('Phone')
    await user.type(nameInput, 'Manual User')
    await user.type(phoneInput, '6666666666')

    const addContactSection = screen.getByText('Add Contact').closest('div') as HTMLElement
    await user.click(within(addContactSection).getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Manual User')).toBeInTheDocument()

    const rowsBeforeImport = container.querySelectorAll('tbody tr')
    await user.click(within(rowsBeforeImport[0]).getByRole('checkbox'))

    const combos = screen.getAllByRole('combobox')
    await user.selectOptions(combos[0], 'Walkathon')
    await user.selectOptions(combos[1], 'Area1')
    await user.selectOptions(combos[2], 'Program1')
    await user.click(screen.getByRole('button', { name: '+1 (Selected)' }))

    expect(rowsBeforeImport[0]).toHaveTextContent('1')

    const filterInputs = screen.getAllByPlaceholderText('Filter...')
    await user.clear(filterInputs[0])
    await user.type(filterInputs[0], 'Manual')
    expect(screen.getByText('Manual User')).toBeInTheDocument()
    expect(screen.queryByText('Ravi')).not.toBeInTheDocument()

    await user.clear(filterInputs[0])
    await user.click(screen.getByText(/Phone/))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['name,phone\nImported User,7777777777'], 'contacts.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(CSVService.handleFileImport).toHaveBeenCalled()
      expect(screen.getByText('Imported User')).toBeInTheDocument()
    })

    const rows = container.querySelectorAll('tbody tr')
    expect(within(rows[0]).getByText('Imported User')).toBeInTheDocument()
  })
})