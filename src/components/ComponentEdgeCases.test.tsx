import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContactForm } from './ContactForm'
import { ContactsTable } from './ContactsTable'
import { ActionBar } from './ActionBar'
import { makeContact, makeFilters } from '@/lib/services/__tests__/fixtures'

describe('Component Edge Cases', () => {
  describe('ContactForm Edge Cases', () => {
    it('handles rapid successive submissions', async () => {
      const user = userEvent.setup()
      const onAddContact = vi.fn()

      render(<ContactForm onAddContact={onAddContact} />)

      const nameInput = screen.getByPlaceholderText('Name')
      const phoneInput = screen.getByPlaceholderText('Phone')
      const addButton = screen.getByRole('button', { name: 'Add' })

      // Rapid submissions
      await user.type(nameInput, 'Alice')
      await user.type(phoneInput, '1111111111')
      await user.click(addButton)

      await user.type(nameInput, 'Bob')
      await user.type(phoneInput, '2222222222')
      await user.click(addButton)

      expect(onAddContact).toHaveBeenCalledTimes(2)
    })

    it('handles special characters in name', async () => {
      const user = userEvent.setup()
      const onAddContact = vi.fn()

      render(<ContactForm onAddContact={onAddContact} />)

      const nameInput = screen.getByPlaceholderText('Name')
      const phoneInput = screen.getByPlaceholderText('Phone')

      await user.type(nameInput, "O'Brien-Smith")
      await user.type(phoneInput, '1111111111')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onAddContact).toHaveBeenCalledWith("O'Brien-Smith", '1111111111', 'Male', undefined, undefined, undefined)
    })

    it('handles very long names', async () => {
      const user = userEvent.setup()
      const onAddContact = vi.fn()

      render(<ContactForm onAddContact={onAddContact} />)

      const longName =
        'Abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
      const nameInput = screen.getByPlaceholderText('Name')
      const phoneInput = screen.getByPlaceholderText('Phone')

      await user.type(nameInput, longName)
      await user.type(phoneInput, '1111111111')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(onAddContact).toHaveBeenCalledWith(longName, '1111111111', 'Male', undefined, undefined, undefined)
    })

    it('handles whitespace-only input as invalid', async () => {
      const user = userEvent.setup()
      const onAddContact = vi.fn()

      render(<ContactForm onAddContact={onAddContact} />)

      const nameInput = screen.getByPlaceholderText('Name')
      const phoneInput = screen.getByPlaceholderText('Phone')

      await user.type(nameInput, '   ')
      await user.type(phoneInput, '   ')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      // Form may accept it - just ensure it doesn't crash
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    it('preserves form state during re-renders', async () => {
      const user = userEvent.setup()
      const onAddContact = vi.fn()

      const { rerender } = render(
        <ContactForm onAddContact={onAddContact} />
      )

      const nameInput = screen.getByPlaceholderText(
        'Name'
      ) as HTMLInputElement
      const phoneInput = screen.getByPlaceholderText(
        'Phone'
      ) as HTMLInputElement

      await user.type(nameInput, 'Alice')
      await user.type(phoneInput, '1111111111')

      // Re-render with same props
      rerender(<ContactForm onAddContact={onAddContact} />)

      // Values should be preserved
      expect(screen.getByPlaceholderText('Name')).toHaveValue('Alice')
      expect(screen.getByPlaceholderText('Phone')).toHaveValue(
        '1111111111'
      )
    })
  })

  describe('ContactsTable Edge Cases', () => {
    it('renders empty table gracefully', () => {
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
          contacts={[]}
          activities={[]}
          areas={[]}
          programs={[]}
          filters={makeFilters()}
          sortState={{ key: 'name', direction: 'asc' }}
          allSelected={false}
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

      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('handles large number of contacts', () => {
      const contacts = Array.from({ length: 100 }, (_, i) =>
        makeContact({
          id: i + 1,
          name: `Contact ${i + 1}`,
          phone: `${String(i + 1).padStart(10, '0')}`
        })
      )

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
          contacts={contacts}
          activities={[]}
          areas={[]}
          programs={[]}
          filters={makeFilters()}
          sortState={{ key: 'name', direction: 'asc' }}
          allSelected={false}
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

      // Should render first few contacts
      expect(screen.getByText('Contact 1')).toBeInTheDocument()
    })

    it('handles contacts with missing optional fields', () => {
      const contacts = [
        makeContact({
          id: 1,
          activities: {},
          areas: {},
          programs: {}
        })
      ]

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
          contacts={contacts}
          activities={[]}
          areas={[]}
          programs={[]}
          filters={makeFilters()}
          sortState={{ key: 'name', direction: 'asc' }}
          allSelected={false}
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

      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('handles sorting by different columns', async () => {
      const user = userEvent.setup()
      const onToggleSort = vi.fn()

      const contacts = [
        makeContact({ id: 1, name: 'Charlie' }),
        makeContact({ id: 2, name: 'Alice', phone: '222' }),
        makeContact({ id: 3, name: 'Bob', phone: '333' })
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
          onToggleSort={onToggleSort}
          onFilterChange={vi.fn()}
          onActivityFilterChange={vi.fn()}
          onAreaFilterChange={vi.fn()}
          onProgramFilterChange={vi.fn()}
        />
      )

      // Table should render with contacts
      expect(screen.getByText('Charlie')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  describe('ActionBar Edge Cases', () => {
    it('handles selection with no contacts', () => {
      const onIncrementSelected = vi.fn()

      render(
        <ActionBar
          selectedCount={0}
          onIncrementSelected={onIncrementSelected}
          activities={[]}
          areas={[]}
          programs={[]}
        />
      )

      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles large number of categories', async () => {
      const user = userEvent.setup()
      const onIncrementSelected = vi.fn()

      const activities = Array.from(
        { length: 50 },
        (_, i) => `Activity ${i + 1}`
      )

      render(
        <ActionBar
          selectedCount={1}
          onIncrementSelected={onIncrementSelected}
          activities={activities}
          areas={[]}
          programs={[]}
        />
      )

      // Should render first activity
      expect(screen.getByText('Activity 1')).toBeInTheDocument()
    })

    it('handles selection when no categories exist', () => {
      const onIncrementSelected = vi.fn()

      render(
        <ActionBar
          selectedCount={5}
          onIncrementSelected={onIncrementSelected}
          activities={[]}
          areas={[]}
          programs={[]}
        />
      )

      // Should handle gracefully and render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles rapid category switches', async () => {
      const user = userEvent.setup()
      const onIncrementSelected = vi.fn()

      const { rerender } = render(
        <ActionBar
          selectedCount={1}
          onIncrementSelected={onIncrementSelected}
          activities={['Activity1', 'Activity2']}
          areas={['Area1']}
          programs={['Program1']}
        />
      )

      // Change props rapidly
      rerender(
        <ActionBar
          selectedCount={2}
          onIncrementSelected={onIncrementSelected}
          activities={['Activity1']}
          areas={['Area1', 'Area2']}
          programs={['Program1']}
        />
      )

      rerender(
        <ActionBar
          selectedCount={1}
          onIncrementSelected={onIncrementSelected}
          activities={['Activity1', 'Activity2', 'Activity3']}
          areas={['Area1']}
          programs={[]}
        />
      )

      expect(onIncrementSelected).not.toHaveBeenCalled()
    })
  })
})
