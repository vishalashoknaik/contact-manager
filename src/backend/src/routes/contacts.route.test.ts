/**
 * Comprehensive backend route tests for /api/contacts
 * Covers: GET, POST, PATCH, DELETE — all happy paths and all edge cases.
 */
import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockPrisma = {
  contact: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  activity: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  area: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  program: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  contactActivity: { deleteMany: vi.fn(), create: vi.fn() },
  contactArea: { deleteMany: vi.fn(), create: vi.fn() },
  contactProgram: { deleteMany: vi.fn(), create: vi.fn() },
  interest: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
  contactInterest: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn().mockResolvedValue({}) }
}

vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn(() => mockPrisma) }))

// ── Server helpers ────────────────────────────────────────────────────────────
const servers: Array<{ close: () => void }> = []

async function startTestServer() {
  const { default: contactsRouter } = await import('./contacts')
  const app = express()
  app.use(express.json())
  app.use('/api/contacts', contactsRouter)
  const server = await new Promise<import('node:http').Server>(resolve => {
    const instance = app.listen(0, () => resolve(instance))
  })
  servers.push(server)
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(() => {
  while (servers.length > 0) servers.pop()?.close()
  vi.clearAllMocks()
})

// ── Fixture helpers ───────────────────────────────────────────────────────────
const CENTER = 'center-abc'
const CENTER_HEADERS = { 'Content-Type': 'application/json', 'X-Center-ID': CENTER }

function makeDbContact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c-001',
    name: 'Ananya Rao',
    phone: '9964297517',
    gender: 'Female',
    ieDate: null,
    areaOfStay: null,
    remarks: null,
    centerId: CENTER,
    selected: false,
    lastUpdated: new Date('2026-05-01T10:00:00.000Z'),
    importOrder: null,
    activities: [],
    areas: [],
    programs: [],
    interests: [],
    notInterested: false,
    centerChange: false,
    doNotDisturb: false,
    ...overrides
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/contacts
// ════════════════════════════════════════════════════════════════════════════
describe('GET /api/contacts', () => {
  it('returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Center ID is required' })
  })

  it('returns empty array when no contacts exist for center', async () => {
    mockPrisma.contact.findMany.mockResolvedValueOnce([])
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, { headers: { 'X-Center-ID': CENTER } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('transforms DB rows to frontend format', async () => {
    const dbRow = makeDbContact({
      gender: 'Female',
      ieDate: new Date('2026-02-15'),
      areaOfStay: 'HSR Layout',
      remarks: 'Active',
      selected: true,
      importOrder: 3,
      activities: [{ activity: { name: 'Walkathon' }, count: 7 }],
      areas: [{ area: { name: 'HSR' }, count: 2 }],
      programs: [{ program: { name: 'Satsang' }, count: 5 }]
    })
    mockPrisma.contact.findMany.mockResolvedValueOnce([dbRow])
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, { headers: { 'X-Center-ID': CENTER } })
    expect(res.status).toBe(200)
    const [contact] = await res.json()
    expect(contact.id).toBe('c-001')
    expect(contact.gender).toBe('Female')
    expect(contact.ieDate).toBeDefined()
    expect(contact.areaOfStay).toBe('HSR Layout')
    expect(contact.remarks).toBe('Active')
    expect(contact.selected).toBe(true)
    expect(contact.importOrder).toBe(3)
    expect(contact.activities).toEqual({ Walkathon: 7 })
    expect(contact.areas).toEqual({ HSR: 2 })
    expect(contact.programs).toEqual({ Satsang: 5 })
    expect(typeof contact.lastUpdated).toBe('string')
  })

  it('defaults gender to Male when DB value is null', async () => {
    mockPrisma.contact.findMany.mockResolvedValueOnce([makeDbContact({ gender: null })])
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, { headers: { 'X-Center-ID': CENTER } })
    const [contact] = await res.json()
    expect(contact.gender).toBe('Male')
  })

  it('returns 500 when prisma.findMany throws', async () => {
    mockPrisma.contact.findMany.mockRejectedValueOnce(new Error('DB crash'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, { headers: { 'X-Center-ID': CENTER } })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to fetch contacts' })
  })

  it('maps multiple contacts in correct transformed structure', async () => {
    const dbRows = [
      makeDbContact({ id: 'c-001', name: 'Alice', phone: '1111111111' }),
      makeDbContact({ id: 'c-002', name: 'Bob', phone: '2222222222' })
    ]
    mockPrisma.contact.findMany.mockResolvedValueOnce(dbRows)
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, { headers: { 'X-Center-ID': CENTER } })
    const data = await res.json()
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Alice')
    expect(data[1].name).toBe('Bob')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// POST /api/contacts
// ════════════════════════════════════════════════════════════════════════════
describe('POST /api/contacts', () => {
  beforeEach(() => {
    mockPrisma.contactActivity.deleteMany.mockResolvedValue({})
    mockPrisma.contactArea.deleteMany.mockResolvedValue({})
    mockPrisma.contactProgram.deleteMany.mockResolvedValue({})
  })

  it('returns 400 when name is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ phone: '9876543210' })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Name and phone are required' })
  })

  it('returns 400 when phone is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice' })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Name and phone are required' })
  })

  it('returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', phone: '9876543210' })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Center ID is required' })
  })

  it('returns 201 and upserts a new contact with defaults', async () => {
    const dbRow = makeDbContact({ name: 'Alice', phone: '9876543210', selected: true })
    mockPrisma.contact.upsert.mockResolvedValueOnce(dbRow)
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice', phone: '9876543210' })
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.contact.name).toBeDefined()
    // Verify upsert called with gender default
    const call = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(call.create.gender).toBe('Male')
    expect(call.create.centerId).toBe(CENTER)
    expect(call.create.selected).toBe(true)
  })

  it('upsert preserves existing optional fields when not provided', async () => {
    mockPrisma.contact.upsert.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice', phone: '9876543210' })
    })
    const call = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(call.update.gender).toBeUndefined()
    expect(call.update.ieDate).toBeUndefined()
    expect(call.update.areaOfStay).toBeUndefined()
    expect(call.update.remarks).toBeUndefined()
  })

  it('upsert explicitly sets optional fields when provided as null', async () => {
    mockPrisma.contact.upsert.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice', phone: '9876543210', ieDate: null, areaOfStay: null, remarks: null })
    })
    const call = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(call.update.ieDate).toBeNull()
    expect(call.update.areaOfStay).toBeNull()
    expect(call.update.remarks).toBeNull()
  })

  it('stores selected=false when explicitly passed', async () => {
    mockPrisma.contact.upsert.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice', phone: '9876543210', selected: false })
    })
    const call = mockPrisma.contact.upsert.mock.calls[0][0]
    expect(call.create.selected).toBe(false)
    expect(call.update.selected).toBe(false)
  })

  it('returns 500 when upsert throws', async () => {
    mockPrisma.contact.upsert.mockRejectedValueOnce(new Error('DB error'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'Alice', phone: '9876543210' })
    })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to create/update contact' })
  })

  it('accepts all three gender values', async () => {
    const baseUrl = await startTestServer()
    for (const gender of ['Male', 'Female', 'Other']) {
      mockPrisma.contact.upsert.mockResolvedValueOnce(makeDbContact({ gender }))
      mockPrisma.contactActivity.deleteMany.mockResolvedValueOnce({})
      mockPrisma.contactArea.deleteMany.mockResolvedValueOnce({})
      mockPrisma.contactProgram.deleteMany.mockResolvedValueOnce({})
      const res = await fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: CENTER_HEADERS,
        body: JSON.stringify({ name: 'Alice', phone: '9876543210', gender })
      })
      expect(res.status).toBe(201)
      const call = mockPrisma.contact.upsert.mock.calls.at(-1)![0]
      expect(call.create.gender).toBe(gender)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// PATCH /api/contacts/:id
// ════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/contacts/:id', () => {
  it('returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected: true })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Center ID is required' })
  })

  it('returns 404 when contact does not belong to the center', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(null)
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/not-mine`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ selected: true })
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Contact not found' })
  })

  it('updates the selected field successfully', async () => {
    const existing = makeDbContact()
    const updated = makeDbContact({ selected: true, activities: [], areas: [], programs: [] })
    mockPrisma.contact.findFirst.mockResolvedValueOnce(existing)
    mockPrisma.contact.update.mockResolvedValueOnce(updated)
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ selected: true })
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.selected).toBe(true)
    const call = mockPrisma.contact.update.mock.calls[0][0]
    expect(call.where.id).toBe('c-001')
    expect(call.data.selected).toBe(true)
  })

  it('updates name and phone fields successfully', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.update.mockResolvedValueOnce(makeDbContact({ name: 'New Name', phone: '9000000000' }))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: 'New Name', phone: '9000000000' })
    })
    expect(res.status).toBe(200)
    const call = mockPrisma.contact.update.mock.calls[0][0]
    expect(call.data.name).toBe('New Name')
    expect(call.data.phone).toBe('9000000000')
  })

  it('returns 400 when name is provided as empty string', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: '   ' })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Name cannot be empty' })
  })

  it('returns 400 when phone is provided as empty string', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ phone: '' })
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Phone cannot be empty' })
  })

  it('updates optional fields (gender, ieDate, areaOfStay, remarks)', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.update.mockResolvedValueOnce(makeDbContact({
      gender: 'Female', ieDate: new Date('2026-01-01'), areaOfStay: 'Bellandur', remarks: 'VIP'
    }))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ gender: 'Female', ieDate: '2026-01-01', areaOfStay: 'Bellandur', remarks: 'VIP' })
    })
    expect(res.status).toBe(200)
    const call = mockPrisma.contact.update.mock.calls[0][0]
    expect(call.data.gender).toBe('Female')
    expect(call.data.areaOfStay).toBe('Bellandur')
    expect(call.data.remarks).toBe('VIP')
  })

  it('does not overwrite undefined optional fields', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.update.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ selected: false })
    })
    const call = mockPrisma.contact.update.mock.calls[0][0]
    expect(call.data.gender).toBeUndefined()
    expect(call.data.ieDate).toBeUndefined()
    expect(call.data.areaOfStay).toBeUndefined()
    expect(call.data.remarks).toBeUndefined()
  })

  it('returns 500 (not 404) when prisma.update throws unexpectedly', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.update.mockRejectedValueOnce(new Error('DB deadlock'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ selected: true })
    })
    expect(res.status).toBe(500)
    // Should NOT say "Contact not found" for an unexpected DB error
    const body = await res.json()
    expect(body.error).not.toBe('Contact not found')
  })

  it('trims whitespace from name and phone', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.update.mockResolvedValueOnce(makeDbContact())
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: CENTER_HEADERS,
      body: JSON.stringify({ name: '  Alice  ', phone: '  9876543210  ' })
    })
    const call = mockPrisma.contact.update.mock.calls[0][0]
    expect(call.data.name).toBe('Alice')
    expect(call.data.phone).toBe('9876543210')
  })

  it('scopes lookup to the requesting center (cross-center isolation)', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(null) // contact exists but not in this center
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': 'other-center' },
      body: JSON.stringify({ selected: true })
    })
    expect(res.status).toBe(404)
    // Verify the findFirst query included the centerId
    const call = mockPrisma.contact.findFirst.mock.calls[0][0]
    expect(call.where.centerId).toBe('other-center')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/contacts/:id
// ════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/contacts/:id', () => {
  it('returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, { method: 'DELETE' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Center ID is required' })
  })

  it('returns 404 when contact is not found in the center', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(null)
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-999`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': CENTER }
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Contact not found' })
  })

  it('deletes successfully and returns success', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.delete.mockResolvedValueOnce({})
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': CENTER }
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockPrisma.contact.delete).toHaveBeenCalledWith({ where: { id: 'c-001' } })
  })

  it('scopes deletion lookup to the requesting center', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(null)
    const baseUrl = await startTestServer()
    await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': 'other-center' }
    })
    const call = mockPrisma.contact.findFirst.mock.calls[0][0]
    expect(call.where.centerId).toBe('other-center')
    expect(call.where.id).toBe('c-001')
  })

  it('returns 404 on prisma error (catch-all)', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(makeDbContact())
    mockPrisma.contact.delete.mockRejectedValueOnce(new Error('FK constraint'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/contacts/c-001`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': CENTER }
    })
    expect(res.status).toBe(404)
  })
})
