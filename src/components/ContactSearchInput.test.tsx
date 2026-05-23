import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ContactSearchInput } from './ContactSearchInput'
import { makeContact } from '@/lib/services/__tests__/fixtures'

const ALICE = makeContact({ id: 1, name: 'Alice Kumar', phone: '9876543210', lastUpdated: '2026-05-01T10:00:00.000Z' })
const BOB   = makeContact({ id: 2, name: 'Bob Das',    phone: '1234567890', lastUpdated: '2026-04-01T10:00:00.000Z' })
const CAROL = makeContact({ id: 3, name: '',           phone: '5550001111', lastUpdated: '2026-03-01T10:00:00.000Z' })

const contacts = [ALICE, BOB, CAROL]

describe('ContactSearchInput', () => {
  it('renders an input with the given placeholder', () => {
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} placeholder="Find a volunteer" />)
    expect(screen.getByPlaceholderText('Find a volunteer')).toBeInTheDocument()
  })

  it('shows no dropdown when input is empty', () => {
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows suggestions after typing 1 character', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'a')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('filters by contact name (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'alice')
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Alice Kumar')
  })

  it('filters by phone number', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), '123456')
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('1234567890')
  })

  it('shows phone only for contacts with no name', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), '555')
    const items = screen.getAllByRole('option')
    expect(items[0]).toHaveTextContent('5550001111')
    expect(items[0]).not.toHaveTextContent('—')
  })

  it('sorts suggestions by lastUpdated descending', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    // 'a' matches Alice (2026-05-01) and Bob Das (2026-04-01)
    await user.type(screen.getByRole('textbox'), 'a')
    const items = screen.getAllByRole('option')
    // Alice is more recently updated — should appear first
    expect(items[0]).toHaveTextContent('Alice Kumar')
    expect(items[1]).toHaveTextContent('Bob Das')
  })

  it('limits suggestions to 10 results', async () => {
    const user = userEvent.setup()
    const manyContacts = Array.from({ length: 15 }, (_, i) =>
      makeContact({ id: i + 10, name: `Person ${i}`, phone: `900000000${i}`, lastUpdated: '2026-01-01T00:00:00.000Z' })
    )
    render(<ContactSearchInput contacts={manyContacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'person')
    expect(screen.getAllByRole('option')).toHaveLength(10)
  })

  it('calls onSelect and clears the input when a suggestion is clicked', async () => {
    const onSelect = vi.fn()
    render(<ContactSearchInput contacts={contacts} onSelect={onSelect} />)

    await userEvent.setup().type(screen.getByRole('textbox'), 'alice')
    fireEvent.mouseDown(screen.getByRole('option'))

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Alice Kumar' }))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('closes the dropdown after selection', async () => {
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await userEvent.setup().type(screen.getByRole('textbox'), 'alice')
    fireEvent.mouseDown(screen.getByRole('option'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes dropdown on Escape key', async () => {
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'alice')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('selects highlighted item with Enter key', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[ALICE]} onSelect={onSelect} />)

    await user.type(screen.getByRole('textbox'), 'alice')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('does not call onSelect when Enter is pressed without navigating', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[ALICE]} onSelect={onSelect} />)

    await user.type(screen.getByRole('textbox'), 'alice{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
  })

  // ── onQueryChange ────────────────────────────────────────────────────────

  it('calls onQueryChange with the current text on every keystroke', async () => {
    const onQueryChange = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} onQueryChange={onQueryChange} />)

    await user.type(screen.getByRole('textbox'), 'ali')
    expect(onQueryChange).toHaveBeenCalledWith('a')
    expect(onQueryChange).toHaveBeenCalledWith('al')
    expect(onQueryChange).toHaveBeenCalledWith('ali')
  })

  it('calls onQueryChange with an empty string when a contact is selected', async () => {
    const onQueryChange = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[ALICE]} onSelect={vi.fn()} onQueryChange={onQueryChange} />)

    await user.type(screen.getByRole('textbox'), 'alice')
    onQueryChange.mockClear()
    fireEvent.mouseDown(screen.getByRole('option'))
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  // ── onRawAdd ─────────────────────────────────────────────────────────────

  it('calls onRawAdd and clears the input when Enter is pressed with no highlighted suggestion', async () => {
    const onRawAdd = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[]} onSelect={vi.fn()} onRawAdd={onRawAdd} />)

    await user.type(screen.getByRole('textbox'), '9999999999{Enter}')
    expect(onRawAdd).toHaveBeenCalledWith('9999999999')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('calls onRawAdd when Enter is pressed while dropdown is closed (query present, no nav)', async () => {
    const onRawAdd = vi.fn()
    const user = userEvent.setup()
    // Contacts provided but no match — dropdown stays closed
    render(<ContactSearchInput contacts={contacts} onSelect={vi.fn()} onRawAdd={onRawAdd} />)

    await user.type(screen.getByRole('textbox'), '0000000000{Enter}')
    expect(onRawAdd).toHaveBeenCalledWith('0000000000')
  })

  it('does not call onRawAdd when Enter is pressed with a highlighted dropdown item', async () => {
    const onSelect = vi.fn()
    const onRawAdd = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[ALICE]} onSelect={onSelect} onRawAdd={onRawAdd} />)

    await user.type(screen.getByRole('textbox'), 'alice')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(onRawAdd).not.toHaveBeenCalled()
  })

  it('does not call onRawAdd when Enter is pressed with empty input', async () => {
    const onRawAdd = vi.fn()
    const user = userEvent.setup()
    render(<ContactSearchInput contacts={[]} onSelect={vi.fn()} onRawAdd={onRawAdd} />)

    await user.keyboard('{Enter}')
    expect(onRawAdd).not.toHaveBeenCalled()
  })
})
