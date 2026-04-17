"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  X,
  Check,
  AlertTriangle,
  Palette,
  Image as ImageIcon,
  Save,
  Download,
} from "lucide-react"
import Link from "next/link"

// --- Types (match lib/synopsis-studio-data.ts) ---

type StudioSurface = {
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
  photos: Array<{ id: string; cloudStoragePath: string; fileName: string }>
}

type StudioRoom = {
  roomId: string
  roomName: string
  surfaces: StudioSurface[]
}

type UniversalSpec = {
  surfaceType: string
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

type StudioData = {
  project: {
    id: string
    name: string
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    address: string | null
  }
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

// --- Helpers ---

function Swatch({ hex, size = 20 }: { hex: string | null; size?: number }) {
  return (
    <span
      className="inline-block rounded border border-gray-300"
      style={{ background: hex ?? "#eee", width: size, height: size, verticalAlign: "middle" }}
    />
  )
}

function formatSurfaceType(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function surfaceMatchesUniversal(s: StudioSurface, universals: UniversalSpec[]): boolean {
  for (const u of universals) {
    const matchTypes =
      u.surfaceType === "trim"
        ? ["trim", "baseboard", "molding", "door", "window", "wainscoting"]
        : ["ceiling"]
    const st = s.surfaceType.toLowerCase()
    if (matchTypes.some((m) => st.includes(m)) && s.colorCode === u.dominant.colorCode) {
      return true
    }
  }
  return false
}

// --- Main Component ---

export default function SynopsisStudioPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [data, setData] = useState<StudioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedSurface, setSelectedSurface] = useState<StudioSurface | null>(null)
  const [editing, setEditing] = useState<Partial<StudioSurface> | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExceptions, setShowExceptions] = useState(true)
  const [dedupeUniversal, setDedupeUniversal] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis/studio`)
      if (!res.ok) throw new Error(await res.text())
      const d: StudioData = await res.json()
      setData(d)
      if (d.rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(d.rooms[0].roomId)
      }
    } catch (e: any) {
      setError(e.message || "Failed to load")
    }
    setLoading(false)
  }, [projectId, selectedRoomId])

  useEffect(() => {
    load()
  }, [load])

  async function saveEdit() {
    if (!editing || !selectedSurface) return
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/synopsis/studio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annotationId: selectedSurface.annotationId,
          ...editing,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditing(null)
      setSelectedSurface(null)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-slate-500">Loading Synopsis Studio...</div>
      </div>
    )
  }
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-red-600">{error}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    )
  }
  if (!data) return null

  const currentRoom = data.rooms.find((r) => r.roomId === selectedRoomId)

  // Filter room surfaces: suppress universal-matching if dedupe is on
  const visibleSurfaces = currentRoom
    ? dedupeUniversal
      ? currentRoom.surfaces.filter((s) => !surfaceMatchesUniversal(s, data.universals))
      : currentRoom.surfaces
    : []

  const suppressedTypes = currentRoom
    ? [
        ...new Set(
          currentRoom.surfaces
            .filter((s) => surfaceMatchesUniversal(s, data.universals))
            .map((s) => s.surfaceType.toLowerCase().includes("ceiling") ? "ceiling" : "trim")
        ),
      ]
    : []

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">{data.project.name}</h1>
            <p className="text-xs text-slate-500">
              {data.project.clientName} · {data.project.address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showExceptions}
              onChange={(e) => setShowExceptions(e.target.checked)}
              className="rounded"
            />
            Exceptions
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={dedupeUniversal}
              onChange={(e) => setDedupeUniversal(e.target.checked)}
              className="rounded"
            />
            Dedupe
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                const url = `/api/projects/${projectId}/synopsis/studio/export?showExceptions=${showExceptions}`
                const res = await fetch(url)
                if (!res.ok) throw new Error("Export failed")
                const blob = await res.blob()
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `${data?.project.clientName || "Synopsis"}_Color_Synopsis.pdf`
                a.click()
                URL.revokeObjectURL(a.href)
              } catch (e: any) {
                setError(e.message)
              }
              setExporting(false)
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Room Outline */}
        <div className="w-56 flex-shrink-0 border-r bg-slate-50 overflow-y-auto">
          <div className="p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Rooms ({data.rooms.length})
            </p>
            {data.rooms.map((room) => {
              const nonUniversalCount = dedupeUniversal
                ? room.surfaces.filter((s) => !surfaceMatchesUniversal(s, data.universals)).length
                : room.surfaces.length
              return (
                <button
                  key={room.roomId}
                  onClick={() => {
                    setSelectedRoomId(room.roomId)
                    setSelectedSurface(null)
                    setEditing(null)
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition ${
                    selectedRoomId === room.roomId
                      ? "bg-white shadow-sm border font-medium"
                      : "hover:bg-white/70"
                  }`}
                >
                  <span className="truncate">{room.roomName}</span>
                  <span className="text-xs text-slate-400 ml-1">{nonUniversalCount}</span>
                </button>
              )
            })}
          </div>

          {/* Universal summary */}
          <Separator className="my-2" />
          <div className="p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Universal Specs
            </p>
            {data.universals.map((u) => (
              <div key={u.surfaceType} className="mb-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Swatch hex={u.dominant.hexColor} size={14} />
                  {u.surfaceType.charAt(0).toUpperCase() + u.surfaceType.slice(1)}
                </div>
                <div className="text-slate-500 ml-5">
                  {u.dominant.colorCode} · {u.dominant.colorName}
                  <br />
                  {u.coverage}/{u.total} rooms
                </div>
                {showExceptions && u.exceptions.length > 0 && (
                  <div className="ml-5 mt-1 border-l-2 border-red-300 pl-2">
                    <p className="text-[10px] font-semibold text-red-600 uppercase">Exceptions</p>
                    {u.exceptions.map((e) => (
                      <div key={`${e.roomId}-${e.colorCode}`} className="text-slate-600">
                        <Swatch hex={e.hexColor} size={10} /> {e.roomName}: {e.colorCode}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL — Synopsis Document */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {currentRoom ? (
            <>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <span
                  className="w-1 h-6 rounded bg-amber-700 inline-block"
                  style={{ flexShrink: 0 }}
                />
                {currentRoom.roomName}
              </h2>

              {/* Suppression note */}
              {suppressedTypes.length > 0 && (
                <p className="text-xs text-slate-500 italic mb-4 pl-3 border-l-2 border-amber-200">
                  {suppressedTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")} per
                  universal specification.
                </p>
              )}

              {visibleSurfaces.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                  All surfaces match the universal specification — no room-specific entries.
                </p>
              )}

              {/* Surface entries */}
              <div className="space-y-3">
                {visibleSurfaces.map((surface, i) => {
                  const isSelected = selectedSurface?.annotationId === surface.annotationId
                  return (
                    <div
                      key={surface.annotationId}
                      onClick={() => {
                        setSelectedSurface(surface)
                        setEditing(null)
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border ${
                        isSelected
                          ? "border-amber-400 bg-amber-50 shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <Swatch hex={surface.hexColor} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {formatSurfaceType(surface.surfaceType)}
                        </div>
                        <div className="text-xs text-slate-600">
                          {surface.colorCode} · {surface.colorName}
                        </div>
                        <div className="text-xs text-slate-500 italic">
                          {surface.productLine} · {surface.sheen}
                        </div>
                        {surface.notes && (
                          <div className="text-xs text-slate-500 mt-1 pl-2 border-l-2 border-amber-200">
                            {surface.notes}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-center mt-20">Select a room from the left panel.</p>
          )}
        </div>

        {/* RIGHT PANEL — Inspector */}
        <div className="w-80 flex-shrink-0 border-l bg-slate-50 overflow-y-auto">
          {selectedSurface ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Inspector</h3>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        productLine: selectedSurface.productLine,
                        sheen: selectedSurface.sheen,
                        notes: selectedSurface.notes,
                      })
                    }
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={saving} onClick={saveEdit}>
                      <Check className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Annotation details */}
              <Card className="mb-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500">
                    Annotation Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Swatch hex={selectedSurface.hexColor} size={24} />
                    <div>
                      <div className="font-medium">{selectedSurface.colorCode}</div>
                      <div className="text-xs text-slate-600">{selectedSurface.colorName}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Surface: </span>
                    <span className="text-xs font-medium">
                      {formatSurfaceType(selectedSurface.surfaceType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Manufacturer: </span>
                    <span className="text-xs">{selectedSurface.manufacturer}</span>
                  </div>

                  {/* Editable fields */}
                  {editing ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div>
                        <Label className="text-xs">Product Line</Label>
                        <Input
                          value={editing.productLine ?? ""}
                          onChange={(e) =>
                            setEditing({ ...editing, productLine: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Sheen</Label>
                        <Select
                          value={editing.sheen ?? ""}
                          onValueChange={(v) => setEditing({ ...editing, sheen: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Flat", "Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss"].map(
                              (s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input
                          value={editing.notes ?? ""}
                          onChange={(e) =>
                            setEditing({ ...editing, notes: e.target.value })
                          }
                          className="h-8 text-xs"
                          placeholder="Consultant notes..."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-xs text-slate-500">Product Line: </span>
                        <span className="text-xs">{selectedSurface.productLine}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Sheen: </span>
                        <span className="text-xs">{selectedSurface.sheen}</span>
                      </div>
                      {selectedSurface.notes && (
                        <div>
                          <span className="text-xs text-slate-500">Notes: </span>
                          <span className="text-xs italic">{selectedSurface.notes}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="text-[10px] text-slate-400 pt-2 border-t font-mono">
                    ID: {selectedSurface.annotationId.slice(0, 12)}...
                  </div>
                </CardContent>
              </Card>

              {/* Photo references */}
              {selectedSurface.photos.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Photos ({selectedSurface.photos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedSurface.photos.map((p) => (
                      <div
                        key={p.id}
                        className="mb-2 border rounded overflow-hidden"
                      >
                        <div className="bg-slate-200 h-24 flex items-center justify-center text-slate-400 text-xs">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <div className="px-2 py-1 text-[10px] text-slate-500 font-mono truncate">
                          {p.fileName}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {error && (
                <p className="text-xs text-red-600 mt-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm px-4 text-center">
              <Palette className="h-8 w-8 mb-2 opacity-40" />
              Select a surface entry in the center panel to inspect and edit.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
