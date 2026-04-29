import { describe, expect, it } from 'vitest'

import { PhoneService } from './PhoneService'
import { makeContact } from './__tests__/fixtures'

describe('PhoneService', () => {
  it('normalizes phone numbers and matches equivalent forms', () => {
    expect(PhoneService.normalize('(987) 654-3210')).toBe('9876543210')
    expect(PhoneService.areEquivalent('(987) 654-3210', '9876543210')).toBe(true)
  })

  it('finds a contact by normalized phone number', () => {
    const contacts = [
      makeContact({ id: 1, phone: '(111) 222-3333' }),
      makeContact({ id: 2, phone: '4445556666' })
    ]

    expect(PhoneService.findByPhone(contacts, '1112223333')).toMatchObject({ id: 1 })
    expect(PhoneService.findByPhone(contacts, '999')).toBeUndefined()
  })
})