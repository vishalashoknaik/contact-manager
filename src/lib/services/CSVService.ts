import { Contact } from '../types'
import { PhoneService } from './PhoneService'

/**
 * CSVService
 * Handles CSV import operations
 */
export class CSVService {
  /**
   * Parse CSV content and merge with existing contacts
   * All imported contacts (new or updated) are placed at the top and marked as selected
   */
  static importCSV(csvContent: string, existingContacts: Contact[]): Contact[] {
    const rows = csvContent.split('\n').slice(1) // Skip header
    const now = new Date().toISOString()
    const importedContacts: Contact[] = []
    const importedIds = new Set<Contact['id']>()

    rows.forEach((row: string, index: number) => {
      if (!row.trim()) return

      const [name, phone] = row.split(',')
      if (!name || !phone) return

      const trimmedName = name.trim()
      const trimmedPhone = phone.trim()
      const existing = existingContacts.find(
        c => PhoneService.normalize(c.phone) === PhoneService.normalize(trimmedPhone)
      )

      if (existing) {
        importedContacts.push({
          ...existing,
          name: trimmedName,
          phone: trimmedPhone,
          gender: existing.gender || 'Male',
          selected: true,
          lastUpdated: now,
          importOrder: index
        })
        importedIds.add(existing.id)
      } else {
        importedContacts.push({
          id: Date.now() + Math.random(),
          name: trimmedName,
          phone: trimmedPhone,
          gender: 'Male',
          activities: {},
          areas: {},
          programs: {},
          selected: true,
          lastUpdated: now,
          importOrder: index
        })
      }
    })

    const remainingContacts = existingContacts
      .filter(contact => !importedIds.has(contact.id))
      .map(contact => {
        const { importOrder, ...rest } = contact
        return rest
      })

    return [...importedContacts, ...remainingContacts]
  }

  /**
   * Handle file input and return parsed contacts
   */
  static async handleFileImport(
    file: File,
    existingContacts: Contact[]
  ): Promise<Contact[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event: any) => {
        try {
          const csvContent = event.target.result
          const result = this.importCSV(csvContent, existingContacts)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }
}
