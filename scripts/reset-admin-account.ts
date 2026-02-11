/**
 * Reset to single admin account for testing
 * Deletes all users EXCEPT the primary data owner, then resets their password
 * Run with: npx tsx scripts/reset-admin-account.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_ID = 'cmkklu7b50000qieeyvw720na'
const ADMIN_EMAIL = 'weadtech@outlook.com'
const ADMIN_PASSWORD = 'ColorAdmin2026!'

async function main() {
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
      role: 'ADMIN',
    }
  })

  console.log(`Admin account reset:`)
  console.log(`  Email:    ${admin.email}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  Role:     ${admin.role}`)
  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
