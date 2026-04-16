/**
 * Fix truncated Benjamin Moore color names using the clean catalog from
 * github.com/wesbos/benjamin-moore-css (4,118 official BM colors).
 *
 * Downloads catalog, x-refs every BM color in the DB, updates names
 * where the DB version differs from the official catalog.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface CleanEntry {
  number: string;
  name: string;
  hex: string;
  family?: string;
}

async function main() {
  const path = '/tmp/bm-clean.json';
  if (!fs.existsSync(path)) {
    console.error(`❌ Missing ${path}. Run: curl -sSL -o ${path} https://raw.githubusercontent.com/wesbos/benjamin-moore-css/master/colors.json`);
    process.exit(1);
  }
  const raw = fs.readFileSync(path, 'utf-8');
  const clean: CleanEntry[] = JSON.parse(raw);
  console.log(`📖 Loaded ${clean.length} clean BM entries`);

  // Build lookup by color number (e.g., "AF-25")
  const cleanMap = new Map<string, CleanEntry>();
  for (const e of clean) {
    if (e.number) cleanMap.set(e.number.trim(), e);
  }

  // Fetch all BM colors from DB
  const bmColors = await prisma.color.findMany({
    where: { manufacturer: 'Benjamin Moore' },
  });
  console.log(`📊 DB has ${bmColors.length} BM colors`);

  let updated = 0;
  let notInClean = 0;
  let alreadyCorrect = 0;
  const changes: Array<{ code: string; old: string; new: string }> = [];

  for (const c of bmColors) {
    const clean = cleanMap.get(c.colorCode);
    if (!clean) {
      notInClean++;
      continue;
    }
    if (c.name === clean.name) {
      alreadyCorrect++;
      continue;
    }
    // Update name (and hex if the clean catalog has better data)
    const hexUpdate = clean.hex ? `#${clean.hex.toUpperCase().replace(/^#/, '')}` : c.hexColor;
    await prisma.color.update({
      where: { id: c.id },
      data: {
        name: clean.name,
        hexColor: hexUpdate,
      },
    });
    changes.push({ code: c.colorCode, old: c.name, new: clean.name });
    updated++;
  }

  console.log(`\n📊 Results:`);
  console.log(`   Already correct: ${alreadyCorrect}`);
  console.log(`   Updated:         ${updated}`);
  console.log(`   Not in clean:    ${notInClean} (DB codes not in wesbos catalog)`);

  console.log(`\n🔎 Sample changes (first 30):`);
  for (const ch of changes.slice(0, 30)) {
    console.log(`   ${ch.code}: "${ch.old}" → "${ch.new}"`);
  }
  if (changes.length > 30) {
    console.log(`   ... +${changes.length - 30} more`);
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
