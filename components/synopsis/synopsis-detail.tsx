
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Calendar, 
  Users, 
  Download,
  Edit,
  FileText,
  Home,
  Palette,
  Plus
} from "lucide-react"
import Link from "next/link"
import { AddColorSpecDialog } from "./add-color-spec-dialog"
import { EditSynopsisDialog } from "./edit-synopsis-dialog"
import { useRouter } from "next/navigation"

interface SynopsisDetailProps {
  synopsis: any
}

export function SynopsisDetail({ synopsis }: SynopsisDetailProps) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSpecAdded = () => {
    setRefreshKey(prev => prev + 1)
    router.refresh()
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  }

  const exportToPDF = async () => {
    try {
      const response = await fetch(`/api/synopsis/${synopsis.id}/export?format=csv`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${synopsis.title.replace(/[^a-zA-Z0-9]/g, '_')}_color_synopsis.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const exportToExcel = async () => {
    try {
      const response = await fetch(`/api/synopsis/${synopsis.id}/export?format=excel`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${synopsis.title.replace(/[^a-zA-Z0-9]/g, '_')}_color_synopsis.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const groupedEntries = synopsis.entries.reduce((acc: any, entry: any) => {
    if (!acc[entry.room.name]) {
      acc[entry.room.name] = []
    }
    acc[entry.room.name].push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/synopsis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Synopsis
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{synopsis.title}</h1>
          <div className="flex items-center gap-4 mt-1 text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{synopsis.project.name} - {synopsis.project.clientName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(synopsis.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AddColorSpecDialog
            synopsisId={synopsis.id}
            projectId={synopsis.project.id}
            onSpecAdded={handleSpecAdded}
          >
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Color Spec
            </Button>
          </AddColorSpecDialog>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <EditSynopsisDialog synopsis={synopsis} />
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Client</p>
              <p className="text-gray-900">{synopsis.project.clientName}</p>
              {synopsis.project.clientEmail && (
                <p className="text-sm text-gray-600">{synopsis.project.clientEmail}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Project</p>
              <p className="text-gray-900">{synopsis.project.name}</p>
              <p className="text-sm text-gray-600">{synopsis.project.description}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p className="text-gray-900">{synopsis.project.address || "Not specified"}</p>
            </div>
          </div>
          {synopsis.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Synopsis Notes</p>
                <p className="text-gray-900">{synopsis.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Color Specifications by Room */}
      {Object.entries(groupedEntries).map(([roomName, entries]) => {
        const roomEntries = entries as any[]
        return (
        <Card key={roomName}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {roomName}
            </CardTitle>
            <CardDescription>
              {roomEntries.length} color specification{roomEntries.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Product & Sheen</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomEntries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="capitalize">
                        {entry.surfaceType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: entry.color.hexColor || '#f3f4f6' }}
                        />
                        <div>
                          <p className="font-medium">{entry.color.name}</p>
                          <p className="text-sm text-gray-600">{entry.color.manufacturer}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{entry.productLine}</p>
                        <p className="text-sm text-gray-600">{entry.sheen}</p>
                      </div>
                    </TableCell>
                    <TableCell>{entry.surfaceArea || '-'}</TableCell>
                    <TableCell>{entry.quantity || '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate">
                        {entry.notes || '-'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )
      })}

      {synopsis.entries.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Palette className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No color specifications yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add color specifications manually or generate them from photo annotations
              </p>
              <AddColorSpecDialog
                synopsisId={synopsis.id}
                projectId={synopsis.project.id}
                onSpecAdded={handleSpecAdded}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
