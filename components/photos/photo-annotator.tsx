
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Tag,
  Loader2,
  Search,
  Palette,
  Edit,
  Plus,
  Copy,
  TrendingUp,
  Clock,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DrawingCanvas } from "./drawing-canvas"
import { AnnotationToolbar } from "./annotation-toolbar"
import { DraggableZoomControls } from "./draggable-zoom-controls"
import { AddCustomColorDialog } from "@/components/colors/add-custom-color-dialog"
import { QuickAddRoom } from "@/components/projects/quick-add-room"
import { RecentColorsPicker } from "@/components/colors/recent-colors-picker"
import { FavoritesSection } from "@/components/colors/favorites-section"
import { SURFACE_TYPES, PRODUCT_LINES, SHEEN_OPTIONS } from "@/lib/types"
import { addRecentColor } from "@/lib/recent-colors"
import toast from "react-hot-toast"
import Fuse from 'fuse.js'

interface PhotoAnnotatorProps {
  photo: any
  rooms?: any[]
  colors?: any[]
  allProjectPhotos?: any[]
  currentPhotoIndex?: number
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

export function PhotoAnnotator({ 
  photo, 
  rooms: initialRooms = [], 
  colors: initialColors = [],
  allProjectPhotos = [],
  currentPhotoIndex = 0
}: PhotoAnnotatorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTool, setCurrentTool] = useState<AnnotationTool>({
    type: 'pen',
    color: '#dc2626',
    strokeWidth: 3,
    opacity: 1
  })
  const [annotations, setAnnotations] = useState<any[]>(photo.annotations || [])
  const [rooms, setRooms] = useState<any[]>(initialRooms)
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
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [annotationSuggestions, setAnnotationSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [aiSuggestions, setAISuggestions] = useState<any[]>([])
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false)
  const [showAISuggestionsDialog, setShowAISuggestionsDialog] = useState(false)
  const [ralphQuote, setRalphQuote] = useState("")
  const [zoomLevel, setZoomLevel] = useState(100) // Zoom percentage: 50% to 200%
  const [editForm, setEditForm] = useState({
    colorId: '',
    surfaceType: '',
    productLine: '',
    sheen: '',
    notes: '',
    roomId: ''
  })
  
  // Highlighted annotation tracking
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null)

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Start with sidebar closed on mobile, open on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 // lg breakpoint
    }
    return true
  })
  
  // Mobile annotation dialog state
  const [showMobileAnnotationDialog, setShowMobileAnnotationDialog] = useState(false)
  const [mobileAnnotationReady, setMobileAnnotationReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Router for navigation
  const router = useRouter()

  // Navigation helpers
  const hasPreviousPhoto = currentPhotoIndex > 0
  const hasNextPhoto = currentPhotoIndex < allProjectPhotos.length - 1

  const navigateToPhoto = (index: number) => {
    if (index >= 0 && index < allProjectPhotos.length) {
      const targetPhoto = allProjectPhotos[index]
      router.push(`/dashboard/photos/${targetPhoto.id}/annotate`)
    }
  }

  const handlePreviousPhoto = () => {
    if (hasPreviousPhoto) {
      navigateToPhoto(currentPhotoIndex - 1)
    }
  }

  const handleNextPhoto = () => {
    if (hasNextPhoto) {
      navigateToPhoto(currentPhotoIndex + 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if not focused on an input element
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return
      }

      if (e.key === 'ArrowLeft' && hasPreviousPhoto) {
        handlePreviousPhoto()
      } else if (e.key === 'ArrowRight' && hasNextPhoto) {
        handleNextPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPhotoIndex, allProjectPhotos])
  const [returnToMobileDialog, setReturnToMobileDialog] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null)
  
  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sort colors by manufacturer and name
  const sortedColors = [...colors].sort((a, b) => {
    if (a.manufacturer !== b.manufacturer) {
      return a.manufacturer.localeCompare(b.manufacturer)
    }
    return a.name.localeCompare(b.name)
  })

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(sortedColors, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'colorCode', weight: 1.5 },
        { name: 'manufacturer', weight: 1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    })
  }, [sortedColors])

  // Filter colors based on search with fuzzy matching
  const filteredColors = useMemo(() => {
    if (!colorSearch.trim()) {
      return sortedColors
    }
    const results = fuse.search(colorSearch)
    return results.map(result => result.item)
  }, [colorSearch, fuse, sortedColors])

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

  // Function to refresh colors from server
  const refreshColors = async (selectLatest: boolean = false) => {
    try {
      const response = await fetch('/api/colors')
      if (response.ok) {
        const fetchedColors = await response.json()
        setColors(fetchedColors)
        
        if (selectLatest && fetchedColors.length > 0) {
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
    refreshColors(true)
  }

  // Function to refresh rooms from server
  const refreshRooms = async () => {
    try {
      const response = await fetch(`/api/projects/${photo.projectId}/rooms`)
      if (response.ok) {
        const fetchedRooms = await response.json()
        setRooms(fetchedRooms)
      }
    } catch (error) {
      console.error("Failed to refresh rooms:", error)
    }
  }

  const handleRoomAdded = (newRoomId: string) => {
    refreshRooms()
    setSelectedRoomId(newRoomId)
  }

  // Function to load annotation suggestions
  const loadAnnotationSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const response = await fetch(`/api/projects/${photo.projectId}/annotation-suggestions`)
      if (response.ok) {
        const data = await response.json()
        setAnnotationSuggestions(data.suggestions || [])
      } else {
        toast.error("Failed to load annotation suggestions")
      }
    } catch (error) {
      console.error("Error loading suggestions:", error)
      toast.error("Failed to load annotation suggestions")
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // Function to copy from a suggestion
  const handleCopyFromSuggestion = (suggestion: any) => {
    setSelectedColorId(suggestion.colorId)
    setSelectedSurface(suggestion.surfaceType)
    setSelectedProductLine(suggestion.productLine)
    setSelectedSheen(suggestion.sheen)
    if (suggestion.roomId) {
      setSelectedRoomId(suggestion.roomId)
    }
    setShowCopyDialog(false)
    toast.success(`Copied: ${suggestion.colorName} - ${suggestion.surfaceType}`, {
      duration: 4000
    })
  }

  // Function to open copy dialog
  const handleOpenCopyDialog = () => {
    setShowCopyDialog(true)
    loadAnnotationSuggestions()
  }

  // Get AI color suggestions
  const handleGetAISuggestions = async () => {
    setLoadingAISuggestions(true)
    try {
      const context = {
        roomType: photo.room?.roomType || photo.room?.name || "General",
        roomSubtype: photo.room?.subType,
        existingColors: annotations
          .filter(a => a.color)
          .map(a => ({
            colorCode: a.color.colorCode,
            colorName: a.color.name,
            surfaceType: a.surfaceType
          })),
        propertyType: photo.project?.property?.type
      }

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })

      if (response.ok) {
        const data = await response.json()
        setAISuggestions(data.suggestions)
        setRalphQuote(data.ralphQuote)
        setShowAISuggestionsDialog(true)
      } else if (response.status === 429) {
        toast.error("Rate limit exceeded. Try again in an hour!")
      } else if (response.status === 402) {
        const data = await response.json()
        toast.error("AI budget exceeded. Upgrade your plan!")
        // Still show fallback suggestions if available
        if (data.suggestions) {
          setAISuggestions(data.suggestions)
          setRalphQuote(data.ralphQuote || "Here are some basic suggestions!")
          setShowAISuggestionsDialog(true)
        }
      } else {
        toast.error("Couldn't get AI suggestions right now")
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error)
      toast.error("Failed to get AI suggestions")
    } finally {
      setLoadingAISuggestions(false)
    }
  }

  // Apply AI suggestion
  const handleApplyAISuggestion = async (suggestion: any) => {
    // Find the color in the colors list
    let colorId = colors.find(c => c.colorCode === suggestion.colorCode)?.id

    // If color doesn't exist, we need to add it
    if (!colorId) {
      toast.error(`Color ${suggestion.colorCode} not found in catalog. Please add it first.`)
      return
    }

    // Apply the suggestion
    setSelectedColorId(colorId)
    setSelectedSurface(suggestion.surfaceType)
    setShowAISuggestionsDialog(false)
    toast.success(`Applied: ${suggestion.colorName} - ${suggestion.surfaceType}`)
  }

  // Zoom control functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50))
  }

  const handleResetZoom = () => {
    setZoomLevel(100)
  }
  
  // Handle tool change with mobile annotation dialog
  const handleToolChange = (newTool: AnnotationTool) => {
    // On mobile, when switching to tag tool, show the annotation dialog first
    if (isMobile && newTool.type === 'colorTag' && currentTool.type !== 'colorTag') {
      setShowMobileAnnotationDialog(true)
      setMobileAnnotationReady(false)
    } else {
      setCurrentTool(newTool)
    }
  }
  
  // Apply mobile annotation details and activate tag tool
  const handleApplyMobileAnnotation = () => {
    setShowMobileAnnotationDialog(false)
    setMobileAnnotationReady(true)
    setCurrentTool({ ...currentTool, type: 'colorTag' })
    toast.success("Now tap on the photo to place your tag")
  }
  
  // Cancel mobile annotation
  const handleCancelMobileAnnotation = () => {
    setShowMobileAnnotationDialog(false)
    setMobileAnnotationReady(false)
  }
  
  // Reset mobile annotation ready state after tag is placed
  const handleMobileAnnotationCreated = (annotationData: any) => {
    handleSaveAnnotation(annotationData)
    setMobileAnnotationReady(false)
    // Switch back to pen tool after placing the tag
    setCurrentTool({ ...currentTool, type: 'pen' })
  }

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        // Request large size (2048x2048 optimized) for annotation
        const response = await fetch(`/api/photos/${photo.id}/url?size=large`)
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

  // Track color selection for recent colors
  useEffect(() => {
    if (selectedColorId) {
      const selectedColor = colors.find(c => c.id === selectedColorId)
      if (selectedColor) {
        addRecentColor({
          id: selectedColor.id,
          name: selectedColor.name,
          colorCode: selectedColor.colorCode,
          manufacturer: selectedColor.manufacturer,
          hexColor: selectedColor.hexColor
        })
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event('recentColorsUpdated'))
      }
    }
  }, [selectedColorId, colors])

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
          
          // Show appropriate success message with warnings
          if (!selectedColorId || !selectedSurface) {
            toast.success("Annotation saved! Add color and surface details in the panel")
          } else if (!selectedRoomId) {
            toast.success("Annotation saved! Note: No room assigned - will appear as 'Global' in synopsis", {
              duration: 5000
            })
          } else {
            toast.success("Annotation saved successfully")
          }
          
          setAnnotationNotes("")
          setUndoStack(prev => [...prev, { type: 'draw', data: newAnnotation }])
          setRedoStack([])
          
          // Auto-save the annotated photo to gallery
          setTimeout(() => autoSaveAnnotatedPhoto(), 500)
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
        
        // Auto-save the annotated photo to gallery
        setTimeout(() => autoSaveAnnotatedPhoto(), 500)
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
        
        // Auto-save the annotated photo to gallery
        setTimeout(() => autoSaveAnnotatedPhoto(), 500)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update annotation")
      }
    } catch (error) {
      console.error("Error updating annotation:", error)
      toast.error("Error updating annotation")
    }
  }

  const handleAnnotationPositionUpdate = async (annotationId: string, newCoordinates: Point[]) => {
    try {
      // Optimistically update UI first
      setAnnotations(prev => prev.map(ann => {
        if (ann.id === annotationId) {
          // Update coordinates in the data field
          const updatedData = {
            ...(ann.data || {}),
            coordinates: newCoordinates
          }
          return {
            ...ann,
            data: updatedData
          }
        }
        return ann
      }))
      
      const response = await fetch(`/api/photos/${photo.id}/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates: newCoordinates })
      })

      if (response.ok) {
        // Server confirmed the update
        toast.success("Annotation position updated")
        
        // Auto-save the annotated photo to gallery
        setTimeout(() => autoSaveAnnotatedPhoto(), 500)
      } else {
        // Revert on error - refresh from server
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update position")
        await refreshAnnotations()
      }
    } catch (error) {
      console.error("Error updating annotation position:", error)
      toast.error("Error updating annotation position")
      // Revert on error - refresh from server
      await refreshAnnotations()
    }
  }

  // Auto-save annotated photo to gallery (runs in background)
  const autoSaveAnnotatedPhoto = async () => {
    if (!imageUrl || !canvasRef.current) {
      console.log("Cannot auto-save: image or canvas not ready")
      return
    }
    
    try {
      // Create a composite canvas element to combine original image and annotations
      const compositeCanvas = document.createElement('canvas')
      const compositeCtx = compositeCanvas.getContext('2d')
      
      if (!compositeCtx) {
        console.error("Failed to create canvas context for auto-save")
        return
      }

      // Load the original image
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Set composite canvas size to match original image
      compositeCanvas.width = img.naturalWidth
      compositeCanvas.height = img.naturalHeight

      // Draw original image
      compositeCtx.drawImage(img, 0, 0)

      // Draw annotations canvas on top
      const annotationsCanvas = canvasRef.current
      if (annotationsCanvas) {
        compositeCtx.drawImage(annotationsCanvas, 0, 0, img.naturalWidth, img.naturalHeight)
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        compositeCanvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create blob'))
        }, 'image/jpeg', 0.95)
      })

      // Create form data and upload
      const formData = new FormData()
      formData.append('image', blob, `annotated-${photo.originalFilename}`)

      const response = await fetch(`/api/photos/${photo.id}/annotated`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        console.log("Annotated photo auto-saved to gallery")
      } else {
        console.error("Failed to auto-save annotated photo")
      }
    } catch (error) {
      console.error("Error auto-saving annotated photo:", error)
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
              <Link href={`/dashboard/projects/${photo.projectId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
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
          
          {/* Photo Navigation Controls */}
          {allProjectPhotos.length > 1 && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePreviousPhoto}
                disabled={!hasPreviousPhoto}
                title="Previous photo (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {currentPhotoIndex + 1} / {allProjectPhotos.length}
                </Badge>
                <Badge variant="outline">
                  {annotations.length} annotations
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextPhoto}
                disabled={!hasNextPhoto}
                title="Next photo (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Single Photo View */}
          {allProjectPhotos.length <= 1 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {annotations.length} annotations
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshAnnotations}>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="space-y-4">

          {/* Existing Annotations Summary - Moved to top */}
          {annotations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg">Annotations Summary ({annotations.length})</CardTitle>
                  <Button variant="ghost" size="sm" onClick={refreshAnnotations} title="Refresh annotations">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {annotations.map((annotation, index) => (
                    <div 
                      key={annotation.id || index} 
                      onClick={() => {
                        // Toggle highlighting - click again to deselect
                        setHighlightedAnnotationId(prev => 
                          prev === annotation.id ? null : annotation.id
                        )
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        highlightedAnnotationId === annotation.id
                          ? 'bg-blue-100 ring-2 ring-blue-500 shadow-lg scale-105'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {annotation.color ? (
                            <Badge variant="outline" className="text-xs">
                              {annotation.color.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              No Color
                            </Badge>
                          )}
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditAnnotation(annotation)
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                                title="Edit annotation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteAnnotation(annotation.id)
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
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
                              className="text-gray-400 h-8 w-8 p-0"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {annotation.color && (
                          <>
                            <p><span className="font-medium">Manufacturer:</span> {annotation.color.manufacturer}</p>
                            <p><span className="font-medium">Color Code:</span> {annotation.color.colorCode}</p>
                          </>
                        )}
                        {annotation.room && (
                          <p><span className="font-medium">Room:</span> {annotation.room.name}</p>
                        )}
                        <p><span className="font-medium">Surface:</span> {annotation.surfaceType || 'Not specified'}</p>
                        {annotation.productLine && (
                          <p><span className="font-medium">Product Line:</span> {annotation.productLine}</p>
                        )}
                        {annotation.sheen && (
                          <p><span className="font-medium">Sheen:</span> {annotation.sheen}</p>
                        )}
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

          {/* Compact Annotation Toolbar - Made sticky on mobile */}
          <div className="sticky top-0 z-10 bg-white rounded-lg border shadow-sm">
            <div className="px-3 py-2 md:px-4 md:py-3">
              <AnnotationToolbar 
                currentTool={currentTool}
                onToolChange={handleToolChange}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClearAll}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                canClear={annotations.length > 0}
              />
            </div>
          </div>

          {/* Main Content Area: Photo and Collapsible Sidebar */}
          <div className="relative">
            <div className={`grid gap-4 transition-all duration-300 ${isSidebarOpen ? 'lg:grid-cols-[1fr_400px]' : 'grid-cols-1'}`}>
              {/* Drawing Canvas */}
              <Card className="relative">
                {/* Zoom Controls - Draggable Floating */}
                <DraggableZoomControls
                  zoomLevel={zoomLevel}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetZoom={handleResetZoom}
                  minZoom={50}
                  maxZoom={200}
                />

                <CardContent className="p-0 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                    {imageUrl ? (
                      <DrawingCanvas
                      ref={canvasRef}
                      imageUrl={imageUrl}
                      tool={currentTool}
                      annotations={annotations}
                      onAnnotationCreate={isMobile && mobileAnnotationReady ? handleMobileAnnotationCreated : handleSaveAnnotation}
                      onTextAnnotationRequest={handleTextAnnotationRequest}
                      onAnnotationUpdate={handleAnnotationPositionUpdate}
                      highlightedAnnotationId={highlightedAnnotationId}
                      onAnnotationSelect={(annotationId) => {
                        // Toggle highlighting - click again to deselect
                        setHighlightedAnnotationId(prev => 
                          prev === annotationId ? null : annotationId
                        )
                      }}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Failed to load image</p>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>

              {/* Annotation Details Panel - Fixed Right Sidebar */}
              {isSidebarOpen && (
                <Card className="lg:sticky lg:top-4 lg:h-[calc(100vh-180px)] flex flex-col">
                  <CardHeader className="pb-2 py-3 flex-shrink-0">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Annotation Details
                    </CardTitle>
                  </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto">
                {/* Info message */}
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  Draw or place tags first, then add color and surface details here
                </div>

                {/* Copy from Recent Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCopyDialog}
                  className="w-full h-9 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Copy from Recent Annotations
                </Button>

                {/* Get AI Suggestions Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetAISuggestions}
                  className="w-full h-9 text-xs"
                  disabled={loadingAISuggestions}
                >
                  {loadingAISuggestions ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Ralph is thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      Get AI Suggestions
                    </>
                  )}
                </Button>

                {/* Favorites Section - Quick Access */}
                <FavoritesSection
                  onColorSelect={setSelectedColorId}
                  selectedColorId={selectedColorId}
                  className="pb-3 border-b"
                />

                {/* Recent Colors - Quick Access */}
                <RecentColorsPicker
                  onColorSelect={setSelectedColorId}
                  selectedColorId={selectedColorId}
                  className="pb-3 border-b"
                />

                {/* Color Selection with Browse and Add Custom Color Buttons */}
                <div className="space-y-1.5">
                  <Label htmlFor="colorId" className="text-xs">Color (Optional)</Label>
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <Select value={selectedColorId} onValueChange={setSelectedColorId}>
                        <SelectTrigger className="h-9">
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
                      size="sm"
                      onClick={() => setShowColorCatalog(true)}
                      title="Browse color catalog"
                      className="h-9 w-9 p-0"
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                    <AddCustomColorDialog onColorAdded={handleColorAdded}>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        title="Add custom color"
                        className="h-9 w-9 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </AddCustomColorDialog>
                  </div>
                  {selectedColorId && (
                    <div className="mt-1.5">
                      {(() => {
                        const selectedColor = colors.find(c => c.id === selectedColorId)
                        return selectedColor ? (
                          <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: selectedColor.hexColor || '#f3f4f6' }}
                            />
                            <div>
                              <p className="text-xs font-medium">{selectedColor.name}</p>
                              <p className="text-xs text-gray-500">{selectedColor.manufacturer} • {selectedColor.colorCode}</p>
                            </div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>

                {/* Room Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="roomId" className="text-xs">Room (Optional)</Label>
                    <QuickAddRoom 
                      projectId={photo.projectId} 
                      onRoomAdded={handleRoomAdded}
                    />
                  </div>
                  <Select value={selectedRoomId || "none"} onValueChange={(val) => setSelectedRoomId(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select room..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">None</SelectItem>
                      {(() => {
                        // Group rooms by room type for hierarchical display
                        const grouped = rooms.reduce((acc: Record<string, any[]>, room) => {
                          const type = room.roomType || 'Other'
                          if (!acc[type]) acc[type] = []
                          acc[type].push(room)
                          return acc
                        }, {})

                        return Object.entries(grouped)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([roomType, roomsInType]) => (
                            <SelectGroup key={roomType}>
                              <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {roomType}
                              </SelectLabel>
                              {roomsInType.map(room => (
                                <SelectItem key={room.id} value={room.id} className="pl-6">
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Line Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="productLine" className="text-xs">Product Line (Optional)</Label>
                  <Select value={selectedProductLine || "none"} onValueChange={(val) => setSelectedProductLine(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-9">
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

                {/* Sheen Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="sheen" className="text-xs">Sheen (Optional)</Label>
                  <Select value={selectedSheen || "none"} onValueChange={(val) => setSelectedSheen(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-9">
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

                <div className="space-y-1.5">
                  <Label htmlFor="surface" className="text-xs">Surface Type (Optional)</Label>
                  <Select value={selectedSurface} onValueChange={setSelectedSurface}>
                    <SelectTrigger className="h-9">
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

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={annotationNotes}
                    onChange={(e) => setAnnotationNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Photo Info */}
                <div className="pt-2 border-t space-y-2">
                  <h3 className="font-medium text-xs">Photo Information</h3>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Project</Label>
                      <p className="text-xs">{photo.project.name}</p>
                    </div>
                    
                    {photo.room && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Room</Label>
                        <p className="text-xs">{photo.room.name}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Client</Label>
                      <p className="text-xs">{photo.project.clientName}</p>
                    </div>
                  </div>
                </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Toggle Button */}
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-20"
              title={isSidebarOpen ? "Hide details panel" : "Show details panel"}
            >
              {isSidebarOpen ? (
                <>
                  <svg className="h-4 w-4 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="hidden sm:inline">Hide Panel</span>
                  <span className="sm:hidden">Hide</span>
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Show Panel</span>
                  <span className="sm:hidden">Show</span>
                </>
              )}
            </Button>
          </div>


        </div>
      </div>

      {/* Color Catalog Dialog */}
      <Dialog open={showColorCatalog} onOpenChange={(open) => {
        setShowColorCatalog(open)
        // If closing and we should return to mobile dialog
        if (!open && returnToMobileDialog) {
          setTimeout(() => {
            setShowMobileAnnotationDialog(true)
            setReturnToMobileDialog(false)
          }, 100)
        }
      }}>
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

      {/* Mobile Annotation Details Dialog */}
      <Dialog open={showMobileAnnotationDialog} onOpenChange={setShowMobileAnnotationDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tag Annotation Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Fill in the details for your tag annotation, then tap on the photo to place it.
            </p>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label htmlFor="mobileColorId">Color</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={selectedColorId || "none"} onValueChange={(val) => setSelectedColorId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">None</SelectItem>
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
                  onClick={() => {
                    setShowMobileAnnotationDialog(false)
                    setReturnToMobileDialog(true)
                    setShowColorCatalog(true)
                  }}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="mobileRoomId">Room</Label>
                <QuickAddRoom 
                  projectId={photo.projectId} 
                  onRoomAdded={handleRoomAdded}
                />
              </div>
              <Select value={selectedRoomId || "none"} onValueChange={(val) => setSelectedRoomId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">None</SelectItem>
                  {(() => {
                    // Group rooms by room type for hierarchical display
                    const grouped = rooms.reduce((acc: Record<string, any[]>, room) => {
                      const type = room.roomType || 'Other'
                      if (!acc[type]) acc[type] = []
                      acc[type].push(room)
                      return acc
                    }, {})

                    return Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([roomType, roomsInType]) => (
                        <SelectGroup key={roomType}>
                          <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {roomType}
                          </SelectLabel>
                          {roomsInType.map(room => (
                            <SelectItem key={room.id} value={room.id} className="pl-6">
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Product Line Selection */}
            <div className="space-y-2">
              <Label htmlFor="mobileProductLine">Product Line</Label>
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

            {/* Sheen Selection */}
            <div className="space-y-2">
              <Label htmlFor="mobileSheen">Sheen</Label>
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

            {/* Surface Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="mobileSurface">Surface Type</Label>
              <Select value={selectedSurface || "none"} onValueChange={(val) => setSelectedSurface(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select surface type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SURFACE_TYPES.map(surface => (
                    <SelectItem key={surface} value={surface}>
                      {surface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="mobileNotes">Notes</Label>
              <Textarea
                id="mobileNotes"
                placeholder="Add notes about this annotation..."
                value={annotationNotes}
                onChange={(e) => setAnnotationNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleCancelMobileAnnotation}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApplyMobileAnnotation}
                className="flex-1"
              >
                Apply & Place Tag
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
              <div className="flex items-center justify-between">
                <Label htmlFor="editRoom">Room (Optional)</Label>
                <QuickAddRoom 
                  projectId={photo.projectId} 
                  onRoomAdded={handleRoomAdded}
                />
              </div>
              <Select 
                value={editForm.roomId || "none"} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, roomId: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">None</SelectItem>
                  {(() => {
                    // Group rooms by room type for hierarchical display
                    const grouped = rooms.reduce((acc: Record<string, any[]>, room) => {
                      const type = room.roomType || 'Other'
                      if (!acc[type]) acc[type] = []
                      acc[type].push(room)
                      return acc
                    }, {})

                    return Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([roomType, roomsInType]) => (
                        <SelectGroup key={roomType}>
                          <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {roomType}
                          </SelectLabel>
                          {roomsInType.map(room => (
                            <SelectItem key={room.id} value={room.id} className="pl-6">
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Product Line Selection for Edit Dialog */}
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

            {/* Sheen Selection for Edit Dialog */}
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


      {/* Copy from Recent Annotations Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copy from Recent Annotations
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-2">
              Select a previous annotation to quickly copy its color, surface type, product line, and sheen
            </p>
          </DialogHeader>

          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : annotationSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No previous annotations found in this project</p>
              <p className="text-sm text-gray-400 mt-2">
                Create your first annotation to see suggestions here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {annotationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleCopyFromSuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Color Info */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded border shadow-sm"
                          style={{ backgroundColor: colors.find(c => c.id === suggestion.colorId)?.hexColor || '#f3f4f6' }}
                        />
                        <div>
                          <p className="font-medium text-sm">{suggestion.colorName}</p>
                          <p className="text-xs text-gray-500">
                            {suggestion.manufacturer} • {suggestion.colorCode}
                          </p>
                        </div>
                      </div>

                      {/* Annotation Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Surface:</span>
                          <span className="ml-1 font-medium">{suggestion.surfaceType}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Product:</span>
                          <span className="ml-1 font-medium">{suggestion.productLine}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Sheen:</span>
                          <span className="ml-1 font-medium">{suggestion.sheen}</span>
                        </div>
                        {suggestion.roomName && (
                          <div>
                            <span className="text-gray-500">Room:</span>
                            <span className="ml-1 font-medium">{suggestion.roomName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Used {suggestion.count}x
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {new Date(suggestion.lastUsedAt).toLocaleDateString()}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {suggestion.photoFilename}
                      </p>
                    </div>
                  </div>

                  {/* Click to Copy Hint */}
                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-blue-600 font-medium">
                      Click to copy these details →
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showAISuggestionsDialog} onOpenChange={setShowAISuggestionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Ralph Wiggum AI Suggestions
            </DialogTitle>
            {ralphQuote && (
              <p className="text-sm text-gray-500 mt-2">
                {ralphQuote}
              </p>
            )}
          </DialogHeader>

          {aiSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No suggestions available</p>
              <p className="text-sm text-gray-400 mt-2">
                Try adding some existing colors first
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleApplyAISuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Color Info */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded border shadow-sm bg-gray-200"
                        />
                        <div>
                          <p className="font-medium text-sm">{suggestion.colorName}</p>
                          <p className="text-xs text-gray-500">
                            {suggestion.manufacturer} • {suggestion.colorCode}
                          </p>
                        </div>
                      </div>

                      {/* Suggestion Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Surface:</span>
                          <span className="ml-1 font-medium">{suggestion.surfaceType}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <span className="ml-1 font-medium capitalize">{suggestion.confidence}</span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="text-xs">
                        <span className="text-gray-500">Why:</span>
                        <p className="mt-1 text-gray-700">{suggestion.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* Click to Apply Hint */}
                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-blue-600 font-medium">
                      Click to apply this suggestion →
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </Dialog>
    </div>
  )
}