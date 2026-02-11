/**
 * Seed colors from XLSX export CSVs + create ColorAvailability cross-references
 * Run with: npx tsx scripts/seed-colors-from-xlsx.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const DATA_DIR = path.join(__dirname, '..', 'data', 'color-import')

// ── Parse Products sheet to get product lines with their sheens ──────────

interface ProductLine {
  manufacturer: string // "SW" or "BM"
  location: string     // "Interior", "Exterior", "Interior/Exterior"
  name: string         // "Emerald", "Duration", etc.
  displayName: string  // "Emerald Exterior", "Duration Interior"
  sheens: string[]     // ["Flat", "Satin", "Gloss"]
}

function parseProducts(): ProductLine[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'products.csv'), 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())

  // Header line defines sheen columns
  // Columns: Manufacturer, Interior/Exterior, Product, (empty), Ultra Flat, Flat, Matte, Low Sheen, Eggshell, Low Luster, Satin, Pearl, Semi Gloss, Medium Luster, Soft Gloss, Gloss, High Gloss, (empty), Translucent, Semi Transparent, Semi Solid, Solid, Other
  const sheenColumns = [
    { idx: 4, name: 'Ultra Flat' },
    { idx: 5, name: 'Flat' },
    { idx: 6, name: 'Matte' },
    { idx: 7, name: 'Low Sheen' },
    { idx: 8, name: 'Eggshell' },
    { idx: 9, name: 'Low Luster' },
    { idx: 10, name: 'Satin' },
    { idx: 11, name: 'Pearl' },
    { idx: 12, name: 'Semi-Gloss' },
    { idx: 13, name: 'Medium Luster' },
    { idx: 14, name: 'Soft Gloss' },
    { idx: 15, name: 'Gloss' },
    { idx: 16, name: 'High Gloss' },
    // Stain sheens
    { idx: 18, name: 'Translucent' },
    { idx: 19, name: 'Semi-Transparent' },
    { idx: 20, name: 'Semi-Solid' },
    { idx: 21, name: 'Solid' },
  ]

  const products: ProductLine[] = []
  let lastMfr = ''

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const mfr = cols[0]?.trim() || lastMfr
    const location = cols[1]?.trim()
    const productName = cols[2]?.trim()

    if (!productName || !location) continue
    if (mfr === 'Renner') continue // Skip Renner — no colors for it

    lastMfr = mfr

    const sheens: string[] = []
    for (const sc of sheenColumns) {
      const val = cols[sc.idx]?.trim()
      if (val && val.length > 0) {
        sheens.push(sc.name)
      }
    }

    if (sheens.length === 0) continue // Skip products with no sheens

    const displayName = `${productName} ${location}`

    products.push({
      manufacturer: mfr === 'SW' ? 'Sherwin Williams' : 'Benjamin Moore',
      location,
      name: productName,
      displayName,
      sheens,
    })
  }

  return products
}

// ── Parse color CSVs ─────────────────────────────────────────────────────

interface ColorRow {
  manufacturer: string
  colorCode: string
  name: string
  r: number
  g: number
  b: number
  hex: string
}

function parseSWColors(): ColorRow[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'sw-colors.csv'), 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())
  const colors: ColorRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 7) continue
    const colorCode = cols[1]?.trim()
    const name = cols[2]?.trim()
    const r = parseInt(cols[4]?.trim() || '0')
    const g = parseInt(cols[5]?.trim() || '0')
    const b = parseInt(cols[6]?.trim() || '0')
    const hex = cols[7]?.trim() || ''

    if (!colorCode || !name) continue

    // Normalize color code: "SW0001" → "SW 0001"
    const normalizedCode = colorCode.startsWith('SW') && !colorCode.includes(' ')
      ? `SW ${colorCode.slice(2)}`
      : colorCode

    colors.push({
      manufacturer: 'Sherwin Williams',
      colorCode: normalizedCode,
      name,
      r, g, b,
      hex: hex.startsWith('#') ? hex : `#${hex}`,
    })
  }

  return colors
}

function parseBMColors(): ColorRow[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, 'bm-colors.csv'), 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())
  const colors: ColorRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 6) continue
    // BM format: Manufacturer, Color Name, Color Number, R, G, B, Hex
    const name = cols[1]?.trim()
    const colorCode = cols[2]?.trim()
    const r = parseInt(cols[3]?.trim() || '0')
    const g = parseInt(cols[4]?.trim() || '0')
    const b = parseInt(cols[5]?.trim() || '0')
    const hex = cols[6]?.trim() || ''

    if (!colorCode || !name) continue

    colors.push({
      manufacturer: 'Benjamin Moore',
      colorCode,
      name,
      r, g, b,
      hex: hex.startsWith('#') ? hex : `#${hex}`,
    })
  }

  return colors
}

// ── Main seed function ───────────────────────────────────────────────────

async function main() {
  console.log('=== Color Catalog Import ===\n')

  // Parse data
  const swColors = parseSWColors()
  const bmColors = parseBMColors()
  const products = parseProducts()

  console.log(`Parsed ${swColors.length} Sherwin Williams colors`)
  console.log(`Parsed ${bmColors.length} Benjamin Moore colors`)
  console.log(`Parsed ${products.length} product lines with sheens`)

  const swProducts = products.filter(p => p.manufacturer === 'Sherwin Williams')
  const bmProducts = products.filter(p => p.manufacturer === 'Benjamin Moore')
  console.log(`  SW products: ${swProducts.length} (${swProducts.reduce((a, p) => a + p.sheens.length, 0)} total sheen combos)`)
  console.log(`  BM products: ${bmProducts.length} (${bmProducts.reduce((a, p) => a + p.sheens.length, 0)} total sheen combos)`)

  // Calculate total availability records
  const swSheenCount = swProducts.reduce((a, p) => a + p.sheens.length, 0)
  const bmSheenCount = bmProducts.reduce((a, p) => a + p.sheens.length, 0)
  const totalAvailability = swColors.length * swSheenCount + bmColors.length * bmSheenCount
  console.log(`\nTotal ColorAvailability records to create: ${totalAvailability.toLocaleString()}`)

  // Step 1: Clear existing data
  console.log('\n1. Clearing existing colors...')
  const deletedAvail = await prisma.colorAvailability.deleteMany()
  const deletedFavs = await prisma.userFavoriteColor.deleteMany()
  const deletedColors = await prisma.color.deleteMany()
  console.log(`   Deleted ${deletedColors.count} colors, ${deletedAvail.count} availability records, ${deletedFavs.count} favorites`)

  // Step 2: Insert colors
  console.log('\n2. Inserting colors...')
  const allColors = [...swColors, ...bmColors]

  // Deduplicate by colorCode (some may have dupes)
  const seen = new Set<string>()
  const uniqueColors = allColors.filter(c => {
    const key = `${c.manufacturer}:${c.colorCode}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  console.log(`   ${uniqueColors.length} unique colors (${allColors.length - uniqueColors.length} duplicates removed)`)

  // Batch insert colors in groups of 500
  const BATCH_SIZE = 500
  let insertedCount = 0
  const colorIdMap = new Map<string, string>() // "manufacturer:colorCode" → id

  for (let i = 0; i < uniqueColors.length; i += BATCH_SIZE) {
    const batch = uniqueColors.slice(i, i + BATCH_SIZE)

    const result = await prisma.color.createManyAndReturn({
      data: batch.map(c => ({
        colorCode: c.colorCode,
        name: c.name,
        manufacturer: c.manufacturer,
        rgbColor: `${c.r}, ${c.g}, ${c.b}`,
        hexColor: c.hex,
      })),
      select: { id: true, colorCode: true, manufacturer: true },
    })

    for (const row of result) {
      colorIdMap.set(`${row.manufacturer}:${row.colorCode}`, row.id)
    }

    insertedCount += result.length
    if ((i / BATCH_SIZE) % 2 === 0) {
      process.stdout.write(`   ${insertedCount}/${uniqueColors.length} colors...\r`)
    }
  }
  console.log(`   ${insertedCount} colors inserted                    `)

  // Step 3: Create ColorAvailability records
  console.log('\n3. Creating ColorAvailability records...')

  let availInserted = 0
  const AVAIL_BATCH = 2000

  // Process SW colors
  console.log('   Processing Sherwin Williams...')
  let swAvailBatch: { colorId: string; productLine: string; sheen: string }[] = []

  for (const color of swColors) {
    const colorId = colorIdMap.get(`Sherwin Williams:${color.colorCode}`)
    if (!colorId) continue

    for (const product of swProducts) {
      for (const sheen of product.sheens) {
        swAvailBatch.push({
          colorId,
          productLine: product.displayName,
          sheen,
        })

        if (swAvailBatch.length >= AVAIL_BATCH) {
          await prisma.colorAvailability.createMany({
            data: swAvailBatch,
            skipDuplicates: true,
          })
          availInserted += swAvailBatch.length
          process.stdout.write(`   ${availInserted.toLocaleString()} availability records...\r`)
          swAvailBatch = []
        }
      }
    }
  }
  if (swAvailBatch.length > 0) {
    await prisma.colorAvailability.createMany({ data: swAvailBatch, skipDuplicates: true })
    availInserted += swAvailBatch.length
  }
  console.log(`   SW: ${availInserted.toLocaleString()} records                    `)

  // Process BM colors
  console.log('   Processing Benjamin Moore...')
  let bmAvailBatch: { colorId: string; productLine: string; sheen: string }[] = []
  let bmInserted = 0

  for (const color of bmColors) {
    const colorId = colorIdMap.get(`Benjamin Moore:${color.colorCode}`)
    if (!colorId) continue

    for (const product of bmProducts) {
      for (const sheen of product.sheens) {
        bmAvailBatch.push({
          colorId,
          productLine: product.displayName,
          sheen,
        })

        if (bmAvailBatch.length >= AVAIL_BATCH) {
          await prisma.colorAvailability.createMany({
            data: bmAvailBatch,
            skipDuplicates: true,
          })
          bmInserted += bmAvailBatch.length
          process.stdout.write(`   ${bmInserted.toLocaleString()} BM availability records...\r`)
          bmAvailBatch = []
        }
      }
    }
  }
  if (bmAvailBatch.length > 0) {
    await prisma.colorAvailability.createMany({ data: bmAvailBatch, skipDuplicates: true })
    bmInserted += bmAvailBatch.length
  }
  availInserted += bmInserted
  console.log(`   BM: ${bmInserted.toLocaleString()} records                    `)

  console.log(`\n=== DONE ===`)
  console.log(`Colors: ${insertedCount}`)
  console.log(`Availability records: ${availInserted.toLocaleString()}`)
  console.log(`Product lines: ${products.length}`)

  // Print summary by manufacturer
  for (const mfr of ['Sherwin Williams', 'Benjamin Moore']) {
    const mfrProducts = products.filter(p => p.manufacturer === mfr)
    console.log(`\n${mfr} product lines:`)
    for (const p of mfrProducts) {
      console.log(`  ${p.displayName}: ${p.sheens.join(', ')}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
