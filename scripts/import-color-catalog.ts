/**
 * Import complete SW + BM color catalog from Color Uploads.xlsx
 *
 * - Reads both SW and BM tabs
 * - Normalizes color codes (SW0001 → SW 0001, BM AF-5 → unchanged)
 * - X-refs existing DB color codes against catalog and updates truncated names
 * - Inserts missing colors
 * - Reports: total catalog, updated, inserted, still-unmatched
 *
 * Run: npx tsx --require dotenv/config scripts/import-color-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
import { COLOR_CATALOG_PATH, CatalogEntry, readColorCatalog } from './lib/reference-data';

const prisma = new PrismaClient();

async function main() {
  console.log(`📖 Reading: ${COLOR_CATALOG_PATH}`);
  const allEntries = readColorCatalog();
  const swCount = allEntries.filter((e) => e.manufacturer === 'Sherwin Williams').length;

  console.log(`   SW catalog entries: ${swCount}`);
  console.log(`   BM catalog entries: ${allEntries.length - swCount}`);

  // Build a lookup by (manufacturer, colorCode)
  const catalogMap = new Map<string, CatalogEntry>();
  for (const e of allEntries) {
    catalogMap.set(`${e.manufacturer}::${e.colorCode}`, e);
  }

  // --- Pass 1: Update existing DB colors against catalog ---
  const existingColors = await prisma.color.findMany();
  console.log(`\n📊 DB has ${existingColors.length} existing colors`);

  let updated = 0;
  let stillUnmatched = 0;
  const unmatched: { code: string; name: string }[] = [];

  for (const c of existingColors) {
    const key = `${c.manufacturer}::${c.colorCode}`;
    const catalog = catalogMap.get(key);
    if (!catalog) {
      stillUnmatched++;
      unmatched.push({ code: c.colorCode, name: c.name });
      continue;
    }
    // If name differs (truncated) or hex/rgb missing, update
    const needsUpdate =
      c.name !== catalog.name ||
      (catalog.hexColor && c.hexColor !== catalog.hexColor) ||
      (catalog.rgbColor && c.rgbColor !== catalog.rgbColor);

    if (needsUpdate) {
      await prisma.color.update({
        where: { id: c.id },
        data: {
          name: catalog.name,
          hexColor: catalog.hexColor || c.hexColor,
          rgbColor: catalog.rgbColor || c.rgbColor,
        },
      });
      updated++;
      if (c.name !== catalog.name) {
        console.log(`  ✏️  ${c.colorCode}: "${c.name}" → "${catalog.name}"`);
      }
    }
  }

  // --- Pass 2: Insert missing catalog entries ---
  const existingKeys = new Set(existingColors.map((c) => `${c.manufacturer}::${c.colorCode}`));
  let inserted = 0;
  let insertErrors = 0;

  for (const e of allEntries) {
    const key = `${e.manufacturer}::${e.colorCode}`;
    if (existingKeys.has(key)) continue;
    try {
      await prisma.color.create({
        data: {
          colorCode: e.colorCode,
          name: e.name,
          manufacturer: e.manufacturer,
          hexColor: e.hexColor,
          rgbColor: e.rgbColor,
        },
      });
      inserted++;
    } catch (err: any) {
      insertErrors++;
      if (insertErrors < 5) {
        console.error(`  ⚠️  Insert failed ${e.colorCode}: ${err.message}`);
      }
    }
  }

  // --- Summary ---
  const finalCount = await prisma.color.count();
  console.log(`\n📊 Import complete:`);
  console.log(`   Catalog total:    ${allEntries.length}`);
  console.log(`   Existing updated: ${updated}`);
  console.log(`   New inserted:     ${inserted}`);
  console.log(`   Insert errors:    ${insertErrors}`);
  console.log(`   DB unmatched:     ${stillUnmatched}`);
  console.log(`   Final DB count:   ${finalCount}`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️  DB codes not in catalog (first 10):`);
    unmatched.slice(0, 10).forEach((u) => console.log(`     ${u.code}: ${u.name}`));
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
