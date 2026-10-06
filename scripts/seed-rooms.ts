import { PrismaClient } from '@prisma/client'
import { buildGlobalRooms } from './lib/reference-data'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding global rooms from ROOM_HIERARCHY...')

  const rooms = buildGlobalRooms()

  let created = 0
  let skipped = 0

  for (const room of rooms) {
    const existing = await prisma.room.findFirst({
      where: { name: room.name }
    })

    if (existing) {
      // Update roomType/subType if they were blank
      if (!existing.roomType || !existing.subType) {
        await prisma.room.update({
          where: { id: existing.id },
          data: {
            roomType: room.roomType,
            subType: room.subType,
          }
        })
        console.log(`  Updated: ${room.name} (set roomType=${room.roomType}, subType=${room.subType})`)
      } else {
        console.log(`  Skipped: ${room.name} (already exists)`)
      }
      skipped++
      continue
    }

    await prisma.room.create({
      data: {
        name: room.name,
        roomType: room.roomType,
        subType: room.subType,
        projectId: null, // Global room
      }
    })
    console.log(`  Created: ${room.name}`)
    created++
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`)
  console.log(`Total rooms in database: ${await prisma.room.count()}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
