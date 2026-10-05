/**
 * Restore recovered client data (photos + Michelle project) into the database.
 *
 * Context: the AWS account was deleted and the S3 bucket (colorguru-photos) is
 * gone. Photos recovered from exported DOCX files live in the recovery folder;
 * this script:
 *
 *   1. Re-ingests the recovered Wead + Michelle photos into the active storage
 *      driver (STORAGE_DRIVER=local or any S3-compatible endpoint).
 *   2. Creates Photo rows attached to the Wead project and updates the Wead
 *      synopsis draft to reference them (old S3 ids are dead).
 *   3. Rebuilds the Michelle project (client/property/project/synopsis draft)
 *      from the exported Michelle_Color_Synopsis.docx structure.
 *
 * Idempotent: re-running skips photos already present (by originalFilename).
 *
 * Run: npx tsx --require dotenv/config scripts/restore-recovered-data.ts
 */

import { PrismaClient } from "@prisma/client"
import { optimizeImage, generateBlurPlaceholder } from "../lib/image-optimizer"
import { putObject, getStoragePrefix } from "../lib/storage"
import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

const RECOVERY_DIR =
  process.env.RECOVERY_DIR || "/home/mark/recovery/photos"

const WEAD_PHOTOS = [
  "2a117d3fa9a9bb56a1f815c67bd6c71394dac8a8.jpg",
  "38667408988a81713391054b4a304a8c5a0704b9.jpg",
  "7f6ba0163d2c9ead61f532dfbfc067f18e90272d.jpg",
  "941baa510b7464f879f5e38b2110cf7677fdd0d6.jpg",
]

const MICHELLE_PHOTOS = [
  "michelle-bb14ab7465867bbbb9d10dd8b1a16493c27c02bd.jpg",
  "michelle-d41cb67e0afc6db8545b27d9e8244821c1f88a41.jpg",
  "michelle-f80f75c36dbf2a8214a52e38b84ee4144acb4fa9.jpg",
]

const MICHELLE_STRUCTURE = {
  summary: {
    walls: [
      { colorCode: "SW 6204", colorName: "Sea Salt", productLines: ["Cashmere Interior"] },
      { colorCode: "SW 6056", colorName: "Polite White", productLines: ["Cashmere Interior"] },
      { colorCode: "1256", colorName: "Amaryllis", productLines: ["Cashmere Interior"] },
    ],
    trim: [
      { colorCode: "SW 7005", colorName: "Pure White", productLines: ["Super Paint Interior"] },
    ],
    ceilings: [
      {
        colorCode: "SW 6204",
        colorName: "Sea Salt",
        productLines: ["Cashmere Interior", "ProMar 400 Interior"],
      },
      {
        colorCode: "SW 6056",
        colorName: "Polite White",
        productLines: ["Cashmere Interior", "ProMar 400 Interior"],
      },
    ],
  },
  groups: [
    {
      id: randomUUID(),
      layout: 3 as const,
      columns: [
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 6056", colorName: "Polite White", productLine: "Cashmere Interior", sheen: "Flat", photoIds: [] as string[] },
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "1256", colorName: "Amaryllis", productLine: "Cashmere Interior", sheen: "Eggshell", photoIds: [] as string[] },
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 6204", colorName: "Sea Salt", productLine: "Cashmere Interior", sheen: "Flat", photoIds: [] as string[] },
      ],
    },
    {
      id: randomUUID(),
      layout: 1 as const,
      columns: [
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 7005", colorName: "Pure White", productLine: "Super Paint Interior", sheen: "Semi-Gloss", photoIds: [] as string[] },
      ],
    },
    {
      id: randomUUID(),
      layout: 3 as const,
      columns: [
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 6204", colorName: "Sea Salt", productLine: "Cashmere Interior", sheen: "Flat", photoIds: [] as string[] },
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 6204", colorName: "Sea Salt", productLine: "ProMar 400 Interior", sheen: "Flat", photoIds: [] as string[] },
        { id: randomUUID(), roomsLabel: "Unassigned", colorCode: "SW 6056", colorName: "Polite White", productLine: "ProMar 400 Interior", sheen: "Flat", photoIds: [] as string[] },
      ],
    },
  ],
}

async function addPhotos(
  projectId: string,
  files: string[]
): Promise<string[]> {
  const ids: string[] = []
  for (const file of files) {
    const filePath = path.join(RECOVERY_DIR, file)
    let buffer: Buffer
    try {
      buffer = await fs.readFile(filePath)
    } catch {
      console.error(`  ✗ missing file: ${filePath}`)
      continue
    }

    const baseName = path.parse(file).name.replace(/^michelle-/, "")
    const existing = await prisma.photo.findFirst({
      where: { projectId, originalFilename: file },
    })
    if (existing) {
      console.log(`  = photo already present: ${file}`)
      ids.push(existing.id)
      continue
    }

    const timestamp = Date.now()
    const storagePrefix = getStoragePrefix()
    const opt = await optimizeImage(buffer, {
      quality: parseInt(process.env.IMAGE_QUALITY || "85"),
      maxDimensions: {
        width: parseInt(process.env.MAX_IMAGE_DIMENSION || "2048"),
        height: parseInt(process.env.MAX_IMAGE_DIMENSION || "2048"),
      },
    })
    const blurPlaceholder = await generateBlurPlaceholder(buffer)

    const [largePath, mediumPath, thumbnailPath] = await Promise.all([
      putObject(
        `${storagePrefix}${timestamp}-${baseName}-large.webp`,
        opt.sizes.large,
        "image/webp"
      ),
      putObject(
        `${storagePrefix}${timestamp}-${baseName}-medium.webp`,
        opt.sizes.medium,
        "image/webp"
      ),
      putObject(
        `${storagePrefix}${timestamp}-${baseName}-thumbnail.webp`,
        opt.sizes.thumbnail,
        "image/webp"
      ),
    ])

    const photo = await prisma.photo.create({
      data: {
        filename: `${timestamp}-${file}`,
        originalFilename: file,
        cloud_storage_path: largePath,
        medium_path: mediumPath,
        thumbnail_path: thumbnailPath,
        blur_placeholder: blurPlaceholder,
        mimeType: "image/webp",
        size: buffer.length,
        width: opt.metadata.large.width,
        height: opt.metadata.large.height,
        optimized_size:
          opt.metadata.large.size +
          opt.metadata.medium.size +
          opt.metadata.thumbnail.size,
        storage_savings: opt.savings.storageReduction,
        projectId,
      },
    })
    console.log(`  ✓ photo restored: ${file} -> ${photo.id}`)
    ids.push(photo.id)
  }
  return ids
}

async function main() {
  // --- Michelle: rebuild client/property/project from the DOCX ---
  const weadClient = await prisma.client.findFirst({
    where: { name: "Mark Robert Wead" },
  })
  if (!weadClient) {
    throw new Error("Wead client not found — run against the right database")
  }
  const userId = weadClient.userId

  let michelle = await prisma.client.findFirst({
    where: { userId, name: "Michelle" },
  })
  if (!michelle) {
    michelle = await prisma.client.create({
      data: { userId, name: "Michelle", type: "individual", status: "active" },
    })
    console.log(`✓ created client: Michelle (${michelle.id})`)
  }

  let michelleProperty = await prisma.property.findFirst({
    where: { clientId: michelle.id, address: "111 main" },
  })
  if (!michelleProperty) {
    michelleProperty = await prisma.property.create({
      data: {
        clientId: michelle.id,
        name: "Michelle",
        address: "111 main",
        type: "residential",
        status: "active",
      },
    })
    console.log(`✓ created property: Michelle (${michelleProperty.id})`)
  }

  let michelleProject = await prisma.project.findFirst({
    where: {
      propertyId: michelleProperty.id,
      name: "Michelle — Interior Repaint",
    },
  })
  if (!michelleProject) {
    michelleProject = await prisma.project.create({
      data: {
        propertyId: michelleProperty.id,
        userId,
        name: "Michelle — Interior Repaint",
        status: "active",
      },
    })
    console.log(`✓ created project: Michelle (${michelleProject.id})`)
  }

  // --- Photos ---
  const weadProjectId = weadClient
    ? (await prisma.project.findFirst({
        where: { userId: weadClient.userId, name: "Remodel Exterior" },
        select: { id: true },
      }))?.id
    : undefined
  if (!weadProjectId) {
    throw new Error("Wead project not found")
  }

  console.log("\nRestoring Wead photos…")
  const weadPhotoIds = await addPhotos(weadProjectId, WEAD_PHOTOS)
  console.log("Restoring Michelle photos…")
  const michellePhotoIds = await addPhotos(
    michelleProject.id,
    MICHELLE_PHOTOS
  )

  // --- Wead draft: point photoIds at the restored photos ---
  const weadDraft = await prisma.synopsisDraft.findUnique({
    where: { projectId: weadProjectId },
  })
  if (weadDraft && weadPhotoIds.length > 0) {
    const structure = weadDraft.structure as any
    // Replace EVERY column's photoIds with restored photos (old S3 ids are dead)
    let idx = 0
    for (const group of structure.groups ?? []) {
      for (const col of group.columns ?? []) {
        col.photoIds = idx < weadPhotoIds.length ? [weadPhotoIds[idx]] : []
        idx++
      }
    }
    await prisma.synopsisDraft.update({
      where: { projectId: weadProjectId },
      data: { structure },
    })
    console.log(`✓ Wead draft photoIds updated to restored photos`)
  }

  // --- Michelle draft ---
  const michelleDraft = await prisma.synopsisDraft.findUnique({
    where: { projectId: michelleProject.id },
  })
  if (!michelleDraft) {
    const structure = JSON.parse(JSON.stringify(MICHELLE_STRUCTURE))
    if (michellePhotoIds.length > 0) {
      structure.groups[0].columns[0].photoIds = [michellePhotoIds[0]]
      structure.groups[0].columns[1].photoIds = [michellePhotoIds[1]]
      structure.groups[0].columns[2].photoIds = [michellePhotoIds[2]]
    }
    await prisma.synopsisDraft.create({
      data: {
        projectId: michelleProject.id,
        clientName: "Michelle",
        address: "111 main",
        email: null,
        phone: null,
        consultDate: new Date("2026-04-21"),
        structure,
      },
    })
    console.log(`✓ created Michelle synopsis draft (from DOCX structure)`)
  }

  const totals = await prisma.photo.count()
  console.log(`\nDone. Total photos in DB: ${totals}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
