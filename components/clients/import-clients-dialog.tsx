"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Upload,
  Link2,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react"

interface ImportClientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportMode = "file" | "url"
type ImportStep = "upload" | "mapping" | "results"

interface ColumnMapping {
  name: string
  contactName: string
  email: string
  phone: string
  type: string
  notes: string
}

interface ImportResults {
  created: number
  skipped: number
  errors: { row: number; reason: string }[]
}

const CLIENT_FIELDS = [
  { key: "name", label: "Client Name", required: true },
  { key: "contactName", label: "Contact Name", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "type", label: "Type", required: false },
  { key: "notes", label: "Notes", required: false },
] as const

const SKIP_VALUE = "__skip__"

export function ImportClientsDialog({ open, onOpenChange }: ImportClientsDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>("file")
  const [step, setStep] = useState<ImportStep>("upload")
  const [isLoading, setIsLoading] = useState(false)

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  // Preview state
  const [headers, setHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<any[][]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    type: "",
    notes: "",
  })

  // Results state
  const [results, setResults] = useState<ImportResults | null>(null)

  const reset = () => {
    setStep("upload")
    setSelectedFile(null)
    setUrl("")
    setHeaders([])
    setPreview([])
    setTotalRows(0)
    setMapping({ name: "", contactName: "", email: "", phone: "", type: "", notes: "" })
    setResults(null)
    setIsLoading(false)
    setIsDragging(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  // Auto-map columns based on header names
  const autoMap = (hdrs: string[]): ColumnMapping => {
    const m: ColumnMapping = { name: "", contactName: "", email: "", phone: "", type: "", notes: "" }
    const lower = hdrs.map(h => h.toLowerCase().trim())

    for (let i = 0; i < lower.length; i++) {
      const h = lower[i]
      const col = hdrs[i]
      if (!m.name && (h === "name" || h === "client name" || h === "client" || h === "company" || h === "company name" || h === "full name")) {
        m.name = col
      } else if (!m.contactName && (h === "contact" || h === "contact name" || h === "contact person" || h === "primary contact")) {
        m.contactName = col
      } else if (!m.email && (h === "email" || h === "e-mail" || h === "email address" || h === "e-mail address")) {
        m.email = col
      } else if (!m.phone && (h === "phone" || h === "telephone" || h === "phone number" || h === "tel" || h === "mobile" || h === "cell")) {
        m.phone = col
      } else if (!m.type && (h === "type" || h === "client type" || h === "category")) {
        m.type = col
      } else if (!m.notes && (h === "notes" || h === "note" || h === "comments" || h === "description")) {
        m.notes = col
      }
    }
    return m
  }

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    const validExts = [".xlsx", ".xls"]
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error("Please select an .xlsx or .xls file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — maximum 5MB")
      return
    }
    setSelectedFile(file)
  }, [])

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // Preview: parse file and show columns
  const handlePreview = async () => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("action", "preview")

      if (mode === "file" && selectedFile) {
        formData.append("file", selectedFile)
      } else if (mode === "url" && url.trim()) {
        formData.append("url", url.trim())
      } else {
        toast.error(mode === "file" ? "Please select a file" : "Please enter a URL")
        setIsLoading(false)
        return
      }

      const res = await fetch("/api/clients/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to parse file")
        setIsLoading(false)
        return
      }

      setHeaders(data.headers)
      setPreview(data.preview)
      setTotalRows(data.totalRows)
      setMapping(autoMap(data.headers))
      setStep("mapping")
    } catch (err) {
      toast.error("Failed to parse file")
    }
    setIsLoading(false)
  }

  // Import: send mapping and create clients
  const handleImport = async () => {
    if (!mapping.name) {
      toast.error("Name column mapping is required")
      return
    }
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("action", "import")
      formData.append("mapping", JSON.stringify(mapping))

      if (mode === "file" && selectedFile) {
        formData.append("file", selectedFile)
      } else if (mode === "url" && url.trim()) {
        formData.append("url", url.trim())
      }

      const res = await fetch("/api/clients/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Import failed")
        setIsLoading(false)
        return
      }

      setResults(data)
      setStep("results")
      if (data.created > 0) {
        router.refresh()
      }
    } catch (err) {
      toast.error("Import failed")
    }
    setIsLoading(false)
  }

  const updateMapping = (field: string, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value === SKIP_VALUE ? "" : value }))
  }

  const nameIsMapped = mapping.name !== ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto"
        style={{ borderColor: "#d2691e", borderWidth: "2px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "#412501" }}>
            <FileSpreadsheet className="h-5 w-5" style={{ color: "#c47004" }} />
            Import Clients from Spreadsheet
          </DialogTitle>
          <DialogDescription style={{ color: "#8b4513" }}>
            {step === "upload" && "Upload an XLSX file or paste a download link"}
            {step === "mapping" && `Map spreadsheet columns to client fields (${totalRows} rows found)`}
            {step === "results" && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={mode === "file" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("file")}
                style={mode === "file" ? { backgroundColor: "#c47004" } : { borderColor: "#d2691e", color: "#8b4513" }}
              >
                <Upload className="h-4 w-4 mr-1" />
                File Upload
              </Button>
              <Button
                variant={mode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("url")}
                style={mode === "url" ? { backgroundColor: "#c47004" } : { borderColor: "#d2691e", color: "#8b4513" }}
              >
                <Link2 className="h-4 w-4 mr-1" />
                URL
              </Button>
            </div>

            {mode === "file" ? (
              <>
                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-orange-400 bg-orange-50" : "border-gray-300 hover:border-orange-300"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3" style={{ color: "#c47004" }} />
                  <p className="text-sm font-medium" style={{ color: "#412501" }}>
                    Drag & drop your spreadsheet here
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#8b4513" }}>
                    or click to browse — .xlsx, .xls (max 5MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                </div>

                {/* Selected file */}
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "#fef3e8" }}>
                    <FileSpreadsheet className="h-5 w-5" style={{ color: "#c47004" }} />
                    <span className="text-sm font-medium flex-1" style={{ color: "#412501" }}>
                      {selectedFile.name}
                    </span>
                    <span className="text-xs" style={{ color: "#8b4513" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* URL Input */
              <div className="space-y-2">
                <Label style={{ color: "#412501" }}>Spreadsheet URL</Label>
                <Input
                  placeholder="Paste OneDrive, Google Drive, or direct download link..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{ borderColor: "#d2691e" }}
                />
                <p className="text-xs" style={{ color: "#8b4513" }}>
                  Use a direct download link. For OneDrive, use the "Download" link from the share menu.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            {/* Preview Table */}
            <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "#d2691e" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "#fef3e8" }}>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium" style={{ color: "#412501" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, ri) => (
                    <tr key={ri} className="border-t" style={{ borderColor: "#f0d0a0" }}>
                      {headers.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5 truncate max-w-[150px]" style={{ color: "#8b4513" }}>
                          {row[ci] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Column Mapping */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold" style={{ color: "#412501" }}>
                Map Columns to Client Fields
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CLIENT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Label className="text-xs w-28 shrink-0" style={{ color: "#8b4513" }}>
                      {field.label}{field.required && " *"}
                    </Label>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] || SKIP_VALUE}
                      onValueChange={(v) => updateMapping(field.key, v)}
                    >
                      <SelectTrigger
                        className="h-8 text-xs"
                        style={{
                          borderColor: mapping[field.key as keyof ColumnMapping] ? "#c47004" : "#d1d5db",
                          backgroundColor: mapping[field.key as keyof ColumnMapping] ? "#fef3e8" : "white",
                        }}
                      >
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_VALUE}>
                          <span className="text-gray-400 italic">Skip</span>
                        </SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === "results" && results && (
          <div className="space-y-4 py-2">
            {results.created > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: "#ecfdf5" }}>
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">
                    {results.created} client{results.created !== 1 ? "s" : ""} imported
                  </p>
                </div>
              </div>
            )}
            {results.skipped > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: "#fef3e8" }}>
                <AlertCircle className="h-6 w-6 shrink-0" style={{ color: "#c47004" }} />
                <div>
                  <p className="font-semibold" style={{ color: "#412501" }}>
                    {results.skipped} duplicate{results.skipped !== 1 ? "s" : ""} skipped
                  </p>
                  <p className="text-xs" style={{ color: "#8b4513" }}>
                    Clients with matching names already exist
                  </p>
                </div>
              </div>
            )}
            {results.errors.length > 0 && (
              <div className="p-4 rounded-lg bg-red-50">
                <p className="font-semibold text-red-800 mb-2">
                  {results.errors.length} error{results.errors.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {results.created === 0 && results.skipped === 0 && results.errors.length === 0 && (
              <div className="text-center py-4">
                <p style={{ color: "#8b4513" }}>No data found to import</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button
              onClick={handlePreview}
              disabled={isLoading || (mode === "file" ? !selectedFile : !url.trim())}
              style={{ backgroundColor: "#c47004" }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Preview & Map Columns"
              )}
            </Button>
          )}
          {step === "mapping" && (
            <div className="flex gap-2 w-full justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                style={{ borderColor: "#d2691e", color: "#8b4513" }}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading || !nameIsMapped}
                style={{ backgroundColor: nameIsMapped ? "#c47004" : "#d1d5db" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${totalRows} Client${totalRows !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          )}
          {step === "results" && (
            <Button
              onClick={() => handleOpenChange(false)}
              style={{ backgroundColor: "#c47004" }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
