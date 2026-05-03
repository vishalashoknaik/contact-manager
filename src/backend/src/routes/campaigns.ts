import { Router, Request, Response } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

function getPhoneFromAuthHeader(authorization: string | undefined): string | null {
  if (!authorization) return null
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const colonIdx = decoded.lastIndexOf(':')
    if (colonIdx === -1) return null
    return decoded.slice(0, colonIdx)
  } catch {
    return null
  }
}

async function getActor(req: Request, res: Response) {
  const phone = getPhoneFromAuthHeader(req.headers.authorization)
  if (!phone) {
    res.status(401).json({ error: 'No authorization header' })
    return null
  }
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { centers: true }
  })
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return null
  }
  return user
}

function canAccessCenter(
  user: { canAccessAllCenters: boolean; centers: Array<{ centerId: string; isApproved: boolean }> },
  centerId: string
) {
  if (user.canAccessAllCenters) return true
  return user.centers.some(m => m.centerId === centerId && m.isApproved)
}

/**
 * POST /api/campaigns
 * Create a new campaign for a center with an optional initial list of contact IDs
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const { name, contactIds } = req.body as { name: string; contactIds?: string[] }
    if (!name?.trim()) return res.status(400).json({ error: 'Campaign name is required' })

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        centerId,
        contacts: contactIds?.length
          ? {
              create: contactIds.map(contactId => ({ contactId }))
            }
          : undefined
      },
      include: {
        contacts: { include: { contact: true } },
        volunteers: true
      }
    })

    return res.status(201).json(formatCampaign(campaign))
  } catch (err) {
    console.error('Create campaign error:', err)
    return res.status(500).json({ error: 'Failed to create campaign' })
  }
})

/**
 * GET /api/campaigns
 * List campaigns for a center. Admins see all; volunteers see only assigned campaigns.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const membership = actor.centers.find(m => m.centerId === centerId)
    const isAdmin = actor.canAccessAllCenters || (membership as any)?.role === 'ADMIN' || (membership as any)?.role === 'USER'

    const campaigns = await prisma.campaign.findMany({
      where: isAdmin
        ? { centerId }
        : {
            centerId,
            volunteers: { some: { volunteerPhone: actor.phone } }
          },
      include: {
        contacts: { include: { contact: true } },
        volunteers: { include: { volunteer: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(campaigns.map(formatCampaign))
  } catch (err) {
    console.error('List campaigns error:', err)
    return res.status(500).json({ error: 'Failed to list campaigns' })
  }
})

/**
 * GET /api/campaigns/:id
 * Get a single campaign with contacts and volunteers
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, centerId },
      include: {
        contacts: { include: { contact: true } },
        volunteers: { include: { volunteer: true } }
      }
    })

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    // Volunteers can only see campaigns they are assigned to
    const membership = actor.centers.find(m => m.centerId === centerId)
    const isAdmin = actor.canAccessAllCenters || (membership as any)?.role === 'ADMIN' || (membership as any)?.role === 'USER'
    if (!isAdmin) {
      const isAssigned = campaign.volunteers.some(v => v.volunteerPhone === actor.phone)
      if (!isAssigned) return res.status(403).json({ error: 'Not assigned to this campaign' })
    }

    return res.json(formatCampaign(campaign))
  } catch (err) {
    console.error('Get campaign error:', err)
    return res.status(500).json({ error: 'Failed to get campaign' })
  }
})

/**
 * PUT /api/campaigns/:id/contacts
 * Add contacts to an existing campaign
 */
router.put('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, centerId }
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const { contactIds } = req.body as { contactIds: string[] }
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' })
    }

    // Upsert - ignore duplicates
    await prisma.$transaction(
      contactIds.map(contactId =>
        prisma.campaignContact.upsert({
          where: { campaignId_contactId: { campaignId: campaign.id, contactId } },
          create: { campaignId: campaign.id, contactId },
          update: {}
        })
      )
    )

    const updated = await prisma.campaign.findFirst({
      where: { id: campaign.id },
      include: {
        contacts: { include: { contact: true } },
        volunteers: { include: { volunteer: true } }
      }
    })

    return res.json(formatCampaign(updated!))
  } catch (err) {
    console.error('Add contacts to campaign error:', err)
    return res.status(500).json({ error: 'Failed to add contacts to campaign' })
  }
})

/**
 * PUT /api/campaigns/:id/volunteers
 * Assign volunteers (by phone) to a campaign
 */
router.put('/:id/volunteers', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const membership = actor.centers.find(m => m.centerId === centerId)
    const isAdmin = actor.canAccessAllCenters || (membership as any)?.role === 'ADMIN' || (membership as any)?.role === 'USER'
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins/users can assign volunteers' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, centerId }
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const { volunteerPhones } = req.body as { volunteerPhones: string[] }
    if (!Array.isArray(volunteerPhones)) {
      return res.status(400).json({ error: 'volunteerPhones array is required' })
    }

    // Replace volunteer list
    await prisma.$transaction([
      prisma.campaignVolunteer.deleteMany({ where: { campaignId: campaign.id } }),
      ...volunteerPhones.map(volunteerPhone =>
        prisma.campaignVolunteer.create({ data: { campaignId: campaign.id, volunteerPhone } })
      )
    ])

    // Auto-grant center access (ATTENDANCE_TAKER, no approval required) for any new volunteers
    for (const volunteerPhone of volunteerPhones) {
      const targetUser = await prisma.user.findUnique({
        where: { phone: volunteerPhone },
        include: { centers: true }
      })
      if (!targetUser) continue
      const existing = targetUser.centers.find(m => m.centerId === centerId)
      if (!existing) {
        await prisma.userCenter.create({
          data: { userPhone: volunteerPhone, centerId, role: 'ATTENDANCE_TAKER', isApproved: true }
        })
      } else if (!existing.isApproved) {
        await prisma.userCenter.update({
          where: { userPhone_centerId: { userPhone: volunteerPhone, centerId } },
          data: { isApproved: true }
        })
      }
    }

    const updated = await prisma.campaign.findFirst({
      where: { id: campaign.id },
      include: {
        contacts: { include: { contact: true } },
        volunteers: { include: { volunteer: true } }
      }
    })

    return res.json(formatCampaign(updated!))
  } catch (err) {
    console.error('Assign volunteers error:', err)
    return res.status(500).json({ error: 'Failed to assign volunteers' })
  }
})

/**
 * GET /api/campaigns/:id/next-contact
 * Get the next PENDING contact for a volunteer to call
 */
router.get('/:id/next-contact', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        centerId,
        volunteers: { some: { volunteerPhone: actor.phone } }
      }
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found or not assigned' })

    const mode = (req.query.mode as string) === 'skipped' ? 'SKIPPED' : 'PENDING'

    const next = await prisma.campaignContact.findFirst({
      where: { campaignId: campaign.id, status: mode },
      include: { contact: true },
      orderBy: { createdAt: 'asc' }
    })

    if (!next) return res.json({ done: true })

    return res.json({
      done: false,
      campaignContactId: next.id,
      contact: {
        id: next.contact.id,
        name: next.contact.name,
        phone: next.contact.phone
      }
    })
  } catch (err) {
    console.error('Next contact error:', err)
    return res.status(500).json({ error: 'Failed to get next contact' })
  }
})

/**
 * POST /api/campaigns/:id/call-log
 * Submit a call result (feedback + flags + optional remarks)
 */
router.post('/:id/call-log', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, centerId }
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const {
      campaignContactId,
      feedback,
      centerChange = false,
      doNotDisturb = false,
      notInterestedToVolunteer = false,
      remarks,
      action,
      mode: callMode = 'pending'
    } = req.body as {
      campaignContactId: string
      feedback: 'COMPLETED' | 'NO_RESPONSE' | 'CONNECT_LATER'
      centerChange?: boolean
      doNotDisturb?: boolean
      notInterestedToVolunteer?: boolean
      remarks?: string
      action: 'submit' | 'skip'
      mode?: 'pending' | 'skipped'
    }

    if (!campaignContactId) return res.status(400).json({ error: 'campaignContactId is required' })
    if (!['COMPLETED', 'NO_RESPONSE', 'CONNECT_LATER'].includes(feedback)) {
      return res.status(400).json({ error: 'Valid feedback is required' })
    }
    if (!['submit', 'skip'].includes(action)) {
      return res.status(400).json({ error: 'action must be submit or skip' })
    }

    const campaignContact = await prisma.campaignContact.findFirst({
      where: { id: campaignContactId, campaignId: campaign.id }
    })
    if (!campaignContact) return res.status(404).json({ error: 'Campaign contact not found' })

    const newStatus = action === 'skip' ? 'SKIPPED' : 'COMPLETED'

    await prisma.$transaction([
      prisma.campaignCallLog.upsert({
        where: { campaignContactId },
        create: {
          campaignContactId,
          volunteerPhone: actor.phone,
          feedback,
          centerChange,
          doNotDisturb,
          notInterestedToVolunteer,
          remarks: remarks || null
        },
        update: {
          volunteerPhone: actor.phone,
          feedback,
          centerChange,
          doNotDisturb,
          notInterestedToVolunteer,
          remarks: remarks || null,
          calledAt: new Date()
        }
      }),
      prisma.campaignContact.update({
        where: { id: campaignContactId },
        data: { status: newStatus }
      })
    ])

    // Find the next contact in the same mode.
    // For skipped revisit mode, move forward from the current contact to avoid returning the same row again.
    const nextStatus: 'SKIPPED' | 'PENDING' = callMode === 'skipped' ? 'SKIPPED' : 'PENDING'
    const nextWhere: Prisma.CampaignContactWhereInput =
      callMode === 'skipped'
        ? {
            campaignId: campaign.id,
            status: nextStatus,
            OR: [
              { createdAt: { gt: campaignContact.createdAt } },
              { createdAt: campaignContact.createdAt, id: { gt: campaignContact.id } }
            ]
          }
        : { campaignId: campaign.id, status: nextStatus }

    const next = await prisma.campaignContact.findFirst({
      where: nextWhere,
      include: { contact: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    })

    return res.json({
      success: true,
      next: next
        ? {
            done: false,
            campaignContactId: next.id,
            contact: { id: next.contact.id, name: next.contact.name, phone: next.contact.phone }
          }
        : { done: true }
    })
  } catch (err) {
    console.error('Submit call log error:', err)
    return res.status(500).json({ error: 'Failed to submit call log' })
  }
})

/**
 * GET /api/campaigns/:id/call-logs
 * List completed/skipped call logs for a campaign (table view)
 */
router.get('/:id/call-logs', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) return

    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })
    if (!canAccessCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required' })
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, centerId }
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const membership = actor.centers.find(m => m.centerId === centerId)
    const isAdminOrUser = actor.canAccessAllCenters ||
      (membership as any)?.role === 'ADMIN' ||
      (membership as any)?.role === 'USER'

    const logs = await prisma.campaignCallLog.findMany({
      where: {
        campaignContact: { campaignId: campaign.id },
        ...(isAdminOrUser ? {} : { volunteerPhone: actor.phone })
      },
      include: {
        campaignContact: { include: { contact: true } }
      },
      orderBy: { calledAt: 'desc' }
    })

    return res.json(
      logs.map(log => ({
        id: log.id,
        campaignContactId: log.campaignContactId,
        calledAt: log.calledAt.toISOString(),
        volunteerPhone: log.volunteerPhone,
        contact: {
          id: log.campaignContact.contact.id,
          name: log.campaignContact.contact.name,
          phone: log.campaignContact.contact.phone
        },
        status: log.campaignContact.status,
        feedback: log.feedback,
        centerChange: log.centerChange,
        doNotDisturb: log.doNotDisturb,
        notInterestedToVolunteer: log.notInterestedToVolunteer,
        remarks: log.remarks
      }))
    )
  } catch (err) {
    console.error('Get call logs error:', err)
    return res.status(500).json({ error: 'Failed to get call logs' })
  }
})

// ---- helpers ----

type CampaignWithIncludes = {
  id: string
  name: string
  centerId: string
  createdAt: Date
  contacts: Array<{
    id: string
    status: string
    createdAt: Date
    contact: { id: string; name: string; phone: string }
  }>
  volunteers: Array<{
    id: string
    volunteerPhone: string
    volunteer?: { phone: string; name: string }
  }>
}

function formatCampaign(campaign: CampaignWithIncludes) {
  return {
    id: campaign.id,
    name: campaign.name,
    centerId: campaign.centerId,
    createdAt: campaign.createdAt.toISOString(),
    totalContacts: campaign.contacts.length,
    pendingContacts: campaign.contacts.filter(c => c.status === 'PENDING').length,
    completedContacts: campaign.contacts.filter(c => c.status === 'COMPLETED').length,
    skippedContacts: campaign.contacts.filter(c => c.status === 'SKIPPED').length,
    contacts: campaign.contacts.map(cc => ({
      campaignContactId: cc.id,
      status: cc.status,
      contact: { id: cc.contact.id, name: cc.contact.name, phone: cc.contact.phone }
    })),
    volunteers: campaign.volunteers.map(v => ({
      phone: v.volunteerPhone,
      name: v.volunteer?.name || v.volunteerPhone
    }))
  }
}

export default router
