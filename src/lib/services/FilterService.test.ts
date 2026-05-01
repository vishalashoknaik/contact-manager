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

    it('filters by gender exact match', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
        makeContact({ id: 2, name: 'Bob', gender: 'Male', phone: '222' }),
        makeContact({ id: 3, name: 'Charlie', gender: 'Other', phone: '333' })
      ]

      const femaleFilter = makeFilters({ genderFilter: 'Female' })
      const resultFemale = FilterService.filterContacts(contacts, femaleFilter, [], [], [])
      expect(resultFemale).toEqual([contacts[0]])

      const maleFilter = makeFilters({ genderFilter: 'Male' })
      const resultMale = FilterService.filterContacts(contacts, maleFilter, [], [], [])
      expect(resultMale).toEqual([contacts[1]])

      const otherFilter = makeFilters({ genderFilter: 'Other' })
      const resultOther = FilterService.filterContacts(contacts, otherFilter, [], [], [])
      expect(resultOther).toEqual([contacts[2]])
    })

    it('filters by area of stay case-insensitively', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice', areaOfStay: 'Downtown' }),
        makeContact({ id: 2, name: 'Bob', areaOfStay: 'Uptown', phone: '222' }),
        makeContact({ id: 3, name: 'Charlie', areaOfStay: 'Midtown', phone: '333' })
      ]

      const filter = makeFilters({ areaOfStayFilter: 'DOWN' })
      const result = FilterService.filterContacts(contacts, filter, [], [], [])
      expect(result).toEqual([contacts[0]])

      const filter2 = makeFilters({ areaOfStayFilter: 'town' })
      const result2 = FilterService.filterContacts(contacts, filter2, [], [], [])
      expect(result2).toHaveLength(3) // All contain "town"
    })

    it('handles contacts with missing optional fields in filters', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice', areaOfStay: 'Downtown' }),
        makeContact({ id: 2, name: 'Bob', areaOfStay: undefined, phone: '222' }),
        makeContact({ id: 3, name: 'Charlie', gender: 'Female', phone: '333' })
      ]

      const areaFilter = makeFilters({ areaOfStayFilter: 'Downtown' })
      const resultArea = FilterService.filterContacts(contacts, areaFilter, [], [], [])
      expect(resultArea).toEqual([contacts[0]])

      const genderFilter = makeFilters({ genderFilter: 'Female' })
      const resultGender = FilterService.filterContacts(contacts, genderFilter, [], [], [])
      expect(resultGender).toEqual([contacts[2]])
    })

    it('sorts by gender alphabetically', () => {
      const contacts = [
        makeContact({ id: 1, gender: 'Other' }),
        makeContact({ id: 2, gender: 'Female', phone: '222' }),
        makeContact({ id: 3, gender: 'Male', phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'gender', direction: 'asc' },
        []
      )

      expect(result.map(c => c.gender)).toEqual(['Female', 'Male', 'Other'])
    })

    it('sorts by ieDate alphabetically as free text', () => {
      const contacts = [
        makeContact({ id: 1, ieDate: 'Week 3' }),
        makeContact({ id: 2, ieDate: 'Week 10', phone: '222' }),
        makeContact({ id: 3, ieDate: 'Week 1', phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'ieDate', direction: 'asc' },
        []
      )

      expect(result.map(c => c.id)).toEqual([3, 2, 1])
    })

    it('sorts by areaOfStay alphabetically', () => {
      const contacts = [
        makeContact({ id: 1, areaOfStay: 'Uptown' }),
        makeContact({ id: 2, areaOfStay: 'Downtown', phone: '222' }),
        makeContact({ id: 3, areaOfStay: 'Midtown', phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'areaOfStay', direction: 'asc' },
        []
      )

      expect(result.map(c => c.areaOfStay)).toEqual(['Downtown', 'Midtown', 'Uptown'])
    })

    it('combines gender and areaOfStay filters', () => {
      const contacts = [
        makeContact({ id: 1, gender: 'Female', areaOfStay: 'Downtown' }),
        makeContact({ id: 2, gender: 'Female', areaOfStay: 'Uptown', phone: '222' }),
        makeContact({ id: 3, gender: 'Male', areaOfStay: 'Downtown', phone: '333' })
      ]

      const filters = makeFilters({
        genderFilter: 'Female',
        areaOfStayFilter: 'Down'
      })

      const result = FilterService.filterContacts(contacts, filters, [], [], [])
      expect(result).toEqual([contacts[0]])
    })

    it('handles empty string area of stay field', () => {
      const contacts = [
        makeContact({ id: 1, areaOfStay: '' }),
        makeContact({ id: 2, areaOfStay: 'Downtown', phone: '222' })
      ]

      const filter = makeFilters({ areaOfStayFilter: 'Down' })
      const result = FilterService.filterContacts(contacts, filter, [], [], [])
      expect(result).toEqual([contacts[1]])
    })

    it('preserves selected contacts at top when sorting by gender', () => {
      const contacts = [
        makeContact({ id: 1, gender: 'Male', selected: true }),
        makeContact({ id: 2, gender: 'Female', phone: '222', selected: false }),
        makeContact({ id: 3, gender: 'Female', phone: '333', selected: true })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'gender', direction: 'asc' },
        []
      )

      // Selected contacts (1, 3) should be first
      expect(result[0].selected).toBe(true)
      expect(result[1].selected).toBe(true)
      expect(result[2].selected).toBe(false)
    })

    it('handles gender sort with null/undefined values', () => {
      const contacts = [
        makeContact({ id: 1, gender: 'Female' }),
        makeContact({ id: 2, gender: 'Male', phone: '222' }),
        makeContact({ id: 3, gender: undefined, phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'gender', direction: 'asc' },
        []
      )

      // Should handle gracefully - undefined values typically sort to end
      expect(result.map(c => c.id)).toBeDefined()
      expect(result.length).toBe(3)
    })

    it('handles ieDate sort with null/undefined values', () => {
      const contacts = [
        makeContact({ id: 1, ieDate: '2026-05-01' }),
        makeContact({ id: 2, ieDate: undefined, phone: '222' }),
        makeContact({ id: 3, ieDate: '2026-01-01', phone: '333' })
      ]

      const result = FilterService.sortContacts(
        contacts,
        { key: 'ieDate', direction: 'asc' },
        []
      )

      // Should handle gracefully
      expect(result.map(c => c.id)).toBeDefined()
      expect(result.length).toBe(3)
    })
  })
})