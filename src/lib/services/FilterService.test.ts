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

  it('keeps selected contacts at the top before applying normal sort order', () => {
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

  describe('Error Handling & Edge Cases', () => {
    it('handles empty contact list', () => {
      const filters = makeFilters({ nameFilter: 'test' })

      const result = FilterService.filterContacts([], filters, [], [], [])

      expect(result).toEqual([])
    })

    it('handles no matching filters', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice' }),
        makeContact({ id: 2, name: 'Bob', phone: '222' })
      ]

      const filters = makeFilters({
        nameFilter: '',
        phoneFilter: '',
        totalFilter: '',
        dateFilter: ''
      })

      const result = FilterService.filterContacts(
        contacts,
        filters,
        [],
        [],
        []
      )

      expect(result).toEqual(contacts)
    })

    it('handles case-insensitive name filtering', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice' }),
        makeContact({ id: 2, name: 'alice2', phone: '222' })
      ]

      const filters = makeFilters({ nameFilter: 'ALICE' })

      const result = FilterService.filterContacts(
        contacts,
        filters,
        [],
        [],
        []
      )

      expect(result).toHaveLength(2)
    })

    it('handles partial phone number filtering', () => {
      const contacts = [
        makeContact({ id: 1, phone: '1234567890' }),
        makeContact({ id: 2, phone: '9876543210', name: 'Bob' })
      ]

      const filters = makeFilters({ phoneFilter: '123' })

      const result = FilterService.filterContacts(
        contacts,
        filters,
        [],
        [],
        []
      )

      expect(result).toEqual([contacts[0]])
    })

    it('handles sorting by different keys', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Charlie' }),
        makeContact({ id: 2, name: 'Alice', phone: '222' }),
        makeContact({ id: 3, name: 'Bob', phone: '333' })
      ]

      const byName = FilterService.sortContacts(
        contacts,
        { key: 'name', direction: 'asc' },
        []
      )

      expect(byName.map(c => c.name)).toEqual(['Alice', 'Bob', 'Charlie'])

      const byPhone = FilterService.sortContacts(
        contacts,
        { key: 'phone', direction: 'asc' },
        []
      )

      expect(byPhone[0].phone).toBe('111-222-3333')

      const byUpdated = FilterService.sortContacts(
        [
          makeContact({ id: 1, lastUpdated: '2026-04-01T00:00:00.000Z' }),
          makeContact({ id: 2, phone: '222', lastUpdated: '2026-05-01T00:00:00.000Z' })
        ],
        { key: 'lastUpdated', direction: 'desc' },
        []
      )

      expect(byUpdated[0].id).toBe(2)

      const byActivity = FilterService.sortContacts(
        [
          makeContact({ id: 1, activities: { Walkathon: 1 } }),
          makeContact({ id: 2, phone: '222', activities: { Walkathon: 3 } })
        ],
        { key: 'Walkathon', direction: 'desc' },
        ['Walkathon']
      )

      expect(byActivity[0].id).toBe(2)

      const byArea = FilterService.sortContacts(
        [
          makeContact({ id: 1, areas: { Area1: 1 } }),
          makeContact({ id: 2, phone: '222', areas: { Area1: 3 } })
        ],
        { key: 'Area1', direction: 'desc' },
        [],
        ['Area1']
      )

      expect(byArea[0].id).toBe(2)

      const byProgram = FilterService.sortContacts(
        [
          makeContact({ id: 1, programs: { Program1: 1 } }),
          makeContact({ id: 2, phone: '222', programs: { Program1: 3 } })
        ],
        { key: 'Program1', direction: 'desc' },
        [],
        [],
        ['Program1']
      )

      expect(byProgram[0].id).toBe(2)
    })

    it('handles descending sort order', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice' }),
        makeContact({ id: 2, name: 'Bob', phone: '222' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'name', direction: 'desc' },
        []
      )

      expect(result[0].name).toBe('Bob')
      expect(result[1].name).toBe('Alice')
    })

    it('handles numeric threshold filtering', () => {
      const contacts = [
        makeContact({
          id: 1,
          activities: { Walkathon: 5 },
          areas: { Area1: 3 },
          programs: { Program1: 2 }
        }),
        makeContact({
          id: 2,
          activities: { Walkathon: 1 },
          areas: { Area1: 0 },
          programs: { Program1: 0 },
          phone: '222'
        })
      ]

      const filters = makeFilters({
        activityFilters: { Walkathon: '3' },
        areaFilters: { Area1: '1' }
      })

      const result = FilterService.filterContacts(
        contacts,
        filters,
        ['Walkathon'],
        ['Area1'],
        []
      )

      expect(result).toEqual([contacts[0]])
    })

    it('handles date filtering', () => {
      const contacts = [
        makeContact({
          id: 1,
          lastUpdated: '2026-05-01T00:00:00.000Z'
        }),
        makeContact({
          id: 2,
          lastUpdated: '2026-04-01T00:00:00.000Z',
          phone: '222'
        })
      ]

      const filters = makeFilters({ dateFilter: '2026-04-15' })

      const result = FilterService.filterContacts(
        contacts,
        filters,
        [],
        [],
        []
      )

      expect(result).toEqual([contacts[0]])
    })

    it('sorts by key when contacts are not selected', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alpha' }),
        makeContact({ id: 2, name: 'Beta', importOrder: 0, phone: '222' }),
        makeContact({ id: 3, name: 'Gamma', phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'name', direction: 'asc' },
        []
      )

      expect(result.map(c => c.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    })
  })
})