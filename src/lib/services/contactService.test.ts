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
})