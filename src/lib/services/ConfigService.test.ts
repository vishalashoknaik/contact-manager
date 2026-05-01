import { describe, expect, it } from 'vitest'
import { ConfigService } from './ConfigService'
import { makeContact } from './__tests__/fixtures'

describe('ConfigService', () => {
  describe('addItem', () => {
    it('adds a new item to the list', () => {
      const items = ['Walkathon']

      const result = ConfigService.addItem(items, 'Cleanup')

      expect(result).toEqual(['Walkathon', 'Cleanup'])
    })

    it('does not add duplicate items', () => {
      const items = ['Walkathon', 'Cleanup']

      const result = ConfigService.addItem(items, 'Walkathon')

      expect(result).toEqual(items)
    })

    it('returns original list when value is empty', () => {
      const items = ['Walkathon']

      const result = ConfigService.addItem(items, '')

      expect(result).toEqual(items)
    })

    it('returns original list when value is null or undefined', () => {
      const items = ['Walkathon']

      const result1 = ConfigService.addItem(items, null as any)
      const result2 = ConfigService.addItem(items, undefined as any)

      expect(result1).toEqual(items)
      expect(result2).toEqual(items)
    })

    it('works with empty initial list', () => {
      const result = ConfigService.addItem([], 'Walkathon')

      expect(result).toEqual(['Walkathon'])
    })
  })

  describe('removeItem for activities', () => {
    it('removes item from list and cleans from all contacts', () => {
      const items = ['Walkathon', 'Cleanup', 'Donation']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2, Cleanup: 1 } }),
        makeContact({ id: 2, activities: { Walkathon: 4 } }),
        makeContact({ id: 3, activities: { Cleanup: 3 } })
      ]

      const result = ConfigService.removeItem(items, contacts, 'Walkathon', 'activity')

      expect(result.items).toEqual(['Cleanup', 'Donation'])
      expect(result.contacts[0].activities).toEqual({ Cleanup: 1 })
      expect(result.contacts[1].activities).toEqual({})
      expect(result.contacts[2].activities).toEqual({ Cleanup: 3 })
    })

    it('handles removing item not present in all contacts', () => {
      const items = ['Walkathon', 'Cleanup']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2 } }),
        makeContact({ id: 2, activities: {} })
      ]

      const result = ConfigService.removeItem(items, contacts, 'Cleanup', 'activity')

      expect(result.items).toEqual(['Walkathon'])
      expect(result.contacts[0].activities).toEqual({ Walkathon: 2 })
      expect(result.contacts[1].activities).toEqual({})
    })

    it('preserves other activities when removing one', () => {
      const items = ['Walkathon', 'Cleanup', 'Donation']
      const contacts = [
        makeContact({
          id: 1,
          activities: { Walkathon: 2, Cleanup: 1, Donation: 3 }
        })
      ]

      const result = ConfigService.removeItem(items, contacts, 'Cleanup', 'activity')

      expect(result.contacts[0].activities).toEqual({ Walkathon: 2, Donation: 3 })
    })
  })

  describe('removeItem for areas', () => {
    it('removes area from list and cleans from contacts', () => {
      const items = ['Area1', 'Area2', 'Area3']
      const contacts = [
        makeContact({ id: 1, areas: { Area1: 5, Area2: 3 } }),
        makeContact({ id: 2, areas: { Area1: 2 } })
      ]

      const result = ConfigService.removeItem(items, contacts, 'Area1', 'area')

      expect(result.items).toEqual(['Area2', 'Area3'])
      expect(result.contacts[0].areas).toEqual({ Area2: 3 })
      expect(result.contacts[1].areas).toEqual({})
    })
  })

  describe('removeItem for programs', () => {
    it('removes program from list and cleans from contacts', () => {
      const items = ['Program1', 'Program2']
      const contacts = [
        makeContact({ id: 1, programs: { Program1: 7, Program2: 2 } })
      ]

      const result = ConfigService.removeItem(items, contacts, 'Program1', 'program')

      expect(result.items).toEqual(['Program2'])
      expect(result.contacts[0].programs).toEqual({ Program2: 2 })
    })
  })

  describe('renameItem for activities', () => {
    it('renames activity and updates all contacts', () => {
      const items = ['Walkathon', 'Cleanup']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2 } }),
        makeContact({ id: 2, activities: { Walkathon: 4, Cleanup: 1 } })
      ]

      const result = ConfigService.renameItem(items, contacts, 'Walkathon', 'Walking', 'activity')

      expect(result.items).toEqual(['Walking', 'Cleanup'])
      expect(result.contacts[0].activities).toEqual({ Walking: 2 })
      expect(result.contacts[1].activities).toEqual({ Walking: 4, Cleanup: 1 })
    })

    it('does not rename to existing item name', () => {
      const items = ['Walkathon', 'Cleanup']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2, Cleanup: 1 } })
      ]

      const result = ConfigService.renameItem(items, contacts, 'Walkathon', 'Cleanup', 'activity')

      expect(result.items).toEqual(items)
      expect(result.contacts[0].activities).toEqual({ Walkathon: 2, Cleanup: 1 })
    })
  })

  describe('renameItem for areas', () => {
    it('renames area and updates all contacts', () => {
      const items = ['Area1', 'Area2']
      const contacts = [
        makeContact({ id: 1, areas: { Area1: 5 } })
      ]

      const result = ConfigService.renameItem(items, contacts, 'Area1', 'Downtown', 'area')

      expect(result.items).toEqual(['Downtown', 'Area2'])
      expect(result.contacts[0].areas).toEqual({ Downtown: 5 })
    })
  })

  describe('renameItem for programs', () => {
    it('renames program and updates all contacts', () => {
      const items = ['Program1', 'Program2']
      const contacts = [
        makeContact({ id: 1, programs: { Program1: 3 } })
      ]

      const result = ConfigService.renameItem(items, contacts, 'Program1', 'Education', 'program')

      expect(result.items).toEqual(['Education', 'Program2'])
      expect(result.contacts[0].programs).toEqual({ Education: 3 })
    })
  })

  describe('mergeItem for activities', () => {
    it('merges activity into another and updates all contacts', () => {
      const items = ['Walkathon', 'Walking', 'Cleanup']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2, Walking: 1 } }),
        makeContact({ id: 2, activities: { Walkathon: 4 } })
      ]

      const result = ConfigService.mergeItem(items, contacts, 'Walkathon', 'Walking', 'activity')

      expect(result.items).toEqual(['Walking', 'Cleanup'])
      expect(result.contacts[0].activities).toEqual({ Walking: 3 })
      expect(result.contacts[1].activities).toEqual({ Walking: 4 })
    })

    it('handles merge when target does not exist on contact', () => {
      const items = ['Walkathon', 'Walking']
      const contacts = [
        makeContact({ id: 1, activities: { Walkathon: 2 } })
      ]

      const result = ConfigService.mergeItem(items, contacts, 'Walkathon', 'Walking', 'activity')

      expect(result.items).toEqual(['Walking'])
      expect(result.contacts[0].activities).toEqual({ Walking: 2 })
    })
  })

  describe('mergeItem for areas', () => {
    it('merges area into another and sums counts', () => {
      const items = ['Area1', 'Area2', 'Area3']
      const contacts = [
        makeContact({ id: 1, areas: { Area1: 5, Area2: 3 } })
      ]

      const result = ConfigService.mergeItem(items, contacts, 'Area1', 'Area2', 'area')

      expect(result.items).toEqual(['Area2', 'Area3'])
      expect(result.contacts[0].areas).toEqual({ Area2: 8 })
    })
  })

  describe('mergeItem for programs', () => {
    it('merges program into another and sums counts', () => {
      const items = ['Program1', 'Program2', 'Program3']
      const contacts = [
        makeContact({ id: 1, programs: { Program1: 7, Program2: 2 } })
      ]

      const result = ConfigService.mergeItem(items, contacts, 'Program1', 'Program2', 'program')

      expect(result.items).toEqual(['Program2', 'Program3'])
      expect(result.contacts[0].programs).toEqual({ Program2: 9 })
    })
  })
})
