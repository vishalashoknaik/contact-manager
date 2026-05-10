import express from 'express'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn()
  },
  contact: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
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
  },
  attendanceSession: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  attendanceSessionEntry: {
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn()
  },
  attendanceSessionVolunteer: {
    create: vi.fn()
  },
  userCenter: {
    create: vi.fn(),
    update: vi.fn()
  }
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}))

const servers: Array<{ close: () => void }> = []

function authHeaderFor(phone: string) {
  const token = Buffer.from(`${phone}:password`).toString('base64')
  return { Authorization: `Bearer ${token}` }
}

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

  it('starts an attendance session for a volunteer with attendance access', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)
    mockPrisma.attendanceSession.create.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({ name: 'Morning Session', activities: ['Walkathon'], areas: ['Downtown'], programs: ['Youth Program'] })
    })

    expect(response.status).toBe(201)
    const data = await response.json() as { id: string; name: string; volunteers: Array<{ phone: string }> }
    expect(data.id).toBe('session-1')
    expect(data.name).toBe('Morning Session')
    expect(data.volunteers).toHaveLength(1)
    expect(data.volunteers[0].phone).toBe('1111111111')
  })

  it('allows a session volunteer to add a second volunteer for the same session', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '1111111111',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
      })
      .mockResolvedValueOnce({
        phone: '2222222222',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
      })

    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })

    mockPrisma.attendanceSessionVolunteer.create.mockResolvedValueOnce({ id: 'join-1' })

    mockPrisma.attendanceSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        },
        {
          volunteerPhone: '2222222222',
          volunteer: { phone: '2222222222', name: 'Volunteer Two' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({ volunteerPhone: '2222222222' })
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { volunteers: Array<{ phone: string }> }
    expect(data.volunteers).toHaveLength(2)
    expect(data.volunteers.map(v => v.phone)).toContain('2222222222')
  })

  it('matches an existing volunteer by normalized phone and reuses the stored phone value', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '1111111111',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
      })
      .mockResolvedValueOnce(null)

    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        phone: '222-222-2222',
        canAccessAllCenters: false,
        centers: []
      }
    ])

    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })
    mockPrisma.userCenter.create.mockResolvedValueOnce({ id: 'membership-1' })
    mockPrisma.attendanceSessionVolunteer.create.mockResolvedValueOnce({ id: 'join-2' })
    mockPrisma.attendanceSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        },
        {
          volunteerPhone: '222-222-2222',
          volunteer: { phone: '222-222-2222', name: 'Volunteer Two' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({ volunteerPhone: '(222) 222-2222' })
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({ include: { centers: true } })
    expect(mockPrisma.userCenter.create).toHaveBeenCalledWith({
      data: {
        userPhone: '222-222-2222',
        centerId,
        role: 'ATTENDANCE_TAKER',
        isApproved: true
      }
    })
    expect(mockPrisma.attendanceSessionVolunteer.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        volunteerPhone: '222-222-2222',
        grantedByPhone: '1111111111'
      }
    })
  })

  it('creates a user from an existing contact before granting attendance access', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '1111111111',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
      })
      .mockResolvedValueOnce(null)
    mockPrisma.user.findMany.mockResolvedValueOnce([])
    mockPrisma.contact.findFirst.mockResolvedValueOnce({
      id: 'contact-9',
      name: 'Contact Volunteer',
      phone: '3333333333',
      centerId
    })
    mockPrisma.user.create.mockResolvedValueOnce({
      phone: '3333333333',
      name: 'Contact Volunteer',
      canAccessAllCenters: false,
      centers: []
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })
    mockPrisma.userCenter.create.mockResolvedValueOnce({ id: 'membership-2' })
    mockPrisma.attendanceSessionVolunteer.create.mockResolvedValueOnce({ id: 'join-3' })
    mockPrisma.attendanceSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        },
        {
          volunteerPhone: '3333333333',
          volunteer: { phone: '3333333333', name: 'Contact Volunteer' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({ volunteerPhone: '3333333333' })
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
      where: { centerId, phone: { in: ['3333333333', '3333333333'] } }
    })
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { phone: '3333333333', name: 'Contact Volunteer' },
      include: { centers: true }
    })
  })

  it('approves pending center membership and does not duplicate an existing session volunteer', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '1111111111',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
      })
      .mockResolvedValueOnce(null)
    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        phone: '444-444-4444',
        canAccessAllCenters: false,
        centers: [{ centerId, isApproved: false, role: 'ATTENDANCE_TAKER' }]
      }
    ])
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        },
        {
          volunteerPhone: '444-444-4444',
          volunteer: { phone: '444-444-4444', name: 'Volunteer Four' }
        }
      ]
    })
    mockPrisma.userCenter.update.mockResolvedValueOnce({ id: 'membership-4' })
    mockPrisma.attendanceSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Morning Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        },
        {
          volunteerPhone: '444-444-4444',
          volunteer: { phone: '444-444-4444', name: 'Volunteer Four' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({ volunteerPhone: '4444444444' })
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.userCenter.update).toHaveBeenCalledWith({
      where: { userPhone_centerId: { userPhone: '444-444-4444', centerId } },
      data: { isApproved: true }
    })
    expect(mockPrisma.attendanceSessionVolunteer.create).not.toHaveBeenCalled()
  })

  it('allows a session volunteer to reopen an ended attendance session', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Ended Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: new Date('2026-05-02T11:00:00.000Z'),
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })
    mockPrisma.attendanceSession.update.mockResolvedValueOnce({
      id: 'session-1',
      name: 'Ended Session',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth Program'],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [
        {
          volunteerPhone: '1111111111',
          volunteer: { phone: '1111111111', name: 'Volunteer One' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.attendanceSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { endedAt: null },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  })

  it('allows a session volunteer to delete an attendance session', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [{ volunteerPhone: '1111111111' }]
    })
    mockPrisma.attendanceSession.delete.mockResolvedValueOnce({ id: 'session-1' })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.attendanceSession.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' }
    })
  })

  it('returns shared session attendees for volunteers', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [{ volunteerPhone: '1111111111' }]
    })
    mockPrisma.attendanceSessionEntry.findMany.mockResolvedValueOnce([
      {
        id: 'entry-1',
        contactName: 'Synced Person',
        contactPhone: '9999999999',
        createdAt: new Date('2026-05-02T10:05:00.000Z')
      }
    ])

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/attendees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as Array<{ name: string; phone: string }>
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Synced Person')
    expect(data[0].phone).toBe('9999999999')
  })

  it('stores a session attendee entry when attendance is submitted with an active session id', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [{ volunteerPhone: '1111111111' }]
    })
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({
      id: 'contact-22',
      name: 'Session Person',
      phone: '1231231234'
    })
    mockPrisma.attendanceSessionEntry.upsert.mockResolvedValueOnce({ id: 'entry-22' })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({
        name: 'Session Person',
        phone: '1231231234',
        gender: 'Female',
        ieDate: '2026 Batch',
        areaOfStay: 'Downtown',
        sessionId: 'session-1',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(201)
    expect(mockPrisma.attendanceSessionEntry.upsert).toHaveBeenCalledWith({
      where: {
        sessionId_contactId: {
          sessionId: 'session-1',
          contactId: 'contact-22'
        }
      },
      create: {
        sessionId: 'session-1',
        contactId: 'contact-22',
        contactName: 'Session Person',
        contactPhone: '1231231234',
        submittedByPhone: '1111111111'
      },
      update: {
        contactName: 'Session Person',
        contactPhone: '1231231234'
      }
    })
  })

  it('rejects reopening a session when actor is not in session volunteers', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [
        {
          volunteerPhone: '2222222222',
          volunteer: { phone: '2222222222', name: 'Other Volunteer' }
        }
      ]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/reopen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSession.update).not.toHaveBeenCalled()
  })

  it('rejects deleting a session when actor is not in session volunteers', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [{ volunteerPhone: '3333333333' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSession.delete).not.toHaveBeenCalled()
  })

  it('rejects attendee listing when actor is not in session volunteers', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      volunteers: [{ volunteerPhone: '4444444444' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/attendees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      }
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSessionEntry.findMany).not.toHaveBeenCalled()
  })

  it('rejects attendance submit when session id is not active', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': centerId,
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({
        name: 'Session Person',
        phone: '1231231234',
        gender: 'Female',
        ieDate: '2026 Batch',
        areaOfStay: 'Downtown',
        sessionId: 'missing-session',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.attendanceSessionEntry.upsert).not.toHaveBeenCalled()
  })

  // ─── GET /sessions ─────────────────────────────────────────────────────────

  it('GET /sessions returns all sessions for the authenticated actor', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findMany.mockResolvedValueOnce([
      {
        id: 'session-list-1',
        name: 'Morning Session',
        centerId,
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program'],
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        endedAt: null,
        volunteers: [{ volunteerPhone: '1111111111', volunteer: { phone: '1111111111', name: 'Volunteer One' } }],
        _count: { volunteers: 1, entries: 7 }
      }
    ])

    const response = await fetch(`${baseUrl}/api/attendance/sessions`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as Array<{ id: string; attendeeCount: number; volunteers: Array<{ phone: string }> }>
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('session-list-1')
    expect(data[0].attendeeCount).toBe(7)
    expect(data[0].volunteers[0].phone).toBe('1111111111')
  })

  it('GET /sessions returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions`, {
      headers: { ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Center ID is required')
  })

  it('GET /sessions returns 401 when authorization header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(401)
  })

  it('GET /sessions returns 403 when user does not have attendance access for the center', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId: 'other-center', isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSession.findMany).not.toHaveBeenCalled()
  })

  it('GET /sessions allows canAccessAllCenters admin without explicit center membership', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: true,
      centers: []
    })
    mockPrisma.attendanceSession.findMany.mockResolvedValueOnce([])

    const response = await fetch(`${baseUrl}/api/attendance/sessions`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as unknown[]
    expect(data).toHaveLength(0)
  })

  // ─── GET /sessions/active ──────────────────────────────────────────────────

  it('GET /sessions/active returns the active session when one exists', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-active',
      name: 'Active Session',
      centerId,
      activities: ['Walkathon'],
      areas: [],
      programs: [],
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      endedAt: null,
      volunteers: [{ volunteerPhone: '1111111111', volunteer: { phone: '1111111111', name: 'Vol One' } }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/active`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { active: boolean; session?: { id: string } }
    expect(data.active).toBe(true)
    expect(data.session?.id).toBe('session-active')
  })

  it('GET /sessions/active returns { active: false } when no active session exists', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/active`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { active: boolean; session?: unknown }
    expect(data.active).toBe(false)
    expect(data.session).toBeUndefined()
  })

  it('GET /sessions/active returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/active`, {
      headers: { ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(400)
  })

  it('GET /sessions/active returns 401 when auth header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/active`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(401)
  })

  // ─── POST /sessions/start — error cases ───────────────────────────────────

  it('POST /sessions/start returns 400 when session name is blank', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: '   ', activities: [], areas: [], programs: [] })
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Session name is required')
    expect(mockPrisma.attendanceSession.create).not.toHaveBeenCalled()
  })

  it('POST /sessions/start returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: 'Morning', activities: [], areas: [], programs: [] })
    })

    expect(response.status).toBe(400)
  })

  it('POST /sessions/start returns 403 when user lacks attendance access', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: []
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: 'Morning', activities: [], areas: [], programs: [] })
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSession.create).not.toHaveBeenCalled()
  })

  it('POST /sessions/start strips empty strings and whitespace from activity/area/program lists', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.create.mockResolvedValueOnce({
      id: 'session-trim',
      name: 'Trimmed',
      centerId,
      activities: ['Walkathon'],
      areas: ['Downtown'],
      programs: ['Youth'],
      createdAt: new Date(),
      endedAt: null,
      volunteers: [{ volunteerPhone: '1111111111', volunteer: { phone: '1111111111', name: 'V' } }]
    })

    await fetch(`${baseUrl}/api/attendance/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ name: 'Trimmed', activities: ['  Walkathon  ', ''], areas: ['  Downtown  '], programs: [' Youth '] })
    })

    const createCall = mockPrisma.attendanceSession.create.mock.calls[0][0]
    expect(createCall.data.activities).toEqual(['Walkathon'])
    expect(createCall.data.areas).toEqual(['Downtown'])
    expect(createCall.data.programs).toEqual(['Youth'])
  })

  // ─── POST /sessions/:id/volunteers — error cases ──────────────────────────

  it('POST /sessions/:id/volunteers returns 400 when volunteerPhone is missing', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({})
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('volunteerPhone is required')
  })

  it('POST /sessions/:id/volunteers returns 404 when session does not exist or is ended', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/missing-session/volunteers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ volunteerPhone: '2222222222' })
    })

    expect(response.status).toBe(404)
  })

  it('POST /sessions/:id/volunteers returns 403 when actor is not a session volunteer', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      endedAt: null,
      volunteers: [{ volunteerPhone: '9999999999', volunteer: { phone: '9999999999', name: 'Other' } }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/volunteers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({ volunteerPhone: '2222222222' })
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  // ─── POST /sessions/:id/end ────────────────────────────────────────────────

  it('POST /sessions/:id/end marks the session as ended', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      endedAt: null,
      volunteers: [{ volunteerPhone: '1111111111' }]
    })
    mockPrisma.attendanceSession.update.mockResolvedValueOnce({ id: 'session-1', endedAt: new Date() })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { success: boolean }
    expect(data.success).toBe(true)
    expect(mockPrisma.attendanceSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { endedAt: expect.any(Date) as Date }
    })
  })

  it('POST /sessions/:id/end returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(400)
  })

  it('POST /sessions/:id/end returns 401 when auth header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(401)
  })

  it('POST /sessions/:id/end returns 404 when session does not exist', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/missing/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.attendanceSession.update).not.toHaveBeenCalled()
  })

  it('POST /sessions/:id/end returns 403 when actor is not a session volunteer', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      endedAt: null,
      volunteers: [{ volunteerPhone: '9999999999' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.attendanceSession.update).not.toHaveBeenCalled()
  })

  // ─── GET /sessions/:id/attendees — missing cases ──────────────────────────

  it('GET /sessions/:id/attendees returns 404 when session not found', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/missing/attendees`, {
      headers: { 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.attendanceSessionEntry.findMany).not.toHaveBeenCalled()
  })

  it('GET /sessions/:id/attendees returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/attendees`, {
      headers: { ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(400)
  })

  it('GET /sessions/:id/attendees returns 401 when auth header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/sessions/session-1/attendees`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(401)
  })

  // ─── GET /lookup — missing cases ──────────────────────────────────────────

  it('GET /lookup returns { found: false } when contact does not exist', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/lookup?phone=0000000000`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { found: boolean; contact?: unknown }
    expect(data.found).toBe(false)
    expect(data.contact).toBeUndefined()
  })

  it('GET /lookup returns 400 when phone query param is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/lookup`, {
      headers: { 'X-Center-ID': centerId }
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Phone is required')
  })

  it('GET /lookup returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/lookup?phone=1234567890`)

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Center ID is required')
  })

  // ─── POST /submit — missing edge cases ───────────────────────────────────

  it('POST /submit returns 400 when name or phone is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId },
      body: JSON.stringify({ activities: [], areas: [], programs: [] })
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Name and phone are required')
  })

  it('POST /submit returns 400 when X-Center-ID header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Person', phone: '9999999999', activities: [], areas: [], programs: [] })
    })

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Center ID is required')
  })

  it('POST /submit returns 403 when actor is not a volunteer in the specified session', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      endedAt: null,
      volunteers: [{ volunteerPhone: '9999999999' }]
    })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({
        name: 'Person',
        phone: '5555555555',
        gender: 'Male',
        ieDate: '2026',
        areaOfStay: 'Downtown',
        sessionId: 'session-1',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(403)
    expect(mockPrisma.contact.upsert).not.toHaveBeenCalled()
  })

  it('POST /submit auto-creates an activity that does not exist in the center', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-new' })
    mockPrisma.activity.findUnique.mockResolvedValueOnce(null)
    mockPrisma.activity.create.mockResolvedValueOnce({ id: 'activity-new', name: 'Brand New Activity', centerId })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId },
      body: JSON.stringify({
        name: 'New Person',
        phone: '8888888888',
        gender: 'Male',
        ieDate: '2026',
        areaOfStay: 'North',
        activities: ['Brand New Activity'],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(201)
    expect(mockPrisma.activity.create).toHaveBeenCalledWith({ data: { name: 'Brand New Activity', centerId } })
    expect(mockPrisma.contactActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ contactId: 'contact-new', activityId: 'activity-new' }) })
    )
  })

  it('POST /submit auto-creates area and program when they do not exist', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-ap' })
    mockPrisma.area.findUnique.mockResolvedValueOnce(null)
    mockPrisma.area.create.mockResolvedValueOnce({ id: 'area-new', name: 'New Area', centerId })
    mockPrisma.program.findUnique.mockResolvedValueOnce(null)
    mockPrisma.program.create.mockResolvedValueOnce({ id: 'program-new', name: 'New Program', centerId })

    await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId },
      body: JSON.stringify({
        name: 'Area Program Person',
        phone: '7777777777',
        gender: 'Female',
        ieDate: '2026',
        areaOfStay: 'East',
        activities: [],
        areas: ['New Area'],
        programs: ['New Program']
      })
    })

    expect(mockPrisma.area.create).toHaveBeenCalledWith({ data: { name: 'New Area', centerId } })
    expect(mockPrisma.program.create).toHaveBeenCalledWith({ data: { name: 'New Program', centerId } })
    expect(mockPrisma.contactArea.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ contactId: 'contact-ap', areaId: 'area-new' }) })
    )
    expect(mockPrisma.contactProgram.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ contactId: 'contact-ap', programId: 'program-new' }) })
    )
  })

  it('POST /submit does not create a session entry when no sessionId is provided', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-3' })

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId },
      body: JSON.stringify({
        name: 'Person',
        phone: '7777777777',
        gender: 'Female',
        ieDate: '2026',
        areaOfStay: 'East',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(201)
    expect(mockPrisma.attendanceSessionEntry.upsert).not.toHaveBeenCalled()
  })

  it('POST /submit normalizes phone before storing in the session entry', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      centerId,
      endedAt: null,
      volunteers: [{ volunteerPhone: '1111111111' }]
    })
    mockPrisma.contact.findUnique.mockResolvedValueOnce(null)
    mockPrisma.contact.upsert.mockResolvedValueOnce({ id: 'contact-norm', name: 'Phone Person', phone: '(123) 456-7890' })
    mockPrisma.attendanceSessionEntry.upsert.mockResolvedValueOnce({ id: 'entry-norm' })

    await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({
        name: 'Phone Person',
        phone: '(123) 456-7890',
        gender: 'Male',
        ieDate: '2026',
        areaOfStay: 'West',
        sessionId: 'session-1',
        activities: [],
        areas: [],
        programs: []
      })
    })

    const upsertCall = mockPrisma.attendanceSessionEntry.upsert.mock.calls[0][0]
    expect(upsertCall.create.contactPhone).toBe('1234567890')
    expect(upsertCall.update.contactPhone).toBe('1234567890')
  })

  it('POST /submit returns 401 when sessionId is provided but auth header is missing', async () => {
    const baseUrl = await startTestServer()

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId },
      body: JSON.stringify({
        name: 'Person',
        phone: '9999999999',
        gender: 'Male',
        ieDate: '2026',
        areaOfStay: 'Downtown',
        sessionId: 'session-1',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(401)
  })

  it('POST /submit returns 404 when the provided sessionId is not active', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') },
      body: JSON.stringify({
        name: 'Person',
        phone: '9999999999',
        gender: 'Male',
        ieDate: '2026',
        areaOfStay: 'Downtown',
        sessionId: 'ended-session',
        activities: [],
        areas: [],
        programs: []
      })
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.contact.findUnique).not.toHaveBeenCalled()
  })

  it('POST /sessions/:id/reopen returns 404 when session does not exist', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/missing/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.attendanceSession.update).not.toHaveBeenCalled()
  })

  it('DELETE /sessions/:id returns 404 when session does not exist', async () => {
    const baseUrl = await startTestServer()

    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId, isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })
    mockPrisma.attendanceSession.findFirst.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/attendance/sessions/missing`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Center-ID': centerId, ...authHeaderFor('1111111111') }
    })

    expect(response.status).toBe(404)
    expect(mockPrisma.attendanceSession.delete).not.toHaveBeenCalled()
  })
})
