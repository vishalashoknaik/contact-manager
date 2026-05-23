/**
 * Interests route tests
 * Covers GET, POST, DELETE /api/interests following the same pattern
 * as the activities, areas, and programs route tests.
 */
import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  interest: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const servers: Array<{ close: () => void }> = []

async function startTestServer() {
  const { default: interestsRouter } = await import('./interests')
  const app = express()
  app.use(express.json())
  app.use('/api/interests', interestsRouter)
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

describe('GET /api/interests', () => {
  it('returns 400 when center ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/interests`)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Center ID/i)
  })

  it('returns list of interest names for a center', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.findMany.mockResolvedValueOnce([
      { id: '1', name: 'Yoga', centerId: 'c1' },
      { id: '2', name: 'Meditation', centerId: 'c1' }
    ])
    const res = await fetch(`${baseUrl}/api/interests`, {
      headers: { 'X-Center-ID': 'c1' }
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(['Yoga', 'Meditation'])
  })

  it('returns empty array when no interests exist', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.findMany.mockResolvedValueOnce([])
    const res = await fetch(`${baseUrl}/api/interests`, {
      headers: { 'X-Center-ID': 'c1' }
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns 500 when database throws', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.findMany.mockRejectedValueOnce(new Error('db error'))
    const res = await fetch(`${baseUrl}/api/interests`, {
      headers: { 'X-Center-ID': 'c1' }
    })
    expect(res.status).toBe(500)
  })
})

describe('POST /api/interests', () => {
  it('returns 400 when name is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': 'c1' },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Name/i)
  })

  it('returns 400 when center ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yoga' })
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Center ID/i)
  })

  it('creates an interest and returns its name', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.create.mockResolvedValueOnce({ id: '1', name: 'Yoga', centerId: 'c1' })
    const res = await fetch(`${baseUrl}/api/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': 'c1' },
      body: JSON.stringify({ name: 'Yoga' })
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toBe('Yoga')
  })

  it('returns 400 when interest already exists (P2002)', async () => {
    const baseUrl = await startTestServer()
    const err: any = new Error('unique')
    err.code = 'P2002'
    mockPrisma.interest.create.mockRejectedValueOnce(err)
    const res = await fetch(`${baseUrl}/api/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': 'c1' },
      body: JSON.stringify({ name: 'Yoga' })
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/already exists/i)
  })
})

describe('DELETE /api/interests/:name', () => {
  it('returns 400 when center ID header is missing', async () => {
    const baseUrl = await startTestServer()
    const res = await fetch(`${baseUrl}/api/interests/Yoga`, { method: 'DELETE' })
    expect(res.status).toBe(400)
  })

  it('deletes the interest and returns success', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.deleteMany.mockResolvedValueOnce({ count: 1 })
    const res = await fetch(`${baseUrl}/api/interests/Yoga`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': 'c1' }
    })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('returns 404 when interest is not found', async () => {
    const baseUrl = await startTestServer()
    mockPrisma.interest.deleteMany.mockResolvedValueOnce({ count: 0 })
    const res = await fetch(`${baseUrl}/api/interests/Unknown`, {
      method: 'DELETE',
      headers: { 'X-Center-ID': 'c1' }
    })
    expect(res.status).toBe(404)
  })
})
