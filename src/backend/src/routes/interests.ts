import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/interests
 * Get all interests for a center
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    const interests = await prisma.interest.findMany({
      where: { centerId },
      orderBy: { name: 'asc' }
    })
    res.json(interests.map(i => i.name))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' })
  }
})

/**
 * POST /api/interests
 * Create a new interest
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

    const interest = await prisma.interest.create({
      data: { name, centerId }
    })
    res.status(201).json(interest.name)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Interest already exists' })
    }
    res.status(500).json({ error: 'Failed to create interest' })
  }
})

/**
 * DELETE /api/interests/:name
 * Delete an interest
 */
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const result = await prisma.interest.deleteMany({
      where: { name: req.params.name, centerId }
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Interest not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: 'Interest not found' })
  }
})

export default router
