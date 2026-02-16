
"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, FileText, Loader2, RefreshCw, ImageIcon, FileDown } from "lucide-react"
import { toast } from "react-hot-toast"
import { useSynopsis } from "@/hooks/use-synopsis"
import { usePdfExport } from "@/hooks/use-pdf-export"
import { usePhotoUrls } from "@/hooks/use-photo-urls"
import { SynopsisData } from "@/lib/synopsis-generator"

interface SynopsisViewerProps {
  projectId: string
}

export function SynopsisViewer({ projectId }: SynopsisViewerProps) {
  const { data: synopsis, isLoading, refetch, isRefetching } = useSynopsis(projectId)
  const photoUrls = usePhotoUrls(synopsis)
  const synopsisRef = useRef<HTMLDivElement>(null)
  
  const { exportPdf, isExporting: exportingPdf } = usePdfExport({ 
    synopsis: synopsis || null, 
    elementRef: synopsisRef, 
    photoUrls 
  })

  const [exporting, setExporting] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; fileName: string } | null>(null)

  const handleExport = async () => {
    if (!synopsis) return
    
    try {
      setExporting(true)
      const response = await fetch(`/api/projects/${projectId}/synopsis/export`)

      if (!response.ok) {
        throw new Error("Failed to export synopsis")
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${synopsis.project.clientName}_Color_Synopsis.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Synopsis exported successfully!")
    } catch (error) {
      console.error("Error exporting synopsis:", error)
      toast.error("Failed to export synopsis")
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!synopsis || (synopsis.colorSummary.trim.length === 0 && synopsis.colorSummary.ceilings.length === 0 && synopsis.colorSummary.walls.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Synopsis Data</CardTitle>
          <CardDescription>
            Add color annotations to your photos to generate a synopsis. Make sure to:
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Tag colors on your photos</li>
              <li>Select a surface type (Wall, Trim, Ceiling, etc.)</li>
              <li>Choose a product line and sheen</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Refresh Synopsis
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { project, colorSummary, roomData } = synopsis

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{project.clientName}</CardTitle>
              <CardDescription className="mt-2 space-y-1">
                {project.address && <div>{project.address}</div>}
                {project.clientEmail && <div>{project.clientEmail}</div>}
                {project.clientPhone && <div>{project.clientPhone}</div>}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" disabled={isLoading || isRefetching}>
                {isRefetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
              <Button onClick={exportPdf} disabled={exportingPdf} variant="outline">
                {exportingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export DOCX
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Synopsis Content - Wrapped for PDF Export */}
      <div ref={synopsisRef} className="space-y-6">
        {/* Client Header for PDF - Hidden on screen */}
        <Card className="hidden" data-pdf-visible="true">
          <CardHeader>
            <CardTitle className="text-2xl">{project.clientName}</CardTitle>
            <CardDescription className="mt-2 space-y-1">
              {project.address && <div>{project.address}</div>}
              {project.clientEmail && <div>{project.clientEmail}</div>}
              {project.clientPhone && <div>{project.clientPhone}</div>}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <p className="mb-4">
              Color Guru provides color consultations. Recommendations by Color Guru are suggestions only and do not warrant or guarantee clients satisfaction with their color choices, products, services, or workmanship. Client is solely responsible for all color choices, products, services and communications. Payments shall be made to Color Guru, are due at time of consultation, and are non-refundable.
            </p>
            <p className="italic">
              Thank you for choosing Color Guru, a guide through your paint journey.
            </p>
          </CardContent>
        </Card>

        {/* Color Summary */}
        <Card>
          <CardHeader>
            <CardTitle>SPECIFICATIONS</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table Headers */}
            <div className="grid grid-cols-[1fr,auto] gap-4 pb-3 border-b-2 mb-4">
              <div className="font-semibold text-base">Colors</div>
              <div className="font-semibold text-base">Products</div>
            </div>

            <div className="space-y-4">
              {colorSummary.trim.length > 0 && (
                <div className="border-b pb-4">
                  <div className="grid gap-2 grid-cols-[1fr,auto]">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">All Trim:</h4>
                      <div className="flex flex-wrap gap-2">
                        {colorSummary.trim.map((color, idx) => (
                          <span key={idx} className="text-sm">
                            {color.colorCode} {color.name}
                            {idx < colorSummary.trim.length - 1 && ","}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      {[...new Set(colorSummary.trim.flatMap(c => c.productLines))].map((pl, idx) => (
                        <div key={idx}>{pl}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {colorSummary.ceilings.length > 0 && (
                <div className="border-b pb-4">
                  <div className="grid gap-2 grid-cols-[1fr,auto]">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">All Ceilings:</h4>
                      <div className="flex flex-wrap gap-2">
                        {colorSummary.ceilings.map((color, idx) => (
                          <span key={idx} className="text-sm">
                            {color.colorCode} {color.name}
                            {idx < colorSummary.ceilings.length - 1 && ","}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      {[...new Set(colorSummary.ceilings.flatMap(c => c.productLines))].map((pl, idx) => (
                        <div key={idx}>{pl}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {colorSummary.walls.length > 0 && (
                <div className="pb-2">
                  <div className="grid gap-2 grid-cols-[1fr,auto]">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Walls:</h4>
                      <div className="flex flex-wrap gap-2">
                        {colorSummary.walls.map((color, idx) => (
                          <span key={idx} className="text-sm">
                            {color.colorCode} {color.name}
                            {idx < colorSummary.walls.length - 1 && ","}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      {[...new Set(colorSummary.walls.flatMap(c => c.productLines))].map((pl, idx) => (
                        <div key={idx}>{pl}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Room-by-Room Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Room-by-Room Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {roomData.map((room, idx) => (
              <div key={idx} className="border rounded-lg p-3 sm:p-4 space-y-3">
                <h4 className="font-semibold text-sm sm:text-base">{room.roomName}</h4>
                <div className="space-y-4">
                  {room.surfaces.map((surface, surfaceIdx) => (
                    <div key={surfaceIdx} className="flex flex-col sm:flex-row gap-3">
                      {/* Text Information */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm leading-tight">
                          {surface.colorCode}
                        </div>
                        <div className="font-medium text-xs sm:text-sm leading-tight">
                          {surface.colorName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {surface.productLine}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {surface.sheen}
                        </div>
                        {surface.notes && (
                          <div className="text-xs text-gray-700 mt-1 italic">
                            {surface.notes}
                          </div>
                        )}
                      </div>
                      
                      {/* Photo Thumbnails */}
                      {surface.photos && surface.photos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:justify-end content-start">
                          {surface.photos.map((photo) => {
                            const photoUrl = photoUrls.get(photo.id)
                            if (!photoUrl) return null
                            
                            return (
                              <button
                                key={photo.id}
                                onClick={() => setSelectedPhoto({ url: photoUrl, fileName: photo.fileName })}
                                className="relative w-20 h-20 sm:w-[102px] sm:h-[102px] rounded overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors cursor-pointer group flex-shrink-0"
                                title={`View ${photo.fileName}`}
                              >
                                <Image
                                  src={photoUrl}
                                  alt={photo.fileName}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 80px, 102px"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.fileName}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.fileName}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
