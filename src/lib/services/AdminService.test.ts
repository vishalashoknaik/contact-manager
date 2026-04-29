import { describe, expect, it } from 'vitest'

import { AdminService } from './AdminService'
import { makeContact } from './__tests__/fixtures'

describe('AdminService', () => {
  it('toggles admin state and settings state independently', () => {
    const service = new AdminService()

    expect(service.getIsAdmin()).toBe(false)
    expect(service.getShowSettings()).toBe(false)

    service.toggleAdmin()
    service.toggleSettings()

    expect(service.getIsAdmin()).toBe(true)
    expect(service.getShowSettings()).toBe(true)
  })

  it('removes a configured activity and cleans that key from all contacts', () => {
    const service = new AdminService()
    const contacts = [
      makeContact({ id: 1, activities: { Walkathon: 2, Other: 1 } }),
      makeContact({ id: 2, phone: '222', activities: { Walkathon: 4 } })
    ]

    const result = service.removeActivity(['Walkathon', 'Other'], contacts, 'Walkathon')

    expect(result.activities).toEqual(['Other'])
    expect(result.contacts).toEqual([
      expect.objectContaining({ activities: { Other: 1 } }),
      expect.objectContaining({ activities: {} })
    ])
  })
})