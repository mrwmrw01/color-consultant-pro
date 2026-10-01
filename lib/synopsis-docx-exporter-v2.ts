import {
  Document,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  TextRun,
  ImageRun,
} from "docx"
import type { SynopsisDraft } from "@prisma/client"
import type { SynopsisStructure, SummaryEntry, ColorGroup } from "./synopsis-types"
import { getFileBuffer } from "./s3"
import { prisma } from "@/lib/db"
import sharp from "sharp"

interface ExportOptions {
  includePhotos?: boolean // default true
  maxPhotosPerGroup?: number // default 4
}

// ---------------------------------------------------------------------------
// Bounded concurrency helper -- limits parallel S3 fetches
// ---------------------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function next(): Promise<void> {
    const i = index++
    if (i >= items.length) return
    results[i] = await fn(items[i])
    return next()
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => next())
  )
  return results
}

const DISCLAIMER_TEXT =
  "Color Guru provides color consultations. Recommendations by Color Guru are suggestions only " +
  "and do not warrant or guarantee clients satisfaction with their color choices, products, " +
  "services, or workmanship. Client is solely responsible for all color choices, products, " +
  "services and communications. Payments shall be made to Color Guru, are due at time of " +
  "consultation, and are non-refundable."

const THANK_YOU_TEXT =
  "Thank you for choosing Color Guru, a guide through your paint journey."

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
} as const

/**
 * Creates a DOCX Document from a curated SynopsisDraft.
 *
 * This is the v2 exporter that works with the new SynopsisStructure format
 * (summary + color groups) rather than the legacy room-based format.
 */
export async function createSynopsisDocumentV2(
  draft: SynopsisDraft,
  options?: ExportOptions
): Promise<Document> {
  const includePhotos = options?.includePhotos ?? true
  const maxPhotosPerGroup = options?.maxPhotosPerGroup ?? 4
  const structure = draft.structure as unknown as SynopsisStructure

  const consultDate = draft.consultDate
    ? new Date(draft.consultDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

  const children: (Paragraph | Table)[] = []

  // --- Title block ---
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: draft.clientName,
          bold: true,
          size: 60, // 30pt = 60 half-points
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )

  // Subtitles: address, email, phone+date
  if (draft.address) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: draft.address, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    )
  }

  if (draft.email) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: draft.email, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    )
  }

  // Phone + date right-aligned on the same line
  const phoneDateParts: TextRun[] = []
  if (draft.phone) {
    phoneDateParts.push(new TextRun({ text: draft.phone, size: 28 }))
  }
  // Add spacing between phone and date when both are present
  if (draft.phone) {
    phoneDateParts.push(
      new TextRun({
        text: "                                        ",
        size: 28,
      })
    )
  }
  phoneDateParts.push(new TextRun({ text: consultDate, size: 28 }))

  children.push(
    new Paragraph({
      children: phoneDateParts,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    })
  )

  // --- Disclaimer ---
  children.push(
    new Paragraph({
      children: [new TextRun({ text: DISCLAIMER_TEXT, size: 20 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: THANK_YOU_TEXT,
          italics: true,
          size: 18,
        }),
      ],
      spacing: { after: 200 },
    })
  )

  // --- Section headers ---
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Colors                                                      Products & Sheen",
          bold: true,
        }),
      ],
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      text: "SPECIFICATIONS",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  )

  // --- Summary table ---
  const summaryRows = buildSummaryRows(structure)
  if (summaryRows.length > 0) {
    children.push(
      new Table({
        rows: summaryRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )
    children.push(new Paragraph({ text: "", spacing: { after: 300 } }))
  }

  // --- Color group tables + photos ---
  for (const group of structure.groups) {
    children.push(buildColorGroupTable(group))
    children.push(new Paragraph({ text: "", spacing: { after: 200 } }))

    // Embed photos between color group tables when enabled
    if (includePhotos) {
      const photoParagraphs = await buildGroupPhotoParagraphs(
        group,
        maxPhotosPerGroup
      )
      for (const p of photoParagraphs) {
        children.push(p)
      }
    }
  }

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// Summary table helpers
// ---------------------------------------------------------------------------

function formatSummaryColorCell(label: string, entries: SummaryEntry[]): string {
  const colorList = entries
    .map((e) => `${e.colorCode} ${e.colorName}`)
    .join(", ")
  return `${label}: ${colorList}`
}

function formatSummaryProductCell(entries: SummaryEntry[]): string {
  const uniqueProducts = [
    ...new Set(entries.flatMap((e) => e.productLines)),
  ]
  return uniqueProducts.join(" | ")
}

function buildSummaryRows(structure: SynopsisStructure): TableRow[] {
  const rows: TableRow[] = []

  const categories: { label: string; entries: SummaryEntry[] }[] = [
    { label: "Walls", entries: structure.summary.walls },
    { label: "Trim", entries: structure.summary.trim },
    { label: "Ceilings", entries: structure.summary.ceilings },
  ]

  for (const cat of categories) {
    if (cat.entries.length === 0) continue

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: formatSummaryColorCell(cat.label, cat.entries),
              }),
            ],
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: formatSummaryProductCell(cat.entries),
              }),
            ],
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
          }),
        ],
      })
    )
  }

  return rows
}

// ---------------------------------------------------------------------------
// Color group table helpers
// ---------------------------------------------------------------------------

function buildColorGroupTable(group: ColorGroup): Table {
  const colCount = group.layout
  const colWidthPct = Math.floor(100 / colCount)

  // Row 0: Room names (bold)
  const roomCells = group.columns.map(
    (col) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: col.notesTag
                  ? `${col.roomsLabel} (${col.notesTag})`
                  : col.roomsLabel,
                bold: true,
              }),
            ],
          }),
        ],
        width: { size: colWidthPct, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
      })
  )

  // Row 1: Color code + name
  const colorCells = group.columns.map(
    (col) =>
      new TableCell({
        children: [
          new Paragraph({
            text: `${col.colorCode} ${col.colorName}`,
          }),
        ],
        width: { size: colWidthPct, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
      })
  )

  // Row 2: Product - sheen (italic)
  const productCells = group.columns.map(
    (col) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `${col.productLine} - ${col.sheen}`,
                italics: true,
              }),
            ],
          }),
        ],
        width: { size: colWidthPct, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
      })
  )

  return new Table({
    rows: [
      new TableRow({ children: roomCells }),
      new TableRow({ children: colorCells }),
      new TableRow({ children: productCells }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

// ---------------------------------------------------------------------------
// Photo embedding helpers
// ---------------------------------------------------------------------------

/**
 * Collects deduplicated photoIds from all columns in a group, fetches their
 * binary data from S3 with bounded concurrency, and returns Paragraph nodes
 * each containing a single ImageRun at 300x225px.
 */
async function buildGroupPhotoParagraphs(
  group: ColorGroup,
  maxPhotos: number
): Promise<Paragraph[]> {
  // Deduplicate photo IDs across all columns in the group
  const seen = new Set<string>()
  const allPhotoIds: string[] = []
  for (const col of group.columns) {
    for (const id of col.photoIds) {
      if (!seen.has(id)) {
        seen.add(id)
        allPhotoIds.push(id)
      }
    }
  }

  const photoIds = allPhotoIds.slice(0, maxPhotos)
  if (photoIds.length === 0) return []

  // Fetch photo data with bounded concurrency (4 parallel)
  const paragraphs = await mapWithConcurrency(photoIds, 4, async (photoId) => {
    try {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { cloud_storage_path: true },
      })
      if (!photo?.cloud_storage_path) {
        console.error(`Photo ${photoId}: no cloud_storage_path found`)
        return null
      }

      const imageBuffer = await getFileBuffer(photo.cloud_storage_path)

      // S3 stores WebP ("-large.webp"); Word cannot render WebP bytes passed as
      // type "jpg". Normalize to a real JPEG via sharp before embedding (B2).
      const jpegBuffer = await sharp(imageBuffer)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer()

      return new Paragraph({
        children: [
          new ImageRun({
            data: Uint8Array.from(jpegBuffer),
            transformation: { width: 300, height: 225 },
            type: "jpg",
          }),
        ],
        spacing: { before: 100, after: 100 },
      })
    } catch (error) {
      console.error(`Failed to load photo ${photoId}:`, error)
      return null
    }
  })

  // Filter out nulls from failed loads
  return paragraphs.filter((p): p is Paragraph => p !== null)
}
