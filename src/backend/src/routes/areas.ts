import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/areas
 * Get all areas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    const areas = await prisma.area.findMany({
      where: { centerId },
      orderBy: { name: 'asc' }
    })
    res.json(areas.map(a => a.name))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch areas' })
  }
})

/**
 * POST /api/areas
 * Create a new area
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

    const area = await prisma.area.create({
      data: { name, centerId }
    })
    res.status(201).json(area.name)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Area already exists' })
    }
    res.status(500).json({ error: 'Failed to create area' })
  }
})

/**
 * DELETE /api/areas/:name
 * Delete an area
 */
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const result = await prisma.area.deleteMany({
      where: { name: req.params.name, centerId }
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Area not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: 'Area not found' })
  }
})

export default router
