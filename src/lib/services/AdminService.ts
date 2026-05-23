import { Contact } from '../types'
import { ConfigService } from './ConfigService'

/**
 * AdminService
 * Handles all admin-related operations
 * This is a separate class that encapsulates admin functionality
 */
export class AdminService {
  private isAdmin: boolean = false
  private showSettings: boolean = false

  /**
   * Get admin status
   */
  getIsAdmin(): boolean {
    return this.isAdmin
  }

  /**
   * Set admin status
   */
  setIsAdmin(value: boolean): void {
    this.isAdmin = value
  }

  /**
   * Toggle admin status
   */
  toggleAdmin(): void {
    this.isAdmin = !this.isAdmin
  }

  /**
   * Get settings panel visibility
   */
  getShowSettings(): boolean {
    return this.showSettings
  }

  /**
   * Set settings panel visibility
   */
  setShowSettings(value: boolean): void {
    this.showSettings = value
  }

  /**
   * Toggle settings panel visibility
   */
  toggleSettings(): void {
    this.showSettings = !this.showSettings
  }

  /**
   * Add a new activity
   */
  addActivity(activities: string[], value: string): string[] {
    return ConfigService.addItem(activities, value)
  }

  /**
   * Remove an activity
   */
  removeActivity(
    activities: string[],
    contacts: Contact[],
    value: string
  ): { activities: string[]; contacts: Contact[] } {
    const result = ConfigService.removeItem(activities, contacts, value, 'activity')
    return {
      activities: result.items,
      contacts: result.contacts
    }
  }

  /**
   * Add a new area
   */
  addArea(areas: string[], value: string): string[] {
    return ConfigService.addItem(areas, value)
  }

  /**
   * Remove an area
   */
  removeArea(
    areas: string[],
    contacts: Contact[],
    value: string
  ): { areas: string[]; contacts: Contact[] } {
    const result = ConfigService.removeItem(areas, contacts, value, 'area')
    return {
      areas: result.items,
      contacts: result.contacts
    }
  }

  /**
   * Add a new program
   */
  addProgram(programs: string[], value: string): string[] {
    return ConfigService.addItem(programs, value)
  }

  /**
   * Remove a program
   */
  removeProgram(
    programs: string[],
    contacts: Contact[],
    value: string
  ): { programs: string[]; contacts: Contact[] } {
    const result = ConfigService.removeItem(programs, contacts, value, 'program')
    return {
      programs: result.items,
      contacts: result.contacts
    }
  }

  /**
   * Add a new interest
   */
  addInterest(interests: string[], value: string): string[] {
    return ConfigService.addItem(interests, value)
  }

  /**
   * Remove an interest
   */
  removeInterest(
    interests: string[],
    contacts: Contact[],
    value: string
  ): { interests: string[]; contacts: Contact[] } {
    const result = ConfigService.removeItem(interests, contacts, value, 'interest')
    return {
      interests: result.items,
      contacts: result.contacts
    }
  }
}
