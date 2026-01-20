#!/usr/bin/env ts-node
/**
 * Seed Script - Import Colors to Database
 *
 * Usage: npx tsx scripts/seed-colors.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface ColorData {
  colorCode: string
  name: string
  manufacturer: string
  rgbColor?: string
  hexColor?: string
  notes?: string
  productLines?: Array<{
    productLine: string
    sheens: string[]
  }>
}

async function seedColors() {
  try {
    console.log('🎨 Starting color import...\n')

    // Read the JSON file
    const filePath = path.join(process.cwd(), 'data', 'sherwin-williams-top-50.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const colors: ColorData[] = JSON.parse(fileContent)

    console.log(`📁 Found ${colors.length} colors to import\n`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const color of colors) {
      try {
        // Check if color already exists
        const existing = await prisma.color.findUnique({
          where: { colorCode: color.colorCode }
        })

        if (existing) {
          console.log(`⏭️  Skipped: ${color.colorCode} - ${color.name} (already exists)`)
          skipped++
          continue
        }

        // Create the color with availability entries
        await prisma.color.create({
          data: {
            colorCode: color.colorCode,
            name: color.name,
            manufacturer: color.manufacturer,
            rgbColor: color.rgbColor,
            hexColor: color.hexColor,
            notes: color.notes,
            availability: {
              create: color.productLines?.flatMap(pl =>
                pl.sheens?.map(sheen => ({
                  productLine: pl.productLine,
                  sheen
                }))
              ) || []
            }
          }
        })

        console.log(`✅ Created: ${color.colorCode} - ${color.name}`)
        created++

      } catch (error: any) {
        console.error(`❌ Error importing ${color.colorCode}: ${error.message}`)
        errors++
      }
    }

    console.log(`\n📊 Import Complete!`)
    console.log(`   ✅ Created: ${created}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)

  } catch (error: any) {
    console.error('Fatal error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedColors()
