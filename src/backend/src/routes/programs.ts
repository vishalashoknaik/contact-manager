import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

/**
 * GET /api/programs
 * Get all programs
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }
    const programs = await prisma.program.findMany({
      where: { centerId },
      orderBy: { name: 'asc' }
    })
    res.json(programs.map(p => p.name))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch programs' })
  }
})

/**
 * POST /api/programs
 * Create a new program
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

    const program = await prisma.program.create({
      data: { name, centerId }
    })
    res.status(201).json(program.name)
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Program already exists' })
    }
    res.status(500).json({ error: 'Failed to create program' })
  }
})

/**
 * DELETE /api/programs/:name
 * Delete a program
 */
router.delete('/:name', async (req: Request, res: Response) => {
  try {
    const centerId = req.headers['x-center-id'] as string | undefined
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    const result = await prisma.program.deleteMany({
      where: { name: req.params.name, centerId }
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Program not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: 'Program not found' })
  }
})

export default router
