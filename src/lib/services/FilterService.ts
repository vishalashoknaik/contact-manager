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

      // Gender filter
      if (filters.genderFilter && contact.gender !== filters.genderFilter) {
        return false
      }

      // Area of stay filter
      if (filters.areaOfStayFilter && !(contact.areaOfStay || '').toLowerCase().includes(filters.areaOfStayFilter.toLowerCase())) {
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
   * Sort contacts with selected rows first, then by the specified sort key
   */
  static sortContacts(
    contacts: Contact[],
    sortState: SortState,
    activities: string[],
    areas: string[] = [],
    programs: string[] = []
  ): Contact[] {
    const sorted = [...contacts].sort((a, b) => {
      // Keep selected contacts pinned at the top regardless of import source.
      if (a.selected !== b.selected) {
        return a.selected ? -1 : 1
      }

      // Apply normal sort within selected and unselected groups.
      switch (sortState.key) {
        case 'name':
          return sortState.direction === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)

        case 'phone':
          return sortState.direction === 'asc'
            ? a.phone.localeCompare(b.phone)
            : b.phone.localeCompare(a.phone)

        case 'gender':
          return sortState.direction === 'asc'
            ? (a.gender || '').localeCompare(b.gender || '')
            : (b.gender || '').localeCompare(a.gender || '')

        case 'ieDate':
          return sortState.direction === 'asc'
            ? (a.ieDate || '').localeCompare(b.ieDate || '')
            : (b.ieDate || '').localeCompare(a.ieDate || '')

        case 'areaOfStay':
          return sortState.direction === 'asc'
            ? (a.areaOfStay || '').localeCompare(b.areaOfStay || '')
            : (b.areaOfStay || '').localeCompare(a.areaOfStay || '')

        case 'date':
        case 'lastUpdated':
          return sortState.direction === 'asc'
            ? new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
            : new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()

        case 'total':
          const aTot = ContactService.getTotal(a)
          const bTot = ContactService.getTotal(b)
          return sortState.direction === 'asc' ? aTot - bTot : bTot - aTot

        default:
          if (activities.includes(sortState.key)) {
            const aCount = a.activities[sortState.key] || 0
            const bCount = b.activities[sortState.key] || 0
            return sortState.direction === 'asc' ? aCount - bCount : bCount - aCount
          }

          if (areas.includes(sortState.key)) {
            const aCount = a.areas[sortState.key] || 0
            const bCount = b.areas[sortState.key] || 0
            return sortState.direction === 'asc' ? aCount - bCount : bCount - aCount
          }

          if (programs.includes(sortState.key)) {
            const aCount = a.programs[sortState.key] || 0
            const bCount = b.programs[sortState.key] || 0
            return sortState.direction === 'asc' ? aCount - bCount : bCount - aCount
          }

          return 0
      }
    })

    return sorted
  }
}
