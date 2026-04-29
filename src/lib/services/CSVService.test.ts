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
})