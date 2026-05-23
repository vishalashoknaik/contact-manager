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

    it('addActivity delegates to ConfigService.addItem', () => {
      const service = new AdminService()

      const result = service.addActivity(['Walkathon'], 'Cleanup')

      expect(result).toEqual(['Walkathon', 'Cleanup'])
    })

    it('addActivity does not add duplicate', () => {
      const service = new AdminService()

      const result = service.addActivity(['Walkathon'], 'Walkathon')

      expect(result).toEqual(['Walkathon'])
    })

    it('addArea adds a new area', () => {
      const service = new AdminService()

      const result = service.addArea(['North'], 'South')

      expect(result).toEqual(['North', 'South'])
    })

    it('addProgram adds a new program', () => {
      const service = new AdminService()

      const result = service.addProgram(['Yoga'], 'Meditation')

      expect(result).toEqual(['Yoga', 'Meditation'])
    })

    it('setIsAdmin directly sets admin state', () => {
      const service = new AdminService()

      service.setIsAdmin(true)
      expect(service.getIsAdmin()).toBe(true)

      service.setIsAdmin(false)
      expect(service.getIsAdmin()).toBe(false)
    })

    it('setShowSettings directly sets settings visibility', () => {
      const service = new AdminService()

      service.setShowSettings(true)
      expect(service.getShowSettings()).toBe(true)

      service.setShowSettings(false)
      expect(service.getShowSettings()).toBe(false)
    })
  })

  describe('Interests', () => {
    it('addInterest adds a new interest to the list', () => {
      const service = new AdminService()
      const result = service.addInterest(['Meditation'], 'Yoga')
      expect(result).toEqual(['Meditation', 'Yoga'])
    })

    it('addInterest does not add a duplicate', () => {
      const service = new AdminService()
      const result = service.addInterest(['Meditation'], 'Meditation')
      expect(result).toEqual(['Meditation'])
    })

    it('removeInterest removes the interest and cleans contacts', () => {
      const service = new AdminService()
      const contacts = [
        makeContact({ id: 1, interests: { Meditation: 3, Yoga: 1 } }),
        makeContact({ id: 2, phone: '222', interests: { Meditation: 2 } })
      ]
      const result = service.removeInterest(['Meditation', 'Yoga'], contacts, 'Meditation')
      expect(result.interests).toEqual(['Yoga'])
      expect(result.contacts[0].interests).toEqual({ Yoga: 1 })
      expect(result.contacts[1].interests).toEqual({})
    })

    it('removeInterest is a no-op when interest does not exist', () => {
      const service = new AdminService()
      const contacts = [makeContact({ id: 1, interests: { Yoga: 2 } })]
      const result = service.removeInterest(['Yoga'], contacts, 'NonExistent')
      expect(result.interests).toEqual(['Yoga'])
      expect(result.contacts[0].interests).toEqual({ Yoga: 2 })
    })
  })
})