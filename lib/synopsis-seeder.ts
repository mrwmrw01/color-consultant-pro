import { prisma } from "@/lib/db"
import { SynopsisDraft } from "@prisma/client"
import { randomUUID } from "crypto"
import type { SynopsisStructure, ColorGroup, ColorColumn, SummaryEntry } from "@/lib/synopsis-types"

const TRIM_KEYWORDS = ["trim", "baseboard", "molding", "door", "window", "wainscoting"]
const CEILING_KEYWORDS = ["ceiling"]
const WALL_KEYWORDS = ["wall"]

type SurfaceCategory = "walls" | "trim" | "ceilings" | "other"

function classifySurface(surfaceType: string): SurfaceCategory {
  const lower = surfaceType.toLowerCase()
  if (TRIM_KEYWORDS.some((k) => lower.includes(k))) return "trim"
  if (CEILING_KEYWORDS.some((k) => lower.includes(k))) return "ceilings"
  if (WALL_KEYWORDS.some((k) => lower.includes(k))) return "walls"
  return "other"
}

interface ResolvedAnnotation {
  colorId: string
  colorCode: string
  colorName: string
  productLine: string
  sheen: string
  surfaceType: string
  surfaceCategory: SurfaceCategory
  roomName: string
  photoId: string
}

export async function seedSynopsisDraft(projectId: string): Promise<SynopsisDraft> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      property: { include: { client: true } },
      rooms: true,
      photos: {
        select: {
          id: true,
          annotations: {
            where: { colorId: { not: null }, surfaceType: { not: null } },
            include: {
              color: {
                include: {
                  availability: { take: 1, orderBy: { createdAt: "asc" } },
                },
              },
              room: true,
            },
          },
        },
      },
    },
  })

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const client = project.property?.client
  const clientName = client?.name ?? project.clientName ?? ""
  const address = project.property?.address ?? project.address ?? null
  const email = client?.email ?? project.clientEmail ?? null
  const phone = client?.phone ?? project.clientPhone ?? null

  const resolved: ResolvedAnnotation[] = []

  for (const photo of project.photos) {
    for (const annotation of photo.annotations) {
      if (!annotation.color || !annotation.surfaceType) continue

      let productLine = annotation.productLine ?? null
      let sheen = annotation.sheen ?? null

      if ((!productLine || !sheen) && annotation.color.availability.length > 0) {
        const fallback = annotation.color.availability[0]
        if (!productLine) productLine = fallback.productLine
        if (!sheen) sheen = fallback.sheen
      }

      if (!productLine || !sheen) continue

      resolved.push({
        colorId: annotation.color.id,
        colorCode: annotation.color.colorCode,
        colorName: annotation.color.name,
        productLine,
        sheen,
        surfaceType: annotation.surfaceType,
        surfaceCategory: classifySurface(annotation.surfaceType),
        roomName: annotation.room?.name ?? "Unassigned",
        photoId: photo.id,
      })
    }
  }

  if (resolved.length === 0) {
    const emptyStructure: SynopsisStructure = {
      summary: { walls: [], trim: [], ceilings: [] },
      groups: [],
    }
    return upsertDraft({ projectId, clientName, address, email, phone, structure: emptyStructure })
  }

  const fingerprints = new Map<string, ResolvedAnnotation[]>()
  for (const ann of resolved) {
    // colorId disambiguates same-code colors across manufacturers (SW/BM can share codes)
    const key = `${ann.colorId}|${ann.productLine}|${ann.sheen}`
    let bucket = fingerprints.get(key)
    if (!bucket) {
      bucket = []
      fingerprints.set(key, bucket)
    }
    bucket.push(ann)
  }

  const categorizedColumns: { category: SurfaceCategory; column: ColorColumn }[] = []

  for (const [, annotations] of fingerprints) {
    const sample = annotations[0]

    // Check if this fingerprint spans multiple surface categories
    const categories = new Set(annotations.map((a) => a.surfaceCategory))

    if (categories.size === 1) {
      const roomSet = new Set<string>()
      const photoSet = new Set<string>()
      for (const ann of annotations) {
        roomSet.add(ann.roomName)
        photoSet.add(ann.photoId)
      }
      categorizedColumns.push({
        category: categories.values().next().value!,
        column: {
          id: randomUUID(),
          roomsLabel: Array.from(roomSet).join(", "),
          colorCode: sample.colorCode,
          colorName: sample.colorName,
          productLine: sample.productLine,
          sheen: sample.sheen,
          photoIds: Array.from(photoSet),
        },
      })
    } else {
      // Split into one column per category with only relevant rooms/photos
      for (const cat of categories) {
        const catAnnotations = annotations.filter((a) => a.surfaceCategory === cat)
        const catRoomSet = new Set<string>()
        const catPhotoSet = new Set<string>()
        for (const a of catAnnotations) {
          catRoomSet.add(a.roomName)
          catPhotoSet.add(a.photoId)
        }
        categorizedColumns.push({
          category: cat,
          column: {
            id: randomUUID(),
            roomsLabel: Array.from(catRoomSet).join(", "),
            colorCode: sample.colorCode,
            colorName: sample.colorName,
            productLine: sample.productLine,
            sheen: sample.sheen,
            photoIds: Array.from(catPhotoSet),
          },
        })
      }
    }
  }

  const summary: SynopsisStructure["summary"] = {
    walls: buildSummary(categorizedColumns, "walls"),
    trim: buildSummary(categorizedColumns, "trim"),
    ceilings: buildSummary(categorizedColumns, "ceilings"),
  }

  const categoryOrder: SurfaceCategory[] = ["walls", "trim", "ceilings", "other"]
  const sortedColumns = [...categorizedColumns].sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a.category)
    const bIdx = categoryOrder.indexOf(b.category)
    if (aIdx !== bIdx) return aIdx - bIdx
    const aRooms = a.column.roomsLabel.split(", ").length
    const bRooms = b.column.roomsLabel.split(", ").length
    return bRooms - aRooms
  })

  const groups: ColorGroup[] = []
  let i = 0
  while (i < sortedColumns.length) {
    const current = sortedColumns[i]
    const sameCategory: ColorColumn[] = [current.column]
    let j = i + 1
    while (j < sortedColumns.length && sortedColumns[j].category === current.category && sameCategory.length < 3) {
      sameCategory.push(sortedColumns[j].column)
      j++
    }

    const layout = sameCategory.length as 1 | 2 | 3
    groups.push({ id: randomUUID(), layout, columns: sameCategory })
    i = j
  }

  const structure: SynopsisStructure = { summary, groups }
  return upsertDraft({ projectId, clientName, address, email, phone, structure })
}

function buildSummary(
  columns: { category: SurfaceCategory; column: ColorColumn }[],
  category: SurfaceCategory,
): SummaryEntry[] {
  const filtered = columns.filter((c) => c.category === category)
  const map = new Map<string, SummaryEntry>()
  for (const { column } of filtered) {
    // Key on code+name so identical codes from different manufacturers stay separate
    const key = `${column.colorCode}|${column.colorName}`
    const existing = map.get(key)
    if (existing) {
      if (!existing.productLines.includes(column.productLine)) {
        existing.productLines.push(column.productLine)
      }
    } else {
      map.set(key, {
        colorCode: column.colorCode,
        colorName: column.colorName,
        productLines: [column.productLine],
      })
    }
  }
  return Array.from(map.values())
}

interface DraftInput {
  projectId: string
  clientName: string
  address: string | null
  email: string | null
  phone: string | null
  structure: SynopsisStructure
}

async function upsertDraft(input: DraftInput): Promise<SynopsisDraft> {
  const data = {
    clientName: input.clientName,
    address: input.address,
    email: input.email,
    phone: input.phone,
    structure: JSON.parse(JSON.stringify(input.structure)),
  }
  return prisma.synopsisDraft.upsert({
    where: { projectId: input.projectId },
    create: { projectId: input.projectId, ...data },
    update: { ...data, updatedAt: new Date() },
  })
}
