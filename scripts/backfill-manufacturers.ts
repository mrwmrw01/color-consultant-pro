/**
 * Backfill the Manufacturer entity from existing Color.manufacturer strings.
 * Links each Color to its Manufacturer via manufacturerId.
 *
 * Idempotent — safe to re-run.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed the known manufacturers with codePattern hints
const SEED: Array<{ name: string; abbreviation: string; website?: string; codePattern?: string; notes?: string }> = [
  {
    name: 'Sherwin Williams',
    abbreviation: 'SW',
    website: 'https://www.sherwin-williams.com',
    codePattern: '^SW\\s*\\d{1,5}$',
    notes: 'Codes formatted "SW 0001" (with space).',
  },
  {
    name: 'Benjamin Moore',
    abbreviation: 'BM',
    website: 'https://www.benjaminmoore.com',
    codePattern: '^(AF|HC|CC|CSP|OC|PM)-\\d{1,4}$|^\\d{4}-\\d{2}$|^\\d{2,4}$',
    notes: 'Mixed code formats: AF-5, HC-154, 2041-10, 100.',
  },
  {
    name: 'Farrow & Ball',
    abbreviation: 'FB',
    website: 'https://www.farrow-ball.com',
    codePattern: '^\\d{1,3}$|^No\\.\\s*\\d{1,3}$',
    notes: 'Traditional British paint brand. Codes like "No. 200".',
  },
  {
    name: 'PPG Paints',
    abbreviation: 'PPG',
    website: 'https://www.ppgpaints.com',
  },
  {
    name: 'Behr',
    abbreviation: 'BH',
    website: 'https://www.behr.com',
  },
  {
    name: 'Dunn-Edwards',
    abbreviation: 'DE',
    website: 'https://www.dunnedwards.com',
  },
  {
    name: 'Valspar',
    abbreviation: 'VS',
    website: 'https://www.valspar.com',
  },
];

async function main() {
  console.log('🏭 Backfilling Manufacturer entity...\n');

  // Step 1: Upsert the known brands
  const byName = new Map<string, { id: string }>();
  for (const m of SEED) {
    const rec = await prisma.manufacturer.upsert({
      where: { name: m.name },
      update: {
        abbreviation: m.abbreviation,
        website: m.website ?? null,
        codePattern: m.codePattern ?? null,
        notes: m.notes ?? null,
      },
      create: m,
    });
    byName.set(m.name, { id: rec.id });
    console.log(`  ✓ ${m.name} (${m.abbreviation}) → ${rec.id}`);
  }

  // Step 2: Also create manufacturers for any Color.manufacturer strings we didn't seed
  const distinct = await prisma.color.findMany({
    select: { manufacturer: true },
    distinct: ['manufacturer'],
  });
  for (const d of distinct) {
    if (!d.manufacturer) continue;
    if (byName.has(d.manufacturer)) continue;
    const abbrev = d.manufacturer
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);
    const rec = await prisma.manufacturer.upsert({
      where: { name: d.manufacturer },
      update: {},
      create: { name: d.manufacturer, abbreviation: abbrev, notes: 'Auto-created from legacy manufacturer string' },
    });
    byName.set(d.manufacturer, { id: rec.id });
    console.log(`  ✓ (auto) ${d.manufacturer} (${abbrev}) → ${rec.id}`);
  }

  // Step 3: Backfill Color.manufacturerId
  let linked = 0;
  let alreadyLinked = 0;
  for (const [name, { id }] of byName.entries()) {
    const result = await prisma.color.updateMany({
      where: { manufacturer: name, manufacturerId: null },
      data: { manufacturerId: id },
    });
    linked += result.count;
  }
  alreadyLinked = await prisma.color.count({ where: { manufacturerId: { not: null } } });
  const unlinked = await prisma.color.count({ where: { manufacturerId: null } });

  console.log(`\n📊 Backfill complete:`);
  console.log(`   Manufacturers created/updated: ${byName.size}`);
  console.log(`   Colors newly linked:           ${linked}`);
  console.log(`   Colors total with manufacturerId: ${alreadyLinked}`);
  console.log(`   Colors still unlinked:         ${unlinked}`);

  if (unlinked > 0) {
    console.log(`\n⚠️  ${unlinked} colors have no manufacturer match — check Color.manufacturer value.`);
  }
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
