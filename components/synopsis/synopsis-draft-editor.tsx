"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Download, RefreshCw, Loader2, Save, GripVertical, GripHorizontal,
  ImagePlus, X, ChevronDown, ChevronUp,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { SynopsisStructure, ColorGroup, ColorColumn, SummaryEntry } from "@/lib/synopsis-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SynopsisDraftData {
  id: string
  projectId: string
  clientName: string
  address: string | null
  email: string | null
  phone: string | null
  consultDate: string | null
  structure: SynopsisStructure
  createdAt: string
  updatedAt: string
}

interface ProjectPhoto {
  id: string
  filename: string
  hasThumbnail: boolean
}

interface SynopsisDraftEditorProps {
  projectId: string
  projectName: string
  photos: ProjectPhoto[]
}

// ---------------------------------------------------------------------------
// Shared DnD helpers
// ---------------------------------------------------------------------------

const DRAG_HANDLE_CLASS = "cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"

const LAYOUT_META: Record<1 | 2 | 3, { label: string; gridClass: string }> = {
  1: { label: "Single", gridClass: "grid-cols-1" },
  2: { label: "Double", gridClass: "grid-cols-2" },
  3: { label: "Triple", gridClass: "grid-cols-3" },
}

function buildSortableStyle(
  transform: Parameters<typeof CSS.Transform.toString>[0],
  transition: string | undefined,
  isDragging: boolean,
) {
  return { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------

export function SynopsisDraftEditor({ projectId, projectName, photos }: SynopsisDraftEditorProps) {
  const [draft, setDraft] = useState<SynopsisDraftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { fetchDraft() }, [projectId])

  useEffect(() => {
    if (!dirty || !draft) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveDraft(), 3000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [dirty, draft])

  // Warn before closing the tab with unsaved edits (autosave is debounced 3s)
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  // Collect all photo IDs currently assigned to any column
  const assignedPhotoIds = new Set<string>()
  if (draft) {
    for (const g of draft.structure.groups) {
      for (const c of g.columns) {
        for (const pid of c.photoIds) assignedPhotoIds.add(pid)
      }
    }
  }
  const unassignedPhotos = photos.filter((p) => !assignedPhotoIds.has(p.id))

  async function fetchDraft() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis-draft`)
      if (!res.ok) throw new Error("Failed to load draft")
      setDraft(await res.json())
    } catch (err: any) {
      toast.error(err.message || "Failed to load synopsis draft")
    } finally {
      setLoading(false)
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!draft) return false
    // Guards: the server rejects these, and a failed autosave would retry forever (B1/B5)
    if (!draft.clientName?.trim()) {
      toast.error("Client name is required before saving")
      return false
    }
    if (draft.structure.groups.some((g) => g.columns.some((c) => !c.roomsLabel?.trim()))) {
      toast.error("Room labels cannot be empty")
      return false
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structure: draft.structure,
          clientName: draft.clientName,
          address: draft.address,
          email: draft.email,
          phone: draft.phone,
          consultDate: draft.consultDate,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Save failed")
      }
      setDirty(false)
      toast.success("Saved")
      return true
    } catch (err: any) {
      toast.error(err.message || "Save failed")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (dirty) {
      const saved = await saveDraft()
      if (!saved) return // don't export a stale draft (B4)
    }
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis-draft/export`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${draft?.clientName || "Synopsis"}_Color_Synopsis.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Synopsis exported")
    } catch (err: any) {
      toast.error(err.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  async function handleReset() {
    if (!window.confirm("Reset this synopsis to a fresh draft generated from the current annotations? Your edits will be lost.")) {
      return
    }
    setResetting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis-draft/reset`, { method: "POST" })
      if (!res.ok) throw new Error("Reset failed")
      setDraft(await res.json())
      setDirty(false)
      toast.success("Synopsis re-generated from annotations")
    } catch (err: any) {
      toast.error(err.message || "Reset failed")
    } finally {
      setResetting(false)
    }
  }

  const updateDraft = useCallback((updater: (d: SynopsisDraftData) => SynopsisDraftData) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      if (next === prev) return prev
      return next
    })
    setDirty(true)
  }, [])

  const updateClientField = useCallback((field: keyof SynopsisDraftData, value: string) => {
    // Keep the raw string (never coerce to null) — clientName is NOT NULL in the DB (B1)
    updateDraft((d) => ({ ...d, [field]: value }))
  }, [updateDraft])

  const updateColumn = useCallback((groupId: string, columnId: string, field: keyof ColorColumn, value: string) => {
    updateDraft((d) => ({
      ...d,
      structure: {
        ...d.structure,
        groups: d.structure.groups.map((g) =>
          g.id !== groupId ? g : {
            ...g,
            columns: g.columns.map((c) =>
              c.id !== columnId ? c : { ...c, [field]: value }
            ),
          }
        ),
      },
    }))
  }, [updateDraft])

  const reorderColumns = useCallback((groupId: string, fromId: string, toId: string) => {
    updateDraft((d) => ({
      ...d,
      structure: {
        ...d.structure,
        groups: d.structure.groups.map((g) => {
          if (g.id !== groupId) return g
          const fromIndex = g.columns.findIndex((c) => c.id === fromId)
          const toIndex = g.columns.findIndex((c) => c.id === toId)
          if (fromIndex < 0 || toIndex < 0) return g
          return { ...g, columns: arrayMove(g.columns, fromIndex, toIndex) }
        }),
      },
    }))
  }, [updateDraft])

  const togglePhoto = useCallback((groupId: string, columnId: string, photoId: string) => {
    updateDraft((d) => ({
      ...d,
      structure: {
        ...d.structure,
        groups: d.structure.groups.map((g) =>
          g.id !== groupId ? g : {
            ...g,
            columns: g.columns.map((c) => {
              if (c.id !== columnId) return c
              const has = c.photoIds.includes(photoId)
              return {
                ...c,
                photoIds: has
                  ? c.photoIds.filter((pid) => pid !== photoId)
                  : [...c.photoIds, photoId],
              }
            }),
          }
        ),
      },
    }))
  }, [updateDraft])

  const updateSummary = useCallback((
    category: "walls" | "trim" | "ceilings",
    colorCode: string,
    field: "productLines",
    value: string[]
  ) => {
    updateDraft((d) => ({
      ...d,
      structure: {
        ...d.structure,
        summary: {
          ...d.structure.summary,
          [category]: d.structure.summary[category].map((e) =>
            e.colorCode !== colorCode ? e : { ...e, [field]: value }
          ),
        },
      },
    }))
  }, [updateDraft])

  const removeSummaryEntry = useCallback((category: "walls" | "trim" | "ceilings", colorCode: string) => {
    updateDraft((d) => ({
      ...d,
      structure: {
        ...d.structure,
        summary: {
          ...d.structure.summary,
          [category]: d.structure.summary[category].filter((e) => e.colorCode !== colorCode),
        },
      },
    }))
  }, [updateDraft])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !draft) return
    const oldIndex = draft.structure.groups.findIndex((g) => g.id === active.id)
    const newIndex = draft.structure.groups.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    updateDraft((d) => ({
      ...d,
      structure: { ...d.structure, groups: arrayMove(d.structure.groups, oldIndex, newIndex) },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No synopsis draft available. Add color annotations to photos first.
      </div>
    )
  }

  const structure = draft.structure

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{projectName} — Synopsis</h1>
            <p className="text-sm text-muted-foreground">
              {dirty && <span className="text-orange-500 mr-1">Unsaved changes</span>}
              {!dirty && "All changes saved"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => saveDraft()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
            {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Reset
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            Export DOCX
          </Button>
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Client Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="clientName">Name</Label>
              <Input id="clientName" value={draft.clientName} onChange={(e) => updateClientField("clientName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={draft.address || ""} onChange={(e) => updateClientField("address", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={draft.email || ""} onChange={(e) => updateClientField("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={draft.phone || ""} onChange={(e) => updateClientField("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consultDate">Consult Date</Label>
              <Input
                id="consultDate"
                type="date"
                value={draft.consultDate ? new Date(draft.consultDate).toISOString().split("T")[0] : ""}
                onChange={(e) => updateClientField("consultDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Color Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SummarySection
              label="Walls"
              entries={structure.summary.walls}
              category="walls"
              onUpdateProductLines={(colorCode, value) => updateSummary("walls", colorCode, "productLines", value)}
              onRemoveEntry={(colorCode) => removeSummaryEntry("walls", colorCode)}
            />
            <SummarySection
              label="Trim"
              entries={structure.summary.trim}
              category="trim"
              onUpdateProductLines={(colorCode, value) => updateSummary("trim", colorCode, "productLines", value)}
              onRemoveEntry={(colorCode) => removeSummaryEntry("trim", colorCode)}
            />
            <SummarySection
              label="Ceilings"
              entries={structure.summary.ceilings}
              category="ceilings"
              onUpdateProductLines={(colorCode, value) => updateSummary("ceilings", colorCode, "productLines", value)}
              onRemoveEntry={(colorCode) => removeSummaryEntry("ceilings", colorCode)}
            />
            {structure.summary.walls.length === 0 &&
             structure.summary.trim.length === 0 &&
             structure.summary.ceilings.length === 0 && (
              <p className="text-muted-foreground text-sm">No colors specified yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Specifications
            <Badge variant="secondary" className="ml-2">{structure.groups.length} groups</Badge>
            {photos.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {unassignedPhotos.length} unassigned photo{unassignedPhotos.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {structure.groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">No color groups. Add annotations to project photos first.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={structure.groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {structure.groups.map((group, idx) => (
                    <SortableGroupCard
                      key={group.id}
                      group={group}
                      index={idx}
                      photos={photos}
                      colSensors={sensors}
                      onUpdateColumn={(columnId, field, value) => updateColumn(group.id, columnId, field, value)}
                      onTogglePhoto={(columnId, photoId) => togglePhoto(group.id, columnId, photoId)}
                      onReorderColumns={(fromId, toId) => reorderColumns(group.id, fromId, toId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  label: string
  entries: SummaryEntry[]
  category: "walls" | "trim" | "ceilings"
  onUpdateProductLines: (colorCode: string, value: string[]) => void
  onRemoveEntry: (colorCode: string) => void
}

function SummarySection({ label, entries, onUpdateProductLines, onRemoveEntry }: SummarySectionProps) {
  if (entries.length === 0) return null
  return (
    <div className="flex items-start gap-4">
      <span className="font-medium text-sm w-20 shrink-0">{label}:</span>
      <div className="flex-1 space-y-1">
        {entries.map((e) => (
          <SummaryEntryRow
            key={e.colorCode}
            entry={e}
            onUpdateProductLines={(value) => onUpdateProductLines(e.colorCode, value)}
            onRemove={() => onRemoveEntry(e.colorCode)}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryEntryRow({
  entry,
  onUpdateProductLines,
  onRemove,
}: {
  entry: SummaryEntry
  onUpdateProductLines: (value: string[]) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(entry.productLines.join(", "))

  const commitEdit = useCallback(() => {
    const parsed = localValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (parsed.length > 0) {
      onUpdateProductLines(parsed)
    }
    setEditing(false)
  }, [localValue, onUpdateProductLines])

  if (!editing) {
    return (
      <div className="flex items-center gap-1 text-sm group">
        <span className="font-medium">{entry.colorCode}</span>{" "}
        <span>{entry.colorName}</span>
        <button
          onClick={() => {
            setLocalValue(entry.productLines.join(", "))
            setEditing(true)
          }}
          className="text-muted-foreground hover:text-foreground ml-1 cursor-pointer"
          title="Edit product lines"
        >
          <span className="text-muted-foreground">({entry.productLines.join(" | ")})</span>
        </button>
        <button
          onClick={onRemove}
          className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Remove ${entry.colorCode}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="font-medium">{entry.colorCode}</span>{" "}
      <span>{entry.colorName}</span>
      <Input
        autoFocus
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitEdit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="h-6 text-xs w-48 ml-1"
        placeholder="Product lines (comma-separated)"
      />
      <button
        onClick={onRemove}
        className="ml-1 text-muted-foreground hover:text-destructive"
        title={`Remove ${entry.colorCode}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Group Card
// ---------------------------------------------------------------------------

interface SortableGroupCardProps {
  group: ColorGroup
  index: number
  photos: ProjectPhoto[]
  colSensors: ReturnType<typeof useSensors>
  onUpdateColumn: (columnId: string, field: keyof ColorColumn, value: string) => void
  onTogglePhoto: (columnId: string, photoId: string) => void
  onReorderColumns: (fromId: string, toId: string) => void
}

function SortableGroupCard({ group, index, photos, colSensors, onUpdateColumn, onTogglePhoto, onReorderColumns }: SortableGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id })
  const style = buildSortableStyle(transform, transition, isDragging)
  const { label, gridClass } = LAYOUT_META[group.layout]

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorderColumns(String(active.id), String(over.id))
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <button className={DRAG_HANDLE_CLASS} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant="outline" className="text-xs">{label}</Badge>
        <span className="text-xs text-muted-foreground">Group {index + 1}</span>
      </div>
      <DndContext sensors={colSensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
        <SortableContext items={group.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className={`grid gap-4 ${gridClass}`}>
            {group.columns.map((col) => (
              <EditableColumnCard
                key={col.id}
                column={col}
                columnCount={group.layout}
                photos={photos}
                onUpdate={onUpdateColumn}
                onTogglePhoto={onTogglePhoto}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable Column Card with Photo Picker
// ---------------------------------------------------------------------------

interface EditableColumnCardProps {
  column: ColorColumn
  columnCount: 1 | 2 | 3
  photos: ProjectPhoto[]
  onUpdate: (columnId: string, field: keyof ColorColumn, value: string) => void
  onTogglePhoto: (columnId: string, photoId: string) => void
}

function EditableColumnCard({ column, columnCount, photos, onUpdate, onTogglePhoto }: EditableColumnCardProps) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id })
  const style = buildSortableStyle(transform, transition, isDragging)

  const assignedPhotos = photos.filter((p) => column.photoIds.includes(p.id))
  const availablePhotos = photos.filter((p) => !column.photoIds.includes(p.id))

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      {columnCount > 1 && (
        <div className="flex items-center justify-end">
          <button className={DRAG_HANDLE_CLASS} {...attributes} {...listeners}>
            <GripHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Rooms</Label>
        <Input
          value={column.roomsLabel}
          onChange={(e) => onUpdate(column.id, "roomsLabel", e.target.value)}
          className="text-sm font-medium"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes Tag</Label>
        <Input
          value={column.notesTag || ""}
          onChange={(e) => onUpdate(column.id, "notesTag", e.target.value)}
          placeholder="e.g., notes below"
          className="text-sm"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <ColorSwatch colorCode={column.colorCode} />
        <div>
          <p className="text-sm">
            <span className="font-mono">{column.colorCode}</span> {column.colorName}
          </p>
          <p className="text-sm text-muted-foreground italic">
            {column.productLine} — {column.sheen}
          </p>
        </div>
      </div>

      {/* Assigned photos */}
      {assignedPhotos.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {assignedPhotos.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
            >
              {p.filename.length > 20 ? p.filename.slice(0, 17) + "..." : p.filename}
              <button
                onClick={() => onTogglePhoto(column.id, p.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Photo picker toggle */}
      {photos.length > 0 && (
        <div>
          <button
            onClick={() => setShowPhotoPicker(!showPhotoPicker)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showPhotoPicker ? <ChevronUp className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
            {showPhotoPicker ? "Hide photos" : `Add photos (${assignedPhotos.length}/${photos.length})`}
          </button>

          {showPhotoPicker && availablePhotos.length > 0 && (
            <div className="mt-2 border rounded p-2 max-h-32 overflow-y-auto space-y-1">
              {availablePhotos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onTogglePhoto(column.id, p.id)}
                  className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-muted truncate"
                >
                  + {p.filename}
                </button>
              ))}
            </div>
          )}
          {showPhotoPicker && availablePhotos.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">All photos assigned to this column.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color Swatch
// ---------------------------------------------------------------------------

// Common Sherwin-Williams color approximations for swatch display
const SW_COLOR_MAP: Record<string, string> = {
  "SW7005": "#F3F0E7", "SW7006": "#EDE8DB", "SW7008": "#C5B9A6",
  "SW7011": "#9B9386", "SW7012": "#918A7E", "SW7015": "#686058",
  "SW7029": "#D5CFC4", "SW7035": "#C6BFB0", "SW7036": "#ACA396",
  "SW7037": "#9E958A", "SW7043": "#72695D", "SW7044": "#655C51",
  "SW7541": "#EDE6D3", "SW7542": "#DDD4C0", "SW9166": "#DDD7CA",
}

function ColorSwatch({ colorCode }: { colorCode: string }) {
  // Try known map, otherwise generate a deterministic pastel from the code
  const normalized = colorCode.replace(/\s+/g, "")
  const hex = SW_COLOR_MAP[normalized]

  if (hex) {
    return (
      <div
        className="w-6 h-6 rounded border border-border shrink-0"
        style={{ backgroundColor: hex }}
        title={colorCode}
      />
    )
  }

  // Deterministic hash-based pastel fallback
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  const fallbackColor = `hsl(${h}, 40%, 80%)`

  return (
    <div
      className="w-6 h-6 rounded border border-border shrink-0"
      style={{ backgroundColor: fallbackColor }}
      title={`${colorCode} (approx)`}
    />
  )
}
