import { PrismaClient } from '@prisma/client'

/**
 * Shared PrismaClient singleton.
 *
 * All route files must import `prisma` from here instead of creating their own
 * PrismaClient instances.  Multiple instances each spin up their own connection
 * pool, which quickly exhausts the small connection budget on the free-tier
 * Aiven PostgreSQL (≤ 25 connections total).
 *
 * connection_limit  — cap the pool to 5 connections for the whole server.
 * pool_timeout      — fail fast (20 s) instead of hanging when all conns busy.
 */
function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) return url

  const separator = url.includes('?') ? '&' : '?'

  // Don't double-add if the env var already contains these params.
  const extra: string[] = []
  if (!url.includes('connection_limit')) extra.push('connection_limit=5')
  if (!url.includes('pool_timeout')) extra.push('pool_timeout=20')

  return extra.length ? `${url}${separator}${extra.join('&')}` : url
}

const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } }
})

export default prisma
