import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  contact: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  activity: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  area: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  program: {
    findUnique: vi.fn(),
    create: vi.fn()
  },
  contactActivity: {
    deleteMany: vi.fn(),
    create: vi.fn()
  },
  contactArea: {
    deleteMany: vi.fn(),
    create: vi.fn()
  },
  contactProgram: {
    deleteMany: vi.fn(),
    create: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const servers: Array<{ close: () => void }> = []

async function startTestServer() {
  const { default: contactsRouter } = await import('./contacts')

  const app = express()
  app.use(express.json())
  app.use('/api/contacts', contactsRouter)

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance))
  })

  servers.push(server)
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(() => {
  while (servers.length > 0) {
    const server = servers.pop()
    server?.close()
  }
  vi.clearAllMocks()
})

describe('Contact Fields Persistence', () => {
  const centerId = 'center-123'

  it('preserves optional fields when updating a contact with partial data', async () => {
    const baseUrl = await startTestServer()

    const contactWithAllFields = {
      id: '1',
      name: 'John Doe',
      phone: '9876543210',
      gender: 'Male',
      ieDate: new Date('2026-05-01'),
      areaOfStay: 'Downtown',
      remarks: 'Regular visitor',
      centerId,
      selected: false,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    // First upsert returns the contact with all fields
    mockPrisma.contact.upsert.mockResolvedValueOnce({
      ...contactWithAllFields,
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    // Update with only name - omit optional fields
    const updateResponse = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Jane Doe',
        phone: '9876543210'
        // Omit: gender, ieDate, areaOfStay, remarks
      })
    })

    expect(updateResponse.status).toBe(201)

    // Verify that upsert was called with undefined for optional fields (to preserve old values)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(callArgs.update.gender).toBeUndefined() // Should not overwrite
    expect(callArgs.update.ieDate).toBeUndefined()
    expect(callArgs.update.areaOfStay).toBeUndefined()
    expect(callArgs.update.remarks).toBeUndefined()
  })

  it('updates optional fields when they are explicitly provided', async () => {
    const baseUrl = await startTestServer()

    const updatedContact = {
      id: '2',
      name: 'Test User',
      phone: '9555666777',
      gender: 'Female',
      ieDate: new Date('2026-03-15'),
      areaOfStay: 'Midtown',
      remarks: 'VIP member',
      centerId,
      selected: false,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      ...updatedContact,
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Test User',
        phone: '9555666777',
        gender: 'Female',
        ieDate: '2026-03-15',
        areaOfStay: 'Midtown',
        remarks: 'VIP member'
      })
    })

    expect(response.status).toBe(201)

    // Verify that all fields were passed to upsert
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(callArgs.update.gender).toBe('Female')
    expect(callArgs.update.areaOfStay).toBe('Midtown')
    expect(callArgs.update.remarks).toBe('VIP member')
  })

  it('defaults gender to Male when not provided on create', async () => {
    const baseUrl = await startTestServer()

    const newContact = {
      id: '3',
      name: 'No Gender Specified',
      phone: '9111222333',
      gender: 'Male',
      ieDate: null,
      areaOfStay: null,
      remarks: null,
      centerId,
      selected: true,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      ...newContact,
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'No Gender Specified',
        phone: '9111222333'
        // gender not provided
      })
    })

    expect(response.status).toBe(201)

    // Verify default gender was applied in create
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(callArgs.create.gender).toBe('Male')
  })

  it('includes new fields in GET /contacts response', async () => {
    const baseUrl = await startTestServer()

    const contacts = [
      {
        id: '1',
        name: 'Alice',
        phone: '9876543210',
        gender: 'Female',
        ieDate: new Date('2026-02-01'),
        areaOfStay: 'North',
        remarks: 'Active member',
        centerId,
        selected: true,
        lastUpdated: new Date(),
        importOrder: 0,
        createdAt: new Date(),
        activities: [],
        areas: [],
        programs: []
      }
    ]

    mockPrisma.contact.findMany.mockResolvedValueOnce(contacts)

    const response = await fetch(`${baseUrl}/api/contacts`, {
      headers: {
        'X-Center-ID': centerId
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Alice')
    expect(data[0].gender).toBe('Female')
    expect(data[0].areaOfStay).toBe('North')
    expect(data[0].remarks).toBe('Active member')
    expect(data[0].ieDate).toBeDefined()
  })

  it('explicitly sets fields to null to clear them', async () => {
    const baseUrl = await startTestServer()

    const contact = {
      id: '5',
      name: 'Clear Fields',
      phone: '9123123123',
      gender: 'Male',
      ieDate: null,
      areaOfStay: null,
      remarks: null,
      centerId,
      selected: true,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      ...contact,
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Clear Fields',
        phone: '9123123123',
        ieDate: null,
        areaOfStay: null,
        remarks: null
      })
    })

    expect(response.status).toBe(201)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    
    // Should explicitly set to null
    expect(callArgs.update.ieDate).toBeNull()
    expect(callArgs.update.areaOfStay).toBeNull()
    expect(callArgs.update.remarks).toBeNull()
  })

  it('handles gender field with all valid values', async () => {
    const baseUrl = await startTestServer()

    for (const gender of ['Male', 'Female', 'Other']) {
      mockPrisma.contact.upsert.mockResolvedValueOnce({
        id: '1',
        name: 'Test',
        phone: '9876543210',
        gender,
        ieDate: null,
        areaOfStay: null,
        remarks: null,
        centerId,
        selected: true,
        lastUpdated: new Date(),
        importOrder: null,
        createdAt: new Date(),
        activities: [],
        areas: [],
        programs: []
      })

      mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
      mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
      mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Center-ID': centerId
        },
        body: JSON.stringify({
          name: 'Test',
          phone: '9876543210',
          gender
        })
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.contact.gender).toBe(gender)
    }
  })

  it('transforms ieDate to ISO string in response', async () => {
    const baseUrl = await startTestServer()

    const isoDate = '2026-05-01T14:30:00.000Z'
    const contact = {
      id: '6',
      name: 'Date Test',
      phone: '9111111111',
      gender: 'Male',
      ieDate: new Date(isoDate),
      areaOfStay: null,
      remarks: null,
      centerId,
      selected: false,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    mockPrisma.contact.findMany.mockResolvedValueOnce([
      { ...contact, activities: [], areas: [], programs: [] }
    ])

    const response = await fetch(`${baseUrl}/api/contacts`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data[0].ieDate).toBeDefined()
    // Should be a date string, not a Date object
    expect(typeof data[0].ieDate).toBe('string')
  })

  it('handles empty string fields differently from undefined', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      id: '7',
      name: 'Empty Strings',
      phone: '9222222222',
      gender: 'Female',
      ieDate: null,
      areaOfStay: '',
      remarks: '',
      centerId,
      selected: true,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date(),
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Empty Strings',
        phone: '9222222222',
        areaOfStay: '',
        remarks: ''
      })
    })

    expect(response.status).toBe(201)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    
    // Empty strings should be preserved, not converted to null
    expect(callArgs.update.areaOfStay).toBe('')
    expect(callArgs.update.remarks).toBe('')
  })

  it('handles updating only one optional field while preserving others', async () => {
    const baseUrl = await startTestServer()

    const initialContact = {
      id: '8',
      name: 'Partial Update',
      phone: '9333333333',
      gender: 'Male',
      ieDate: new Date('2026-01-01'),
      areaOfStay: 'Downtown',
      remarks: 'Original remarks',
      centerId,
      selected: false,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date()
    }

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      ...initialContact,
      remarks: 'Updated remarks',
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Partial Update',
        phone: '9333333333',
        remarks: 'Updated remarks'
        // gender, ieDate, areaOfStay omitted - should not be updated
      })
    })

    expect(response.status).toBe(201)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    
    // Only remarks should be updated
    expect(callArgs.update.remarks).toBe('Updated remarks')
    // Others should remain undefined (not overwritten)
    expect(callArgs.update.gender).toBeUndefined()
    expect(callArgs.update.ieDate).toBeUndefined()
    expect(callArgs.update.areaOfStay).toBeUndefined()
  })

  it('handles special characters in area of stay and remarks', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      id: '9',
      name: "O'Brien",
      phone: '9444444444',
      gender: 'Female',
      ieDate: null,
      areaOfStay: "St. John's Park",
      remarks: 'Area: Downtown (Near 5th Ave)',
      centerId,
      selected: true,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date(),
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: "O'Brien",
        phone: '9444444444',
        areaOfStay: "St. John's Park",
        remarks: 'Area: Downtown (Near 5th Ave)'
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.contact.areaOfStay).toBe("St. John's Park")
    expect(data.contact.remarks).toBe('Area: Downtown (Near 5th Ave)')
  })

  it('handles very long text in optional fields', async () => {
    const baseUrl = await startTestServer()
    const longRemarks = 'A'.repeat(500) // 500 characters

    mockPrisma.contact.upsert.mockResolvedValueOnce({
      id: '10',
      name: 'Long Remarks',
      phone: '9555555555',
      gender: 'Male',
      ieDate: null,
      areaOfStay: 'Some Area',
      remarks: longRemarks,
      centerId,
      selected: false,
      lastUpdated: new Date(),
      importOrder: null,
      createdAt: new Date(),
      activities: [],
      areas: [],
      programs: []
    })

    mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Long Remarks',
        phone: '9555555555',
        remarks: longRemarks
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.contact.remarks).toBe(longRemarks)
    expect(data.contact.remarks.length).toBe(500)
  })

  it('returns all new fields in GET response', async () => {
    const baseUrl = await startTestServer()

    const fullContact = {
      id: '11',
      name: 'Complete Data',
      phone: '9666666666',
      gender: 'Other',
      ieDate: new Date('2026-04-15'),
      areaOfStay: 'Uptown',
      remarks: 'Full record',
      centerId,
      selected: true,
      lastUpdated: new Date(),
      importOrder: 0,
      createdAt: new Date(),
      activities: [],
      areas: [],
      programs: []
    }

    mockPrisma.contact.findMany.mockResolvedValueOnce([fullContact])

    const response = await fetch(`${baseUrl}/api/contacts`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data[0]).toHaveProperty('gender')
    expect(data[0]).toHaveProperty('ieDate')
    expect(data[0]).toHaveProperty('areaOfStay')
    expect(data[0]).toHaveProperty('remarks')
  })
})
