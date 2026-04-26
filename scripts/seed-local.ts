import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Essential Sherwin Williams colors for field testing
const essentialColors = [
  { colorCode: 'SW 7005', name: 'Pure White', hexColor: '#F7F7F2', rgbColor: '247,247,242', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7008', name: 'Alabaster', hexColor: '#F2EBE1', rgbColor: '242,235,225', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7006', name: 'Extra White', hexColor: '#F5F5F0', rgbColor: '245,245,240', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7004', name: 'Snowbound', hexColor: '#E8E4DF', rgbColor: '232,228,223', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7015', name: 'Repose Gray', hexColor: '#C8C4BC', rgbColor: '200,196,188', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7016', name: 'Mindful Gray', hexColor: '#B8B4AC', rgbColor: '184,180,172', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7021', name: 'Popular Gray', hexColor: '#C4BFB5', rgbColor: '196,191,181', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7029', name: 'Agreeable Gray', hexColor: '#C9C4BA', rgbColor: '201,196,186', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7036', name: 'Accessible Beige', hexColor: '#C4B8A8', rgbColor: '196,184,168', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7037', name: 'Balanced Beige', hexColor: '#B8A99A', rgbColor: '184,169,154', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7043', name: 'Worldly Gray', hexColor: '#BFB9B0', rgbColor: '191,185,176', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7047', name: 'Anew Gray', hexColor: '#AFA69B', rgbColor: '175,166,155', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7048', name: 'Urban Putty', hexColor: '#A89E92', rgbColor: '168,158,146', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7070', name: 'Site White', hexColor: '#E8E6E1', rgbColor: '232,230,225', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7514', name: 'French Moire', hexColor: '#D4CFC7', rgbColor: '212,207,199', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7551', name: 'Greek Villa', hexColor: '#F0EAE0', rgbColor: '240,234,224', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7566', name: 'Westhighland White', hexColor: '#EDE8E0', rgbColor: '237,232,224', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7604', name: 'White Flour', hexColor: '#F2EDE5', rgbColor: '242,237,229', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7627', name: 'Findlay Cream', hexColor: '#E8DCC8', rgbColor: '232,220,200', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7647', name: 'Crushed Ice', hexColor: '#D5D0C8', rgbColor: '213,208,200', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7671', name: 'Gray Screen', hexColor: '#B5B0A8', rgbColor: '181,176,168', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7672', name: 'Passive', hexColor: '#C4BFB5', rgbColor: '196,191,181', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7674', name: 'Peppercorn', hexColor: '#4A4A4A', rgbColor: '74,74,74', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7728', name: 'Iron Ore', hexColor: '#3D3D3D', rgbColor: '61,61,61', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 7766', name: 'Evergreen Fog', hexColor: '#8B9488', rgbColor: '139,148,136', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 9109', name: 'Natural Tan', hexColor: '#C4B5A3', rgbColor: '196,181,163', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 9130', name: 'Shoji White', hexColor: '#E5DDD2', rgbColor: '229,221,210', manufacturer: 'Sherwin Williams' },
  { colorCode: 'SW 9150', name: 'Toque White', hexColor: '#E8E0D5', rgbColor: '232,224,213', manufacturer: 'Sherwin Williams' },
  { colorCode: 'BM OC-17', name: 'White Dove', hexColor: '#F2EDE6', rgbColor: '242,237,230', manufacturer: 'Benjamin Moore' },
  { colorCode: 'BM OC-23', name: 'Revere Pewter', hexColor: '#C4BCB2', rgbColor: '196,188,178', manufacturer: 'Benjamin Moore' },
  { colorCode: 'BM HC-170', name: 'Stonington Gray', hexColor: '#B5B0A8', rgbColor: '181,176,168', manufacturer: 'Benjamin Moore' },
  { colorCode: 'BM HC-172', name: 'Edgecomb Gray', hexColor: '#C4B8A8', rgbColor: '196,184,168', manufacturer: 'Benjamin Moore' },
]

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Seed colors (skip if already exist)
  console.log('\n📦 Seeding colors...')
  let created = 0
  let skipped = 0

  for (const color of essentialColors) {
    const existing = await prisma.color.findFirst({
      where: {
        colorCode: color.colorCode,
        manufacturer: color.manufacturer,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.color.create({
      data: {
        ...color,
        status: 'active',
        usageCount: 0,
      },
    })
    created++
  }

  console.log(`  ✓ Created ${created} colors, skipped ${skipped} existing`)

  // 2. Create test user if not exists
  console.log('\n👤 Creating test user...')
  const testEmail = 'test@colorguru.com'
  const testPassword = 'TestPassword123!'

  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  })

  if (existingUser) {
    // Update password to known value
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword },
    })
    console.log(`  ✓ Updated test user: ${testEmail} / ${testPassword}`)
  } else {
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        name: 'Test User',
        role: 'consultant',
        tier: 'free',
      },
    })
    console.log(`  ✓ Created test user: ${testEmail} / ${testPassword}`)
  }

  // 3. Seed room types if empty
  console.log('\n🏠 Checking room types...')
  const roomCount = await prisma.room.count()
  if (roomCount === 0) {
    const rooms = [
      'Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom', 'Bathroom',
      'Dining Room', 'Hallway', 'Entryway', 'Office', 'Laundry Room',
      'Garage', 'Basement', 'Attic', 'Closet', 'Pantry',
      'Mudroom', 'Powder Room', 'Great Room', 'Family Room', 'Sunroom'
    ]
    for (const name of rooms) {
      await prisma.room.create({ data: { name } })
    }
    console.log(`  ✓ Created ${rooms.length} room types`)
  } else {
    console.log(`  ✓ ${roomCount} room types already exist`)
  }

  // 4. Summary
  console.log('\n📊 Database Summary:')
  const [users, clients, properties, projects, photos, colors, annotations] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.property.count(),
    prisma.project.count(),
    prisma.photo.count(),
    prisma.color.count(),
    prisma.annotation.count(),
  ])

  console.log(`  Users: ${users}`)
  console.log(`  Clients: ${clients}`)
  console.log(`  Properties: ${properties}`)
  console.log(`  Projects: ${projects}`)
  console.log(`  Photos: ${photos}`)
  console.log(`  Colors: ${colors}`)
  console.log(`  Annotations: ${annotations}`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
