/**
 * Seed reference data. Idempotent — runs on every `npm start`, and a failure
 * stops the start (a new site would otherwise come up without a login).
 *
 *   - Paint manufacturers
 *   - Sherwin-Williams + Benjamin Moore color catalog (data/Color Uploads.xlsx)
 *   - Global room list (ROOM_HIERARCHY)
 *   - An admin account, when ADMIN_EMAIL and ADMIN_PASSWORD are set and no user
 *     with that email exists yet (public signup is normally disabled, so this
 *     is how a new deployment gets its first login)
 *
 * Only inserts missing rows; existing rows are left as they are, apart from
 * linking colors that have no manufacturer record yet.
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { MANUFACTURERS, buildGlobalRooms, readColorCatalog } from './lib/reference-data';

const prisma = new PrismaClient();

async function seedManufacturers(): Promise<number> {
  // skipDuplicates covers both unique keys, so an existing manufacturer with
  // another name but the same abbreviation is left alone instead of failing
  const { count } = await prisma.manufacturer.createMany({ data: MANUFACTURERS, skipDuplicates: true });
  return count;
}

async function seedColors(): Promise<number> {
  const catalog = readColorCatalog();
  const { count } = await prisma.color.createMany({
    data: catalog.map((entry) => ({ ...entry, status: 'active' })),
    skipDuplicates: true,
  });

  for (const m of await prisma.manufacturer.findMany({ select: { id: true, name: true } })) {
    await prisma.color.updateMany({
      where: { manufacturer: m.name, manufacturerId: null },
      data: { manufacturerId: m.id },
    });
  }
  return count;
}

async function seedRooms(): Promise<number> {
  const { count } = await prisma.room.createMany({
    data: buildGlobalRooms().map((room) => ({ ...room, projectId: null })),
    skipDuplicates: true,
  });
  return count;
}

async function seedAdmin(): Promise<string> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return 'skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)';

  if (await prisma.user.findUnique({ where: { email } })) return `exists (${email})`;
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const name = process.env.ADMIN_NAME?.trim() || 'Administrator';
  const [firstName, ...rest] = name.split(/\s+/);
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      name,
      firstName,
      lastName: rest.join(' ') || null,
      role: 'admin',
    },
  });
  return `created (${email})`;
}

async function main() {
  const manufacturers = await seedManufacturers();
  const colors = await seedColors();
  const rooms = await seedRooms();
  const admin = await seedAdmin();
  console.log(
    `[seed] manufacturers +${manufacturers}, colors +${colors}, rooms +${rooms}, admin ${admin}`
  );
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
