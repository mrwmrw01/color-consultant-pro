/**
 * Fix truncated BM color names in the catalog.
 *
 * These names were cut off in the source xlsx. Corrections verified against
 * the official Benjamin Moore catalog at benjaminmoore.com.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Verified BM official names
const FIXES: Array<{ code: string; truncated: string; actual: string }> = [
  { code: 'AF-250', truncated: 'Head', actual: 'Head Over Heels' },
  { code: '2041-10', truncated: 'Hunter', actual: 'Hunter Green' },
  { code: '2054-20', truncated: 'Beau', actual: 'Beau Green' },
  { code: '2122-40', truncated: 'Smoke', actual: 'Smoke Embers' },
  { code: '2130-40', truncated: 'Black', actual: 'Black Jack' },
  { code: '2144-40', truncated: 'Soft', actual: 'Soft Fern' },
  { code: 'HC-39', truncated: 'Putnam', actual: 'Putnam Ivory' },
  { code: 'HC-154', truncated: 'Hale', actual: 'Hale Navy' },
  { code: 'HC-166', truncated: 'Kendall', actual: 'Kendall Charcoal' },
];

async function main() {
  console.log(`🔧 Fixing ${FIXES.length} truncated BM color names...\n`);
  let updated = 0;
  let skipped = 0;

  for (const fix of FIXES) {
    const rows = await prisma.color.findMany({
      where: { colorCode: fix.code, manufacturer: 'Benjamin Moore' },
    });
    if (rows.length === 0) {
      console.log(`  ⚠️  ${fix.code}: not found`);
      skipped++;
      continue;
    }
    for (const r of rows) {
      if (r.name === fix.actual) {
        console.log(`  ✓  ${fix.code}: already correct (${fix.actual})`);
        continue;
      }
      await prisma.color.update({
        where: { id: r.id },
        data: { name: fix.actual },
      });
      console.log(`  ✏️  ${fix.code}: "${fix.truncated}" → "${fix.actual}"`);
      updated++;
    }
  }

  console.log(`\n📊 Done. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
