import { describe, expect, it, vi } from 'vitest'

import { CSVService } from './CSVService'
import { makeContact } from './__tests__/fixtures'

describe('CSVService', () => {
  it('places new and merged imported contacts at the top in import order', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

    const existingContacts = [
      makeContact({ id: 1, name: 'Ravi', phone: '1111111111', selected: false }),
      makeContact({ id: 2, name: 'Priya', phone: '2222222222', selected: false }),
      makeContact({ id: 3, name: 'Nagaraj', phone: '3333333333', selected: true })
    ]
    const csv = [
      'name,phone',
      'Updated Priya, 2222222222',
      'New Person, 4444444444',
      'Updated Ravi, 111-111-1111'
    ].join('\n')

    const result = CSVService.importCSV(csv, existingContacts)

    expect(result.slice(0, 3)).toEqual([
      expect.objectContaining({ id: 2, name: 'Updated Priya', selected: true, importOrder: 0 }),
      expect.objectContaining({ name: 'New Person', phone: '4444444444', selected: true, importOrder: 1 }),
      expect.objectContaining({ id: 1, name: 'Updated Ravi', selected: true, importOrder: 2 })
    ])
    expect(result[3]).toMatchObject({ id: 3, name: 'Nagaraj' })
    expect(result[3].importOrder).toBeUndefined()

    vi.useRealTimers()
  })

  it('ignores blank and malformed csv rows', () => {
    const existingContacts = [makeContact({ id: 1, name: 'Ravi', phone: '1111111111' })]
    const csv = ['name,phone', '', 'OnlyName', '  ', 'Priya,2222222222'].join('\n')

    const result = CSVService.importCSV(csv, existingContacts)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: 'Priya', phone: '2222222222' })
    expect(result[1]).toMatchObject({ id: 1, name: 'Ravi' })
  })

  describe('Error Handling & Edge Cases', () => {
    it('handles empty CSV file', () => {
      const existingContacts = [makeContact({ id: 1, name: 'Ravi', phone: '1111111111' })]
      const csv = 'name,phone'

      const result = CSVService.importCSV(csv, existingContacts)

      expect(result).toEqual(existingContacts)
    })

    it('handles CSV with only headers', () => {
      const existingContacts = [makeContact({ id: 1 })]
      const csv = 'name,phone\n'

      const result = CSVService.importCSV(csv, existingContacts)

      expect(result).toEqual(existingContacts)
    })

    it('normalizes phone numbers before matching', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

      const existingContacts = [
        makeContact({ id: 1, name: 'Ravi', phone: '(111) 111-1111' })
      ]
      const csv = ['name,phone', 'Updated Ravi, 1111111111'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      expect(result[0]).toMatchObject({ id: 1, name: 'Updated Ravi' })

      vi.useRealTimers()
    })

    it('handles missing name field in CSV row', () => {
      const existingContacts: any[] = []
      const csv = ['name,phone', ',1111111111', 'Alice,2222222222'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      // Should only import valid rows
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Alice')
    })

    it('handles missing phone field in CSV row', () => {
      const existingContacts: any[] = []
      const csv = ['name,phone', 'Alice,', 'Bob,2222222222'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      // Should only import valid rows with phone
      expect(result.some(c => c.name === 'Alice')).toBe(false)
      expect(result.some(c => c.name === 'Bob')).toBe(true)
    })

    it('handles duplicate entries in CSV', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

      const existingContacts: any[] = []
      const csv = ['name,phone', 'Alice,1111111111', 'Alice Updated,1111111111'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      // Both entries may be preserved by the CSVService
      const aliceContacts = result.filter(c => c.phone === '1111111111')
      expect(aliceContacts.length).toBeGreaterThanOrEqual(1)

      vi.useRealTimers()
    })

    it('preserves unmodified contacts', () => {
      const unmodified = makeContact({ id: 3, name: 'Charlie', phone: '3333333333' })
      const existingContacts = [
        makeContact({ id: 1, name: 'Ravi', phone: '1111111111' }),
        unmodified
      ]
      const csv = ['name,phone', 'Updated Ravi,1111111111'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      const charlie = result.find(c => c.id === 3)
      expect(charlie?.name).toBe('Charlie')
      expect(charlie?.phone).toBe('3333333333')
    })

    it('marks all imported contacts as selected', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

      const existingContacts: any[] = []
      const csv = ['name,phone', 'Alice,1111111111', 'Bob,2222222222'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      expect(result[0].selected).toBe(true)
      expect(result[1].selected).toBe(true)

      vi.useRealTimers()
    })

    it('sets correct import order for multiple contacts', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

      const existingContacts: any[] = []
      const csv = ['name,phone', 'Alice,1111111111', 'Bob,2222222222', 'Charlie,3333333333'].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      expect(result[0].importOrder).toBe(0)
      expect(result[1].importOrder).toBe(1)
      expect(result[2].importOrder).toBe(2)

      vi.useRealTimers()
    })

    it('handles whitespace in CSV fields', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-30T14:30:00.000Z'))

      const existingContacts: any[] = []
      const csv = ['name,phone', '  Alice  ,  1111111111  '].join('\n')

      const result = CSVService.importCSV(csv, existingContacts)

      // Should trim whitespace
      expect(result[0].name).toBe('Alice')
      expect(result[0].phone).toBe('1111111111')

      vi.useRealTimers()
    })
  })
})