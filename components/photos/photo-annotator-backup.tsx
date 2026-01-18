
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  ArrowLeft,
  Tag,
  Loader2,
  Search,
  Palette,
  Edit,
  Plus
} from "lucide-react"
import Link from "next/link"
import { DrawingCanvas } from "./drawing-canvas"
import { AnnotationToolbar } from "./annotation-toolbar"
import { AddCustomColorDialog } from "@/components/colors/add-custom-color-dialog"
import { SURFACE_TYPES, PRODUCT_LINES, SHEEN_OPTIONS } from "@/lib/types"
import toast from "react-hot-toast"

interface PhotoAnnotatorProps {
  photo: any
  rooms?: any[]
  colors?: any[]
}

interface AnnotationTool {
  type: 'pen' | 'text' | 'colorTag'
  color: string
  strokeWidth: number
  opacity: number
}

interface DrawingAction {
  type: 'draw' | 'clear'
  data?: any
}

interface Point {
  x: number
  y: number
}

export function PhotoAnnotator({ photo, rooms = [], colors: initialColors = [] }: PhotoAnnotatorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>({
    type: 'pen',
    color: '#dc2626',
    strokeWidth: 3,
    opacity: 1
  })
  const [annotations, setAnnotations] = useState<any[]>(photo.annotations || [])
  const [colors, setColors] = useState<any[]>(initialColors)
  const [selectedColorId, setSelectedColorId] = useState("")
  const [selectedSurface, setSelectedSurface] = useState("")
  const [selectedProductLine, setSelectedProductLine] = useState("")
  const [selectedSheen, setSelectedSheen] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState(photo.roomId || "")
  const [annotationNotes, setAnnotationNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [colorSearch, setColorSearch] = useState("")
  const [undoStack, setUndoStack] = useState<DrawingAction[]>([])
  const [redoStack, setRedoStack] = useState<DrawingAction[]>([])
  const [showColorCatalog, setShowColorCatalog] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [showTextDialog, setShowTextDialog] = useState(false)
  const [pendingTextData, setPendingTextData] = useState<any>(null)
  const [editingAnnotation, setEditingAnnotation] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    colorId: '',
    surfaceType: '',
    productLine: '',
    sheen: '',
    notes: '',
    roomId: ''
  })
  const [isSavingAnnotatedPhoto, setIsSavingAnnotatedPhoto] = useState(false)

  // Product lines and sheens are now independent of color selection
  // They can be selected for any color

  // Function to refresh annotations from server
  const refreshAnnotations = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/annotations`)
      if (response.ok) {
        const fetchedAnnotations = await response.json()
        console.log("Refreshed annotations from server:", fetchedAnnotations)
        setAnnotations(fetchedAnnotations)
      }
    } catch (error) {
      console.error("Failed to refresh annotations:", error)
    }
  }

  // Function to refresh colors from server and optionally select a new color
  const refreshColors = async (selectLatest: boolean = false) => {
    try {
      const response = await fetch('/api/colors')
      if (response.ok) {
        const fetchedColors = await response.json()
        setColors(fetchedColors)
        
        // If selectLatest is true, select the most recently added color
        if (selectLatest && fetchedColors.length > 0) {
          // Find the color with the most recent creation date
          const sortedByDate = [...fetchedColors].sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          const latestColor = sortedByDate[0]
          setSelectedColorId(latestColor.id)
          toast.success(`Color "${latestColor.name}" selected for annotation`)
        }
      }
    } catch (error) {
      console.error("Failed to refresh colors:", error)
    }
  }

  const handleColorAdded = () => {
    refreshColors(true) // Refresh and auto-select the new color
  }

  // Sort colors by manufacturer and name
  const sortedColors = [...colors].sort((a, b) => {
    if (a.manufacturer !== b.manufacturer) {
      return a.manufacturer.localeCompare(b.manufacturer)
    }
    return a.name.localeCompare(b.name)
  })

  // Filter colors based on search
  const filteredColors = sortedColors.filter(color => {
    const searchTerm = colorSearch.toLowerCase()
    return (
      color.name.toLowerCase().includes(searchTerm) ||
      color.colorCode.toLowerCase().includes(searchTerm) ||
      color.manufacturer.toLowerCase().includes(searchTerm)
    )
  })

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const response = await fetch(`/api/photos/${photo.id}/url`)
        if (response.ok) {
          const data = await response.json()
          setImageUrl(data.url)
        }
      } catch (error) {
        console.error("Failed to fetch image URL:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [photo.id])

  const handleSaveAnnotation = async (annotationData: any) => {
    try {
      console.log("Creating annotation:", { 
        type: currentTool.type, 
        data: annotationData, 
        surfaceType: selectedSurface, 
        colorId: selectedColorId,
        photoId: photo.id 
      })

      const response = await fetch(`/api/photos/${photo.id}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: currentTool.type,
          data: annotationData,
          surfaceType: selectedSurface || undefined,
          colorId: selectedColorId || undefined,
          productLine: selectedProductLine || undefined,
          sheen: selectedSheen || undefined,
          notes: annotationNotes || undefined,
          roomId: selectedRoomId || undefined
        })
      })

      if (response.ok) {
        const newAnnotation = await response.json()
        console.log("New annotation created with ID:", newAnnotation.id, newAnnotation)
        
        if (newAnnotation.id) {
          setAnnotations(prev => [...prev, newAnnotation])
          
          // Show appropriate success message
          if (!selectedColorId || !selectedSurface) {
            toast.success("Annotation saved! Add color and surface details in the panel")
          } else {
            toast.success("Annotation saved successfully")
          }
          
          // Reset form
          setAnnotationNotes("")
          
          // Add to undo stack
          setUndoStack(prev => [...prev, { type: 'draw', data: newAnnotation }])
          setRedoStack([])
        } else {
          console.error("New annotation missing ID:", newAnnotation)
          toast.error("Annotation saved but missing ID - please refresh page")
        }
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || 'Unknown error'
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
        }
        console.error("Failed to save annotation:", errorMessage)
        toast.error(`Failed to save annotation: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Error saving annotation:", error)
      toast.error("Error saving annotation")
    }
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!annotationId || annotationId === 'undefined' || annotationId === 'null') {
      toast.error("Cannot delete annotation: Invalid ID")
      console.error("Attempting to delete annotation with invalid ID:", annotationId)
      return
    }

    const annotationToDelete = annotations.find(a => a.id === annotationId)
    if (!annotationToDelete) {
      toast.error("Annotation not found in current state")
      console.error("Annotation not found in state:", annotationId, "Available annotations:", annotations.map(a => ({ id: a.id, type: a.type })))
      await refreshAnnotations()
      return
    }

    try {
      console.log("Deleting annotation:", { 
        id: annotationId, 
        type: annotationToDelete.type, 
        photoId: photo.id,
        annotation: annotationToDelete 
      })
      
      const response = await fetch(`/api/photos/${photo.id}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log("Delete response status:", response.status)

      if (response.ok) {
        setAnnotations(prev => {
          const updated = prev.filter(a => a.id !== annotationId)
          console.log("Annotations after deletion:", updated.length, "remaining")
          return updated
        })
        
        toast.success("Annotation deleted")
        
        setUndoStack(prev => [...prev, { type: 'clear', data: annotationToDelete }])
        setRedoStack([])
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || 'Unknown error'
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
        }
        console.error("Delete annotation failed:", {
          status: response.status,
          statusText: response.statusText,
          errorMessage
        })
        toast.error(`Failed to delete annotation: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Error deleting annotation:", error)
      toast.error("Error deleting annotation")
    }
  }

  const handleSaveAnnotatedPhoto = async () => {
    if (annotations.length === 0) {
      toast.error("No annotations to save")
      return
    }

    setIsSavingAnnotatedPhoto(true)
    
    try {
      // Create a canvas to combine the image with annotations
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error("Failed to get canvas context")
      }

      // Load the base image
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl!
      })

      // Set canvas size to match image
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      // Draw the base image
      ctx.drawImage(img, 0, 0)

      // Draw all annotations on top
      annotations.forEach((annotation) => {
        if (annotation.type === 'drawing' && annotation.data.paths) {
          ctx.strokeStyle = annotation.data.color || '#dc2626'
          ctx.lineWidth = annotation.data.strokeWidth || 3
          ctx.globalAlpha = annotation.data.opacity || 1
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          annotation.data.paths.forEach((path: Point[]) => {
            if (path.length > 0) {
              ctx.beginPath()
              ctx.moveTo(path[0].x, path[0].y)
              
              for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y)
              }
              
              ctx.stroke()
            }
          })

          ctx.globalAlpha = 1
        } else if (annotation.type === 'text' && annotation.data.text) {
          ctx.fillStyle = annotation.data.color || '#dc2626'
          ctx.font = `${annotation.data.fontSize || 20}px Arial`
          ctx.globalAlpha = annotation.data.opacity || 1
          ctx.fillText(annotation.data.text, annotation.data.x, annotation.data.y)
          ctx.globalAlpha = 1
        } else if (annotation.type === 'color_tag') {
          const x = annotation.data.x
          const y = annotation.data.y
          const color = annotation.color?.hexColor || '#dc2626'
          
          // Draw circle
          ctx.fillStyle = color
          ctx.globalAlpha = 0.8
          ctx.beginPath()
          ctx.arc(x, y, 15, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw border
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.globalAlpha = 1
          ctx.stroke()
          
          // Draw label if color info exists
          if (annotation.color) {
            ctx.fillStyle = '#000000'
            ctx.globalAlpha = 0.7
            ctx.fillRect(x + 20, y - 15, 150, 30)
            
            ctx.fillStyle = '#ffffff'
            ctx.globalAlpha = 1
            ctx.font = '12px Arial'
            ctx.fillText(`${annotation.color.colorCode}`, x + 25, y + 5)
          }
        }
      })

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error("Failed to create blob"))
        }, 'image/jpeg', 0.95)
      })

      // Upload the annotated photo
      const formData = new FormData()
      formData.append('file', blob, `annotated-${photo.originalFilename}`)

      const response = await fetch(`/api/photos/${photo.id}/save-annotated`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        toast.success("Annotated photo saved successfully!")
      } else {
        const errorData = await response.json()
        toast.error(`Failed to save: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error saving annotated photo:", error)
      toast.error("Failed to save annotated photo")
    } finally {
      setIsSavingAnnotatedPhoto(false)
    }
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    
    const lastAction = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, lastAction])
    
    if (lastAction.type === 'draw') {
      setAnnotations(prev => prev.filter(a => a.id !== lastAction.data.id))
    } else if (lastAction.type === 'clear') {
      setAnnotations(prev => [...prev, lastAction.data])
    }
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    
    const nextAction = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, nextAction])
    
    if (nextAction.type === 'draw') {
      setAnnotations(prev => [...prev, nextAction.data])
    } else if (nextAction.type === 'clear') {
      setAnnotations(prev => prev.filter(a => a.id !== nextAction.data.id))
    }
  }

  const handleClearAll = () => {
    if (annotations.length === 0) return
    
    setUndoStack(prev => [...prev, { type: 'clear', data: [...annotations] }])
    setRedoStack([])
    setAnnotations([])
    toast.success("All annotations cleared")
  }

  const handleSelectColorFromCatalog = (colorId: string) => {
    setSelectedColorId(colorId)
    setShowColorCatalog(false)
    toast.success("Color selected")
  }

  const handleTextAnnotationRequest = (textData: any) => {
    setPendingTextData(textData)
    setTextInput("")
    setShowTextDialog(true)
  }

  const handleTextAnnotationSubmit = () => {
    if (textInput.trim() && pendingTextData) {
      handleSaveAnnotation({
        ...pendingTextData,
        text: textInput.trim()
      })
      setShowTextDialog(false)
      setPendingTextData(null)
      setTextInput("")
    }
  }

  const handleEditAnnotation = (annotation: any) => {
    setEditingAnnotation(annotation)
    setEditForm({
      colorId: annotation.colorId || '',
      surfaceType: annotation.surfaceType || '',
      productLine: annotation.productLine || '',
      sheen: annotation.sheen || '',
      notes: annotation.notes || '',
      roomId: annotation.roomId || ''
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingAnnotation) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/annotations/${editingAnnotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const updatedAnnotation = await response.json()
        setAnnotations(prev => prev.map(ann => 
          ann.id === editingAnnotation.id ? updatedAnnotation : ann
        ))
        setShowEditDialog(false)
        toast.success("Annotation updated successfully")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update annotation")
      }
    } catch (error) {
      console.error("Error updating annotation:", error)
      toast.error("Error updating annotation")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading photo...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/photos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Gallery
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Annotate Photo
              </h1>
              <p className="text-sm text-gray-600">
                {photo.originalFilename} • {photo.project.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {annotations.length} annotations
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveAnnotatedPhoto}
              disabled={isSavingAnnotatedPhoto || annotations.length === 0}
              title={annotations.length === 0 ? "Add annotations first" : "Save annotated photo as preview"}
            >
              {isSavingAnnotatedPhoto ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save as Preview
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={refreshAnnotations}>
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* Annotation Toolbar */}
          <Card>
            <CardContent className="p-4">
              <AnnotationToolbar 
                currentTool={currentTool}
                onToolChange={setCurrentTool}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClearAll}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                canClear={annotations.length > 0}
              />
            </CardContent>
          </Card>

          {/* Main Content Area: Photo on left, Details on right */}
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Drawing Canvas */}
            <Card>
              <CardContent className="p-0">
                {imageUrl ? (
                  <DrawingCanvas
                    imageUrl={imageUrl}
                    tool={currentTool}
                    annotations={annotations}
                    onAnnotationCreate={handleSaveAnnotation}
                    onTextAnnotationRequest={handleTextAnnotationRequest}
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Failed to load image</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Annotation Details Panel - Right side */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Annotation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info message */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  Draw or place tags first, then add color and surface details here
                </div>

                {/* Color Selection with Browse and Add Custom Color Buttons */}
                <div className="space-y-2">
                  <Label htmlFor="colorId">Color (Optional)</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedColorId} onValueChange={setSelectedColorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {sortedColors.slice(0, 20).map(color => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded border"
                                  style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
                                />
                                <span className="text-sm">{color.name} ({color.manufacturer})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => setShowColorCatalog(true)}
                      title="Browse color catalog"
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                    <AddCustomColorDialog onColorAdded={handleColorAdded}>
                      <Button 
                        type="button"
                        variant="outline"
                        title="Add custom color"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </AddCustomColorDialog>
                  </div>
                  {selectedColorId && (
                    <div className="mt-2">
                      {(() => {
                        const selectedColor = colors.find(c => c.id === selectedColorId)
                        return selectedColor ? (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <div
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: selectedColor.hexColor || '#f3f4f6' }}
                            />
                            <div>
                              <p className="text-sm font-medium">{selectedColor.name}</p>
                              <p className="text-xs text-gray-500">{selectedColor.manufacturer} • {selectedColor.colorCode}</p>
                            </div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>

                {/* Room Selection */}
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room (Optional)</Label>
                  <Select value={selectedRoomId || "none"} onValueChange={(val) => setSelectedRoomId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Line Selection - Independent of color */}
                <div className="space-y-2">
                  <Label htmlFor="productLine">Product Line (Optional)</Label>
                  <Select value={selectedProductLine || "none"} onValueChange={(val) => setSelectedProductLine(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product line..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {PRODUCT_LINES.map(productLine => (
                        <SelectItem key={productLine} value={productLine}>
                          {productLine}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sheen Selection - Independent of color and product line */}
                <div className="space-y-2">
                  <Label htmlFor="sheen">Sheen (Optional)</Label>
                  <Select value={selectedSheen || "none"} onValueChange={(val) => setSelectedSheen(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sheen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SHEEN_OPTIONS.map((sheen: string) => (
                        <SelectItem key={sheen} value={sheen}>
                          {sheen}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surface">Surface Type (Optional)</Label>
                  <Select value={selectedSurface} onValueChange={setSelectedSurface}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select surface..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SURFACE_TYPES.map(surface => (
                        <SelectItem key={surface} value={surface}>
                          {surface.charAt(0).toUpperCase() + surface.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this annotation..."
                    value={annotationNotes}
                    onChange={(e) => setAnnotationNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Photo Info */}
                <div className="pt-4 border-t space-y-3">
                  <h3 className="font-medium text-sm">Photo Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Project</Label>
                      <p className="text-sm">{photo.project.name}</p>
                    </div>
                    
                    {photo.room && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Room</Label>
                        <p className="text-sm">{photo.room.name}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Client</Label>
                      <p className="text-sm">{photo.project.clientName}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Annotations - Full width below */}
          {annotations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Annotations Summary ({annotations.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={refreshAnnotations} title="Refresh annotations">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {annotations.map((annotation, index) => (
                    <div key={annotation.id || index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {annotation.color?.name || 'No Color'}
                          </Badge>
                          {(!annotation.colorId || !annotation.surfaceType) && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              Incomplete
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {annotation.id && annotation.id !== 'undefined' ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditAnnotation(annotation)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit annotation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteAnnotation(annotation.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete annotation"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled
                              title="Cannot edit/delete - annotation not saved"
                              className="text-gray-400"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {annotation.room && (
                          <p><span className="font-medium">Room:</span> {annotation.room.name}</p>
                        )}
                        {annotation.productLine && (
                          <p><span className="font-medium">Product Line:</span> {annotation.productLine}</p>
                        )}
                        {annotation.sheen && (
                          <p><span className="font-medium">Sheen:</span> {annotation.sheen}</p>
                        )}
                        <p><span className="font-medium">Surface:</span> {annotation.surfaceType || 'Not specified'}</p>
                        {annotation.notes && (
                          <p className="mt-1"><span className="font-medium">Notes:</span> {annotation.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Color Catalog Dialog */}
      <Dialog open={showColorCatalog} onOpenChange={setShowColorCatalog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Browse Color Catalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, code, or manufacturer..."
                value={colorSearch}
                onChange={(e) => setColorSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Color Grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredColors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => handleSelectColorFromCatalog(color.id)}
                    className={`p-3 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                      selectedColorId === color.id 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      className="w-full h-16 rounded mb-2 border"
                      style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
                    />
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{color.name}</h4>
                    <p className="text-xs text-gray-600">{color.colorCode}</p>
                    <p className="text-xs text-gray-500">{color.manufacturer}</p>
                  </button>
                ))}
              </div>
              {filteredColors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No colors found matching "{colorSearch}"
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowColorCatalog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Input Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Text Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="textInput">Enter text</Label>
              <Textarea
                id="textInput"
                placeholder="Type your annotation text..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTextAnnotationSubmit()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTextDialog(false)
                  setPendingTextData(null)
                  setTextInput("")
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTextAnnotationSubmit}
                disabled={!textInput.trim()}
              >
                Add Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Annotation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editColor">Color</Label>
              <Select 
                value={editForm.colorId} 
                onValueChange={(value) => {
                  setEditForm(prev => ({ ...prev, colorId: value, productLine: '', sheen: '' }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sortedColors.map(color => (
                    <SelectItem key={color.id} value={color.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
                        />
                        <span className="text-sm">{color.name} - {color.manufacturer}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Selection for Edit Dialog */}
            <div className="space-y-2">
              <Label htmlFor="editRoom">Room (Optional)</Label>
              <Select 
                value={editForm.roomId || "none"} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, roomId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Line Selection for Edit Dialog - Independent */}
            <div className="space-y-2">
              <Label htmlFor="editProductLine">Product Line (Optional)</Label>
              <Select 
                value={editForm.productLine || "none"} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, productLine: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product line..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {PRODUCT_LINES.map(productLine => (
                    <SelectItem key={productLine} value={productLine}>
                      {productLine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sheen Selection for Edit Dialog - Independent */}
            <div className="space-y-2">
              <Label htmlFor="editSheen">Sheen (Optional)</Label>
              <Select 
                value={editForm.sheen || "none"} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, sheen: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sheen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SHEEN_OPTIONS.map((sheen: string) => (
                    <SelectItem key={sheen} value={sheen}>
                      {sheen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSurface">Surface Type</Label>
              <Select 
                value={editForm.surfaceType} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, surfaceType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select surface..." />
                </SelectTrigger>
                <SelectContent>
                  {SURFACE_TYPES.map(surface => (
                    <SelectItem key={surface} value={surface}>
                      {surface.charAt(0).toUpperCase() + surface.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Additional notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
