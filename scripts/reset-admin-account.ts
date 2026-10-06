/**
 * Reset to single admin account for testing
 * Deletes all users EXCEPT the primary data owner, then resets their password
 * Run with:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx --require dotenv/config scripts/reset-admin-account.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_ID = 'cmkklu7b50000qieeyvw720na'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD')
  }

  console.log('Resetting to single admin account...')

  // Delete all users EXCEPT the primary admin (cascade will clean up their data)
  const deleted = await prisma.user.deleteMany({
    where: {
      id: { not: ADMIN_ID }
    }
  })
  console.log(`Deleted ${deleted.count} other user account(s)`)

  // Hash the new password
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

  // Update the admin account
  const admin = await prisma.user.update({
    where: { id: ADMIN_ID },
    data: {
      email: ADMIN_EMAIL,
      name: 'Mark Wead',
      firstName: 'Mark',
      lastName: 'Wead',
      password: hashedPassword,
      passwordChangedAt: new Date(), // signs out existing sessions
      role: 'admin',
    }
  })

  console.log(`Admin account reset:`)
  console.log(`  Email:    ${admin.email}`)
  console.log(`  Role:     ${admin.role}`)
  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
