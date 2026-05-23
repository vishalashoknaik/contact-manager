/**
 * Campaign route — extended tests
 * Covers the scenarios missing from campaigns.test.ts:
 *   - GET /api/campaigns — 401 (no auth), 400 (no center), 200 list
 *   - GET /api/campaigns/:id — 404 not found, 200 happy path
 *   - PUT /api/campaigns/:id/volunteers — 400 missing array, 200 success
 *   - POST /api/campaigns/:id/call-log — 400 bad feedback, 400 missing
 *     campaignContactId, 200 success returning next contact
 *   - POST /api/campaigns — 400 missing name, 403 wrong center
 */
import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  user: {
    findUnique: vi.fn()
  },
  userCenter: {
    create: vi.fn(),
    update: vi.fn()
  },
  campaign: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn()
  },
  campaignContact: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  campaignVolunteer: {
    deleteMany: vi.fn(),
    create: vi.fn()
  },
  campaignCallLog: {
    upsert: vi.fn(),
    findMany: vi.fn()
  },
  contact: {
    update: vi.fn()
  },
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  Prisma: {}
}))

const servers: Array<{ close: () => void }> = []

function authHeaderFor(phone: string) {
  const token = Buffer.from(`${phone}:password`).toString('base64')
  return { Authorization: `Bearer ${token}` }
}

const CENTER_HEADERS = {
  'Content-Type': 'application/json',
  'X-Center-ID': 'center-1'
}

async function startTestServer() {
  const { default: campaignsRouter } = await import('./campaigns')
  const app = express()
  app.use(express.json())
  app.use('/api/campaigns', campaignsRouter)
  const server = await new Promise<import('node:http').Server>(resolve => {
    const instance = app.listen(0, () => resolve(instance))
  })
  servers.push(server)
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

function makeUser(phone: string, centerId = 'center-1') {
  return {
    phone,
    canAccessAllCenters: false,
    centers: [{ centerId, isApproved: true, role: 'USER' }]
  }
}

function makeCampaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    centerId: 'center-1',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    messageTemplates: null,
    contacts: [],
    volunteers: [],
    ...overrides
  }
}

afterEach(() => {
  while (servers.length > 0) servers.pop()?.close()
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
})

// ── POST /api/campaigns ───────────────────────────────────────────────────────
describe('POST /api/campaigns', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': 'center-1' },
      body: JSON.stringify({ name: 'Test' })
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is empty', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: '   ' })
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Campaign name is required' })
  })

  it('returns 400 when X-Center-ID header is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: 'Test' })
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 when user has no access to the requested center', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111', 'other-center'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: 'Test' })
    })
    expect(res.status).toBe(403)
  })
})

// ── GET /api/campaigns ────────────────────────────────────────────────────────
describe('GET /api/campaigns', () => {
  it('returns 401 without auth header', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      headers: { 'X-Center-ID': 'center-1' }
    })
    expect(res.status).toBe(401)
  })

  it('returns the campaign list for authenticated user', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findMany.mockResolvedValueOnce([makeCampaignRow()])

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      headers: { 'X-Center-ID': 'center-1', ...authHeaderFor('1111111111') }
    })

    expect(res.status).toBe(200)
    const data = await res.json() as Array<{ name: string }>
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].name).toBe('Test Campaign')
  })

  it('returns 400 when X-Center-ID is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns`, {
      headers: { ...authHeaderFor('1111111111') }
    })
    expect(res.status).toBe(400)
  })
})

// ── GET /api/campaigns/:id ────────────────────────────────────────────────────
describe('GET /api/campaigns/:id', () => {
  it('returns 404 when campaign does not exist for center', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(null)

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/nonexistent-id`, {
      headers: { 'X-Center-ID': 'center-1', ...authHeaderFor('1111111111') }
    })
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: 'Campaign not found' })
  })

  it('returns 200 with campaign data when found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1`, {
      headers: { 'X-Center-ID': 'center-1', ...authHeaderFor('1111111111') }
    })
    expect(res.status).toBe(200)
    const data = await res.json() as { name: string }
    expect(data.name).toBe('Test Campaign')
  })
})

// ── PUT /api/campaigns/:id/volunteers ─────────────────────────────────────────
describe('PUT /api/campaigns/:id/volunteers', () => {
  it('returns 400 when volunteerPhones is not an array', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ volunteerPhones: 'not-an-array' })
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'volunteerPhones array is required' })
  })

  it('returns 403 when caller is ATTENDANCE_TAKER role', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ volunteerPhones: ['9999999999'] })
    })
    expect(res.status).toBe(403)
  })

  it('replaces volunteer list and returns updated campaign', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(makeUser('1111111111')) // actor
      .mockResolvedValueOnce(null)                   // target volunteer (no existing user)
    mockPrisma.campaign.findFirst
      .mockResolvedValueOnce(makeCampaignRow())  // guard lookup
      .mockResolvedValueOnce({                   // final fetch
        ...makeCampaignRow(),
        volunteers: [{ volunteerPhone: '9999999999', volunteer: { phone: '9999999999' } }]
      })
    mockPrisma.campaignVolunteer.deleteMany.mockResolvedValueOnce({})
    mockPrisma.campaignVolunteer.create.mockResolvedValueOnce({})
    mockPrisma.$transaction.mockResolvedValueOnce([{}, {}])

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ volunteerPhones: ['9999999999'] })
    })
    expect(res.status).toBe(200)
  })
})

// ── POST /api/campaigns/:id/call-log ─────────────────────────────────────────
describe('POST /api/campaigns/:id/call-log', () => {
  it('returns 400 when feedback value is invalid', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({
        campaignContactId: 'cc-1',
        feedback: 'INVALID_FEEDBACK',
        action: 'submit'
      })
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'Valid feedback is required' })
  })

  it('returns 400 when campaignContactId is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ feedback: 'COMPLETED', action: 'submit' })
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'campaignContactId is required' })
  })

  it('returns 400 when action is invalid', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ campaignContactId: 'cc-1', feedback: 'COMPLETED', action: 'fly' })
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'action must be submit or skip' })
  })

  it('returns 200 with next contact when submission succeeds', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())
    mockPrisma.campaignContact.findFirst
      .mockResolvedValueOnce({  // guard: campaign contact exists
        id: 'cc-1',
        contactId: 'contact-ext-1',
        campaignId: 'campaign-1',
        createdAt: new Date(),
        status: 'PENDING'
      })
      .mockResolvedValueOnce({  // next contact query
        id: 'cc-2',
        createdAt: new Date(),
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      })
    mockPrisma.$transaction.mockResolvedValueOnce([{}, {}])
    mockPrisma.contact.update.mockResolvedValueOnce({})

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({
        campaignContactId: 'cc-1',
        feedback: 'NO_RESPONSE',
        action: 'submit',
        centerChange: false,
        doNotDisturb: true
      })
    })

    expect(res.status).toBe(200)
    const data = await res.json() as { success: boolean; next: { done: boolean; contact: { name: string } } }
    expect(data.success).toBe(true)
    expect(data.next.done).toBe(false)
    expect(data.next.contact.name).toBe('Bob')
  })

  it('returns done:true when there are no more contacts', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())
    mockPrisma.campaignContact.findFirst
      .mockResolvedValueOnce({ id: 'cc-1', campaignId: 'campaign-1', createdAt: new Date(), status: 'PENDING' })
      .mockResolvedValueOnce(null) // no more contacts
    mockPrisma.$transaction.mockResolvedValueOnce([{}, {}])

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ campaignContactId: 'cc-1', feedback: 'COMPLETED', action: 'submit' })
    })

    expect(res.status).toBe(200)
    const data = await res.json() as { next: { done: boolean } }
    expect(data.next.done).toBe(true)
  })

  it('returns 404 when campaign contact does not belong to the campaign', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(makeUser('1111111111'))
    mockPrisma.campaign.findFirst.mockResolvedValueOnce(makeCampaignRow())
    mockPrisma.campaignContact.findFirst.mockResolvedValueOnce(null)

    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: { ...CENTER_HEADERS, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ campaignContactId: 'cc-orphan', feedback: 'COMPLETED', action: 'submit' })
    })
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ error: 'Campaign contact not found' })
  })
})
