import { z } from "zod"

// --- Zod Schemas (single source of truth) ---

export const summaryEntrySchema = z.object({
  colorCode: z.string().min(1),
  colorName: z.string().min(1),
  productLines: z.array(z.string().min(1)),
})

export const colorColumnSchema = z.object({
  id: z.string().min(1),
  roomsLabel: z.string().min(1),
  notesTag: z.string().optional(),
  colorCode: z.string().min(1),
  colorName: z.string().min(1),
  productLine: z.string().min(1),
  sheen: z.string().min(1),
  photoIds: z.array(z.string()),
})

export const colorGroupSchema = z.object({
  id: z.string().min(1),
  layout: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  columns: z.array(colorColumnSchema).min(1).max(3),
}).refine(
  (g) => g.columns.length === g.layout,
  { message: "columns.length must match layout" }
)

export const synopsisStructureSchema = z.object({
  summary: z.object({
    walls: z.array(summaryEntrySchema),
    trim: z.array(summaryEntrySchema),
    ceilings: z.array(summaryEntrySchema),
  }),
  groups: z.array(colorGroupSchema),
})

// --- Derived TypeScript types ---

export type SummaryEntry = z.infer<typeof summaryEntrySchema>
export type ColorColumn = z.infer<typeof colorColumnSchema>
export type ColorGroup = z.infer<typeof colorGroupSchema>
export type SynopsisStructure = z.infer<typeof synopsisStructureSchema>
