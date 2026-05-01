import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const center1 = await prisma.center.upsert({
    where: { name: 'Center 1' },
    update: {},
    create: { name: 'Center 1' }
  })

  const center2 = await prisma.center.upsert({
    where: { name: 'Center 2' },
    update: {},
    create: { name: 'Center 2' }
  })

  const center3 = await prisma.center.upsert({
    where: { name: 'Center 3' },
    update: {},
    create: { name: 'Center 3' }
  })

  console.log('Centers created:', {
    center1: center1.id,
    center2: center2.id,
    center3: center3.id
  })

  const manager1 = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      phone: '9876543210',
      name: 'Manager Center 1',
      canAccessAllCenters: false,
      centers: {
        create: [{ centerId: center1.id, isAdmin: true }]
      }
    }
  })

  const manager2 = await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: {},
    create: {
      phone: '9876543211',
      name: 'Manager Center 2',
      canAccessAllCenters: false,
      centers: {
        create: [{ centerId: center2.id, isAdmin: true }]
      }
    }
  })

  const admin = await prisma.user.upsert({
    where: { phone: '8765432109' },
    update: {},
    create: {
      phone: '8765432109',
      name: 'Admin User',
      canAccessAllCenters: true,
      centers: {
        create: [
          { centerId: center1.id, isAdmin: true },
          { centerId: center2.id, isAdmin: true },
          { centerId: center3.id, isAdmin: true }
        ]
      }
    }
  })

  console.log('Users created:', { manager1, manager2, admin })

  await prisma.activity.upsert({
    where: { name_centerId: { name: 'Walkathon', centerId: center1.id } },
    update: {},
    create: { name: 'Walkathon', centerId: center1.id }
  })

  await prisma.activity.upsert({
    where: { name_centerId: { name: 'Walkathon', centerId: center2.id } },
    update: {},
    create: { name: 'Walkathon', centerId: center2.id }
  })

  console.log('Activities created')
  console.log('Seeding completed successfully!')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
