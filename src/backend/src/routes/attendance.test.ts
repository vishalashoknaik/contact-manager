import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  contact: {
    findUnique: vi.fn(),
    upsert: vi.fn()
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
    upsert: vi.fn()
  },
  contactArea: {
    upsert: vi.fn()
  },
  contactProgram: {
    upsert: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const servers: Array<{ close: () => void }> = []

async function startTestServer() {
  const { default: attendanceRouter } = await import('./attendance')

  const app = express()
  app.use(express.json())
  app.use('/api/attendance', attendanceRouter)

  const server = await new Promise<import('node:http').Server>(resolve => {
    const instance = app.listen(0, () => resolve(instance))
  })

  servers.push(server)
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close()
  }
  vi.clearAllMocks()
})

describe('attendance route', () => {
  const centerId = 'center-123'

  it('returns found contact details without remarks on lookup', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce({
      id: 'contact-1',
      name: 'Lookup Person',
      phone: '1231231234',
      gender: 'Female',
      ieDate: '2026 Batch',
      areaOfStay: 'Downtown',
      remarks: 'Should not be returned'
    })

    const response = await fetch(`${baseUrl}/api/attendance/lookup?phone=1231231234`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as {
      found: boolean
      contact: Record<string, unknown>
    }
    expect(data.found).toBe(true)
    expect(data.contact.name).toBe('Lookup Person')
    expect(data.contact.ieDate).toBe('2026 Batch')
    expect(data.contact.areaOfStay).toBe('Downtown')
    expect(data.contact).not.toHaveProperty('remarks')
  })

  it('rejects new contacts without gender, IE Date, and area of stay', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'New Person',
        phone: '9999999999',
        activities: ['Walkathon']
      })
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Gender, IE Date, and Area of Stay are required for new contacts')
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled()
  })

  it('allows existing contacts without re-entering mandatory new-contact fields', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce({
      id: 'contact-1',
      name: 'Existing Person',
      phone: '9999999999',
      centerId
    })
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-1' })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'Existing Person',
        phone: '9999999999',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(201)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(callArgs.update.gender).toBeUndefined()
    expect(callArgs.update.ieDate).toBeUndefined()
    expect(callArgs.update.areaOfStay).toBeUndefined()
    expect(callArgs.create).not.toHaveProperty('remarks')
    expect(callArgs.update).not.toHaveProperty('remarks')
  })

  it('creates a new contact and increments selected category counts', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-2' })
    mockPrisma.activity.findUnique.mockResolvedValueOnce({ id: 'activity-1' })
    mockPrisma.area.findUnique.mockResolvedValueOnce({ id: 'area-1' })
    mockPrisma.program.findUnique.mockResolvedValueOnce({ id: 'program-1' })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId
      },
      body: JSON.stringify({
        name: 'New Person',
        phone: '2222222222',
        gender: 'Female',
        ieDate: '2026 Batch',
        areaOfStay: 'Downtown',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program']
      })
    })

    expect(response.status).toBe(201)
    const callArgs = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(callArgs.create.gender).toBe('Female')
    expect(callArgs.create.ieDate).toBe('2026 Batch')
    expect(callArgs.create.areaOfStay).toBe('Downtown')
    expect(mockPrisma.contactActivity.upsert).toHaveBeenCalledWith({
      where: { contactId_activityId: { contactId: 'contact-2', activityId: 'activity-1' } },
      create: { contactId: 'contact-2', activityId: 'activity-1', count: 1 },
      update: { count: { increment: 1 } }
    })
    expect(mockPrisma.contactArea.upsert).toHaveBeenCalledWith({
      where: { contactId_areaId: { contactId: 'contact-2', areaId: 'area-1' } },
      create: { contactId: 'contact-2', areaId: 'area-1', count: 1 },
      update: { count: { increment: 1 } }
    })
    expect(mockPrisma.contactProgram.upsert).toHaveBeenCalledWith({
      where: { contactId_programId: { contactId: 'contact-2', programId: 'program-1' } },
      create: { contactId: 'contact-2', programId: 'program-1', count: 1 },
      update: { count: { increment: 1 } }
    })
  })
})