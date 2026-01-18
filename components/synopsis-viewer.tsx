
"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, FileText, Loader2, RefreshCw, ImageIcon, FileDown } from "lucide-react"
import { toast } from "react-hot-toast"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface SynopsisViewerProps {
  projectId: string
}

interface SynopsisData {
  project: {
    id: string
    name: string
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    address: string | null
  }
  colorSummary: {
    trim: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[] }>
    ceilings: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[] }>
    walls: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[] }>
  }
  roomData: Array<{
    roomName: string
    surfaces: Array<{
      surfaceType: string
      surfaceArea?: string
      colorCode: string
      colorName: string
      productLine: string
      sheen: string
      notes?: string
      photos: Array<{
        id: string
        cloudStoragePath: string
        fileName: string
      }>
    }>
  }>
}

export function SynopsisViewer({ projectId }: SynopsisViewerProps) {
  const [synopsis, setSynopsis] = useState<SynopsisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; fileName: string } | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const synopsisRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSynopsis()
  }, [projectId])

  const loadSynopsis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/synopsis/generate`, {
        method: "POST"
      })

      if (!response.ok) {
        throw new Error("Failed to generate synopsis")
      }

      const data = await response.json()
      setSynopsis(data)

      // Collect all unique photo IDs
      const photoIds = new Set<string>()
      data.roomData?.forEach((room: any) => {
        room.surfaces?.forEach((surface: any) => {
          surface.photos?.forEach((photo: any) => {
            photoIds.add(photo.id)
          })
        })
      })

      // Fetch signed URLs for all photos
      if (photoIds.size > 0) {
        await loadPhotoUrls(Array.from(photoIds))
      }
    } catch (error) {
      console.error("Error loading synopsis:", error)
      toast.error("Failed to load synopsis")
    } finally {
      setLoading(false)
    }
  }

  const loadPhotoUrls = async (photoIds: string[]) => {
    try {
      const urlMap = new Map<string, string>()
      
      // Fetch signed URLs for each photo
      await Promise.all(
        photoIds.map(async (photoId) => {
          try {
            const response = await fetch(`/api/photos/${photoId}/url`)
            if (response.ok) {
              const { url } = await response.json()
              urlMap.set(photoId, url)
            }
          } catch (err) {
            console.error(`Error loading URL for photo ${photoId}:`, err)
          }
        })
      )
      
      setPhotoUrls(urlMap)
    } catch (error) {
      console.error("Error loading photo URLs:", error)
    }
  }

  const handleExport = async () => {
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
      a.download = `${synopsis?.project.clientName}_Color_Synopsis.docx`.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
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

  const convertImageToBase64 = async (photoId: string): Promise<string> => {
    try {
      // Use server-side API to convert image to base64 (avoids CORS issues)
      const response = await fetch(`/api/photos/${photoId}/base64`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const { base64 } = await response.json()
      console.log('Base64 conversion successful, length:', base64?.length || 0)
      return base64 || ''
    } catch (error) {
      console.error('Error converting image to base64:', error)
      // Return empty string on error
      return ''
    }
  }

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true)
      toast('Preparing PDF export...', { icon: '📄' })

      if (!synopsisRef.current) {
        throw new Error("Synopsis content not found")
      }

      // Clone the element to avoid modifying the original
      const element = synopsisRef.current.cloneNode(true) as HTMLElement
      
      // Show hidden elements marked for PDF
      const pdfVisibleElements = element.querySelectorAll('[data-pdf-visible="true"]')
      pdfVisibleElements.forEach(el => {
        (el as HTMLElement).classList.remove('hidden')
      })
      
      // Remove all buttons (both with and without images)
      const buttons = element.querySelectorAll('button')
      buttons.forEach(btn => {
        // If button contains an image, extract the image first
        const imgs = btn.querySelectorAll('img')
        if (imgs.length > 0) {
          const parent = btn.parentElement
          if (parent) {
            // Replace button with its images in a container div
            const container = document.createElement('div')
            container.className = 'relative w-[102px] h-[102px] rounded overflow-hidden border-2 border-gray-200 flex-shrink-0'
            imgs.forEach(img => container.appendChild(img.cloneNode(true)))
            parent.replaceChild(container, btn)
          }
        } else {
          btn.remove()
        }
      })

      // Create a map of photo URLs to photo IDs from synopsis data
      const urlToPhotoId = new Map<string, string>()
      if (synopsis) {
        synopsis.roomData.forEach((room) => {
          room.surfaces.forEach((surface) => {
            surface.photos?.forEach((photo) => {
              const url = photoUrls.get(photo.id)
              if (url) {
                urlToPhotoId.set(url, photo.id)
              }
            })
          })
        })
      }

      // Find and convert all images to base64
      const images = element.querySelectorAll('img')
      console.log(`Found ${images.length} images to convert for PDF`)
      
      if (images.length > 0) {
        toast(`Converting ${images.length} images...`, { icon: '🖼️' })
        
        const conversionPromises = Array.from(images).map(async (img, index) => {
          // Get the actual displayed src
          let srcToConvert = img.src || img.getAttribute('src') || ''
          
          console.log(`Processing image ${index + 1}/${images.length}:`, srcToConvert)
          
          if (srcToConvert && !srcToConvert.startsWith('data:')) {
            try {
              // Find the photo ID for this URL
              const photoId = urlToPhotoId.get(srcToConvert)
              
              if (photoId) {
                // Use the server-side API to get base64
                const base64 = await convertImageToBase64(photoId)
                
                if (base64) {
                  img.setAttribute('src', base64)
                  img.removeAttribute('srcset')
                  img.removeAttribute('sizes')
                  
                  // Set explicit dimensions
                  const width = img.getAttribute('width') || '102'
                  const height = img.getAttribute('height') || '102'
                  img.style.width = `${width}px`
                  img.style.height = `${height}px`
                  img.style.objectFit = 'cover'
                  img.style.display = 'block'
                  
                  console.log(`✓ Converted image ${index + 1}`)
                  return true
                } else {
                  console.warn(`⚠ Empty base64 for image ${index + 1}`)
                  return false
                }
              } else {
                console.warn(`⚠ No photo ID found for image ${index + 1}`)
                return false
              }
            } catch (err) {
              console.error(`✗ Failed to convert image ${index + 1}:`, err)
              return false
            }
          } else if (srcToConvert.startsWith('data:')) {
            console.log(`✓ Image ${index + 1} already base64`)
            return true
          }
          
          return false
        })
        
        const results = await Promise.all(conversionPromises)
        const successCount = results.filter(Boolean).length
        console.log(`Successfully converted ${successCount}/${images.length} images`)
        
        if (successCount === 0 && images.length > 0) {
          throw new Error('Failed to convert any images. Please try again.')
        }
      }

      console.log('Generating PDF document...')
      toast('Rendering content to canvas...', { icon: '⏳' })

      // Prepare element for rendering with proper page dimensions
      // US Letter: 8.5" x 11" at 96 DPI = 816 x 1056 pixels
      const pageWidthPx = 816
      const pageHeightPx = 1056
      const marginPx = 48  // 0.5 inch margins
      const contentWidthPx = pageWidthPx - (marginPx * 2) // 720px
      
      element.style.width = `${contentWidthPx}px`
      element.style.padding = `${marginPx}px`
      element.style.backgroundColor = '#ffffff'
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.boxSizing = 'border-box'
      document.body.appendChild(element)

      try {
        // Render the element to canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 0,
          removeContainer: false,
          width: pageWidthPx,
          windowWidth: pageWidthPx
        })

        toast('Creating PDF...', { icon: '📄' })

        // Create PDF with same dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [pageWidthPx, pageHeightPx],
          compress: true
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const imgWidth = pageWidthPx
        const imgHeight = (canvas.height * pageWidthPx) / canvas.width
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(imgHeight / pageHeightPx)
        console.log(`PDF generation: ${totalPages} pages needed, canvas height: ${canvas.height}px, scaled height: ${imgHeight}px`)
        toast(`Generating ${totalPages} page(s)...`, { icon: '📄' })
        
        // Add pages using jsPDF's automatic pagination
        let heightLeft = imgHeight
        let position = 0
        let pageNum = 0
        
        while (heightLeft > 0) {
          if (pageNum > 0) {
            pdf.addPage()
            position = -(pageNum * pageHeightPx)
          }
          
          pdf.addImage(
            imgData,
            'JPEG',
            0,
            position,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'
          )
          
          heightLeft -= pageHeightPx
          pageNum++
          console.log(`Added page ${pageNum}/${totalPages}`)
        }

        // Download the PDF
        const filename = `${synopsis?.project.clientName}_Color_Synopsis.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        pdf.save(filename)

        toast.success("PDF exported successfully!")
      } finally {
        // Clean up: remove temporary element
        document.body.removeChild(element)
      }
    } catch (error: any) {
      console.error("Error exporting PDF:", error)
      const errorMessage = error?.message || 'Unknown error occurred'
      toast.error(`Failed to export PDF: ${errorMessage}`)
    } finally {
      setExportingPdf(false)
    }
  }

  if (loading) {
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
          <Button onClick={loadSynopsis} variant="outline">
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
              <Button onClick={loadSynopsis} variant="outline" disabled={loading}>
                {loading ? (
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
              <Button onClick={handleExportPdf} disabled={exportingPdf} variant="outline">
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
