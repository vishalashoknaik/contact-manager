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
})
