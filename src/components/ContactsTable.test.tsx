import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContactsTable } from './ContactsTable'
import { makeContact, makeFilters } from '@/lib/services/__tests__/fixtures'
import { within } from '@testing-library/react'

describe('ContactsTable', () => {
  it('renders contact rows and forwards table interactions', async () => {
    const user = userEvent.setup()
    const onToggleSelect = vi.fn()
    const onToggleSelectAll = vi.fn()
    const onClearSelections = vi.fn()
    const onToggleSort = vi.fn()
    const onFilterChange = vi.fn()
    const onActivityFilterChange = vi.fn()
    const onAreaFilterChange = vi.fn()
    const onProgramFilterChange = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({
            id: 1,
            name: 'Ravi',
            phone: '9999999999',
            selected: true,
            activities: { Walkathon: 2 },
            areas: { Area1: 1 },
            programs: { Program1: 3 }
          })
        ]}
        activities={['Walkathon']}
        areas={['Area1']}
        programs={['Program1']}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onToggleSelectAll}
        onClearSelections={onClearSelections}
        onToggleSort={onToggleSort}
        onFilterChange={onFilterChange}
        onActivityFilterChange={onActivityFilterChange}
        onAreaFilterChange={onAreaFilterChange}
        onProgramFilterChange={onProgramFilterChange}
      />
    )

    expect(screen.getByText('Ravi')).toBeInTheDocument()
    expect(screen.getByText('9999999999')).toBeInTheDocument()

    await user.click(screen.getByText(/Name/))
    await user.click(screen.getAllByRole('checkbox')[0])
    await user.click(screen.getAllByRole('checkbox')[1])
    await user.type(screen.getAllByPlaceholderText('Filter...')[0], 'Ra')
    await user.type(screen.getAllByPlaceholderText('Min')[0], '2')

    const row = screen.getByText('Ravi').closest('tr') as HTMLElement
    expect(within(row).getByText('3')).toBeInTheDocument()

    expect(onToggleSort).toHaveBeenCalledWith('name')
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1)
    expect(onToggleSelect).toHaveBeenCalledWith(1)
    expect(onFilterChange).toHaveBeenNthCalledWith(1, 'name', 'R')
    expect(onActivityFilterChange).toHaveBeenCalled()
  })
})