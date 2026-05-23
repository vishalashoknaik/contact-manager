import { Contact } from '../types'
import { PhoneService } from './PhoneService'
import type { Gender } from '../types'

/**
 * ContactService
 * Core business logic for contact operations
 */
export class ContactService {
  /**
   * Create a new contact object
   */
  static createContact(name: string, phone: string, gender: Gender = 'Male', ieDate?: string, areaOfStay?: string, remarks?: string): Contact {
    return {
      id: Date.now() + Math.random(),
      name,
      phone,
      gender,
      ieDate,
      areaOfStay,
      remarks,
      activities: {},
      areas: {},
      programs: {},
      selected: true,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Add or update a contact
   * Returns true if new contact was added, false if existing was updated
   */
  static addOrUpdateContact(
    contacts: Contact[],
    name: string,
    phone: string,
    gender: Gender = 'Male',
    ieDate?: string,
    areaOfStay?: string,
    remarks?: string
  ): { contacts: Contact[]; isNew: boolean } {
    const existing = PhoneService.findByPhone(contacts, phone)

    if (existing) {
      const updated = contacts.map(c =>
        c.id === existing.id ? { ...c, name, gender, ieDate, areaOfStay, remarks, selected: true } : c
      )
      return { contacts: updated, isNew: false }
    }

    const newContact = this.createContact(name, phone, gender, ieDate, areaOfStay, remarks)
    return { contacts: [newContact, ...contacts], isNew: true }
  }

  /**
   * Toggle selection of a contact
   */
  static toggleSelect(contacts: Contact[], id: string | number): Contact[] {
    return contacts.map(c =>
      c.id === id ? { ...c, selected: !c.selected } : c
    )
  }

  /**
   * Toggle selection of all contacts
   */
  static toggleSelectAll(contacts: Contact[]): Contact[] {
    const allSelected = contacts.length > 0 && contacts.every(c => c.selected)
    return contacts.map(c => ({ ...c, selected: !allSelected }))
  }

  /**
   * Increment counters for selected contacts
   */
  static incrementSelected(
    contacts: Contact[],
    selectedActivity: string,
    selectedArea: string,
    selectedProgram: string,
    selectedInterest: string = ''
  ): Contact[] {
    const now = new Date().toISOString()

    return contacts.map(c => {
      if (!c.selected) return c

      let updated = { ...c }

      if (selectedActivity) {
        updated.activities = {
          ...c.activities,
          [selectedActivity]: (c.activities?.[selectedActivity] || 0) + 1
        }
      }

      if (selectedArea) {
        updated.areas = {
          ...c.areas,
          [selectedArea]: (c.areas?.[selectedArea] || 0) + 1
        }
      }

      if (selectedProgram) {
        updated.programs = {
          ...c.programs,
          [selectedProgram]: (c.programs?.[selectedProgram] || 0) + 1
        }
      }

      if (selectedInterest) {
        updated.interests = {
          ...(c.interests || {}),
          [selectedInterest]: ((c.interests || {})[selectedInterest] || 0) + 1
        }
      }

      updated.lastUpdated = now
      return updated
    })
  }

  /**
   * Calculate total activity count for a contact
   */
  static getTotal(contact: Contact): number {
    return Object.values(contact.activities || {}).reduce(
      (sum: number, val: any) => sum + val,
      0
    )
  }

  /**
   * Initialize contacts with default structure
   */
  static initializeFromData(data: any[]): Contact[] {
    return data.map(c => ({
      ...c,
      selected: false,
      activities: {},
      areas: {},
      programs: {},
      lastUpdated: new Date().toISOString()
    }))
  }
}
