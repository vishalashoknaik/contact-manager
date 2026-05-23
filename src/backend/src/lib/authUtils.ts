import { Request, Response } from 'express'
import prisma from './prisma.js'

/**
 * Minimal shape of a User row as needed by route-level auth checks.
 * The full Prisma type includes more fields; we only declare what is
 * consumed so callers don't need to cast.
 */
export type Actor = {
  phone: string
  name: string
  canAccessAllCenters: boolean
  centers: Array<{ centerId: string; isApproved: boolean; role: string }>
}

/**
 * Parse the phone number from a base64-encoded Bearer token.
 *
 * Token format: base64(phone:timestamp)
 * The phone is everything before the LAST colon so that colons inside
 * the phone (unusual but possible) are preserved.
 */
export function getPhoneFromAuthHeader(authorization: string | undefined): string | null {
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

/**
 * Resolve the authenticated user from the request Authorization header.
 *
 * Sends 401 and returns null if the header is absent or the user is not
 * found, so callers can use the early-return pattern:
 *   const actor = await getActor(req, res)
 *   if (!actor) return
 */
export async function getActor(req: Request, res: Response): Promise<Actor | null> {
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

  return user as unknown as Actor
}

/**
 * Return true if the actor has approved membership for the given center,
 * or is an overall admin.
 */
export function canAccessCenter(actor: Actor, centerId: string): boolean {
  if (actor.canAccessAllCenters) return true
  return actor.centers.some(m => m.centerId === centerId && m.isApproved)
}

/**
 * Return true if the actor holds ADMIN or USER role for the given center
 * (or is an overall admin).  These roles can manage campaigns, contacts,
 * and volunteer lists.  ATTENDANCE_TAKER cannot.
 */
export function isAdminOrUser(actor: Actor, centerId: string): boolean {
  if (actor.canAccessAllCenters) return true
  const membership = actor.centers.find(m => m.centerId === centerId)
  return membership?.role === 'ADMIN' || membership?.role === 'USER'
}
