import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

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

function canTakeAttendance(
  user: { canAccessAllCenters: boolean; centers: Array<{ centerId: string; isApproved: boolean }> },
  centerId: string
) {
  if (user.canAccessAllCenters) return true
  return user.centers.some(m => m.centerId === centerId && m.isApproved)
}

function formatSession(
  session: {
    id: string
    name: string
    centerId: string
    activities: string[]
    areas: string[]
    programs: string[]
    createdAt: Date
    endedAt: Date | null
    volunteers: Array<{ volunteerPhone: string; volunteer: { phone: string; name: string } }>
  }
) {
  return {
    id: session.id,
    name: session.name,
    centerId: session.centerId,
    activities: session.activities,
    areas: session.areas,
    programs: session.programs,
    createdAt: session.createdAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    volunteers: session.volunteers.map(v => ({
      phone: v.volunteer.phone,
      name: v.volunteer.name
    }))
  }
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\D/g, '')
}

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        centerId,
        volunteers: { some: { volunteerPhone: actor.phone } }
      },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(sessions.map(formatSession))
  } catch (err) {
    console.error('List attendance sessions error:', err)
    return res.status(500).json({ error: 'Failed to list attendance sessions' })
  }
})

router.get('/sessions/active', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const active = await prisma.attendanceSession.findFirst({
      where: {
        centerId,
        endedAt: null,
        volunteers: { some: { volunteerPhone: actor.phone } }
      },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!active) return res.json({ active: false })

    return res.json({ active: true, session: formatSession(active) })
  } catch (err) {
    console.error('Get active attendance session error:', err)
    return res.status(500).json({ error: 'Failed to fetch active attendance session' })
  }
})

router.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const { name, activities = [], areas = [], programs = [] } = req.body as {
      name?: string
      activities?: string[]
      areas?: string[]
      programs?: string[]
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Session name is required' })
    }

    const normalize = (items: string[]) => items.map(item => item?.trim()).filter(Boolean)

    const created = await prisma.attendanceSession.create({
      data: {
        name: name.trim(),
        centerId,
        createdByPhone: actor.phone,
        activities: normalize(activities),
        areas: normalize(areas),
        programs: normalize(programs),
        volunteers: {
          create: {
            volunteerPhone: actor.phone,
            grantedByPhone: actor.phone
          }
        }
      },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return res.status(201).json(formatSession(created))
  } catch (err) {
    console.error('Start attendance session error:', err)
    return res.status(500).json({ error: 'Failed to start attendance session' })
  }
})

router.post('/sessions/:id/volunteers', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const { volunteerPhone } = req.body as { volunteerPhone?: string }
    if (!volunteerPhone?.trim()) {
      return res.status(400).json({ error: 'volunteerPhone is required' })
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: req.params.id, centerId, endedAt: null },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return res.status(404).json({ error: 'Active attendance session not found' })
    }

    const actorInSession = session.volunteers.some(v => v.volunteerPhone === actor.phone)
    if (!actorInSession) {
      return res.status(403).json({ error: 'Only session volunteers can grant session attendance access' })
    }

    const normalizedPhone = volunteerPhone.trim().replace(/\D/g, '')
    const alreadyParticipant = session.volunteers.some(v => v.volunteerPhone.replace(/\D/g, '') === normalizedPhone)

    // Try exact match first, then fall back to digits-only comparison
    let target = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: { centers: true }
    })

    if (!target) {
      // Search all users and find one whose phone matches when non-digits are stripped
      const allUsers = await prisma.user.findMany({ include: { centers: true } })
      target = allUsers.find(u => u.phone.replace(/\D/g, '') === normalizedPhone) ?? null
    }

    if (!target) {
      // Try to find a contact record to get the name
      const contact = await prisma.contact.findFirst({
        where: { centerId, phone: { in: [normalizedPhone, volunteerPhone.trim()] } }
      })
      const userName = contact?.name ?? normalizedPhone
      // Auto-create user account so they can log in later
      target = await prisma.user.create({
        data: { phone: normalizedPhone, name: userName },
        include: { centers: true }
      })
    }

    // Auto-grant ATTENDANCE_TAKER access (no approval required) if not already a member
    const existingMembership = target.centers.find(m => m.centerId === centerId)
    if (!existingMembership) {
      await prisma.userCenter.create({
        data: {
          userPhone: target.phone,
          centerId,
          role: 'ATTENDANCE_TAKER',
          isApproved: true
        }
      })
    } else if (!existingMembership.isApproved) {
      await prisma.userCenter.update({
        where: { userPhone_centerId: { userPhone: target.phone, centerId } },
        data: { isApproved: true }
      })
    }

    if (!alreadyParticipant) {
      await prisma.attendanceSessionVolunteer.create({
        data: {
          sessionId: session.id,
          volunteerPhone: target.phone,
          grantedByPhone: actor.phone
        }
      })
    }

    const updated = await prisma.attendanceSession.findUnique({
      where: { id: session.id },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return res.json(formatSession(updated!))
  } catch (err) {
    console.error('Add attendance session volunteer error:', err)
    return res.status(500).json({ error: 'Failed to add volunteer to attendance session' })
  }
})

router.post('/sessions/:id/end', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: req.params.id, centerId, endedAt: null },
      include: { volunteers: true }
    })

    if (!session) {
      return res.status(404).json({ error: 'Active attendance session not found' })
    }

    const actorInSession = session.volunteers.some(v => v.volunteerPhone === actor.phone)
    if (!actorInSession) {
      return res.status(403).json({ error: 'Only session volunteers can end this attendance session' })
    }

    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('End attendance session error:', err)
    return res.status(500).json({ error: 'Failed to end attendance session' })
  }
})

router.post('/sessions/:id/reopen', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: req.params.id, centerId },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session) {
      return res.status(404).json({ error: 'Attendance session not found' })
    }

    const actorInSession = session.volunteers.some(v => v.volunteerPhone === actor.phone)
    if (!actorInSession) {
      return res.status(403).json({ error: 'Only session volunteers can reopen this attendance session' })
    }

    const reopened = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { endedAt: null },
      include: {
        volunteers: {
          include: { volunteer: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    return res.json(formatSession(reopened))
  } catch (err) {
    console.error('Reopen attendance session error:', err)
    return res.status(500).json({ error: 'Failed to reopen attendance session' })
  }
})

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: req.params.id, centerId },
      include: { volunteers: true }
    })

    if (!session) {
      return res.status(404).json({ error: 'Attendance session not found' })
    }

    const actorInSession = session.volunteers.some(v => v.volunteerPhone === actor.phone)
    if (!actorInSession) {
      return res.status(403).json({ error: 'Only session volunteers can delete this attendance session' })
    }

    await prisma.attendanceSession.delete({
      where: { id: session.id }
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('Delete attendance session error:', err)
    return res.status(500).json({ error: 'Failed to delete attendance session' })
  }
})

router.get('/sessions/:id/attendees', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' })

    const actor = await getActor(req, res)
    if (!actor) return
    if (!canTakeAttendance(actor, centerId)) {
      return res.status(403).json({ error: 'Attendance access is required' })
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: req.params.id, centerId },
      include: { volunteers: true }
    })

    if (!session) {
      return res.status(404).json({ error: 'Attendance session not found' })
    }

    const actorInSession = session.volunteers.some(v => v.volunteerPhone === actor.phone)
    if (!actorInSession) {
      return res.status(403).json({ error: 'Only session volunteers can view attendees for this attendance session' })
    }

    const attendees = await prisma.attendanceSessionEntry.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(attendees.map(entry => ({
      id: entry.id,
      name: entry.contactName,
      phone: entry.contactPhone,
      submittedAt: entry.createdAt.toISOString()
    })))
  } catch (err) {
    console.error('List attendance session attendees error:', err)
    return res.status(500).json({ error: 'Failed to list attendance session attendees' })
  }
})

/**
 * GET /api/attendance/lookup?phone=xxx
 * Look up a contact by phone number for a center.
 * Returns contact details (without remarks) if found.
 */
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    const { phone } = req.query

    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone is required' })
    }

    const contact = await prisma.contact.findUnique({
      where: { phone_centerId: { phone, centerId } }
    })

    if (!contact) {
      return res.json({ found: false })
    }

    return res.json({
      found: true,
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        gender: contact.gender || 'Male',
        ieDate: contact.ieDate || '',
        areaOfStay: contact.areaOfStay || ''
        // remarks intentionally omitted — fresh entry each time
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed' })
  }
})

/**
 * POST /api/attendance/submit
 * Upsert contact details and increment attendance counts for selected
 * activities, areas, and/or programs.
 *
 * Body: {
 *   name: string,
 *   phone: string,
 *   gender?: string,
 *   ieDate?: string,
 *   areaOfStay?: string,
 *   activities?: string[],
 *   areas?: string[],
 *   programs?: string[]
 * }
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    const {
      name,
      phone,
      gender,
      ieDate,
      areaOfStay,
      activities = [],
      areas = [],
      programs = [],
      sessionId
    } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    let activeSession: { id: string; volunteers: Array<{ volunteerPhone: string }> } | null = null
    let sessionActorPhone: string | null = null

    if (sessionId) {
      const actor = await getActor(req, res)
      if (!actor) return
      if (!canTakeAttendance(actor, centerId)) {
        return res.status(403).json({ error: 'Attendance access is required' })
      }

      activeSession = await prisma.attendanceSession.findFirst({
        where: { id: sessionId, centerId, endedAt: null },
        include: { volunteers: true }
      })

      if (!activeSession) {
        return res.status(404).json({ error: 'Active attendance session not found' })
      }

      const actorInSession = activeSession.volunteers.some(v => v.volunteerPhone === actor.phone)
      if (!actorInSession) {
        return res.status(403).json({ error: 'Only session volunteers can submit attendance for this session' })
      }

      sessionActorPhone = actor.phone
    }

    const existingContact = await prisma.contact.findUnique({
      where: { phone_centerId: { phone, centerId } }
    })

    if (!existingContact && (!gender || !ieDate || !areaOfStay)) {
      return res.status(400).json({
        error: 'Gender, IE Date, and Area of Stay are required for new contacts'
      })
    }

    // Upsert the contact — preserve fields not provided
    const contact = await prisma.contact.upsert({
      where: { phone_centerId: { phone, centerId } },
      create: {
        name,
        phone,
        gender,
        ieDate,
        areaOfStay,
        centerId,
        selected: false
      },
      update: {
        name,
        gender: gender !== undefined ? gender : undefined,
        ieDate: ieDate !== undefined ? (ieDate || null) : undefined,
        areaOfStay: areaOfStay !== undefined ? areaOfStay : undefined,
        lastUpdated: new Date()
      }
    })

    // Increment attendance counts for each selected activity
    for (const activityName of activities as string[]) {
      let activity = await prisma.activity.findUnique({
        where: { name_centerId: { name: activityName, centerId } }
      })
      if (!activity) {
        activity = await prisma.activity.create({
          data: { name: activityName, centerId }
        })
      }
      await prisma.contactActivity.upsert({
        where: { contactId_activityId: { contactId: contact.id, activityId: activity.id } },
        create: { contactId: contact.id, activityId: activity.id, count: 1 },
        update: { count: { increment: 1 } }
      })
    }

    // Increment attendance counts for each selected area
    for (const areaName of areas as string[]) {
      let area = await prisma.area.findUnique({
        where: { name_centerId: { name: areaName, centerId } }
      })
      if (!area) {
        area = await prisma.area.create({
          data: { name: areaName, centerId }
        })
      }
      await prisma.contactArea.upsert({
        where: { contactId_areaId: { contactId: contact.id, areaId: area.id } },
        create: { contactId: contact.id, areaId: area.id, count: 1 },
        update: { count: { increment: 1 } }
      })
    }

    // Increment attendance counts for each selected program
    for (const programName of programs as string[]) {
      let program = await prisma.program.findUnique({
        where: { name_centerId: { name: programName, centerId } }
      })
      if (!program) {
        program = await prisma.program.create({
          data: { name: programName, centerId }
        })
      }
      await prisma.contactProgram.upsert({
        where: { contactId_programId: { contactId: contact.id, programId: program.id } },
        create: { contactId: contact.id, programId: program.id, count: 1 },
        update: { count: { increment: 1 } }
      })
    }

    if (activeSession) {
      await prisma.attendanceSessionEntry.create({
        data: {
          sessionId: activeSession.id,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: normalizePhone(contact.phone),
          submittedByPhone: sessionActorPhone
        }
      })
    }

    return res.status(201).json({ success: true, contactId: contact.id })
  } catch (err) {
    console.error('Attendance submit error:', err)
    res.status(500).json({ error: 'Failed to record attendance' })
  }
})

export default router
