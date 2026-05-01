import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

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
 *   remarks?: string,
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
      remarks,
      activities = [],
      areas = [],
      programs = []
    } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    // Upsert the contact — preserve fields not provided
    const contact = await prisma.contact.upsert({
      where: { phone_centerId: { phone, centerId } },
      create: {
        name,
        phone,
        gender: gender || 'Male',
        ieDate: ieDate || null,
        areaOfStay: areaOfStay || null,
        remarks: remarks || null,
        centerId,
        selected: false
      },
      update: {
        name,
        gender: gender !== undefined ? gender : undefined,
        ieDate: ieDate !== undefined ? (ieDate || null) : undefined,
        areaOfStay: areaOfStay !== undefined ? areaOfStay : undefined,
        remarks: remarks !== undefined && remarks !== '' ? remarks : undefined,
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

    return res.status(201).json({ success: true, contactId: contact.id })
  } catch (err) {
    console.error('Attendance submit error:', err)
    res.status(500).json({ error: 'Failed to record attendance' })
  }
})

export default router
