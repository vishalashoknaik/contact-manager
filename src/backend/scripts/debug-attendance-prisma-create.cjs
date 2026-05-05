const { PrismaClient } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()
  try {
    const actor = await prisma.user.findFirst({
      where: {
        OR: [
          { canAccessAllCenters: true },
          { centers: { some: { isApproved: true } } }
        ]
      },
      include: { centers: true }
    })

    if (!actor) {
      console.log('No eligible actor found')
      return
    }

    const centerId = actor.centers.find(c => c.isApproved)?.centerId || (await prisma.center.findFirst())?.id
    if (!centerId) {
      console.log('No center found')
      return
    }

    const normalize = items => items.map(item => item?.trim()).filter(Boolean)

    const created = await prisma.attendanceSession.create({
      data: {
        name: 'Direct Prisma Debug',
        centerId,
        createdByPhone: actor.phone,
        activities: normalize(['Walkathon']),
        areas: normalize(['Downtown']),
        programs: normalize(['Youth Program']),
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

    console.log('CREATE_OK', created.id)
  } catch (err) {
    console.log('CREATE_FAIL')
    console.error(err)
    if (err && typeof err === 'object') {
      console.log('ERROR_CODE', err.code)
      console.log('ERROR_META', JSON.stringify(err.meta || null))
    }
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run().catch(err => {
  console.error('FATAL', err)
  process.exit(1)
})
