import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { getPhoneFromAuthHeader } from '../lib/authUtils.js'

const router = Router()

type CenterRole = 'ATTENDANCE_TAKER' | 'USER' | 'ADMIN'

const CENTER_ROLES: CenterRole[] = ['ATTENDANCE_TAKER', 'USER', 'ADMIN']

const CENTER_ROLE_RANK: Record<CenterRole, number> = {
  ATTENDANCE_TAKER: 1,
  USER: 2,
  ADMIN: 3
}

interface CenterCapabilities {
  canManageAccess: boolean
  canManageCenterConfig: boolean
  canViewContacts: boolean
  canTakeAttendance: boolean
  grantableRoles: CenterRole[]
}

const SCHEMA_MIGRATION_HINT =
  'Database schema is outdated. Run "cd src/backend && npx prisma migrate deploy" and restart the backend.'

function buildAuthErrorMessage(defaultMessage: string, error: unknown) {
  const rawMessage = error instanceof Error ? error.message : ''

  // Prisma/schema drift signatures we have seen in runtime environments.
  if (
    /P2022|column.+is_admin|column.+isAdmin|column.+role|Unknown argument `isAdmin`|Unknown argument `role`|does not exist/i.test(
      rawMessage
    )
  ) {
    return `${defaultMessage}. ${SCHEMA_MIGRATION_HINT}`
  }

  if (rawMessage && process.env.NODE_ENV !== 'production') {
    return `${defaultMessage}: ${rawMessage}`
  }

  return defaultMessage
}

async function loadUser(phone: string) {
  return prisma.user.findUnique({
    where: { phone },
    include: {
      centers: {
        include: {
          center: true
        }
      }
    }
  })
}

function normalizeCenterRole(value: unknown): CenterRole | null {
  if (typeof value !== 'string') {
    return null
  }

  return CENTER_ROLES.includes(value as CenterRole) ? (value as CenterRole) : null
}

function getMembershipRole(membership: unknown): CenterRole {
  const role = normalizeCenterRole((membership as { role?: string }).role)
  return role || 'USER'
}

function getGrantableRoles(role: CenterRole): CenterRole[] {
  if (role === 'ADMIN') {
    return ['ADMIN', 'USER', 'ATTENDANCE_TAKER']
  }

  if (role === 'USER') {
    return ['USER', 'ATTENDANCE_TAKER']
  }

  return ['ATTENDANCE_TAKER']
}

function getCenterCapabilities(role: CenterRole): CenterCapabilities {
  return {
    canManageAccess: true,
    canManageCenterConfig: role === 'ADMIN',
    canViewContacts: role !== 'ATTENDANCE_TAKER',
    canTakeAttendance: true,
    grantableRoles: getGrantableRoles(role)
  }
}

function canGrantRole(actorRole: CenterRole, targetRole: CenterRole) {
  return (
    CENTER_ROLE_RANK[actorRole] >= CENTER_ROLE_RANK[targetRole] &&
    getGrantableRoles(actorRole).includes(targetRole)
  )
}

function getApprovedMembershipForCenter(
  user: NonNullable<Awaited<ReturnType<typeof loadUser>>>,
  centerId: string
) {
  return user.centers.find(
    membership => membership.centerId === centerId && membership.isApproved
  )
}

function getActorCenterRole(
  user: NonNullable<Awaited<ReturnType<typeof loadUser>>>,
  centerId: string
): CenterRole | null {
  if (user.canAccessAllCenters) {
    return 'ADMIN'
  }

  const membership = getApprovedMembershipForCenter(user, centerId)
  return membership ? getMembershipRole(membership) : null
}

function canAccessCenter(
  user: NonNullable<Awaited<ReturnType<typeof loadUser>>>,
  centerId: string
) {
  if (user.canAccessAllCenters) {
    return true
  }

  return !!getApprovedMembershipForCenter(user, centerId)
}

async function buildAuthUser(user: NonNullable<Awaited<ReturnType<typeof loadUser>>>) {
  if (user.canAccessAllCenters) {
    const centers = await prisma.center.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' }
    })

    return {
      phone: user.phone,
      name: user.name,
      canAccessAllCenters: true,
      centers: centers.map(center => center.id),
      centerDetails: centers.map(center => ({
        id: center.id,
        name: center.name,
        role: 'ADMIN' as const,
        capabilities: getCenterCapabilities('ADMIN')
      }))
    }
  }

  const approvedMemberships = user.centers.filter(membership => membership.isApproved)

  return {
    phone: user.phone,
    name: user.name,
    canAccessAllCenters: user.canAccessAllCenters,
    centers: approvedMemberships.map(membership => membership.centerId),
    centerDetails: approvedMemberships.map(membership => ({
      id: membership.center.id,
      name: membership.center.name,
      role: getMembershipRole(membership),
      capabilities: getCenterCapabilities(getMembershipRole(membership))
    }))
  }
}

function createToken(phone: string) {
  return Buffer.from(`${phone}:${Date.now()}`).toString('base64')
}

function ensureOverallAdmin(user: NonNullable<Awaited<ReturnType<typeof loadUser>>>, res: Response) {
  if (!user.canAccessAllCenters) {
    res.status(403).json({ error: 'Overall admin access is required' })
    return false
  }

  return true
}

async function getActor(req: Request, res: Response) {
  const phone = getPhoneFromAuthHeader(req.headers.authorization)
  if (!phone) {
    res.status(401).json({ error: 'No authorization header' })
    return null
  }

  const user = await loadUser(phone)
  if (!user) {
    res.status(401).json({ error: 'User not found' })
    return null
  }

  return user
}

function canManageCenter(
  user: NonNullable<Awaited<ReturnType<typeof loadUser>>>,
  centerId: string
) {
  return canAccessCenter(user, centerId)
}

function getApprovedMemberships(user: NonNullable<Awaited<ReturnType<typeof loadUser>>>) {
  return user.centers.filter(membership => membership.isApproved)
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' })
    }

    if (phone !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = await loadUser(phone)

    if (!user) {
      const centers = await prisma.center.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' }
      })

      return res.status(404).json({
        error: 'User not found. Please complete registration.',
        registrationRequired: true,
        phone,
        centers
      })
    }

    const approvedMemberships = getApprovedMemberships(user)

    if (!user.canAccessAllCenters && approvedMemberships.length === 0) {
      const pendingCenters = user.centers
        .filter(membership => !membership.isApproved)
        .map(membership => ({ id: membership.center.id, name: membership.center.name }))

      return res.status(403).json({
        error: pendingCenters.length > 0
          ? 'Access request pending admin approval.'
          : 'No approved center access found. Contact an admin.',
        pendingApproval: pendingCenters.length > 0,
        centers: pendingCenters.length > 0 ? pendingCenters : undefined
      })
    }

    res.json({
      user: await buildAuthUser(user),
      token: createToken(phone)
    })
  } catch (error) {
    res.status(500).json({ error: buildAuthErrorMessage('Login failed', error) })
  }
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, password, name, centerId } = req.body

    if (!phone || !password || !name || !centerId) {
      return res.status(400).json({ error: 'Phone, password, name, and center are required' })
    }

    if (phone !== password) {
      return res.status(401).json({ error: 'Password must match phone number' })
    }

    const existingUser = await loadUser(phone)
    if (existingUser) {
      const pendingRequest = existingUser.centers.find(membership => membership.centerId === centerId)

      if (pendingRequest && !pendingRequest.isApproved) {
        return res.status(400).json({ error: 'Access request is already pending approval.' })
      }

      return res.status(400).json({ error: 'User already exists. Contact admin to update access.' })
    }

    const center = await prisma.center.findUnique({ where: { id: centerId } })
    if (!center) {
      return res.status(404).json({ error: 'Selected center does not exist' })
    }

    await prisma.user.create({
      data: {
        phone,
        name,
        canAccessAllCenters: false,
        centers: {
          create: [{ centerId, role: 'USER', isApproved: false }]
        }
      },
    })

    res.status(201).json({
      message: 'Registration submitted. An admin must approve access before you can log in.',
      pendingApproval: true
    })
  } catch (error) {
    res.status(500).json({ error: buildAuthErrorMessage('Registration failed', error) })
  }
})

router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await getActor(req, res)
    if (!user) {
      return
    }

    res.json(await buildAuthUser(user))
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

router.get('/users', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) {
      return
    }

    const centerId = (req.headers['x-center-id'] as string | undefined) || (req.query.centerId as string | undefined)
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    if (!canManageCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required for this operation' })
    }

    const memberships = await prisma.userCenter.findMany({
      where: { centerId },
      include: {
        user: true,
        center: true
      }
    })

    res.json(
      memberships
        .map(membership => ({
          phone: membership.user.phone,
          name: membership.user.name,
          centerId: membership.center.id,
          centerName: membership.center.name,
          centerRole: getMembershipRole(membership),
          canAccessAllCenters: membership.user.canAccessAllCenters,
          isApproved: membership.isApproved,
          accessStatus: membership.isApproved ? 'approved' : 'pending'
        }))
        .sort((left, right) => {
          if (left.isApproved !== right.isApproved) {
            return left.isApproved ? 1 : -1
          }

          return left.name.localeCompare(right.name)
        })
    )
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.put('/users/:phone', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) {
      return
    }

    const targetPhone = req.params.phone
    const { name, centerId, centerRole, isCenterAdmin, canAccessAllCenters } = req.body

    const resolvedCenterRole =
      normalizeCenterRole(centerRole) ||
      (typeof isCenterAdmin === 'boolean' ? (isCenterAdmin ? 'ADMIN' : 'USER') : null)

    if (centerRole !== undefined && !resolvedCenterRole) {
      return res.status(400).json({ error: 'Invalid center role' })
    }

    if (!targetPhone || !centerId) {
      return res.status(400).json({ error: 'Phone and center are required' })
    }

    if (!canManageCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required for this operation' })
    }

    if (typeof canAccessAllCenters === 'boolean' && !actor.canAccessAllCenters) {
      return res.status(403).json({ error: 'Only overall admins can assign overall admin access' })
    }

    const actorCenterRole = getActorCenterRole(actor, centerId)
    if (!actor.canAccessAllCenters && !actorCenterRole) {
      return res.status(403).json({ error: 'Center access is required for this operation' })
    }

    if (
      resolvedCenterRole &&
      !actor.canAccessAllCenters &&
      actorCenterRole &&
      !canGrantRole(actorCenterRole, resolvedCenterRole)
    ) {
      return res.status(403).json({ error: 'You can only grant roles within your access level' })
    }

    let targetUser = await prisma.user.findUnique({ where: { phone: targetPhone } })

    if (!targetUser) {
      if (!name) {
        return res.status(400).json({ error: 'Name is required when creating a new user' })
      }

      targetUser = await prisma.user.create({
        data: {
          phone: targetPhone,
          name,
          canAccessAllCenters: actor.canAccessAllCenters ? !!canAccessAllCenters : false
        }
      })
    } else if (name && name !== targetUser.name) {
      targetUser = await prisma.user.update({
        where: { phone: targetPhone },
        data: { name }
      })
    }

    if (actor.canAccessAllCenters && typeof canAccessAllCenters === 'boolean') {
      targetUser = await prisma.user.update({
        where: { phone: targetPhone },
        data: { canAccessAllCenters }
      })
    }

    const existingMembership = await prisma.userCenter.findUnique({
      where: {
        userPhone_centerId: {
          userPhone: targetPhone,
          centerId
        }
      }
    })

    const nextRole =
      resolvedCenterRole ||
      (existingMembership ? getMembershipRole(existingMembership) : 'USER')

    const membership = await prisma.userCenter.upsert({
      where: {
        userPhone_centerId: {
          userPhone: targetPhone,
          centerId
        }
      },
      update: {
        role: nextRole,
        isApproved: true
      },
      create: {
        userPhone: targetPhone,
        centerId,
        role: nextRole,
        isApproved: true
      },
      include: {
        user: true,
        center: true
      }
    })

    res.json({
      phone: membership.user.phone,
      name: membership.user.name,
      centerId: membership.center.id,
      centerName: membership.center.name,
      centerRole: getMembershipRole(membership),
      canAccessAllCenters: membership.user.canAccessAllCenters,
      isApproved: membership.isApproved,
      accessStatus: membership.isApproved ? 'approved' : 'pending'
    })
  } catch {
    res.status(500).json({ error: 'Failed to update user access' })
  }
})

router.delete('/users/:phone', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) {
      return
    }

    const centerId = (req.headers['x-center-id'] as string | undefined) || (req.query.centerId as string | undefined)
    if (!centerId) {
      return res.status(400).json({ error: 'Center ID is required' })
    }

    if (!canManageCenter(actor, centerId)) {
      return res.status(403).json({ error: 'Center access is required for this operation' })
    }

    const actorCenterRole = getActorCenterRole(actor, centerId)
    if (!actor.canAccessAllCenters && !actorCenterRole) {
      return res.status(403).json({ error: 'Center access is required for this operation' })
    }

    const targetMembership = await prisma.userCenter.findUnique({
      where: {
        userPhone_centerId: {
          userPhone: req.params.phone,
          centerId
        }
      }
    })

    if (!targetMembership) {
      return res.status(404).json({ error: 'Access entry not found' })
    }

    const targetRole = getMembershipRole(targetMembership)
    if (
      !actor.canAccessAllCenters &&
      actorCenterRole &&
      !canGrantRole(actorCenterRole, targetRole)
    ) {
      return res.status(403).json({ error: 'You can only remove roles within your access level' })
    }

    const deletedMembership = await prisma.userCenter.deleteMany({
      where: {
        userPhone: req.params.phone,
        centerId
      }
    })

    if (deletedMembership.count === 0) {
      return res.status(404).json({ error: 'Access entry not found' })
    }

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to remove user access' })
  }
})

router.get('/centers', async (req: Request, res: Response) => {
  try {
    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    res.json(centers)
  } catch {
    res.status(500).json({ error: 'Failed to fetch centers' })
  }
})

router.post('/centers', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) {
      return
    }

    if (!ensureOverallAdmin(actor, res)) {
      return
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) {
      return res.status(400).json({ error: 'Center name is required' })
    }

    const center = await prisma.center.create({
      data: { name },
      select: { id: true, name: true }
    })

    res.status(201).json(center)
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(400).json({ error: 'Center already exists' })
    }

    res.status(500).json({ error: 'Failed to create center' })
  }
})

router.patch('/centers/:centerId', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req, res)
    if (!actor) {
      return
    }

    if (!ensureOverallAdmin(actor, res)) {
      return
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name) {
      return res.status(400).json({ error: 'Center name is required' })
    }

    const center = await prisma.center.update({
      where: { id: req.params.centerId },
      data: { name },
      select: { id: true, name: true }
    })

    res.json(center)
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(400).json({ error: 'Center already exists' })
    }

    res.status(500).json({ error: 'Failed to update center' })
  }
})

export default router
