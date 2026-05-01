import { describe, expect, it } from 'vitest'

import { AdminService } from './AdminService'
import { makeContact } from './__tests__/fixtures'

describe('AdminService', () => {
  it('toggles admin state and settings state independently', () => {
    const service = new AdminService()

    expect(service.getIsAdmin()).toBe(false)
    expect(service.getShowSettings()).toBe(false)

    service.toggleAdmin()
    service.toggleSettings()

    expect(service.getIsAdmin()).toBe(true)
    expect(service.getShowSettings()).toBe(true)
  })

  it('removes a configured activity and cleans that key from all contacts', () => {
    const service = new AdminService()
    const contacts = [
      makeContact({ id: 1, activities: { Walkathon: 2, Other: 1 } }),
      makeContact({ id: 2, phone: '222', activities: { Walkathon: 4 } })
    ]

    const result = service.removeActivity(['Walkathon', 'Other'], contacts, 'Walkathon')

    expect(result.activities).toEqual(['Other'])
    expect(result.contacts).toEqual([
      expect.objectContaining({ activities: { Other: 1 } }),
      expect.objectContaining({ activities: {} })
    ])
  })

  describe('Error Handling & Edge Cases', () => {
    it('toggles admin state multiple times', () => {
      const service = new AdminService()

      service.toggleAdmin()
      expect(service.getIsAdmin()).toBe(true)

      service.toggleAdmin()
      expect(service.getIsAdmin()).toBe(false)

      service.toggleAdmin()
      expect(service.getIsAdmin()).toBe(true)
    })

    it('handles removing non-existent activity', () => {
      const service = new AdminService()
      const contacts = [makeContact({ id: 1, activities: { Walkathon: 2 } })]

      const result = service.removeActivity(['Walkathon'], contacts, 'NonExistent')

      // Should return unchanged activities list
      expect(result.activities).toEqual(['Walkathon'])
      expect(result.contacts[0].activities).toEqual({ Walkathon: 2 })
    })

    it('handles empty activities list', () => {
      const service = new AdminService()
      const contacts = [makeContact({ id: 1, activities: { Walkathon: 2 } })]

      const result = service.removeActivity([], contacts, 'Walkathon')

      expect(result.activities).toEqual([])
      expect(result.contacts).toHaveLength(1)
    })

    it('handles removing activity from contacts with empty activities', () => {
      const service = new AdminService()
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2 } }),
        makeContact({ id: 2, activities: {} })
      ]

      const result = service.removeActivity(['Walkathon'], contacts, 'Walkathon')

      expect(result.activities).toEqual([])
      expect(result.contacts[0].activities).toEqual({})
      expect(result.contacts[1].activities).toEqual({})
    })

    it('maintains independent state between instances', () => {
      const service1 = new AdminService()
      const service2 = new AdminService()

      service1.toggleAdmin()
      expect(service1.getIsAdmin()).toBe(true)
      expect(service2.getIsAdmin()).toBe(false)
    })

    it('handles removeArea method', () => {
      const service = new AdminService()
      const contacts = [
        makeContact({ id: 1, areas: { Area1: 5, Area2: 3 } }),
        makeContact({ id: 2, areas: { Area1: 2 } })
      ]

      const result = service.removeArea(['Area1', 'Area2'], contacts, 'Area1')

      expect(result.areas).toEqual(['Area2'])
      expect(result.contacts[0].areas).toEqual({ Area2: 3 })
      expect(result.contacts[1].areas).toEqual({})
    })

    it('handles removeProgram method', () => {
      const service = new AdminService()
      const contacts = [
        makeContact({ id: 1, programs: { Program1: 5 } })
      ]

      const result = service.removeProgram(['Program1'], contacts, 'Program1')

      expect(result.programs).toEqual([])
      expect(result.contacts[0].programs).toEqual({})
    })
  })
})