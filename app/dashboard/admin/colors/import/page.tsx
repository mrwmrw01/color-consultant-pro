"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Upload, AlertTriangle } from "lucide-react"

type Manufacturer = { id: string; name: string; abbreviation: string }
type CsvRow = {
  manufacturer?: string
  colorCode?: string
  name?: string
  hex?: string
  rgb?: string
  notes?: string
}
type PreviewRow = {
  index: number
  status: "new" | "duplicate" | "conflict" | "invalid"
  manufacturer?: string
  colorCode?: string
  name?: string
  reason?: string
  existing?: { name: string; hexColor?: string | null }
}
type PreviewReport = {
  totalRows: number
  newCount: number
  duplicateCount: number
  conflictCount: number
  invalidCount: number
  rows: PreviewRow[]
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""))
  const idx = (name: string) => header.findIndex((h) => h.includes(name))

  const iMfr = Math.max(idx("manufacturer"))
  const iCode = Math.max(idx("colornumber"), idx("colorcode"), idx("code"))
  const iName = Math.max(idx("colorname"), idx("name"))
  const iHex = Math.max(idx("hex"))
  const iR = idx("redvalue")
  const iG = idx("greenvalue")
  const iB = idx("bluevalue")
  const iNotes = Math.max(idx("notes"))

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const row: CsvRow = {
      manufacturer: iMfr >= 0 ? cols[iMfr] : undefined,
      colorCode: iCode >= 0 ? cols[iCode] : undefined,
      name: iName >= 0 ? cols[iName] : undefined,
      hex: iHex >= 0 ? cols[iHex] : undefined,
      rgb:
        iR >= 0 && iG >= 0 && iB >= 0 ? `${cols[iR]},${cols[iG]},${cols[iB]}` : undefined,
      notes: iNotes >= 0 ? cols[iNotes] : undefined,
    }
    if (row.colorCode || row.name) rows.push(row)
  }
  return rows
}

export default function ColorImportPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [defaultMfr, setDefaultMfr] = useState<string>("")
  const [rows, setRows] = useState<CsvRow[]>([])
  const [preview, setPreview] = useState<PreviewReport | null>(null)
  const [onConflict, setOnConflict] = useState<"skip" | "update">("skip")
  const [loading, setLoading] = useState(false)
  const [committed, setCommitted] = useState<any>(null)

  useEffect(() => {
    fetch("/api/admin/manufacturers")
      .then((r) => r.json())
      .then((d) => setManufacturers(d.manufacturers || []))
  }, [])

  async function onFile(f: File | null) {
    if (!f) return
    const text = await f.text()
    const parsed = parseCsv(text)
    setRows(parsed)
    setPreview(null)
    setCommitted(null)
  }

  async function runPreview() {
    setLoading(true)
    const res = await fetch("/api/admin/colors/import-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, defaultManufacturerId: defaultMfr || undefined }),
    })
    if (res.ok) setPreview(await res.json())
    setLoading(false)
  }

  async function commit() {
    setLoading(true)
    const res = await fetch("/api/admin/colors/import-commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows,
        defaultManufacturerId: defaultMfr || undefined,
        onConflict,
      }),
    })
    if (res.ok) setCommitted(await res.json())
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload CSV
          </CardTitle>
          <CardDescription>
            Expected headers: <code>Manufacturer</code>, <code>Color Number</code>,{" "}
            <code>Color Name</code>, <code>Hex</code> (optional), RGB (optional), Notes (optional).
            If the CSV omits manufacturer, the default below is used for all rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Default manufacturer (for rows with no manufacturer column)</Label>
            <Select value={defaultMfr} onValueChange={setDefaultMfr}>
              <SelectTrigger><SelectValue placeholder="None — rely on CSV column" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (rely on CSV)</SelectItem>
                {manufacturers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CSV file</Label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600">Parsed {rows.length} rows from CSV.</p>
              <Button onClick={runPreview} disabled={loading}>
                {loading ? "Running..." : "Preview"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>
              Review the classification, then commit. No changes have been applied yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-3 text-sm">
              <Badge className="bg-emerald-600">{preview.newCount} new</Badge>
              <Badge variant="secondary">{preview.duplicateCount} duplicate</Badge>
              <Badge className="bg-amber-600">{preview.conflictCount} conflict</Badge>
              <Badge className="bg-red-600">{preview.invalidCount} invalid</Badge>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Label>On conflict:</Label>
              <Select value={onConflict} onValueChange={(v: any) => setOnConflict(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip conflicts</SelectItem>
                  <SelectItem value="update">Update existing name</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={commit} disabled={loading}>
                {loading ? "Committing..." : `Commit ${preview.newCount + (onConflict === "update" ? preview.conflictCount : 0)} changes`}
              </Button>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Reason / Existing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.slice(0, 200).map((r) => (
                    <TableRow key={r.index}>
                      <TableCell className="text-xs text-slate-500">{r.index + 1}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.status === "new"
                              ? "bg-emerald-600"
                              : r.status === "conflict"
                                ? "bg-amber-600"
                                : r.status === "invalid"
                                  ? "bg-red-600"
                                  : ""
                          }
                          variant={r.status === "duplicate" ? "secondary" : "default"}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.manufacturer ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.colorCode ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {r.reason ?? (r.existing ? `existing: ${r.existing.name}` : "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {preview.rows.length > 200 && (
                <p className="text-xs text-slate-500 p-2 text-center">
                  Showing first 200 of {preview.rows.length} rows.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {committed && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900">Import Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Badge className="bg-emerald-600">{committed.inserted} inserted</Badge>
              <Badge className="bg-blue-600">{committed.updated} updated</Badge>
              <Badge variant="secondary">{committed.skipped} skipped</Badge>
              {committed.errorCount > 0 && (
                <Badge className="bg-red-600">{committed.errorCount} errors</Badge>
              )}
            </div>
            {committed.errors?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Errors:
                </p>
                <ul className="text-xs text-red-600 list-disc pl-5 mt-1">
                  {committed.errors.map((e: any, i: number) => (
                    <li key={i}>
                      row {e.index + 1}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
