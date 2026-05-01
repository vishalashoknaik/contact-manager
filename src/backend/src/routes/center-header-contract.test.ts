import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  activity: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  area: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  program: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  contact: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn()
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
  const [{ default: activitiesRouter }, { default: areasRouter }, { default: programsRouter }, { default: contactsRouter }] =
    await Promise.all([
      import('./activities'),
      import('./areas'),
      import('./programs'),
      import('./contacts')
    ])

  const app = express()
  app.use(express.json())
  app.use('/api/activities', activitiesRouter)
  app.use('/api/areas', areasRouter)
  app.use('/api/programs', programsRouter)
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
})

describe('center header contract', () => {
  it('rejects center-scoped read and write endpoints when X-Center-ID is missing', async () => {
    const baseUrl = await startTestServer()

    const requests = [
      fetch(`${baseUrl}/api/activities`),
      fetch(`${baseUrl}/api/areas`),
      fetch(`${baseUrl}/api/programs`),
      fetch(`${baseUrl}/api/contacts`),
      fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Walkathon' })
      }),
      fetch(`${baseUrl}/api/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Area1' })
      }),
      fetch(`${baseUrl}/api/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Program1' })
      }),
      fetch(`${baseUrl}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', phone: '9999999999' })
      }),
      fetch(`${baseUrl}/api/contacts/contact-1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: true })
      }),
      fetch(`${baseUrl}/api/contacts/contact-1`, {
        method: 'DELETE'
      })
    ]

    const responses = await Promise.all(requests)
    const payloads = await Promise.all(responses.map(response => response.json()))

    responses.forEach(response => {
      expect(response.status).toBe(400)
    })

    payloads.forEach(payload => {
      expect(payload).toEqual({ error: 'Center ID is required' })
    })

    expect(mockPrisma.activity.create).not.toHaveBeenCalled()
    expect(mockPrisma.area.create).not.toHaveBeenCalled()
    expect(mockPrisma.program.create).not.toHaveBeenCalled()
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.contact.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.contact.update).not.toHaveBeenCalled()
    expect(mockPrisma.contact.delete).not.toHaveBeenCalled()
  })
})
