import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

/**
 * GET /api/activities
 * Get all activities
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    const activities = await prisma.activity.findMany({
      where: { centerId },
      orderBy: { name: 'asc' }
    })
    res.json(activities.map(a => a.name))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

/**
 * POST /api/activities
 * Create a new activity
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const activity = await prisma.activity.create({
      data: { name, centerId }
    })
    res.status(201).json(activity.name)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Activity already exists' })
    }
    res.status(500).json({ error: 'Failed to create activity' })
  }
})

/**
 * DELETE /api/activities/:name
 * Delete an activity
 */
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const result = await prisma.activity.deleteMany({
      where: { name: req.params.name, centerId }
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Activity not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' })
  }
})

export default router
