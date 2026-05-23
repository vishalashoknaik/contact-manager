/**
 * FilterService edge case tests
 * Covers the filtering and sorting branches NOT exercised in FilterService.test.ts:
 *   - genderFilter
 *   - areaOfStayFilter
 *   - descending sort (name, phone, total, date)
 *   - sort by phone, total, lastUpdated
 *   - sort by dynamic activity / area / program column key
 *   - selected contacts stay pinned on top even with descending sort
 */
import { describe, expect, it } from 'vitest'

import { FilterService } from './FilterService'
import { makeContact, makeFilters } from './__tests__/fixtures'

// ── genderFilter ─────────────────────────────────────────────────────────────
describe('FilterService — genderFilter', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
    makeContact({ id: 2, name: 'Bob',   gender: 'Male',  phone: '222' }),
    makeContact({ id: 3, name: 'Chris', gender: 'Other', phone: '333' })
  ]

  it('returns only female contacts when genderFilter is Female', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ genderFilter: 'Female' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('returns only male contacts when genderFilter is Male', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ genderFilter: 'Male' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })

  it('returns all contacts when genderFilter is empty string', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ genderFilter: '' }), [], [], [])
    expect(result).toHaveLength(3)
  })

  it('returns no contacts when genderFilter matches none', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ genderFilter: 'Unknown' }), [], [], [])
    expect(result).toHaveLength(0)
  })
})

// ── areaOfStayFilter ──────────────────────────────────────────────────────────
describe('FilterService — areaOfStayFilter', () => {
  const contacts = [
    makeContact({ id: 1, name: 'A', areaOfStay: 'HSR Layout' }),
    makeContact({ id: 2, name: 'B', phone: '222', areaOfStay: 'Koramangala' }),
    makeContact({ id: 3, name: 'C', phone: '333', areaOfStay: undefined })
  ]

  it('filters by partial area of stay (case-insensitive)', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ areaOfStayFilter: 'hsr' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('A')
  })

  it('returns all contacts when areaOfStayFilter is empty', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ areaOfStayFilter: '' }), [], [], [])
    expect(result).toHaveLength(3)
  })

  it('excludes contacts with undefined areaOfStay when filter is non-empty', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ areaOfStayFilter: 'kora' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('B')
  })
})

// ── descending sort by name ───────────────────────────────────────────────────
describe('FilterService — sortContacts descending', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Alpha', phone: '100', selected: false, lastUpdated: '2026-01-01T00:00:00.000Z' }),
    makeContact({ id: 2, name: 'Zulu',  phone: '200', selected: false, lastUpdated: '2026-06-01T00:00:00.000Z' }),
    makeContact({ id: 3, name: 'Mike',  phone: '150', selected: false, lastUpdated: '2026-03-01T00:00:00.000Z' })
  ]

  it('sorts by name descending (Z → A)', () => {
    const result = FilterService.sortContacts(contacts, { key: 'name', direction: 'desc' }, [])
    expect(result.map(c => c.name)).toEqual(['Zulu', 'Mike', 'Alpha'])
  })

  it('sorts by phone ascending then descending', () => {
    const asc = FilterService.sortContacts(contacts, { key: 'phone', direction: 'asc' }, [])
    expect(asc.map(c => c.phone)).toEqual(['100', '150', '200'])

    const desc = FilterService.sortContacts(contacts, { key: 'phone', direction: 'desc' }, [])
    expect(desc.map(c => c.phone)).toEqual(['200', '150', '100'])
  })

  it('sorts by lastUpdated ascending then descending', () => {
    const asc = FilterService.sortContacts(contacts, { key: 'lastUpdated', direction: 'asc' }, [])
    expect(asc[0].id).toBe(1) // oldest first
    expect(asc[2].id).toBe(2) // newest last

    const desc = FilterService.sortContacts(contacts, { key: 'lastUpdated', direction: 'desc' }, [])
    expect(desc[0].id).toBe(2) // newest first
    expect(desc[2].id).toBe(1) // oldest last
  })
})

// ── sort by total ─────────────────────────────────────────────────────────────
describe('FilterService — sort by total', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Low',  activities: { Walkathon: 1 }, areas: {}, programs: {} }),
    makeContact({ id: 2, name: 'High', phone: '222', activities: { Walkathon: 10 }, areas: { Area1: 5 }, programs: {} }),
    makeContact({ id: 3, name: 'Mid',  phone: '333', activities: { Walkathon: 3 }, areas: {}, programs: {} })
  ]

  it('sorts by total count ascending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'total', direction: 'asc' }, ['Walkathon'], ['Area1'])
    expect(result.map(c => c.name)).toEqual(['Low', 'Mid', 'High'])
  })

  it('sorts by total count descending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'total', direction: 'desc' }, ['Walkathon'], ['Area1'])
    expect(result.map(c => c.name)).toEqual(['High', 'Mid', 'Low'])
  })
})

// ── sort by dynamic activity / area / program column ─────────────────────────
describe('FilterService — sort by dynamic column key', () => {
  const contacts = [
    makeContact({ id: 1, name: 'A', activities: { Walkathon: 5 }, areas: { North: 2 }, programs: { Yoga: 1 } }),
    makeContact({ id: 2, name: 'B', phone: '222', activities: { Walkathon: 1 }, areas: { North: 8 }, programs: { Yoga: 3 } }),
    makeContact({ id: 3, name: 'C', phone: '333', activities: { Walkathon: 3 }, areas: { North: 0 }, programs: { Yoga: 7 } })
  ]

  it('sorts by activity column ascending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'Walkathon', direction: 'asc' }, ['Walkathon'])
    expect(result.map(c => c.name)).toEqual(['B', 'C', 'A'])
  })

  it('sorts by activity column descending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'Walkathon', direction: 'desc' }, ['Walkathon'])
    expect(result.map(c => c.name)).toEqual(['A', 'C', 'B'])
  })

  it('sorts by area column', () => {
    const result = FilterService.sortContacts(contacts, { key: 'North', direction: 'desc' }, [], ['North'])
    expect(result[0].name).toBe('B') // North: 8
    expect(result[2].name).toBe('C') // North: 0
  })

  it('sorts by program column', () => {
    const result = FilterService.sortContacts(contacts, { key: 'Yoga', direction: 'desc' }, [], [], ['Yoga'])
    expect(result[0].name).toBe('C') // Yoga: 7
    expect(result[2].name).toBe('A') // Yoga: 1
  })

  it('returns stable order for unknown sort key', () => {
    const result = FilterService.sortContacts(contacts, { key: 'nonexistent', direction: 'asc' }, [])
    expect(result).toHaveLength(3)
  })
})

// ── selected contacts stay pinned on top regardless of sort direction ─────────
describe('FilterService — selected contacts always pinned to top', () => {
  it('keeps selected contacts above unselected regardless of descending sort', () => {
    const contacts = [
      makeContact({ id: 1, name: 'Zulu', selected: false }),
      makeContact({ id: 2, name: 'Alpha', phone: '222', selected: true }),
      makeContact({ id: 3, name: 'Beta', phone: '333', selected: false })
    ]

    const result = FilterService.sortContacts(contacts, { key: 'name', direction: 'desc' }, [])
    // selected contact (Alpha) must be first, remaining in desc order (Zulu, Beta)
    expect(result[0].name).toBe('Alpha')
    expect(result[1].name).toBe('Zulu')
    expect(result[2].name).toBe('Beta')
  })

  it('multiple selected contacts sorted among themselves', () => {
    const contacts = [
      makeContact({ id: 1, name: 'Zulu', selected: true }),
      makeContact({ id: 2, name: 'Alpha', phone: '222', selected: true }),
      makeContact({ id: 3, name: 'Mike', phone: '333', selected: false })
    ]

    const result = FilterService.sortContacts(contacts, { key: 'name', direction: 'asc' }, [])
    expect(result[0].name).toBe('Alpha') // selected + alphabetically first
    expect(result[1].name).toBe('Zulu')  // selected + alphabetically second
    expect(result[2].name).toBe('Mike')  // unselected, last
  })
})

// ── combined gender + name filter ────────────────────────────────────────────
describe('FilterService — combined filters', () => {
  it('applies genderFilter and nameFilter together', () => {
    const contacts = [
      makeContact({ id: 1, name: 'Alice', gender: 'Female' }),
      makeContact({ id: 2, name: 'Annie', phone: '222', gender: 'Female' }),
      makeContact({ id: 3, name: 'Bob',   phone: '333', gender: 'Male' })
    ]

    const result = FilterService.filterContacts(
      contacts,
      makeFilters({ genderFilter: 'Female', nameFilter: 'Ali' }),
      [], [], []
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })
})

// ── sort by ieDate ────────────────────────────────────────────────────────────
describe('FilterService — sort by ieDate', () => {
  const contacts = [
    makeContact({ id: 1, name: 'A', phone: '100', ieDate: '2020-01-01' }),
    makeContact({ id: 2, name: 'B', phone: '200', ieDate: '2024-06-15' }),
    makeContact({ id: 3, name: 'C', phone: '300', ieDate: '2018-03-20' })
  ]

  it('sorts by ieDate ascending (oldest IE date first)', () => {
    const result = FilterService.sortContacts(contacts, { key: 'ieDate', direction: 'asc' }, [])
    expect(result.map(c => c.name)).toEqual(['C', 'A', 'B'])
  })

  it('sorts by ieDate descending (newest IE date first)', () => {
    const result = FilterService.sortContacts(contacts, { key: 'ieDate', direction: 'desc' }, [])
    expect(result.map(c => c.name)).toEqual(['B', 'A', 'C'])
  })

  it('puts contacts with undefined ieDate last when sorting ascending', () => {
    const mixed = [
      makeContact({ id: 1, name: 'Has Date', phone: '100', ieDate: '2022-01-01' }),
      makeContact({ id: 2, name: 'No Date', phone: '200', ieDate: undefined })
    ]
    const result = FilterService.sortContacts(mixed, { key: 'ieDate', direction: 'asc' }, [])
    // empty string sorts before '2022-01-01' in localeCompare — undefined becomes ''
    expect(result[0].name).toBe('No Date')
  })
})

// ── sort by areaOfStay ────────────────────────────────────────────────────────
describe('FilterService — sort by areaOfStay', () => {
  const contacts = [
    makeContact({ id: 1, name: 'A', phone: '100', areaOfStay: 'Koramangala' }),
    makeContact({ id: 2, name: 'B', phone: '200', areaOfStay: 'Bellandur' }),
    makeContact({ id: 3, name: 'C', phone: '300', areaOfStay: 'HSR Layout' })
  ]

  it('sorts by areaOfStay ascending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'areaOfStay', direction: 'asc' }, [])
    expect(result.map(c => c.areaOfStay)).toEqual(['Bellandur', 'HSR Layout', 'Koramangala'])
  })

  it('sorts by areaOfStay descending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'areaOfStay', direction: 'desc' }, [])
    expect(result.map(c => c.areaOfStay)).toEqual(['Koramangala', 'HSR Layout', 'Bellandur'])
  })
})

// ── sort by gender ─────────────────────────────────────────────────────────────
describe('FilterService — sort by gender', () => {
  const contacts = [
    makeContact({ id: 1, name: 'A', phone: '100', gender: 'Male' }),
    makeContact({ id: 2, name: 'B', phone: '200', gender: 'Female' }),
    makeContact({ id: 3, name: 'C', phone: '300', gender: 'Other' })
  ]

  it('sorts by gender ascending (Female < Male < Other)', () => {
    const result = FilterService.sortContacts(contacts, { key: 'gender', direction: 'asc' }, [])
    expect(result[0].gender).toBe('Female')
    expect(result[1].gender).toBe('Male')
    expect(result[2].gender).toBe('Other')
  })

  it('sorts by gender descending', () => {
    const result = FilterService.sortContacts(contacts, { key: 'gender', direction: 'desc' }, [])
    expect(result[0].gender).toBe('Other')
    expect(result[2].gender).toBe('Female')
  })
})

// ── totalFilter edge cases ────────────────────────────────────────────────────
describe('FilterService — totalFilter edge cases', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Low',  activities: { Walkathon: 1 } }),
    makeContact({ id: 2, name: 'High', phone: '222', activities: { Walkathon: 5 } }),
    makeContact({ id: 3, name: 'Zero', phone: '333', activities: {} })
  ]

  it('totalFilter \'0\' passes all contacts (every total ≥ 0)', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ totalFilter: '0' }), ['Walkathon'], [], [])
    expect(result).toHaveLength(3)
  })

  it('totalFilter empty string passes all contacts', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ totalFilter: '' }), ['Walkathon'], [], [])
    expect(result).toHaveLength(3)
  })

  it('getTotal counts only activities — areas and programs are excluded', () => {
    // A contact with large areas/programs but no activities should have total=0
    const richContact = makeContact({
      id: 4,
      phone: '444',
      activities: {},
      areas: { North: 10 },
      programs: { Yoga: 8 }
    })
    const result = FilterService.filterContacts([richContact], makeFilters({ totalFilter: '1' }), [], ['North'], ['Yoga'])
    expect(result).toHaveLength(0) // totalFilter sees total=0, which is < 1
  })

  it('dateFilter with a date far in the past passes all contacts', () => {
    const result = FilterService.filterContacts(
      contacts,
      makeFilters({ dateFilter: '2000-01-01' }),
      [], [], []
    )
    expect(result).toHaveLength(3)
  })

  it('dateFilter with a future date excludes all contacts', () => {
    const result = FilterService.filterContacts(
      contacts,
      makeFilters({ dateFilter: '2099-12-31' }),
      [], [], []
    )
    expect(result).toHaveLength(0)
  })

  describe('Interest filtering and sorting', () => {
    const interestContacts = [
      makeContact({ id: 1, name: 'Alice', interests: { Yoga: 5, Meditation: 1 } }),
      makeContact({ id: 2, name: 'Bob', phone: '222', interests: { Yoga: 2 } }),
      makeContact({ id: 3, name: 'Carol', phone: '333', interests: {} })
    ]

    it('filterContacts by interest minimum threshold returns contacts at or above the value', () => {
      // threshold '4' means contactValue >= 4
      const filters = makeFilters({ interestFilters: { Yoga: '4' } })
      const result = FilterService.filterContacts(interestContacts, filters, [], [], [], ['Yoga', 'Meditation'])
      expect(result.map(c => c.name)).toEqual(['Alice'])
    })

    it('filterContacts by interest threshold 2 returns contacts with at least 2', () => {
      const filters = makeFilters({ interestFilters: { Yoga: '2' } })
      const result = FilterService.filterContacts(interestContacts, filters, [], [], [], ['Yoga'])
      expect(result.map(c => c.name)).toEqual(expect.arrayContaining(['Alice', 'Bob']))
      expect(result).toHaveLength(2)
    })

    it('filterContacts with empty interestFilters returns all contacts', () => {
      const filters = makeFilters({ interestFilters: {} })
      const result = FilterService.filterContacts(interestContacts, filters, [], [], [], ['Yoga'])
      expect(result).toHaveLength(3)
    })

    it('sortContacts by interest key sorts descending by count', () => {
      const result = FilterService.sortContacts(
        interestContacts,
        { key: 'Yoga', direction: 'desc' },
        [], [], [], ['Yoga', 'Meditation']
      )
      expect(result[0].name).toBe('Alice') // Yoga: 5
      expect(result[1].name).toBe('Bob')   // Yoga: 2
      expect(result[2].name).toBe('Carol') // Yoga: 0
    })

    it('sortContacts by interest key ascending', () => {
      const result = FilterService.sortContacts(
        interestContacts,
        { key: 'Yoga', direction: 'asc' },
        [], [], [], ['Yoga']
      )
      expect(result[0].name).toBe('Carol') // 0
      expect(result[2].name).toBe('Alice') // 5
    })

    it('contact with missing interests property counts as 0 in interest filter', () => {
      const noInterests = makeContact({ id: 4, name: 'Dave', phone: '444' })
      const filters = makeFilters({ interestFilters: { Yoga: '1' } })
      const result = FilterService.filterContacts([noInterests], filters, [], [], [], ['Yoga'])
      expect(result).toHaveLength(0)
    })
  })
})

// -- Boolean campaign-flag filters ---------------------------------------------
describe('FilterService � notInterestedFilter', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Alice', phone: '111', notInterested: true }),
    makeContact({ id: 2, name: 'Bob',   phone: '222', notInterested: false }),
    makeContact({ id: 3, name: 'Carol', phone: '333' }) // undefined ? treated as false
  ]

  it('returns only notInterested=true when filter is "true"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ notInterestedFilter: 'true' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('returns contacts where notInterested is false/undefined when filter is "false"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ notInterestedFilter: 'false' }), [], [], [])
    expect(result).toHaveLength(2)
    expect(result.map(c => c.name)).toContain('Bob')
    expect(result.map(c => c.name)).toContain('Carol')
  })

  it('returns all contacts when notInterestedFilter is empty', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ notInterestedFilter: '' }), [], [], [])
    expect(result).toHaveLength(3)
  })
})

describe('FilterService � centerChangeFilter', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Alice', phone: '111', centerChange: true }),
    makeContact({ id: 2, name: 'Bob',   phone: '222', centerChange: false })
  ]

  it('returns only centerChange=true when filter is "true"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ centerChangeFilter: 'true' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('returns only centerChange=false when filter is "false"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ centerChangeFilter: 'false' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })

  it('returns all when centerChangeFilter is empty', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ centerChangeFilter: '' }), [], [], [])
    expect(result).toHaveLength(2)
  })
})

describe('FilterService � doNotDisturbFilter', () => {
  const contacts = [
    makeContact({ id: 1, name: 'Alice', phone: '111', doNotDisturb: true }),
    makeContact({ id: 2, name: 'Bob',   phone: '222', doNotDisturb: false }),
    makeContact({ id: 3, name: 'Carol', phone: '333', doNotDisturb: true })
  ]

  it('returns all DND contacts when filter is "true"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ doNotDisturbFilter: 'true' }), [], [], [])
    expect(result).toHaveLength(2)
    expect(result.map(c => c.name).sort()).toEqual(['Alice', 'Carol'])
  })

  it('returns non-DND contacts when filter is "false"', () => {
    const result = FilterService.filterContacts(contacts, makeFilters({ doNotDisturbFilter: 'false' }), [], [], [])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })

  it('can combine doNotDisturbFilter with notInterestedFilter', () => {
    const mixed = [
      makeContact({ id: 1, phone: '111', doNotDisturb: true, notInterested: true }),
      makeContact({ id: 2, phone: '222', doNotDisturb: true, notInterested: false }),
      makeContact({ id: 3, phone: '333', doNotDisturb: false, notInterested: true })
    ]
    const result = FilterService.filterContacts(
      mixed,
      makeFilters({ doNotDisturbFilter: 'true', notInterestedFilter: 'true' }),
      [], [], []
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })
})
