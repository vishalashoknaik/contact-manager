import { Contact, FilterState, SortState } from '../types'
import { ContactService } from './contactService'

/**
 * FilterService
 * Handles filtering and sorting of contacts
 */
export class FilterService {
  /**
   * Filter contacts based on filter criteria
   */
  static filterContacts(
    contacts: Contact[],
    filters: FilterState,
    activities: string[],
    areas: string[],
    programs: string[]
  ): Contact[] {
    return contacts.filter(contact => {
      // Name filter
      if (filters.nameFilter && !contact.name.toLowerCase().includes(filters.nameFilter.toLowerCase())) {
        return false
      }

      // Phone filter
      if (filters.phoneFilter && !contact.phone.includes(filters.phoneFilter)) {
        return false
      }

      // Date filter
      if (filters.dateFilter) {
        const filterDate = new Date(filters.dateFilter)
        const contactDate = new Date(contact.lastUpdated)
        if (contactDate < filterDate) {
          return false
        }
      }

      // Total filter
      if (filters.totalFilter) {
        const minTotal = parseInt(filters.totalFilter, 10)
        const total = ContactService.getTotal(contact)
        if (total < minTotal) {
          return false
        }
      }

      // Activity threshold filter
      for (const activity of activities) {
        const threshold = parseInt(filters.activityFilters[activity] || '0', 10)
        const contactValue = contact.activities[activity] || 0
        if (contactValue < threshold) {
          return false
        }
      }

      // Area threshold filter
      for (const area of areas) {
        const threshold = parseInt(filters.areaFilters[area] || '0', 10)
        const contactValue = contact.areas[area] || 0
        if (contactValue < threshold) {
          return false
        }
      }

      // Program threshold filter
      for (const program of programs) {
        const threshold = parseInt(filters.programFilters[program] || '0', 10)
        const contactValue = contact.programs[program] || 0
        if (contactValue < threshold) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Sort contacts by importOrder first, then by the specified sort key
   */
  static sortContacts(
    contacts: Contact[],
    sortState: SortState,
    activities: string[]
  ): Contact[] {
    const sorted = [...contacts].sort((a, b) => {
      // Prioritize imported contacts (those with importOrder)
      const aImported = typeof a.importOrder === 'number'
      const bImported = typeof b.importOrder === 'number'

      if (aImported && bImported) {
        // Both imported: sort by importOrder (lower = more recent)
        return (a.importOrder as number) - (b.importOrder as number)
      }
      if (aImported) {
        // Only a is imported: a comes first
        return -1
      }
      if (bImported) {
        // Only b is imported: b comes first
        return 1
      }

      // Neither imported: apply normal sort
      switch (sortState.key) {
        case 'name':
          return sortState.direction === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)

        case 'phone':
          return sortState.direction === 'asc'
            ? a.phone.localeCompare(b.phone)
            : b.phone.localeCompare(a.phone)

        case 'date':
          return sortState.direction === 'asc'
            ? new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
            : new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()

        case 'total':
          const aTot = ContactService.getTotal(a)
          const bTot = ContactService.getTotal(b)
          return sortState.direction === 'asc' ? aTot - bTot : bTot - aTot

        default:
          return 0
      }
    })

    return sorted
  }
}
