/**
 * Seed script to create test user for E2E tests
 * Run with: npx tsx prisma/seed-test-user.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const testEmail = 'test@colorguru.com';
  const testPassword = 'TestPassword123!';

  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', testEmail);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      role: 'consultant',
      tier: 'free',
    },
  });

  console.log('✅ Test user created successfully!');
  console.log('📧 Email:', testEmail);
  console.log('🔑 Password:', testPassword);
  console.log('👤 User ID:', user.id);
}

main()
  .catch((e) => {
    console.error('❌ Error creating test user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
