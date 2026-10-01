# Synopsis Rewrite Plan

> **Goal:** Deliver a painter-usable color synopsis. The consultant curates it via a drag-and-drop editor; the output DOCX matches the hand-crafted format of `Corbin Smith Color Synopsis.docx` and `Kylie Slavin Color Synopsis.docx`.

## Problem Statement

The current synopsis generator produces a mechanical, database-dump-style report:

- Rooms listed one per cell with every annotation as a separate row
- Tiny 120x90 thumbnails crammed into per-surface cells
- No grouping of rooms that share the same color
- Surface types are formal labels (`Wall`, `Trim`, `Door`) rather than descriptive phrases like `"Interior Door to Garage, Interior Front Door, Stair Risers, Stair Stringer & Under Bar"`
- No way for the consultant to edit, reorder, or curate the output before sending it to the painter
- Output does not match Color Guru's established hand-crafted format

A painter cannot take the current DOCX and start a job — they get a fragmented list of surfaces instead of a logical, room-grouped specification.

---

## Target Output (reverse-engineered from examples)

### Structure

```
[Title]                          <- Client name, 30pt
[Subtitle]                       <- Street address
[Subtitle]                       <- Email
[Subtitle]                       <- Phone + Date (right-aligned)

[Body paragraph]                 <- Disclaimer
[Small italic]                   <- "Thank you for choosing Color Guru..."

[Heading]  Colors         Products & Sheen
[Heading]  SPECIFICATIONS

[Table: Summary]                 <- 2-col, N-row. One row per surface category (walls, trim, ceilings)
                                    "Walls: SW7541 Grecian Ivory, SW9166 Drift of Mist, ..." | "Duration - Matte"
                                    "Trim: SW7005 Pure White"                                | "Duration - Semi gloss | Emerald Urethane - Semi gloss"

[Table: Color Group 1]           <- 1-3 columns, 3 rows
  Row 0: room names (e.g., "Entry, Lower Stairway, Great Room, Upper Stairway & Upper Hall: (notes below)")
  Row 1: color code + name (e.g., "SW7541 Grecian Ivory")
  Row 2: product - sheen (e.g., "Duration - Matte")

[Table: Color Group 2]           <- Next group of rooms sharing a color
  ...

[Photos embedded throughout]     <- 22-26 photos in the examples, contextual placement
```

### Critical Characteristics

1. **Rooms grouped by shared color+product+sheen.** Rooms painting `Shoji White in Duration Matte` live in one cell together; rooms painting `Copen Blue in Duration Matte` live in the next cell.
2. **Tables have 1-3 columns.** Single color group = 1 column. Two parallel groups = 2 columns side-by-side. Three = 3 columns. Never 4+.
3. **Notes are short references** like `(notes below)` or `(notes in red)` — not inline long text.
4. **Accent walls and non-standard work** get their own tables, often with notes references.
5. **The summary table lists only unique colors per category** — walls summary lists all unique wall colors in the project; trim lists all unique trim colors.
6. **The room names are editable descriptive labels**, not strict DB room names.

---

## Design

### Phase A — Data Model Changes

Add a persistent, editable synopsis that owns its own curated structure. The existing auto-generated `SynopsisData` (computed on the fly) stays as a seed for the first draft.

**New Prisma model: `SynopsisDraft`**

```prisma
model SynopsisDraft {
  id          String   @id @default(cuid())
  projectId   String   @unique           // one draft per project
  clientName  String
  address     String?
  email       String?
  phone       String?
  consultDate DateTime?                  // date shown on the header

  // JSON blob — structured spec below
  structure   Json

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

**Structure JSON shape (TypeScript interface):**

```typescript
interface SynopsisStructure {
  summary: {
    walls: SummaryEntry[]
    trim: SummaryEntry[]
    ceilings: SummaryEntry[]
  }
  groups: ColorGroup[]            // ordered list of tables in the doc
}

interface SummaryEntry {
  colorCode: string               // e.g., "SW7541"
  colorName: string               // e.g., "Grecian Ivory"
  productLines: string[]          // e.g., ["Duration - Matte"]
}

interface ColorGroup {
  id: string                      // stable uuid for drag-drop
  layout: 1 | 2 | 3                // columns in this table
  columns: ColorColumn[]          // length matches layout
}

interface ColorColumn {
  id: string
  roomsLabel: string              // "Entry, Lower Stairway, Great Room..."
  notesTag?: string               // "(notes below)" | "(notes in red)" | undefined
  colorCode: string               // "SW7541"
  colorName: string               // "Grecian Ivory"
  productLine: string             // "Duration"
  sheen: string                   // "Matte"
  photoIds: string[]              // photos to embed after this group
}
```

**Why JSON instead of relational tables?** The structure is ordered, nested, and rapidly mutated by drag-and-drop. Normalized tables with ordering columns become painful to keep consistent during reorders. JSON blob + Zod validation is simpler, atomic, and versionable.

### Phase B — Seeder (auto-generate first draft)

New function `seedSynopsisDraft(projectId: string): Promise<SynopsisStructure>`:

1. Load all photos + annotations + rooms (same query as current `generateSynopsisFromAnnotations`)
2. Build a `Map<colorFingerprint, Annotation[]>` where `colorFingerprint = colorCode|productLine|sheen`
3. For each fingerprint group:
   - Collect unique room names → joined as `roomsLabel` (e.g., `"Primary Bedroom, Downstairs Guest Bedroom"`)
   - Pick photos from the annotations in that group
4. Order groups: walls first (most rooms first), then trim, then ceilings, then accent/other surfaces
5. Build summary from unique color+product+sheen combos, split by category
6. Pack groups into tables: adjacent single-column groups merge into 2- or 3-column tables when their row heights match
7. Return `SynopsisStructure`

Key heuristic: **rooms with the same wall color become one column**. A single color group used in 5 rooms → one cell listing all 5 room names. This matches the example documents exactly.

### Phase C — API Routes

```
GET    /api/projects/:projectId/synopsis-draft      → fetch draft (auto-seeds if none exists)
PUT    /api/projects/:projectId/synopsis-draft      → save edited structure (Zod-validated)
POST   /api/projects/:projectId/synopsis-draft/reset → wipe and re-seed from annotations
POST   /api/projects/:projectId/synopsis-draft/export → generate DOCX from draft
```

All routes protected by session + ownership check (user owns project).
PUT request body validated with a Zod schema matching `SynopsisStructure`.

### Phase D — Editor UI

**Route:** `/dashboard/projects/[projectId]/synopsis`

**Layout:**
- **Top bar**: client info (name, address, email, phone, date) — editable inline
- **Summary section**: shows the 2-col summary table, editable
- **Groups section**: ordered list of color group cards
  - Each card shows: 1/2/3 columns, a color swatch, product line, sheen, room list, photo thumbnails
  - **Drag handle** on each card (react vertical reorder)
  - **Within a card**: columns can be reordered horizontally (for 2/3 col tables)
  - Click to expand → inline edit of roomsLabel, notes tag, selected photos
- **Sidebar**: list of available photos (from project) — drag into a group to attach
- **Footer**: "Reset from annotations" button, "Save", "Export DOCX"

**Drag-and-drop library:** `@dnd-kit/core` + `@dnd-kit/sortable`. Accessible, modern, zero peer-dep drama, works with React 18. Install adds ~60KB gzipped.

**State management:** Local React state via `useReducer` for fast drag interactions; PUT to server on explicit save or debounced after X seconds of idle. No SWR/react-query for this because we want explicit control.

### Phase E — DOCX Exporter Rewrite

New file: `lib/synopsis-docx-exporter-v2.ts`. Old one stays until v2 is validated, then gets deleted.

Key changes:

1. **Styles match examples:**
   - Title style, 30pt, for client name
   - Subtitle style, 14pt bold, for address/email/phone line
   - Heading 1 for "SPECIFICATIONS"

2. **Summary table:** 2 columns, 60/40 split. One row per category (walls/trim/ceilings). Colors comma-joined in left cell; product+sheen list joined with `" | "` in right cell. Borders minimal/none (examples use no borders).

3. **Color group tables:** Generated straight from `SynopsisStructure.groups`. 1, 2, or 3 columns per table. 3 rows per table (room label, color, product). No borders.

4. **Photos:** Placed as separate paragraphs between groups (not inside cells). Larger size (~300x225) to match example proportions. Maximum N photos per group, configurable.

5. **Photo loading:** Use `Promise.all` with a bounded concurrency pool (e.g., 4) to avoid S3 connection exhaustion on large projects.

---

## Implementation Order

| Step | Deliverable | Depends on |
|------|-------------|------------|
| 1 | Prisma migration adding `SynopsisDraft` | — |
| 2 | `SynopsisStructure` types + Zod schema in `lib/synopsis-types.ts` | — |
| 3 | `seedSynopsisDraft()` function in `lib/synopsis-seeder.ts` | 2 |
| 4 | API routes (GET/PUT/reset) | 1, 3 |
| 5 | Editor page skeleton (no drag-drop) — read-only view of draft | 4 |
| 6 | Inline edit: client info, roomsLabel, notes | 5 |
| 7 | Drag-and-drop reordering (groups + columns) | 6 |
| 8 | Photo attachment (sidebar → group) | 7 |
| 9 | `synopsis-docx-exporter-v2.ts` matching target format | 2 |
| 10 | Export route wired to editor | 8, 9 |
| 11 | E2E Playwright test: seed → edit → export → verify DOCX contents | 10 |
| 12 | Delete old `synopsis-docx-exporter.ts` + unused generator paths | 10 |

## Testing Strategy

- **Unit**: `seedSynopsisDraft()` → given a fixture of annotations, produces the expected `SynopsisStructure`. Uses an in-memory Prisma mock or Testcontainers Postgres.
- **Unit**: DOCX exporter → given a `SynopsisStructure` fixture, generates a document with expected paragraph count, table count, and a few key text assertions (parsed via `docx` package reads or `jszip` + XML inspection).
- **E2E**: Playwright — login, open project, click "Edit Synopsis", drag a group, save, click "Export", verify file downloads.
- **Visual**: Manually compare exported DOCX against `Corbin Smith Color Synopsis.docx` and `Kylie Slavin Color Synopsis.docx` side-by-side.

## Risks & Open Questions

1. **Consultant's mental model of "color groups"** — the examples show grouping by wall color, but accent walls and trim details are interleaved. Need to confirm with Mason whether the seeder's default grouping is close enough to the consultant's mental model, or if it's acceptable to produce a rough draft that gets hand-tuned.

2. **Photo placement** — the examples embed photos between tables. Need confirmation: does each color group own a set of photos, or are photos a separate orderable stream?

3. **Summary table width in examples is only `Walls / Trim`** (Kylie has no ceilings row). Our summary should omit empty categories.

4. **Multi-color rooms** — a single room can appear in multiple color groups (one for walls, one for trim, one for accent). The seeder must handle this (same room name appears in multiple groups). The editor must allow removing a room from a group without deleting it from others.

5. **Styles in docx library** — `docx@^9.5.1` supports custom styles via `Document.styles`. Confirmed Title/Subtitle styles are available as standard Word styles.

6. **Migration strategy** — existing projects should auto-seed a draft on first visit to the new editor. The old `/synopsis/generate` endpoint stays functional during rollout, then gets removed in step 12.

---

## Out of Scope (deferred)

- PDF export (current implementation via `html2canvas` + `jspdf` stays for now)
- Multi-language support
- Collaborative real-time editing (this is single-user)
- Version history of synopsis drafts
- PDF-to-DOCX import (parsing existing Color Guru docs into the system)

---

## Approval Gate

Before writing code:
- [ ] Mason reviews this plan
- [ ] Clarification on risks 1, 2 above
- [ ] Agreement on data model (JSON blob vs relational)
- [ ] Agreement on dnd-kit as the drag library
