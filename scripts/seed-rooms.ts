import { PrismaClient } from '@prisma/client'
import { ROOM_HIERARCHY } from '../lib/types'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding global rooms from ROOM_HIERARCHY...')

  const rooms: { name: string; roomType: string; subType: string }[] = []

  for (const [roomType, config] of Object.entries(ROOM_HIERARCHY)) {
    for (const subtype of config.subtypes) {
      // Build the display name the same way the dropdowns do
      let name: string
      if (roomType === 'Custom') {
        // Skip the "Enter Custom Name" placeholder
        continue
      } else if (subtype === 'Other') {
        name = roomType
      } else if (subtype === 'Custom Defined') {
        name = `${roomType} - ${subtype}`
      } else {
        name = `${roomType} - ${subtype}`
      }

      rooms.push({
        name,
        roomType,
        subType: subtype,
      })
    }
  }

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
