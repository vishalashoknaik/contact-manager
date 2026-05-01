import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  center: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  userCenter: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const servers: Array<{ close: () => void }> = []

async function startTestServer() {
  const { default: authRouter } = await import('./auth')

  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auth role and registration contract', () => {
  it('returns actionable login error when schema is outdated', async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(
      new Error('The column `user_centers.is_admin` does not exist in the current database.')
    )

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '8765432109', password: '8765432109' })
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error:
        'Login failed. Database schema is outdated. Run "cd src/backend && npx prisma migrate deploy" and restart the backend.'
    })
  })

  it('returns registrationRequired for unknown users on login', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.center.findMany.mockResolvedValueOnce([
      { id: 'center-1', name: 'Center 1' }
    ])

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9999999999', password: '9999999999' })
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'User not found. Please complete registration.',
      registrationRequired: true,
      phone: '9999999999',
      centers: [{ id: 'center-1', name: 'Center 1' }]
    })
  })

  it('creates a pending access request for first-time registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.center.findUnique.mockResolvedValueOnce({ id: 'center-1', name: 'Center 1' })
    mockPrisma.user.create.mockResolvedValueOnce({
      phone: '9999999999',
      name: 'New User',
      canAccessAllCenters: false,
      centers: [
        {
          centerId: 'center-1',
          role: 'USER',
          center: { id: 'center-1', name: 'Center 1' }
        }
      ]
    })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9999999999',
        password: '9999999999',
        name: 'New User',
        centerId: 'center-1'
      })
    })

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      message: 'Registration submitted. An admin must approve access before you can log in.',
      pendingApproval: true
    })
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '9999999999',
          name: 'New User',
          centers: {
            create: [{ centerId: 'center-1', role: 'USER', isApproved: false }]
          }
        })
      })
    )
  })

  it('blocks login while an access request is still pending approval', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '9999999999',
      name: 'Pending User',
      canAccessAllCenters: false,
      centers: [
        {
          centerId: 'center-1',
          role: 'USER',
          isApproved: false,
          center: { id: 'center-1', name: 'Center 1' }
        }
      ]
    })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9999999999', password: '9999999999' })
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Access request pending admin approval.',
      pendingApproval: true,
      centers: [{ id: 'center-1', name: 'Center 1' }]
    })
  })

  it('returns actionable registration error when schema is outdated', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.center.findUnique.mockResolvedValueOnce({ id: 'center-1', name: 'Center 1' })
    mockPrisma.user.create.mockRejectedValueOnce(
      new Error('Unknown argument `role`. Available options are marked with ?.')
    )

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '9999999998',
        password: '9999999998',
        name: 'Broken Schema User',
        centerId: 'center-1'
      })
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error:
        'Registration failed. Database schema is outdated. Run "cd src/backend && npx prisma migrate deploy" and restart the backend.'
    })
  })

  it('blocks center admins from assigning overall admin access', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '9876543210',
        name: 'Center Admin',
        canAccessAllCenters: false,
        centers: [
          {
            centerId: 'center-1',
            role: 'ADMIN',
            isApproved: true,
            center: { id: 'center-1', name: 'Center 1' }
          }
        ]
      })
      .mockResolvedValueOnce({
        phone: '9999999999',
        name: 'Target User',
        canAccessAllCenters: false,
        centers: []
      })

    const token = Buffer.from('9876543210:123').toString('base64')

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/users/9999999999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Center-ID': 'center-1'
      },
      body: JSON.stringify({
        name: 'Target User',
        centerId: 'center-1',
        centerRole: 'ADMIN',
        canAccessAllCenters: true
      })
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Only overall admins can assign overall admin access'
    })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockPrisma.userCenter.upsert).not.toHaveBeenCalled()
  })

  it('allows center users to grant user and attendance taker access', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '9000000001',
        name: 'Center User',
        canAccessAllCenters: false,
        centers: [
          {
            centerId: 'center-1',
            role: 'USER',
            isApproved: true,
            center: { id: 'center-1', name: 'Center 1' }
          }
        ]
      })
      .mockResolvedValueOnce({
        phone: '9000000002',
        name: 'Target User',
        canAccessAllCenters: false,
        centers: []
      })

    mockPrisma.userCenter.findUnique.mockResolvedValueOnce(null)
    mockPrisma.userCenter.upsert.mockResolvedValueOnce({
      user: { phone: '9000000002', name: 'Target User', canAccessAllCenters: false },
      center: { id: 'center-1', name: 'Center 1' },
      role: 'USER',
      isApproved: true
    })

    const token = Buffer.from('9000000001:123').toString('base64')
    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/users/9000000002`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Center-ID': 'center-1'
      },
      body: JSON.stringify({
        name: 'Target User',
        centerId: 'center-1',
        centerRole: 'USER'
      })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        phone: '9000000002',
        centerRole: 'USER',
        isApproved: true,
        accessStatus: 'approved'
      })
    )
  })

  it('blocks attendance takers from granting center user access', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '9000000003',
      name: 'Attendance Taker',
      canAccessAllCenters: false,
      centers: [
        {
          centerId: 'center-1',
          role: 'ATTENDANCE_TAKER',
          isApproved: true,
          center: { id: 'center-1', name: 'Center 1' }
        }
      ]
    })

    const token = Buffer.from('9000000003:123').toString('base64')

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/users/9000000004`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Center-ID': 'center-1'
      },
      body: JSON.stringify({
        name: 'Target User',
        centerId: 'center-1',
        centerRole: 'USER'
      })
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'You can only grant roles within your access level'
    })
  })

  it('removes access for the selected center', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '8765432109',
      name: 'Admin User',
      canAccessAllCenters: true,
      centers: []
    })
    mockPrisma.userCenter.findUnique.mockResolvedValueOnce({ role: 'USER', isApproved: true })
    mockPrisma.userCenter.deleteMany.mockResolvedValueOnce({ count: 1 })

    const token = Buffer.from('8765432109:123').toString('base64')
    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/auth/users/9999999999`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Center-ID': 'center-1'
      }
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mockPrisma.userCenter.deleteMany).toHaveBeenCalledWith({
      where: {
        userPhone: '9999999999',
        centerId: 'center-1'
      }
    })
  })

  it('allows overall admins to create and rename centers', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '8765432109',
        name: 'Admin User',
        canAccessAllCenters: true,
        centers: []
      })
      .mockResolvedValueOnce({
        phone: '8765432109',
        name: 'Admin User',
        canAccessAllCenters: true,
        centers: []
      })
    mockPrisma.center.create.mockResolvedValueOnce({ id: 'center-2', name: 'Center 2' })
    mockPrisma.center.update.mockResolvedValueOnce({ id: 'center-1', name: 'Center One' })

    const token = Buffer.from('8765432109:123').toString('base64')
    const baseUrl = await startTestServer()

    const createResponse = await fetch(`${baseUrl}/api/auth/centers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Center 2' })
    })

    expect(createResponse.status).toBe(201)
    await expect(createResponse.json()).resolves.toEqual({ id: 'center-2', name: 'Center 2' })

    const renameResponse = await fetch(`${baseUrl}/api/auth/centers/center-1`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Center One' })
    })

    expect(renameResponse.status).toBe(200)
    await expect(renameResponse.json()).resolves.toEqual({ id: 'center-1', name: 'Center One' })
  })
})
