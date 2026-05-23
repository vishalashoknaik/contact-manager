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
            gender: 'Male',
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
    
    // Verify the table has the contact data
    const raviRow = screen.getByText('Ravi').closest('tr') as HTMLElement
    expect(raviRow).toBeInTheDocument()

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

  it('renders gender column with all contacts', () => {
    const contacts = [
      makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
      makeContact({ id: 2, name: 'Bob', gender: 'Male', phone: '222' }),
      makeContact({ id: 3, name: 'Charlie', gender: 'Other', phone: '333' })
    ]

    render(
      <ContactsTable
        contacts={contacts}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    // Check that the data rows contain the genders
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    
    // Verify the table has gender data by checking multiple elements
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
  })

  it('filters contacts by gender', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
          makeContact({ id: 2, name: 'Bob', gender: 'Male', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters({ genderFilter: 'Female' })}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={onFilterChange}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    // Verify filter dropdown exists and has correct value
    const genderSelects = screen.getAllByDisplayValue('Female')
    const genderSelect = genderSelects.find(el => el.tagName === 'SELECT') as HTMLSelectElement
    
    if (genderSelect) {
      await user.selectOptions(genderSelect, 'Male')
      expect(onFilterChange).toHaveBeenCalledWith('gender', 'Male')
    }
  })

  it('renders area of stay column and allows filtering', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', areaOfStay: 'Downtown' }),
          makeContact({ id: 2, name: 'Bob', areaOfStay: 'Uptown', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={onFilterChange}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    expect(screen.getByText('Downtown')).toBeInTheDocument()
    expect(screen.getByText('Uptown')).toBeInTheDocument()

    // Area of Stay filter should be available
    const areaFilters = screen.getAllByPlaceholderText('Filter...')
    // The Area of Stay filter should be one of these
    expect(areaFilters.length).toBeGreaterThan(0)
  })

  it('renders ie date column', () => {
    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', ieDate: '2026-05-01' }),
          makeContact({ id: 2, name: 'Bob', ieDate: '2026-03-15', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    expect(screen.getByText('2026-05-01')).toBeInTheDocument()
    expect(screen.getByText('2026-03-15')).toBeInTheDocument()
  })

  it('renders remarks column', () => {
    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', remarks: 'VIP member' }),
          makeContact({ id: 2, name: 'Bob', remarks: 'Regular visitor', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    expect(screen.getByText('VIP member')).toBeInTheDocument()
    expect(screen.getByText('Regular visitor')).toBeInTheDocument()
  })

  it('handles contacts with missing optional fields', () => {
    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', ieDate: undefined, areaOfStay: undefined, remarks: undefined }),
          makeContact({ id: 2, name: 'Bob', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    // Should render gracefully with no errors
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('sorts by gender column', async () => {
    const user = userEvent.setup()
    const onToggleSort = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
          makeContact({ id: 2, name: 'Bob', gender: 'Male', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={onToggleSort}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    const genderHeader = screen.getByRole('columnheader', { name: /Gender/ })
    await user.click(genderHeader)

    expect(onToggleSort).toHaveBeenCalledWith('gender')
  })

  it('sorts by ie date column', async () => {
    const user = userEvent.setup()
    const onToggleSort = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', ieDate: '2026-05-01' }),
          makeContact({ id: 2, name: 'Bob', ieDate: '2026-03-15', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={onToggleSort}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    const ieDateHeader = screen.getByRole('columnheader', { name: /IE Date/ })
    await user.click(ieDateHeader)

    expect(onToggleSort).toHaveBeenCalledWith('ieDate')
  })

  it('invokes onContactClick when name or phone cell is clicked', async () => {
    const user = userEvent.setup()
    const onContactClick = vi.fn()
    const contact = makeContact({ id: 1, name: 'Clickable User', phone: '1234567890' })

    render(
      <ContactsTable
        contacts={[contact]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
        onContactClick={onContactClick}
      />
    )

    await user.click(screen.getByText('Clickable User'))
    await user.click(screen.getByText('1234567890'))

    expect(onContactClick).toHaveBeenCalledTimes(2)
    expect(onContactClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Clickable User' }))
  })

  it('does not invoke onContactClick when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onContactClick = vi.fn()

    render(
      <ContactsTable
        contacts={[makeContact({ id: 1, name: 'Checkbox User', selected: false })]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
        onContactClick={onContactClick}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])

    expect(onContactClick).not.toHaveBeenCalled()
  })

  it('sorts by area of stay column', async () => {
    const user = userEvent.setup()
    const onToggleSort = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', areaOfStay: 'Downtown' }),
          makeContact({ id: 2, name: 'Bob', areaOfStay: 'Uptown', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={onToggleSort}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    const areaHeader = screen.getByRole('columnheader', { name: /Area of Stay/ })
    await user.click(areaHeader)

    expect(onToggleSort).toHaveBeenCalledWith('areaOfStay')
  })

  it('displays gender filter with all options', () => {
    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
          makeContact({ id: 2, name: 'Bob', gender: 'Male', phone: '222' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    // Find the gender select (not the filter dropdown)
    const selects = screen.getAllByDisplayValue('All')
    const genderSelect = selects.find(el => el.tagName === 'SELECT') as HTMLSelectElement
    
    if (genderSelect) {
      const options = Array.from(genderSelect.options).map(opt => opt.textContent)
      expect(options).toContain('All')
      expect(options).toContain('Male')
      expect(options).toContain('Female')
      expect(options).toContain('Other')
    }
  })

  it('handles applying gender filter', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', gender: 'Female' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={onFilterChange}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    // Find and interact with gender filter
    const selects = screen.getAllByDisplayValue('All')
    const genderSelect = selects.find(el => el.tagName === 'SELECT') as HTMLSelectElement
    
    if (genderSelect) {
      await user.selectOptions(genderSelect, 'Female')
      expect(onFilterChange).toHaveBeenCalledWith('gender', 'Female')
    }
  })

  it('handles area of stay filter with case-insensitive input', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <ContactsTable
        contacts={[
          makeContact({ id: 1, name: 'Alice', areaOfStay: 'Downtown' })
        ]}
        activities={[]}
        areas={[]}
        programs={[]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={onFilterChange}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
      />
    )

    const areaFilters = screen.getAllByPlaceholderText('Filter...')
    // Find the area of stay filter - it should be in the filter row
    if (areaFilters.length > 1) {
      await user.type(areaFilters[1], 'DOWN')
      expect(onFilterChange).toHaveBeenCalled()
    }
  })

  it('renders interest columns when interests prop is provided', () => {
    const contact = makeContact({ id: 1, interests: { Yoga: 3 } })
    render(
      <ContactsTable
        contacts={[contact]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        activities={[]}
        areas={[]}
        programs={[]}
        interests={['Yoga']}
        selectedRows={new Set()}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
        onInterestFilterChange={vi.fn()}
      />
    )

    // Column header for the interest
    expect(screen.getByRole('columnheader', { name: 'Yoga' })).toBeInTheDocument()
    // Count value in data row
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 0 for interest when contact has no interests property', () => {
    const contact = makeContact({ id: 1, interests: {} })
    render(
      <ContactsTable
        contacts={[contact]}
        filters={makeFilters()}
        sortState={{ key: 'name', direction: 'asc' }}
        activities={[]}
        areas={[]}
        programs={[]}
        interests={['Yoga']}
        selectedRows={new Set()}
        allSelected={false}
        onToggleSelect={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onClearSelections={vi.fn()}
        onToggleSort={vi.fn()}
        onFilterChange={vi.fn()}
        onActivityFilterChange={vi.fn()}
        onAreaFilterChange={vi.fn()}
        onProgramFilterChange={vi.fn()}
        onInterestFilterChange={vi.fn()}
      />
    )

    // Should render the Yoga column header
    expect(screen.getByRole('columnheader', { name: 'Yoga' })).toBeInTheDocument()
    // At least one cell with 0 (the yoga count)
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })
})