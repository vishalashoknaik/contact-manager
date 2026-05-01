import { describe, expect, it, vi } from 'vitest'

import { ContactService } from './contactService'
import { makeContact } from './__tests__/fixtures'

describe('ContactService', () => {
  it('adds a new contact to the top of the list', () => {
    const contacts = [makeContact({ id: 1, name: 'Ravi', phone: '9876543210' })]

    const result = ContactService.addOrUpdateContact(contacts, 'Priya', '9988776655')

    expect(result.isNew).toBe(true)
    expect(result.contacts).toHaveLength(2)
    expect(result.contacts[0]).toMatchObject({
      name: 'Priya',
      phone: '9988776655',
      selected: true
    })
  })

  it('updates an existing contact by normalized phone and marks it selected', () => {
    const contacts = [makeContact({ id: 10, name: 'Old Name', phone: '(987) 654-3210', selected: false })]

    const result = ContactService.addOrUpdateContact(contacts, 'Ravi Kumar', '9876543210')

    expect(result.isNew).toBe(false)
    expect(result.contacts).toEqual([
      expect.objectContaining({
        id: 10,
        name: 'Ravi Kumar',
        phone: '(987) 654-3210',
        selected: true
      })
    ])
  })

  it('increments selected contacts only for chosen categories', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-30T12:00:00.000Z'))

    const contacts = [
      makeContact({
        id: 1,
        selected: true,
        activities: { Walkathon: 1 },
        areas: { Area1: 0 },
        programs: { Program1: 2 }
      }),
      makeContact({ id: 2, name: 'Priya', phone: '999', selected: false })
    ]

    const result = ContactService.incrementSelected(contacts, 'Walkathon', 'Area1', '')

    expect(result[0]).toMatchObject({
      activities: { Walkathon: 2 },
      areas: { Area1: 1 },
      programs: { Program1: 2 },
      lastUpdated: '2026-04-30T12:00:00.000Z'
    })
    expect(result[1]).toEqual(contacts[1])

    vi.useRealTimers()
  })

  it('toggles all contacts based on current selection state', () => {
    const contacts = [
      makeContact({ id: 1, selected: false }),
      makeContact({ id: 2, phone: '222', selected: true })
    ]

    expect(ContactService.toggleSelectAll(contacts).every(contact => contact.selected)).toBe(true)

    const allSelected = contacts.map(contact => ({ ...contact, selected: true }))
    expect(ContactService.toggleSelectAll(allSelected).every(contact => !contact.selected)).toBe(true)
  })

  describe('Error Handling & Edge Cases', () => {
    it('handles empty contact list for addOrUpdateContact', () => {
      const contacts: any[] = []

      const result = ContactService.addOrUpdateContact(contacts, 'Alice', '1111111111')

      expect(result.isNew).toBe(true)
      expect(result.contacts).toHaveLength(1)
      expect(result.contacts[0].name).toBe('Alice')
    })

    it('normalizes phone numbers before matching', () => {
      const contacts = [makeContact({ id: 1, phone: '(111) 222-3333' })]

      const result = ContactService.addOrUpdateContact(contacts, 'Bob', '1112223333')

      expect(result.isNew).toBe(false)
      expect(result.contacts).toHaveLength(1)
    })

    it('handles incrementSelected with unselected contacts', () => {
      const contacts = [
        makeContact({ id: 1, selected: false, activities: { Walkathon: 1 } }),
        makeContact({ id: 2, selected: true, activities: { Walkathon: 1 } })
      ]

      const result = ContactService.incrementSelected(contacts, 'Walkathon', '', '')

      expect(result[0].activities.Walkathon).toBe(1) // Not incremented
      expect(result[1].activities.Walkathon).toBe(2) // Incremented
    })

    it('does not increment activities not selected', () => {
      const contacts = [makeContact({ id: 1, selected: true, activities: { Walkathon: 1, Cleanup: 2 } })]

      const result = ContactService.incrementSelected(contacts, 'Walkathon', '', '')

      expect(result[0].activities.Walkathon).toBe(2)
      expect(result[0].activities.Cleanup).toBe(2) // Unchanged
    })

    it('handles toggleSelectAll with single contact', () => {
      const contacts = [makeContact({ id: 1, selected: false })]

      const result = ContactService.toggleSelectAll(contacts)

      expect(result[0].selected).toBe(true)
    })

    it('returns empty array for incrementSelected on empty list', () => {
      const contacts: any[] = []

      const result = ContactService.incrementSelected(contacts, 'Walkathon', '', '')

      expect(result).toEqual([])
    })

    it('creates new contact with current timestamp', () => {
      vi.useFakeTimers()
      const now = new Date('2026-04-30T14:30:00.000Z')
      vi.setSystemTime(now)

      const contacts: any[] = []
      const result = ContactService.addOrUpdateContact(contacts, 'Alice', '1111111111')

      expect(result.contacts[0].lastUpdated).toBe(now.toISOString())

      vi.useRealTimers()
    })

    it('preserves non-selected categories when incrementing', () => {
      const contacts = [
        makeContact({
          id: 1,
          selected: true,
          activities: { Walkathon: 1 },
          areas: { Area1: 2 },
          programs: { Program1: 3 }
        })
      ]

      const result = ContactService.incrementSelected(contacts, 'Walkathon', '', '')

      expect(result[0].areas.Area1).toBe(2)
      expect(result[0].programs.Program1).toBe(3)
    })

    it('handles contacts with missing category objects', () => {
      const contact = makeContact({ id: 1, selected: true })
      contact.activities = undefined as any
      contact.areas = undefined as any
      contact.programs = undefined as any

      const result = ContactService.incrementSelected([contact], 'Walkathon', '', '')

      // Should not crash
      expect(result).toHaveLength(1)
    })

    it('maintains contact order after addOrUpdateContact', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice' }),
        makeContact({ id: 2, name: 'Bob', phone: '222' }),
        makeContact({ id: 3, name: 'Charlie', phone: '333' })
      ]

      const result = ContactService.addOrUpdateContact(contacts, 'Diana', '444')

      expect(result.contacts[0].name).toBe('Diana') // New at top
      expect(result.contacts[1].name).toBe('Alice')
      expect(result.contacts[2].name).toBe('Bob')
      expect(result.contacts[3].name).toBe('Charlie')
    })

    it('updateContact updates name while preserving phone', () => {
      const contacts = [
        makeContact({
          id: 1,
          name: 'Alice',
          phone: '1111111111',
          activities: { Walkathon: 5 }
        })
      ]

      const result = ContactService.addOrUpdateContact(contacts, 'Alice Updated', '1111111111')

      expect(result.isNew).toBe(false)
      expect(result.contacts[0].name).toBe('Alice Updated')
      expect(result.contacts[0].phone).toBe('1111111111')
      expect(result.contacts[0].activities.Walkathon).toBe(5)
    })
  })
})