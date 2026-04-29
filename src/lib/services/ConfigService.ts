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
