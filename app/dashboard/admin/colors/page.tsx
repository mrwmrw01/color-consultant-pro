"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Pencil } from "lucide-react"

type Manufacturer = { id: string; name: string; abbreviation: string }
type Color = {
  id: string
  colorCode: string
  name: string
  manufacturer: string
  hexColor: string | null
  status: string
  manufacturerRel?: { name: string; abbreviation: string }
}

export default function AdminColorsPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [mfrFilter, setMfrFilter] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [offset, setOffset] = useState(0)
  const limit = 50
  const [editing, setEditing] = useState<Partial<Color & { manufacturerId: string }> | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadManufacturers() {
    const res = await fetch("/api/admin/manufacturers")
    if (res.ok) {
      const data = await res.json()
      setManufacturers(data.manufacturers)
    }
  }

  async function loadColors() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (mfrFilter !== "all") params.set("manufacturerId", mfrFilter)
    if (status !== "all") params.set("status", status)
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    const res = await fetch(`/api/admin/colors?${params}`)
    if (res.ok) {
      const data = await res.json()
      setColors(data.colors)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadManufacturers()
  }, [])

  useEffect(() => {
    loadColors()
  }, [search, mfrFilter, status, offset])

  async function save() {
    if (!editing) return
    setError(null)
    const isEdit = !!editing.id
    const url = isEdit ? `/api/admin/colors/${editing.id}` : "/api/admin/colors"
    const method = isEdit ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed" }))
      setError(err.error || "Failed to save")
      return
    }
    setOpen(false)
    setEditing(null)
    loadColors()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <Label className="text-xs text-slate-500">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-8"
              placeholder="Name, code, manufacturer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOffset(0)
              }}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Manufacturer</Label>
          <Select value={mfrFilter} onValueChange={(v) => { setMfrFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {manufacturers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0) }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="superseded">Superseded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ status: "active" })}>
              <Plus className="h-4 w-4 mr-1" /> Add Color
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit Color" : "New Color"}</DialogTitle>
              <DialogDescription>
                Add a color to the master catalog. Code is validated against the manufacturer&apos;s pattern if one is defined.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {!editing?.id && (
                <div>
                  <Label>Manufacturer *</Label>
                  <Select
                    value={editing?.manufacturerId ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, manufacturerId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {manufacturers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Color Code *</Label>
                <Input
                  value={editing?.colorCode ?? ""}
                  onChange={(e) => setEditing({ ...editing, colorCode: e.target.value })}
                  placeholder="SW 9140"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Blustery Sky"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hex</Label>
                  <Input
                    value={editing?.hexColor ?? ""}
                    onChange={(e) => setEditing({ ...editing, hexColor: e.target.value })}
                    placeholder="#C9D2DA"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing?.status ?? "active"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-slate-600 mb-2">
        {loading ? "Loading..." : `${total.toLocaleString()} matches`}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {colors.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div
                  className="w-6 h-6 rounded border"
                  style={{ background: c.hexColor ?? "#eee" }}
                />
              </TableCell>
              <TableCell className="font-mono text-sm">{c.colorCode}</TableCell>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>
                {c.manufacturerRel?.abbreviation ? (
                  <Badge variant="outline">{c.manufacturerRel.abbreviation}</Badge>
                ) : (
                  <span className="text-xs text-slate-500">{c.manufacturer}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    c.status === "active"
                      ? "bg-emerald-600"
                      : c.status === "pending"
                        ? "bg-amber-600"
                        : "bg-slate-400"
                  }
                >
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing({ ...c })
                    setOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > limit && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            {offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()}
          </p>
          <Button
            variant="outline"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
