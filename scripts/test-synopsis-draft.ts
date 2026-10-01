/**
 * Integration test for synopsis draft (steps 1-7).
 * Run: npx tsx scripts/test-synopsis-draft.ts
 *
 * Tests against the live local database. Creates test data, runs seeder,
 * validates structure, tests API logic, then cleans up.
 */

import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { synopsisStructureSchema } from "../lib/synopsis-types"

const prisma = new PrismaClient()

let testUserId: string
let testProjectId: string
let testPhotoId: string
let testColorWallId: string
let testColorTrimId: string
let testRoom1Id: string
let testRoom2Id: string

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function setup() {
  console.log("\n═══ SETUP: Creating test data ═══\n")

  // Create test user
  const user = await prisma.user.create({
    data: {
      id: `test-user-${randomUUID().slice(0, 8)}`,
      email: `test-${randomUUID().slice(0, 8)}@test.com`,
      name: "Test Consultant",
      role: "consultant",
    },
  })
  testUserId = user.id

  // Create test project
  const project = await prisma.project.create({
    data: {
      id: `test-project-${randomUUID().slice(0, 8)}`,
      name: "Test Home Repaint",
      clientName: "John Smith",
      clientEmail: "john@example.com",
      clientPhone: "555-0100",
      address: "123 Main St, Anytown",
      userId: testUserId,
    },
  })
  testProjectId = project.id

  // Create test rooms
  const room1 = await prisma.room.create({
    data: { id: `test-room1-${randomUUID().slice(0, 8)}`, name: `Test Living Room ${randomUUID().slice(0, 4)}` },
  })
  testRoom1Id = room1.id

  const room2 = await prisma.room.create({
    data: { id: `test-room2-${randomUUID().slice(0, 8)}`, name: `Test Kitchen ${randomUUID().slice(0, 4)}` },
  })
  testRoom2Id = room2.id

  // Create test colors
  const wallColor = await prisma.color.create({
    data: {
      id: `test-color-wall-${randomUUID().slice(0, 8)}`,
      colorCode: `SW${Math.floor(1000 + Math.random() * 8999)}`,
      name: "Grecian Ivory",
      manufacturer: "Sherwin Williams",
      hexColor: "#EDE6D3",
      availability: {
        create: [
          { productLine: "Duration", sheen: "Matte" },
          { productLine: "Duration", sheen: "Eggshell" },
        ],
      },
    },
  })
  testColorWallId = wallColor.id

  const trimColor = await prisma.color.create({
    data: {
      id: `test-color-trim-${randomUUID().slice(0, 8)}`,
      colorCode: `SW${Math.floor(1000 + Math.random() * 8999)}`,
      name: "Pure White",
      manufacturer: "Sherwin Williams",
      hexColor: "#F3F0E7",
      availability: {
        create: [
          { productLine: "Emerald Urethane", sheen: "Semi-Gloss" },
        ],
      },
    },
  })
  testColorTrimId = trimColor.id

  // Create test photo with annotations
  const photo = await prisma.photo.create({
    data: {
      id: `test-photo-${randomUUID().slice(0, 8)}`,
      filename: "test-photo.webp",
      originalFilename: "test-photo.jpg",
      cloud_storage_path: "uploads/test/test-photo.webp",
      mimeType: "image/webp",
      size: 100000,
      projectId: testProjectId,
      roomId: testRoom1Id,
      annotations: {
        create: [
          {
            type: "color_tag",
            data: { label: "Main wall" },
            surfaceType: "wall",
            colorId: testColorWallId,
            productLine: "Duration",
            sheen: "Matte",
            roomId: testRoom1Id,
          },
          {
            type: "color_tag",
            data: { label: "Kitchen wall" },
            surfaceType: "wall",
            colorId: testColorWallId,
            productLine: "Duration",
            sheen: "Matte",
            roomId: testRoom2Id,
          },
          {
            type: "color_tag",
            data: { label: "All trim" },
            surfaceType: "trim",
            colorId: testColorTrimId,
            productLine: "Emerald Urethane",
            sheen: "Semi-Gloss",
            roomId: testRoom1Id,
          },
          {
            // Annotation missing productLine — should fall back to availability
            type: "color_tag",
            data: { label: "Trim kitchen" },
            surfaceType: "trim",
            colorId: testColorTrimId,
            productLine: null,
            sheen: null,
            roomId: testRoom2Id,
          },
        ],
      },
    },
  })
  testPhotoId = photo.id

  console.log(`  Created user: ${testUserId}`)
  console.log(`  Created project: ${testProjectId}`)
  console.log(`  Created rooms: ${testRoom1Id}, ${testRoom2Id}`)
  console.log(`  Created colors: ${testColorWallId}, ${testColorTrimId}`)
  console.log(`  Created photo with 4 annotations: ${testPhotoId}`)
}

async function testSynopsisTypes() {
  console.log("\n═══ TEST: Synopsis Types + Zod Validation ═══\n")

  // Valid structure
  const validStructure = {
    summary: {
      walls: [{ colorCode: "SW7541", colorName: "Grecian Ivory", productLines: ["Duration - Matte"] }],
      trim: [{ colorCode: "SW7005", colorName: "Pure White", productLines: ["Emerald Urethane - Semi-Gloss"] }],
      ceilings: [],
    },
    groups: [
      {
        id: "g1",
        layout: 1,
        columns: [
          {
            id: "c1",
            roomsLabel: "Living Room, Kitchen",
            colorCode: "SW7541",
            colorName: "Grecian Ivory",
            productLine: "Duration",
            sheen: "Matte",
            photoIds: ["p1"],
          },
        ],
      },
    ],
  }

  const validResult = synopsisStructureSchema.safeParse(validStructure)
  assert(validResult.success, "Valid structure passes Zod validation")

  // Invalid: layout doesn't match columns length
  const invalidStructure = {
    ...validStructure,
    groups: [
      {
        id: "g1",
        layout: 2, // says 2 columns but only has 1
        columns: [validStructure.groups[0].columns[0]],
      },
    ],
  }
  const invalidResult = synopsisStructureSchema.safeParse(invalidStructure)
  assert(!invalidResult.success, "Mismatched layout/columns fails Zod validation")

  // Invalid: empty roomsLabel
  const emptyRoomsStructure = {
    ...validStructure,
    groups: [
      {
        id: "g1",
        layout: 1,
        columns: [{ ...validStructure.groups[0].columns[0], roomsLabel: "" }],
      },
    ],
  }
  const emptyResult = synopsisStructureSchema.safeParse(emptyRoomsStructure)
  assert(!emptyResult.success, "Empty roomsLabel fails Zod validation")

  // Valid: 3-column group
  const tripleStructure = {
    ...validStructure,
    groups: [
      {
        id: "g1",
        layout: 3 as const,
        columns: [
          validStructure.groups[0].columns[0],
          { ...validStructure.groups[0].columns[0], id: "c2", roomsLabel: "Bedroom" },
          { ...validStructure.groups[0].columns[0], id: "c3", roomsLabel: "Office" },
        ],
      },
    ],
  }
  const tripleResult = synopsisStructureSchema.safeParse(tripleStructure)
  assert(tripleResult.success, "3-column group with matching layout passes validation")
}

async function testSeeder() {
  console.log("\n═══ TEST: Seeder (seedSynopsisDraft) ═══\n")

  // Dynamic import to use path aliases properly
  // We'll use prisma directly since we can't easily resolve @/ aliases in scripts
  const { seedSynopsisDraft } = await import("../lib/synopsis-seeder")

  const draft = await seedSynopsisDraft(testProjectId)

  assert(draft !== null, "Seeder returns a draft")
  assert(draft.projectId === testProjectId, "Draft belongs to correct project")
  assert(draft.clientName === "John Smith", "Client name from project")
  assert(draft.address === "123 Main St, Anytown", "Address from project")
  assert(draft.email === "john@example.com", "Email from project")
  assert(draft.phone === "555-0100", "Phone from project")

  const structure = draft.structure as any

  // Validate structure passes Zod
  const zodResult = synopsisStructureSchema.safeParse(structure)
  assert(zodResult.success, `Structure passes Zod validation${zodResult.success ? "" : ": " + JSON.stringify((zodResult as any).error?.errors?.slice(0, 2))}`)

  // Summary checks
  assert(structure.summary.walls.length > 0, "Summary has wall colors")
  assert(structure.summary.trim.length > 0, "Summary has trim colors")

  const wallSummary = structure.summary.walls[0]
  assert(wallSummary.colorName === "Grecian Ivory", "Wall summary has correct color name")
  assert(wallSummary.productLines.includes("Duration"), "Wall summary includes product line")

  const trimSummary = structure.summary.trim[0]
  assert(trimSummary.colorName === "Pure White", "Trim summary has correct color name")

  // Groups checks
  assert(structure.groups.length > 0, "Has at least one group")

  // Check that wall groups come before trim groups
  let foundWallGroup = false
  let foundTrimGroup = false
  for (const group of structure.groups) {
    for (const col of group.columns) {
      if (col.colorName === "Grecian Ivory") {
        assert(!foundTrimGroup, "Wall groups ordered before trim groups")
        foundWallGroup = true
      }
      if (col.colorName === "Pure White") {
        foundTrimGroup = true
      }
    }
  }
  assert(foundWallGroup, "Found wall color group")
  assert(foundTrimGroup, "Found trim color group")

  // Check that rooms are grouped correctly
  let wallColumn: any = null
  for (const group of structure.groups) {
    for (const col of group.columns) {
      if (col.colorName === "Grecian Ivory") {
        wallColumn = col
        break
      }
    }
    if (wallColumn) break
  }
  assert(wallColumn !== null, "Found wall color column")
  if (wallColumn) {
    assert(wallColumn.roomsLabel.includes("Living Room") || wallColumn.roomsLabel.includes("Test Living Room"), "Wall column includes Living Room")
    assert(wallColumn.roomsLabel.includes("Kitchen") || wallColumn.roomsLabel.includes("Test Kitchen"), "Wall column includes Kitchen")
    assert(wallColumn.photoIds.length > 0, "Wall column has photo IDs")
  }

  // Check availability fallback (trim annotation 4 had null productLine/sheen)
  let trimColumn: any = null
  for (const group of structure.groups) {
    for (const col of group.columns) {
      if (col.colorName === "Pure White") {
        trimColumn = col
        break
      }
    }
    if (trimColumn) break
  }
  assert(trimColumn !== null, "Found trim color column")
  if (trimColumn) {
    assert(trimColumn.productLine === "Emerald Urethane", "Trim column product line from availability fallback")
    assert(trimColumn.sheen === "Semi-Gloss", "Trim column sheen from availability fallback")
  }

  // Test idempotent upsert
  const draft2 = await seedSynopsisDraft(testProjectId)
  assert(draft2.id === draft.id, "Re-seeding returns same draft (upsert)")
}

async function testDraftCRUD() {
  console.log("\n═══ TEST: Draft CRUD (database operations) ═══\n")

  // Read draft
  const draft = await prisma.synopsisDraft.findUnique({ where: { projectId: testProjectId } })
  assert(draft !== null, "Draft exists in database")

  if (!draft) return

  // Update structure
  const structure = draft.structure as any
  const modifiedStructure = {
    ...structure,
    groups: structure.groups.map((g: any, i: number) =>
      i === 0
        ? { ...g, columns: g.columns.map((c: any) => ({ ...c, roomsLabel: "Modified Room Label" })) }
        : g
    ),
  }

  const updated = await prisma.synopsisDraft.update({
    where: { projectId: testProjectId },
    data: {
      structure: JSON.parse(JSON.stringify(modifiedStructure)),
      clientName: "Jane Smith",
    },
  })
  assert(updated.clientName === "Jane Smith", "Client name updated")

  const updatedStructure = updated.structure as any
  assert(
    updatedStructure.groups[0].columns[0].roomsLabel === "Modified Room Label",
    "Structure roomsLabel updated"
  )

  // Validate modified structure still passes Zod
  const zodResult = synopsisStructureSchema.safeParse(updatedStructure)
  assert(zodResult.success, "Modified structure still passes Zod validation")
}

async function testDocxExporter() {
  console.log("\n═══ TEST: DOCX Exporter V2 ═══\n")

  const { createSynopsisDocumentV2 } = await import("../lib/synopsis-docx-exporter-v2")
  const { Packer } = await import("docx")

  const draft = await prisma.synopsisDraft.findUnique({ where: { projectId: testProjectId } })
  assert(draft !== null, "Draft exists for export")

  if (!draft) return

  const doc = await createSynopsisDocumentV2(draft)
  assert(doc !== null, "Document created")

  const buffer = await Packer.toBuffer(doc)
  assert(buffer.length > 0, `DOCX buffer generated (${buffer.length} bytes)`)
  assert(buffer.length > 500, "DOCX buffer is non-trivial size")

  // Check DOCX magic bytes (PK zip header)
  assert(buffer[0] === 0x50 && buffer[1] === 0x4b, "DOCX has valid ZIP/PK header")
}

async function testDocxContents() {
  console.log("\n═══ TEST: DOCX Content Verification (XML Inspection) ═══\n")

  const { createSynopsisDocumentV2 } = await import("../lib/synopsis-docx-exporter-v2")
  const { Packer } = await import("docx")
  const JSZip = (await import("jszip")).default

  const draft = await prisma.synopsisDraft.findUnique({ where: { projectId: testProjectId } })
  assert(draft !== null, "Draft exists for content verification")

  if (!draft) return

  const doc = await createSynopsisDocumentV2(draft)
  const buffer = await Packer.toBuffer(doc)

  // Unzip the DOCX and read word/document.xml
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file("word/document.xml")?.async("string")
  assert(documentXml !== undefined && documentXml !== null, "word/document.xml exists in DOCX archive")

  if (!documentXml) return

  // Client name (updated by testDraftCRUD to "Jane Smith")
  assert(documentXml.includes("Jane Smith"), "DOCX contains client name 'Jane Smith'")

  // Heading text
  assert(documentXml.includes("SPECIFICATIONS"), "DOCX contains 'SPECIFICATIONS' heading")

  // Disclaimer text
  assert(
    documentXml.includes("Color Guru provides color consultations"),
    "DOCX contains disclaimer text"
  )

  // Wall color name
  assert(documentXml.includes("Grecian Ivory"), "DOCX contains wall color name 'Grecian Ivory'")

  // Trim color name
  assert(documentXml.includes("Pure White"), "DOCX contains trim color name 'Pure White'")

  // Product lines
  assert(documentXml.includes("Duration"), "DOCX contains wall product line 'Duration'")
  assert(documentXml.includes("Emerald Urethane"), "DOCX contains trim product line 'Emerald Urethane'")

  // Modified room label from testDraftCRUD
  assert(documentXml.includes("Modified Room Label"), "DOCX contains 'Modified Room Label' from CRUD update")

  // Table count: at least 2 tables (summary table + group tables)
  const tableMatches = documentXml.match(/<w:tbl[ >]/g)
  const tableCount = tableMatches ? tableMatches.length : 0
  assert(tableCount >= 2, `DOCX contains at least 2 tables (found ${tableCount})`)
}

async function testEmptyProject() {
  console.log("\n═══ TEST: Empty Project (no annotations) ═══\n")

  const { seedSynopsisDraft } = await import("../lib/synopsis-seeder")

  const emptyProject = await prisma.project.create({
    data: {
      id: `test-empty-${randomUUID().slice(0, 8)}`,
      name: "Empty Project",
      clientName: "Nobody",
      userId: testUserId,
    },
  })

  try {
    const draft = await seedSynopsisDraft(emptyProject.id)
    assert(draft !== null, "Seeder handles empty project")

    const structure = draft.structure as any
    assert(structure.summary.walls.length === 0, "Empty project: no wall colors")
    assert(structure.summary.trim.length === 0, "Empty project: no trim colors")
    assert(structure.summary.ceilings.length === 0, "Empty project: no ceiling colors")
    assert(structure.groups.length === 0, "Empty project: no groups")

    const zodResult = synopsisStructureSchema.safeParse(structure)
    assert(zodResult.success, "Empty structure passes Zod validation")
  } finally {
    await prisma.synopsisDraft.deleteMany({ where: { projectId: emptyProject.id } })
    await prisma.project.delete({ where: { id: emptyProject.id } })
  }
}

async function cleanup() {
  console.log("\n═══ CLEANUP ═══\n")

  await prisma.synopsisDraft.deleteMany({ where: { projectId: testProjectId } })
  await prisma.annotation.deleteMany({ where: { photoId: testPhotoId } })
  await prisma.photo.deleteMany({ where: { id: testPhotoId } })
  await prisma.project.delete({ where: { id: testProjectId } })
  await prisma.colorAvailability.deleteMany({ where: { colorId: { in: [testColorWallId, testColorTrimId] } } })
  await prisma.color.deleteMany({ where: { id: { in: [testColorWallId, testColorTrimId] } } })
  await prisma.room.deleteMany({ where: { id: { in: [testRoom1Id, testRoom2Id] } } })
  await prisma.user.delete({ where: { id: testUserId } })

  console.log("  Cleaned up all test data")
}

async function main() {
  console.log("╔══════════════════════════════════════════╗")
  console.log("║  Synopsis Draft Integration Tests        ║")
  console.log("╚══════════════════════════════════════════╝")

  try {
    await setup()
    await testSynopsisTypes()
    await testSeeder()
    await testDraftCRUD()
    await testDocxExporter()
    await testDocxContents()
    await testEmptyProject()
  } catch (err) {
    console.error("\n  FATAL ERROR:", err)
    failed++
  } finally {
    await cleanup()
    await prisma.$disconnect()
  }

  console.log(`\n══════════════════════════════════════════`)
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log(`══════════════════════════════════════════\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main()
