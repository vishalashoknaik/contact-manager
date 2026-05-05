const { PrismaClient } = require('@prisma/client')

async function run() {
  const prisma = new PrismaClient()

  try {
    const centers = await prisma.center.findMany({ select: { id: true, name: true } })
    const users = await prisma.user.findMany({
      select: {
        phone: true,
        name: true,
        canAccessAllCenters: true,
        centers: { select: { centerId: true, isApproved: true, role: true } }
      }
    })

    console.log('CENTERS')
    console.log(JSON.stringify(centers, null, 2))
    console.log('USERS')
    console.log(JSON.stringify(users, null, 2))

    const approvedUser = users.find(u => u.canAccessAllCenters || u.centers.some(c => c.isApproved))
    const targetCenter =
      approvedUser?.centers.find(c => c.isApproved)?.centerId ||
      centers[0]?.id ||
      null

    if (!approvedUser || !targetCenter) {
      console.log('Cannot run start-session probe: missing approved user or center')
      return
    }

    const token = Buffer.from(`${approvedUser.phone}:debug`).toString('base64')

    const response = await fetch('http://localhost:3001/api/attendance/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Center-ID': targetCenter,
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Debug Session',
        activities: ['Walkathon'],
        areas: ['Downtown'],
        programs: ['Youth Program']
      })
    })

    const body = await response.text()
    console.log('START_SESSION_STATUS', response.status)
    console.log('START_SESSION_BODY', body)
  } finally {
    await prisma.$disconnect()
  }
}

run().catch(err => {
  console.error('DEBUG_ERROR', err)
  process.exit(1)
})
