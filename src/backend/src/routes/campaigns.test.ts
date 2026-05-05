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
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops))
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

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close()
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('campaign routes', () => {
  it('creates a campaign with selected contacts', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '1111111111',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
    })

    mockPrisma.campaign.create.mockResolvedValueOnce({
      id: 'campaign-1',
      name: 'Week 1 Outreach',
      centerId: 'center-1',
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      contacts: [
        {
          id: 'cc-1',
          status: 'PENDING',
          createdAt: new Date('2026-05-02T10:00:00.000Z'),
          contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
        }
      ],
      volunteers: []
    })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': 'center-1',
        ...authHeaderFor('1111111111')
      },
      body: JSON.stringify({
        name: 'Week 1 Outreach',
        contactIds: ['contact-1']
      })
    })

    expect(response.status).toBe(201)
    const data = (await response.json()) as { name: string; totalContacts: number; pendingContacts: number }
    expect(data.name).toBe('Week 1 Outreach')
    expect(data.totalContacts).toBe(1)
    expect(data.pendingContacts).toBe(1)
    expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          centerId: 'center-1',
          name: 'Week 1 Outreach',
          contacts: { create: [{ contactId: 'contact-1' }] }
        })
      })
    )
  })

  it('shows only assigned campaigns for volunteers', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '2222222222',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    mockPrisma.campaign.findMany.mockResolvedValueOnce([])

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns`, {
      headers: {
        'X-Center-ID': 'center-1',
        ...authHeaderFor('2222222222')
      }
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          centerId: 'center-1',
          volunteers: { some: { volunteerPhone: '2222222222' } }
        }
      })
    )
  })

  it('blocks volunteer assignment for attendance taker role', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '3333333333',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': 'center-1',
        ...authHeaderFor('3333333333')
      },
      body: JSON.stringify({ volunteerPhones: ['9000000001'] })
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Only admins/users can assign volunteers' })
  })

  it('submits skip call log and returns next contact', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '4444444444',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'ATTENDANCE_TAKER' }]
    })

    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })
    mockPrisma.campaignContact.findFirst
      .mockResolvedValueOnce({ id: 'cc-1', campaignId: 'campaign-1' })
      .mockResolvedValueOnce({
        id: 'cc-2',
        campaignId: 'campaign-1',
        status: 'PENDING',
        createdAt: new Date(),
        contact: { id: 'contact-2', name: 'Bob', phone: '9000000002' }
      })

    mockPrisma.campaignCallLog.upsert.mockResolvedValueOnce({ id: 'log-1' })
    mockPrisma.campaignContact.update.mockResolvedValueOnce({ id: 'cc-1', status: 'SKIPPED' })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': 'center-1',
        ...authHeaderFor('4444444444')
      },
      body: JSON.stringify({
        campaignContactId: 'cc-1',
        feedback: 'NO_RESPONSE',
        centerChange: true,
        doNotDisturb: false,
        notInterestedToVolunteer: true,
        remarks: 'Could not connect',
        action: 'skip'
      })
    })

    expect(response.status).toBe(200)
    const data = (await response.json()) as { success: boolean; next: { done: boolean; contact?: { name: string } } }
    expect(data.success).toBe(true)
    expect(data.next.done).toBe(false)
    expect(data.next.contact?.name).toBe('Bob')
    expect(mockPrisma.campaignContact.update).toHaveBeenCalledWith({
      where: { id: 'cc-1' },
      data: { status: 'SKIPPED' }
    })
  })

  it('returns transformed call logs table payload', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      phone: '5555555555',
      canAccessAllCenters: false,
      centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
    })

    mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })
    mockPrisma.campaignCallLog.findMany.mockResolvedValueOnce([
      {
        id: 'log-1',
        calledAt: new Date('2026-05-02T12:00:00.000Z'),
        volunteerPhone: '5555555555',
        feedback: 'COMPLETED',
        centerChange: false,
        doNotDisturb: true,
        notInterestedToVolunteer: false,
        remarks: 'Reached successfully',
        campaignContact: {
          status: 'COMPLETED',
          contact: { id: 'contact-1', name: 'Alice', phone: '9000000001' }
        }
      }
    ])

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/call-logs`, {
      headers: {
        'X-Center-ID': 'center-1',
        ...authHeaderFor('5555555555')
      }
    })

    expect(response.status).toBe(200)
    const data = (await response.json()) as Array<{ contact: { name: string }; feedback: string; doNotDisturb: boolean }>
    expect(data).toHaveLength(1)
    expect(data[0].contact.name).toBe('Alice')
    expect(data[0].feedback).toBe('COMPLETED')
    expect(data[0].doNotDisturb).toBe(true)
  })

  it('allows a user to assign volunteers and auto-grants attendance taker access for new center members', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '6666666666',
        canAccessAllCenters: false,
        centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
      })
      .mockResolvedValueOnce({
        phone: '9000000001',
        canAccessAllCenters: false,
        centers: []
      })

    mockPrisma.campaign.findFirst
      .mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })
      .mockResolvedValueOnce({
        id: 'campaign-1',
        name: 'Week 1 Outreach',
        centerId: 'center-1',
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        contacts: [],
        volunteers: [
          {
            volunteerPhone: '9000000001',
            volunteer: { phone: '9000000001', name: 'Volunteer One' }
          }
        ]
      })
    mockPrisma.campaignVolunteer.deleteMany.mockResolvedValueOnce({ count: 0 })
    mockPrisma.campaignVolunteer.create.mockResolvedValueOnce({ id: 'cv-1' })
    mockPrisma.userCenter.create.mockResolvedValueOnce({ id: 'membership-1' })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': 'center-1',
        ...authHeaderFor('6666666666')
      },
      body: JSON.stringify({ volunteerPhones: ['9000000001'] })
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.userCenter.create).toHaveBeenCalledWith({
      data: {
        userPhone: '9000000001',
        centerId: 'center-1',
        role: 'ATTENDANCE_TAKER',
        isApproved: true
      }
    })
  })

  it('approves pending center access instead of creating a duplicate membership when assigning campaign volunteers', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        phone: '7777777777',
        canAccessAllCenters: false,
        centers: [{ centerId: 'center-1', isApproved: true, role: 'ADMIN' }]
      })
      .mockResolvedValueOnce({
        phone: '9000000002',
        canAccessAllCenters: false,
        centers: [{ centerId: 'center-1', isApproved: false, role: 'USER' }]
      })

    mockPrisma.campaign.findFirst
      .mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })
      .mockResolvedValueOnce({
        id: 'campaign-1',
        name: 'Week 1 Outreach',
        centerId: 'center-1',
        createdAt: new Date('2026-05-02T10:00:00.000Z'),
        contacts: [],
        volunteers: [
          {
            volunteerPhone: '9000000002',
            volunteer: { phone: '9000000002', name: 'Volunteer Two' }
          }
        ]
      })
    mockPrisma.campaignVolunteer.deleteMany.mockResolvedValueOnce({ count: 0 })
    mockPrisma.campaignVolunteer.create.mockResolvedValueOnce({ id: 'cv-2' })
    mockPrisma.userCenter.update.mockResolvedValueOnce({ id: 'membership-2' })

    const baseUrl = await startTestServer()
    const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/volunteers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': 'center-1',
        ...authHeaderFor('7777777777')
      },
      body: JSON.stringify({ volunteerPhones: ['9000000002'] })
    })

    expect(response.status).toBe(200)
    expect(mockPrisma.userCenter.update).toHaveBeenCalledWith({
      where: { userPhone_centerId: { userPhone: '9000000002', centerId: 'center-1' } },
      data: { isApproved: true }
    })
    expect(mockPrisma.userCenter.create).not.toHaveBeenCalled()

    describe('message templates', () => {
      it('allows USER role to update campaign message templates', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({
          phone: '8888888888',
          canAccessAllCenters: false,
          centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
        })

        mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })
        mockPrisma.campaign.update.mockResolvedValueOnce({
          id: 'campaign-1',
          name: 'Campaign 1',
          centerId: 'center-1',
          createdAt: new Date(),
          messageTemplates: [
            {
              name: 'Friendly',
              smsContent: 'Hi {name}, please call us back.',
              whatsappContent: 'Hi {name}, let us know when you are available.'
            }
          ],
          contacts: [],
          volunteers: []
        })

        const baseUrl = await startTestServer()
        const templates = [
          {
            name: 'Friendly',
            smsContent: 'Hi {name}, please call us back.',
            whatsappContent: 'Hi {name}, let us know when you are available.'
          }
        ]

        const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/templates`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Center-ID': 'center-1',
            ...authHeaderFor('8888888888')
          },
          body: JSON.stringify({ messageTemplates: templates })
        })

        expect(response.status).toBe(200)
        const data = (await response.json()) as { messageTemplates: unknown }
        expect(Array.isArray(data.messageTemplates)).toBe(true)
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { messageTemplates: templates }
          })
        )
      })

      it('blocks ATTENDANCE_TAKER role from updating templates', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({
          phone: '9999999999',
          canAccessAllCenters: false,
          centers: [{ centerId: 'center-1', isApproved: true, role: 'ATTENDANCE_TAKER' }]
        })

        mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })

        const baseUrl = await startTestServer()
        const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/templates`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Center-ID': 'center-1',
            ...authHeaderFor('9999999999')
          },
          body: JSON.stringify({
            messageTemplates: [{ name: 'Test', smsContent: 'Test', whatsappContent: 'Test' }]
          })
        })

        expect(response.status).toBe(403)
        await expect(response.json()).resolves.toEqual({ error: 'Only USER role can edit campaign templates' })
      })

      it('rejects non-array messageTemplates', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({
          phone: '1010101010',
          canAccessAllCenters: false,
          centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
        })

        mockPrisma.campaign.findFirst.mockResolvedValueOnce({ id: 'campaign-1', centerId: 'center-1' })

        const baseUrl = await startTestServer()
        const response = await fetch(`${baseUrl}/api/campaigns/campaign-1/templates`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Center-ID': 'center-1',
            ...authHeaderFor('1010101010')
          },
          body: JSON.stringify({ messageTemplates: 'not an array' })
        })

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({ error: 'messageTemplates must be an array' })
      })

      it('returns 404 when campaign does not exist', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce({
          phone: '1111111010',
          canAccessAllCenters: false,
          centers: [{ centerId: 'center-1', isApproved: true, role: 'USER' }]
        })

        mockPrisma.campaign.findFirst.mockResolvedValueOnce(null)

        const baseUrl = await startTestServer()
        const response = await fetch(`${baseUrl}/api/campaigns/nonexistent/templates`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Center-ID': 'center-1',
            ...authHeaderFor('1111111010')
          },
          body: JSON.stringify({ messageTemplates: [] })
        })

        expect(response.status).toBe(404)
        await expect(response.json()).resolves.toEqual({ error: 'Campaign not found' })
      })
    })
  })
})
