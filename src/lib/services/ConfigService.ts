import { Contact } from '../types'

/**
 * ConfigService
 * Manages configuration items (activities, areas, programs)
 */
export class ConfigService {
  /**
   * Add a new configuration item if it doesn't already exist
   */
  static addItem(items: string[], value: string): string[] {
    if (!value || items.includes(value)) return items
    return [...items, value]
  }

  /**
   * Rename a configuration item and update all contacts
   */
  static renameItem(
    items: string[],
    contacts: Contact[],
    oldValue: string,
    newValue: string,
    type: 'activity' | 'area' | 'program'
  ): { items: string[]; contacts: Contact[] } {
    if (!oldValue || !newValue || oldValue === newValue) {
      return { items, contacts }
    }

    // Don't allow renaming to an existing item name
    if (items.includes(newValue)) {
      return { items, contacts }
    }

    const updatedItems = items.map(x => (x === oldValue ? newValue : x))

    const updatedContacts = contacts.map(c => {
      const updated = { ...c }
      if (type === 'activity') {
        const o = { ...c.activities }
        if (oldValue in o) {
          o[newValue] = o[oldValue]
          delete o[oldValue]
        }
        updated.activities = o
      }
      if (type === 'area') {
        const o = { ...c.areas }
        if (oldValue in o) {
          o[newValue] = o[oldValue]
          delete o[oldValue]
        }
        updated.areas = o
      }
      if (type === 'program') {
        const o = { ...c.programs }
        if (oldValue in o) {
          o[newValue] = o[oldValue]
          delete o[oldValue]
        }
        updated.programs = o
      }
      return updated
    })

    return { items: updatedItems, contacts: updatedContacts }
  }

  /**
   * Remove a configuration item and merge counts with another item
   */
  static mergeItem(
    items: string[],
    contacts: Contact[],
    removeValue: string,
    mergeIntoValue: string,
    type: 'activity' | 'area' | 'program'
  ): { items: string[]; contacts: Contact[] } {
    const updatedItems = items.filter(x => x !== removeValue)

    const updatedContacts = contacts.map(c => {
      const updated = { ...c }
      if (type === 'activity') {
        const o = { ...c.activities }
        if (removeValue in o && mergeIntoValue in o) {
          o[mergeIntoValue] = (o[mergeIntoValue] || 0) + (o[removeValue] || 0)
        } else if (removeValue in o) {
          o[mergeIntoValue] = o[removeValue]
        }
        delete o[removeValue]
        updated.activities = o
      }
      if (type === 'area') {
        const o = { ...c.areas }
        if (removeValue in o && mergeIntoValue in o) {
          o[mergeIntoValue] = (o[mergeIntoValue] || 0) + (o[removeValue] || 0)
        } else if (removeValue in o) {
          o[mergeIntoValue] = o[removeValue]
        }
        delete o[removeValue]
        updated.areas = o
      }
      if (type === 'program') {
        const o = { ...c.programs }
        if (removeValue in o && mergeIntoValue in o) {
          o[mergeIntoValue] = (o[mergeIntoValue] || 0) + (o[removeValue] || 0)
        } else if (removeValue in o) {
          o[mergeIntoValue] = o[removeValue]
        }
        delete o[removeValue]
        updated.programs = o
      }
      return updated
    })

    return { items: updatedItems, contacts: updatedContacts }
  }

  /**
   * Remove a configuration item and clean it from all contacts
   */
  static removeItem(
    items: string[],
    contacts: Contact[],
    value: string,
    type: 'activity' | 'area' | 'program'
  ): { items: string[]; contacts: Contact[] } {
    const updatedItems = items.filter(x => x !== value)

    const updatedContacts = contacts.map(c => {
      const updated = { ...c }
      if (type === 'activity') {
        const o = { ...c.activities }
        delete o[value]
        updated.activities = o
      }
      if (type === 'area') {
        const o = { ...c.areas }
        delete o[value]
        updated.areas = o
      }
      if (type === 'program') {
        const o = { ...c.programs }
        delete o[value]
        updated.programs = o
      }
      return updated
    })

    return { items: updatedItems, contacts: updatedContacts }
  }
}
