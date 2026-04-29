/**
 * StorageService
 * Handles all localStorage operations for the application
 */
export class StorageService {
  private static readonly KEYS = {
    CONTACTS: 'contacts',
    ACTIVITIES: 'activities',
    AREAS: 'areas',
    PROGRAMS: 'programs'
  }

  static getContacts(): any[] | null {
    const data = localStorage.getItem(this.KEYS.CONTACTS)
    return data ? JSON.parse(data) : null
  }

  static saveContacts(contacts: any[]): void {
    localStorage.setItem(this.KEYS.CONTACTS, JSON.stringify(contacts))
  }

  static getActivities(): string[] | null {
    const data = localStorage.getItem(this.KEYS.ACTIVITIES)
    return data ? JSON.parse(data) : null
  }

  static saveActivities(activities: string[]): void {
    localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify(activities))
  }

  static getAreas(): string[] | null {
    const data = localStorage.getItem(this.KEYS.AREAS)
    return data ? JSON.parse(data) : null
  }

  static saveAreas(areas: string[]): void {
    localStorage.setItem(this.KEYS.AREAS, JSON.stringify(areas))
  }

  static getPrograms(): string[] | null {
    const data = localStorage.getItem(this.KEYS.PROGRAMS)
    return data ? JSON.parse(data) : null
  }

  static savePrograms(programs: string[]): void {
    localStorage.setItem(this.KEYS.PROGRAMS, JSON.stringify(programs))
  }

  static clearAll(): void {
    localStorage.removeItem(this.KEYS.CONTACTS)
    localStorage.removeItem(this.KEYS.ACTIVITIES)
    localStorage.removeItem(this.KEYS.AREAS)
    localStorage.removeItem(this.KEYS.PROGRAMS)
  }
}
