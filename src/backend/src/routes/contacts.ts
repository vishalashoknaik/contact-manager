import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/contacts
 * Retrieve all contacts with their activities, areas, and programs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    const contacts = await prisma.contact.findMany({
      where: { centerId },
      include: {
        activities: { include: { activity: true } },
        areas: { include: { area: true } },
        programs: { include: { program: true } },
        interests: { include: { interest: true } }
      },
      orderBy: [
        { importOrder: 'asc' },
        { lastUpdated: 'desc' }
      ]
    })

    // Transform to frontend format
    const transformed = contacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      gender: c.gender || 'Male',
      ieDate: c.ieDate || undefined,
      areaOfStay: c.areaOfStay || undefined,
      remarks: c.remarks || undefined,
      selected: c.selected,
      lastUpdated: c.lastUpdated.toISOString(),
      importOrder: c.importOrder,
      notInterested: c.notInterested,
      centerChange: c.centerChange,
      doNotDisturb: c.doNotDisturb,
      activities: Object.fromEntries(
        c.activities.map(ca => [ca.activity.name, ca.count])
      ),
      areas: Object.fromEntries(
        c.areas.map(ca => [ca.area.name, ca.count])
      ),
      programs: Object.fromEntries(
        c.programs.map(cp => [cp.program.name, cp.count])
      ),
      interests: Object.fromEntries(
        (c.interests || []).map(ci => [ci.interest.name, ci.count])
      )
    }))

    res.json(transformed)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

/**
 * POST /api/contacts
 * Create or update a contact
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      phone,
      gender,
      ieDate,
      areaOfStay,
      remarks,
      activities = {},
      areas = {},
      programs = {},
      interests = {},
      selected,
      importOrder
    } = req.body
    const centerId = req.headers['x-center-id'] as string | undefined

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' })
    }
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    // Only bump lastUpdated when category data (activity/area/program/interest) is present.
    // Selecting/deselecting or basic field edits should NOT change the "last active" date.
    const hasCategoryData =
      Object.values(activities as Record<string, number>).some(v => Number(v) > 0) ||
      Object.values(areas as Record<string, number>).some(v => Number(v) > 0) ||
      Object.values(programs as Record<string, number>).some(v => Number(v) > 0) ||
      Object.values(interests as Record<string, number>).some(v => Number(v) > 0)

    // Upsert contact
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
        selected: typeof selected === 'boolean' ? selected : true,
        importOrder: importOrder ?? null
      },
      update: {
        name,
        gender: gender !== undefined ? gender : undefined,
        ieDate: ieDate !== undefined ? (ieDate || null) : undefined,
        areaOfStay: areaOfStay !== undefined ? areaOfStay : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
        selected: typeof selected === 'boolean' ? selected : true,
        importOrder: importOrder !== undefined ? importOrder : undefined,
        ...(hasCategoryData && { lastUpdated: new Date() })
      },
      include: {
        activities: { include: { activity: true } },
        areas: { include: { area: true } },
        programs: { include: { program: true } },
        interests: { include: { interest: true } }
      }
    })

    // Sync activities, areas, programs, interests
    await syncCategoryData(contact.id, centerId, 'activity', activities)
    await syncCategoryData(contact.id, centerId, 'area', areas)
    await syncCategoryData(contact.id, centerId, 'program', programs)
    await syncCategoryData(contact.id, centerId, 'interest', interests)

    res.status(201).json({ success: true, contact })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create/update contact' })
  }
})

/**
 * DELETE /api/contacts/:id
 * Delete a contact
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, centerId }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    await prisma.contact.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: 'Contact not found' })
  }
})

/**
 * PATCH /api/contacts/:id
 * Update contact fields
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    const { selected, importOrder, name, phone } = req.body

    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, centerId }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    const { gender, ieDate, areaOfStay, remarks } = req.body
    const nextName = typeof name === 'string' ? name.trim() : undefined
    const nextPhone = typeof phone === 'string' ? phone.trim() : undefined

    if (name !== undefined && !nextName) {
      return res.status(400).json({ error: 'Name cannot be empty' })
    }
    if (phone !== undefined && !nextPhone) {
      return res.status(400).json({ error: 'Phone cannot be empty' })
    }

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        selected: selected !== undefined ? selected : undefined,
        importOrder: importOrder !== undefined ? importOrder : undefined,
        name: nextName,
        phone: nextPhone,
        gender: gender !== undefined ? gender : undefined,
        ieDate: ieDate !== undefined ? (ieDate || null) : undefined,
        areaOfStay: areaOfStay !== undefined ? areaOfStay : undefined,
        remarks: remarks !== undefined ? remarks : undefined
        // lastUpdated is intentionally NOT set here — PATCH is for selected/importOrder/field edits
        // which are not "activity" and should not affect the lastUpdated (last active) date.
      },
      include: {
        activities: { include: { activity: true } },
        areas: { include: { area: true } },
        programs: { include: { program: true } }
      }
    })
    res.json(contact)
  } catch (err) {
    console.error('Failed to update contact:', err)
    res.status(500).json({ error: 'Failed to update contact' })
  }
})

/**
 * Helper to sync category data (activities, areas, programs)
 */
async function syncCategoryData(
  contactId: string,
  centerId: string,
  type: 'activity' | 'area' | 'program' | 'interest',
  data: Record<string, number>
) {
  // Delete existing relations
  if (type === 'activity') {
    await prisma.contactActivity.deleteMany({ where: { contactId } })
  } else if (type === 'area') {
    await prisma.contactArea.deleteMany({ where: { contactId } })
  } else if (type === 'program') {
    await prisma.contactProgram.deleteMany({ where: { contactId } })
  } else {
    await prisma.contactInterest.deleteMany({ where: { contactId } })
  }

  // Create new relations
  for (const [name, count] of Object.entries(data)) {
    const parsedCount = Number(count)

    if (!name || Number.isNaN(parsedCount) || parsedCount <= 0) {
      continue
    }

      let categoryId: string | undefined

      if (type === 'activity') {
        const activity = await prisma.activity.upsert({
          where: { name_centerId: { name, centerId } },
          update: {},
          create: { name, centerId }
        })
        categoryId = activity.id
      } else if (type === 'area') {
        const area = await prisma.area.upsert({
          where: { name_centerId: { name, centerId } },
          update: {},
          create: { name, centerId }
        })
        categoryId = area.id
      } else if (type === 'program') {
        const program = await prisma.program.upsert({
          where: { name_centerId: { name, centerId } },
          update: {},
          create: { name, centerId }
        })
        categoryId = program.id
      } else {
        const interest = await prisma.interest.upsert({
          where: { name_centerId: { name, centerId } },
          update: {},
          create: { name, centerId }
        })
        categoryId = interest.id
      }

      if (type === 'activity') {
        await prisma.contactActivity.create({
          data: { contactId, activityId: categoryId, count: parsedCount }
        })
      } else if (type === 'area') {
        await prisma.contactArea.create({
          data: { contactId, areaId: categoryId, count: parsedCount }
        })
      } else if (type === 'program') {
        await prisma.contactProgram.create({
          data: { contactId, programId: categoryId, count: parsedCount }
        })
      } else {
        await prisma.contactInterest.create({
          data: { contactId, interestId: categoryId, count: parsedCount }
        })
      }
  }
}

export default router
