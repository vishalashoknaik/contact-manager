import { describe, expect, it, beforeEach, vi } from 'vitest'
import { StorageService } from './StorageService'
import { makeContact } from './__tests__/fixtures'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Contacts Storage', () => {
    it('saves and retrieves contacts', () => {
      const contacts = [makeContact({ id: 1, name: 'Alice' })]

      StorageService.saveContacts(contacts)
      const retrieved = StorageService.getContacts()

      expect(retrieved).toEqual(contacts)
    })

    it('returns null when no contacts are stored', () => {
      expect(StorageService.getContacts()).toBeNull()
    })

    it('saves multiple contacts and maintains order', () => {
      const contacts = [
        makeContact({ id: 1, name: 'Alice' }),
        makeContact({ id: 2, name: 'Bob' }),
        makeContact({ id: 3, name: 'Charlie' })
      ]

      StorageService.saveContacts(contacts)
      const retrieved = StorageService.getContacts()

      expect(retrieved).toHaveLength(3)
      expect(retrieved?.[0].name).toBe('Alice')
      expect(retrieved?.[2].name).toBe('Charlie')
    })

    it('overwrites previous contacts', () => {
      const contacts1 = [makeContact({ id: 1, name: 'Alice' })]
      const contacts2 = [makeContact({ id: 2, name: 'Bob' })]

      StorageService.saveContacts(contacts1)
      StorageService.saveContacts(contacts2)
      const retrieved = StorageService.getContacts()

      expect(retrieved).toHaveLength(1)
      expect(retrieved?.[0].name).toBe('Bob')
    })
  })

  describe('Activities Storage', () => {
    it('saves and retrieves activities', () => {
      const activities = ['Walkathon', 'Cleanup']

      StorageService.saveActivities(activities)
      const retrieved = StorageService.getActivities()

      expect(retrieved).toEqual(activities)
    })

    it('returns null when no activities are stored', () => {
      expect(StorageService.getActivities()).toBeNull()
    })

    it('maintains activity order', () => {
      const activities = ['Walkathon', 'Cleanup', 'Donation']

      StorageService.saveActivities(activities)
      const retrieved = StorageService.getActivities()

      expect(retrieved).toEqual(activities)
    })
  })

  describe('Areas Storage', () => {
    it('saves and retrieves areas', () => {
      const areas = ['Area1', 'Area2']

      StorageService.saveAreas(areas)
      const retrieved = StorageService.getAreas()

      expect(retrieved).toEqual(areas)
    })

    it('returns null when no areas are stored', () => {
      expect(StorageService.getAreas()).toBeNull()
    })
  })

  describe('Programs Storage', () => {
    it('saves and retrieves programs', () => {
      const programs = ['Program1', 'Program2']

      StorageService.savePrograms(programs)
      const retrieved = StorageService.getPrograms()

      expect(retrieved).toEqual(programs)
    })

    it('returns null when no programs are stored', () => {
      expect(StorageService.getPrograms()).toBeNull()
    })
  })

  describe('clearAll', () => {
    it('clears all stored data', () => {
      const contacts = [makeContact()]
      const activities = ['Walkathon']
      const areas = ['Area1']
      const programs = ['Program1']

      StorageService.saveContacts(contacts)
      StorageService.saveActivities(activities)
      StorageService.saveAreas(areas)
      StorageService.savePrograms(programs)

      StorageService.clearAll()

      expect(StorageService.getContacts()).toBeNull()
      expect(StorageService.getActivities()).toBeNull()
      expect(StorageService.getAreas()).toBeNull()
      expect(StorageService.getPrograms()).toBeNull()
    })

    it('only clears application data, not other localStorage items', () => {
      localStorage.setItem('other_key', 'other_value')
      StorageService.saveContacts([makeContact()])

      StorageService.clearAll()

      expect(localStorage.getItem('other_key')).toBe('other_value')
      expect(StorageService.getContacts()).toBeNull()
    })
  })

  describe('JSON parsing', () => {
    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem('contacts', 'invalid json {')

      expect(() => StorageService.getContacts()).toThrow()
    })

    it('preserves complex objects with nested data', () => {
      const contacts = [
        makeContact({
          id: 1,
          activities: { Walkathon: 2, Cleanup: 1 },
          areas: { Area1: 3 },
          programs: { Program1: 5 }
        })
      ]

      StorageService.saveContacts(contacts)
      const retrieved = StorageService.getContacts()

      expect(retrieved?.[0].activities).toEqual({ Walkathon: 2, Cleanup: 1 })
      expect(retrieved?.[0].areas).toEqual({ Area1: 3 })
      expect(retrieved?.[0].programs).toEqual({ Program1: 5 })
    })
  })
})
