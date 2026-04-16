"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Power } from "lucide-react"

type Manufacturer = {
  id: string
  name: string
  abbreviation: string
  website: string | null
  codePattern: string | null
  notes: string | null
  isActive: boolean
  _count?: { colors: number }
}

export default function ManufacturersPage() {
  const [rows, setRows] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Manufacturer> | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/manufacturers")
    if (res.ok) {
      const data = await res.json()
      setRows(data.manufacturers)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    if (!editing) return
    setError(null)
    const method = editing.id ? "PATCH" : "POST"
    const url = editing.id
      ? `/api/admin/manufacturers/${editing.id}`
      : "/api/admin/manufacturers"
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
    load()
  }

  async function toggleActive(m: Manufacturer) {
    await fetch(`/api/admin/manufacturers/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !m.isActive }),
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">{rows.length} manufacturers</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ isActive: true })}>
              <Plus className="h-4 w-4 mr-1" /> Add Manufacturer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Edit Manufacturer" : "New Manufacturer"}
              </DialogTitle>
              <DialogDescription>
                Define a paint brand. Abbreviation is used as the code prefix.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={editing?.name ?? ""}
                  placeholder="Farrow & Ball"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Abbreviation *</Label>
                <Input
                  value={editing?.abbreviation ?? ""}
                  placeholder="FB"
                  maxLength={6}
                  onChange={(e) =>
                    setEditing({ ...editing, abbreviation: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={editing?.website ?? ""}
                  placeholder="https://..."
                  onChange={(e) => setEditing({ ...editing, website: e.target.value })}
                />
              </div>
              <div>
                <Label>Code Pattern (regex, optional)</Label>
                <Input
                  value={editing?.codePattern ?? ""}
                  placeholder="^\\d{1,3}$"
                  onChange={(e) => setEditing({ ...editing, codePattern: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Validates new color codes entered for this manufacturer.
                </p>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={editing?.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Abbrev</TableHead>
            <TableHead>Colors</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Website</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-500">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{m.abbreviation}</Badge>
                </TableCell>
                <TableCell>{m._count?.colors ?? 0}</TableCell>
                <TableCell>
                  {m.isActive ? (
                    <Badge className="bg-emerald-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {m.website ? (
                    <a href={m.website} target="_blank" rel="noreferrer" className="underline">
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(m)
                      setOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(m)}>
                    <Power className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
