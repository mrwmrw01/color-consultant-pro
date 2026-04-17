/**
 * Extended synopsis data generator for the Synopsis Studio.
 *
 * Builds on generateSynopsisFromAnnotations() but adds:
 *  - annotationId on each surface → enables click-to-edit with annotation linkage
 *  - colorId on each surface → enables color-change propagation
 *  - roomId on each room → enables room-level operations
 *  - photoUrl on each photo → enables inspector panel display
 *  - universals with exceptions detection (dominant + deviating rooms)
 */

import { prisma } from "@/lib/db"

// ---------- Types ----------

export interface StudioProject {
  id: string
  name: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  address: string | null
}

export interface StudioSurface {
  annotationId: string
  surfaceType: string
  colorId: string
  colorCode: string
  colorName: string
  hexColor: string | null
  manufacturer: string
  productLine: string
  sheen: string
  notes: string | null
  photos: Array<{
    id: string
    cloudStoragePath: string
    fileName: string
  }>
}

export interface StudioRoom {
  roomId: string
  roomName: string
  surfaces: StudioSurface[]
}

export interface UniversalSpec {
  surfaceType: string // "trim" | "ceiling"
  dominant: {
    colorId: string
    colorCode: string
    colorName: string
    hexColor: string | null
    manufacturer: string
    productLine: string
    sheen: string
  }
  coverage: number
  total: number
  exceptions: Array<{
    roomId: string
    roomName: string
    annotationId: string
    colorId: string
    colorCode: string
    colorName: string
    hexColor: string | null
    productLine: string
    sheen: string
    notes: string | null
  }>
}

export interface StudioData {
  project: StudioProject
  universals: UniversalSpec[]
  rooms: StudioRoom[]
  wallPalette: Array<{
    colorId: string
    colorCode: string
    colorName: string
    hexColor: string | null
    manufacturer: string
    productLines: string[]
  }>
}

// ---------- Generator ----------

export async function generateStudioData(projectId: string): Promise<StudioData> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      property: { include: { client: true } },
      rooms: true,
      photos: {
        include: {
          annotations: {
            include: {
              color: { include: { availability: true } },
              room: true,
            },
          },
        },
      },
    },
  })

  if (!project) throw new Error("Project not found")

  // -- Collect all valid annotations --
  type Annot = {
    annotationId: string
    surfaceType: string
    colorId: string
    colorCode: string
    colorName: string
    hexColor: string | null
    manufacturer: string
    productLine: string
    sheen: string
    notes: string | null
    roomId: string
    roomName: string
    photoId: string
    cloudStoragePath: string
    fileName: string
  }

  const all: Annot[] = []

  for (const photo of project.photos) {
    for (const ann of photo.annotations) {
      if (!ann.color || !ann.surfaceType) continue
      let pl = ann.productLine
      let sh = ann.sheen
      if ((!pl || !sh) && ann.color.availability?.length) {
        if (!pl) pl = ann.color.availability[0].productLine
        if (!sh) sh = ann.color.availability[0].sheen
      }
      if (!pl || !sh) continue

      all.push({
        annotationId: ann.id,
        surfaceType: ann.surfaceType,
        colorId: ann.color.id,
        colorCode: ann.color.colorCode,
        colorName: ann.color.name,
        hexColor: ann.color.hexColor,
        manufacturer: ann.color.manufacturer,
        productLine: pl,
        sheen: sh,
        notes: ann.notes,
        roomId: ann.room?.id ?? "",
        roomName: ann.room?.name ?? "Unassigned",
        photoId: photo.id,
        cloudStoragePath: photo.cloud_storage_path,
        fileName: photo.filename,
      })
    }
  }

  // -- Build rooms --
  const roomMap = new Map<string, StudioRoom>()
  const surfaceSigs = new Map<string, Set<string>>() // roomId -> seen sigs

  for (const a of all) {
    if (!roomMap.has(a.roomId)) {
      roomMap.set(a.roomId, { roomId: a.roomId, roomName: a.roomName, surfaces: [] })
      surfaceSigs.set(a.roomId, new Set())
    }
    const sig = `${a.surfaceType}|${a.colorCode}|${a.productLine}|${a.sheen}`
    const seen = surfaceSigs.get(a.roomId)!
    if (seen.has(sig)) {
      // Just add photo if different
      const existing = roomMap.get(a.roomId)!.surfaces.find(
        (s) =>
          s.surfaceType === a.surfaceType &&
          s.colorCode === a.colorCode &&
          s.productLine === a.productLine &&
          s.sheen === a.sheen
      )
      if (existing) {
        if (!existing.photos.some((p) => p.id === a.photoId)) {
          existing.photos.push({ id: a.photoId, cloudStoragePath: a.cloudStoragePath, fileName: a.fileName })
        }
        if (a.notes && (!existing.notes || !existing.notes.includes(a.notes))) {
          existing.notes = existing.notes ? `${existing.notes}; ${a.notes}` : a.notes
        }
      }
      continue
    }
    seen.add(sig)
    roomMap.get(a.roomId)!.surfaces.push({
      annotationId: a.annotationId,
      surfaceType: a.surfaceType,
      colorId: a.colorId,
      colorCode: a.colorCode,
      colorName: a.colorName,
      hexColor: a.hexColor,
      manufacturer: a.manufacturer,
      productLine: a.productLine,
      sheen: a.sheen,
      notes: a.notes,
      photos: [{ id: a.photoId, cloudStoragePath: a.cloudStoragePath, fileName: a.fileName }],
    })
  }

  const rooms = Array.from(roomMap.values())

  // -- Detect universals with exceptions (by color code, not full signature) --
  function detectUniversal(surfaceType: string): UniversalSpec | null {
    const matchTypes =
      surfaceType === "trim"
        ? ["trim", "baseboard", "molding", "door", "window", "wainscoting"]
        : ["ceiling"]

    const rows: Array<Annot & { _sig: string }> = []
    for (const a of all) {
      const st = a.surfaceType.toLowerCase()
      if (matchTypes.some((m) => st.includes(m))) {
        rows.push({ ...a, _sig: a.colorCode })
      }
    }
    if (rows.length === 0) return null

    // Count by color code
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.colorCode, (counts.get(r.colorCode) || 0) + 1)
    const dominantCode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const dominantRow = rows.find((r) => r.colorCode === dominantCode)!

    // Count unique rooms
    const roomsWithSurface = new Set(rows.map((r) => r.roomId))
    const roomsWithDominant = new Set(rows.filter((r) => r.colorCode === dominantCode).map((r) => r.roomId))

    // Exceptions = rooms where color differs from dominant
    const exceptionRows = rows.filter((r) => r.colorCode !== dominantCode)
    const seenExcRooms = new Set<string>()
    const exceptions: UniversalSpec["exceptions"] = []
    for (const e of exceptionRows) {
      const key = `${e.roomId}|${e.colorCode}`
      if (seenExcRooms.has(key)) continue
      seenExcRooms.add(key)
      exceptions.push({
        roomId: e.roomId,
        roomName: e.roomName,
        annotationId: e.annotationId,
        colorId: e.colorId,
        colorCode: e.colorCode,
        colorName: e.colorName,
        hexColor: e.hexColor,
        productLine: e.productLine,
        sheen: e.sheen,
        notes: e.notes,
      })
    }

    return {
      surfaceType,
      dominant: {
        colorId: dominantRow.colorId,
        colorCode: dominantRow.colorCode,
        colorName: dominantRow.colorName,
        hexColor: dominantRow.hexColor,
        manufacturer: dominantRow.manufacturer,
        productLine: dominantRow.productLine,
        sheen: dominantRow.sheen,
      },
      coverage: roomsWithDominant.size,
      total: roomsWithSurface.size,
      exceptions,
    }
  }

  const universals: UniversalSpec[] = []
  const trimU = detectUniversal("trim")
  if (trimU) universals.push(trimU)
  const ceilingU = detectUniversal("ceiling")
  if (ceilingU) universals.push(ceilingU)

  // -- Wall palette --
  const wallMap = new Map<string, { colorId: string; colorCode: string; colorName: string; hexColor: string | null; manufacturer: string; productLines: Set<string> }>()
  for (const a of all) {
    const st = a.surfaceType.toLowerCase()
    if (st.includes("wall") || st.includes("accent") || st.includes("cabinet")) {
      if (!wallMap.has(a.colorCode)) {
        wallMap.set(a.colorCode, {
          colorId: a.colorId,
          colorCode: a.colorCode,
          colorName: a.colorName,
          hexColor: a.hexColor,
          manufacturer: a.manufacturer,
          productLines: new Set(),
        })
      }
      wallMap.get(a.colorCode)!.productLines.add(`${a.productLine} - ${a.sheen}`)
    }
  }
  const wallPalette = [...wallMap.values()].map((w) => ({
    ...w,
    productLines: [...w.productLines],
  }))

  return {
    project: {
      id: project.id,
      name: project.name,
      clientName: project.clientName || project.property?.client?.name || "",
      clientEmail: project.clientEmail || project.property?.client?.email || null,
      clientPhone: project.clientPhone || project.property?.client?.phone || null,
      address: project.address || project.property?.address || null,
    },
    universals,
    rooms,
    wallPalette,
  }
}
