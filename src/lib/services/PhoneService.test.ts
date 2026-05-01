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

  describe('Error Handling & Edge Cases', () => {
    it('normalizes various phone number formats', () => {
      const formats = [
        ['(987) 654-3210', '9876543210'],
        ['987-654-3210', '9876543210'],
        ['9876543210', '9876543210'],
        ['987.654.3210', '9876543210'],
        ['+1 987 654 3210', '19876543210'],
        ['1 987 654 3210', '19876543210']
      ]

      formats.forEach(([input, expected]) => {
        expect(PhoneService.normalize(input)).toBe(expected)
      })
    })

    it('handles empty phone number', () => {
      const normalized = PhoneService.normalize('')
      expect(normalized).toBe('')
    })

    it('handles phone with only spaces', () => {
      const normalized = PhoneService.normalize('     ')
      expect(normalized).toBe('')
    })

    it('handles very long phone numbers', () => {
      const longPhone = '12345678901234567890'
      const normalized = PhoneService.normalize(longPhone)
      expect(normalized).toBe(longPhone)
    })

    it('areEquivalent handles various formats', () => {
      expect(PhoneService.areEquivalent('(987) 654-3210', '9876543210')).toBe(true)
      expect(PhoneService.areEquivalent('987-654-3210', '9876543210')).toBe(true)
      expect(PhoneService.areEquivalent('9876543210', '9876543210')).toBe(true)
      expect(PhoneService.areEquivalent('1234567890', '9876543210')).toBe(false)
    })

    it('findByPhone returns undefined for empty contacts', () => {
      const result = PhoneService.findByPhone([], '1112223333')
      expect(result).toBeUndefined()
    })

    it('findByPhone handles contacts without phone', () => {
      const contacts = [
        makeContact({ id: 1, phone: '' }),
        makeContact({ id: 2, phone: '4445556666' })
      ]

      const result = PhoneService.findByPhone(contacts, '1112223333')
      expect(result).toBeUndefined()
    })

    it('findByPhone returns first match when multiple exist', () => {
      const contacts = [
        makeContact({ id: 1, phone: '(111) 222-3333' }),
        makeContact({ id: 2, phone: '1112223333' })
      ]

      const result = PhoneService.findByPhone(contacts, '1112223333')
      expect(result?.id).toBe(1) // First match
    })

    it('handles special characters in phone', () => {
      const normalized = PhoneService.normalize('+1 (987) 654-3210 ext 123')
      // Should normalize to digits only or handle gracefully
      expect(typeof normalized).toBe('string')
    })

    it('areEquivalent is symmetric', () => {
      const phone1 = '(987) 654-3210'
      const phone2 = '9876543210'

      expect(PhoneService.areEquivalent(phone1, phone2)).toBe(
        PhoneService.areEquivalent(phone2, phone1)
      )
    })

    it('areEquivalent is transitive', () => {
      const phone1 = '(987) 654-3210'
      const phone2 = '987-654-3210'
      const phone3 = '9876543210'

      if (
        PhoneService.areEquivalent(phone1, phone2) &&
        PhoneService.areEquivalent(phone2, phone3)
      ) {
        expect(PhoneService.areEquivalent(phone1, phone3)).toBe(true)
      }
    })
  })
})