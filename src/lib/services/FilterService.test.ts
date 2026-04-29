import { describe, expect, it } from 'vitest'

import { FilterService } from './FilterService'
import { makeContact, makeFilters } from './__tests__/fixtures'

describe('FilterService', () => {
  it('filters contacts by name, phone, totals, date, and category thresholds', () => {
    const contacts = [
      makeContact({
        id: 1,
        name: 'Ravi',
        phone: '9991112222',
        activities: { Walkathon: 3 },
        areas: { Area1: 2 },
        programs: { Program1: 1 },
        lastUpdated: '2026-05-01T00:00:00.000Z'
      }),
      makeContact({
        id: 2,
        name: 'Priya',
        phone: '1231231234',
        activities: { Walkathon: 1 },
        areas: { Area1: 0 },
        programs: { Program1: 0 },
        lastUpdated: '2026-04-01T00:00:00.000Z'
      })
    ]

    const filters = makeFilters({
      nameFilter: 'rav',
      phoneFilter: '999',
      totalFilter: '3',
      dateFilter: '2026-04-15',
      activityFilters: { Walkathon: '2' },
      areaFilters: { Area1: '1' },
      programFilters: { Program1: '1' }
    })

    const result = FilterService.filterContacts(
      contacts,
      filters,
      ['Walkathon'],
      ['Area1'],
      ['Program1']
    )

    expect(result).toEqual([contacts[0]])
  })

  it('keeps imported contacts at the top before applying normal sort order', () => {
    const contacts = [
      makeContact({ id: 1, name: 'Zulu', importOrder: 1, selected: true }),
      makeContact({ id: 2, name: 'Alpha', selected: false }),
      makeContact({ id: 3, name: 'Beta', importOrder: 0, selected: true })
    ]

    const result = FilterService.sortContacts(
      contacts,
      { key: 'name', direction: 'asc' },
      ['Walkathon']
    )

    expect(result.map(contact => contact.id)).toEqual([3, 1, 2])
  })
})