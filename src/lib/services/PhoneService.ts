/**
 * PhoneService
 * Handles phone number normalization and validation
 */
export class PhoneService {
  /**
   * Normalize phone number by removing all non-digit characters
   */
  static normalize(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Check if two phone numbers are equivalent (normalized)
   */
  static areEquivalent(phone1: string, phone2: string): boolean {
    return this.normalize(phone1) === this.normalize(phone2)
  }

  /**
   * Find contact by normalized phone number
   */
  static findByPhone(contacts: any[], phone: string): any | undefined {
    const normalized = this.normalize(phone)
    return contacts.find(c => this.normalize(c.phone) === normalized)
  }
}
