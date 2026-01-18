

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Camera,
  X,
  PenTool
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { SURFACE_TYPES } from "@/lib/types"
import toast from "react-hot-toast"

// Photo thumbnail component
function PhotoThumbnail({ photoId, filename }: { photoId: string, filename: string }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        const response = await fetch(`/api/photos/${photoId}/url`)
        if (response.ok) {
          const data = await response.json()
          setThumbnailUrl(data.url)
        } else {
          setError(true)
        }
      } catch (error) {
        console.error("Error fetching thumbnail:", error)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchThumbnail()
  }, [photoId])

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">No preview</p>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={thumbnailUrl}
      alt={filename}
      fill
      className="object-cover"
    />
  )
}

interface AnnotationsManagerProps {
  annotations: any[]
  projects: any[]
  colors: any[]
}

interface FilterState {
  search: string
  project: string
  room: string
  colorId: string
  surfaceType: string
  dateRange: string
}

export function AnnotationsManager({ annotations: initialAnnotations, projects, colors }: AnnotationsManagerProps) {
  // Filter out any invalid annotations on initial load
  const validInitialAnnotations = (initialAnnotations || []).filter(a => 
    a != null && 
    a.id != null && 
    a.photo != null && 
    a.photo.id != null && 
    a.photo.project != null
  )
  
  const [annotations, setAnnotations] = useState(validInitialAnnotations)
  const [filteredAnnotations, setFilteredAnnotations] = useState(validInitialAnnotations)
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    project: 'all',
    room: 'all',
    colorId: 'all',
    surfaceType: 'all',
    dateRange: 'all'
  })
  const [selectedAnnotation, setSelectedAnnotation] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    colorId: '',
    surfaceType: '',
    notes: '',
    roomId: ''
  })

  // Get available rooms based on selected project
  const availableRooms = filters.project === 'all' 
    ? projects.flatMap(p => p.rooms || []).filter((room: any) => room != null)
    : (projects.find(p => p.id === filters.project)?.rooms || []).filter((room: any) => room != null)

  // Get all rooms for edit dialog (across all projects)
  const allRooms = projects.flatMap(p => p.rooms || []).filter((room: any) => room != null)

  // Apply filters
  useEffect(() => {
    // First, filter out any null/undefined annotations or annotations with missing critical data
    let filtered = annotations.filter(a => a != null && a.photo != null && a.photo.project != null)

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(annotation => 
        annotation.color?.name?.toLowerCase().includes(searchLower) ||
        annotation.color?.manufacturer?.toLowerCase().includes(searchLower) ||
        annotation.notes?.toLowerCase().includes(searchLower) ||
        annotation.photo?.project?.name?.toLowerCase().includes(searchLower) ||
        annotation.room?.name?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.project !== 'all') {
      filtered = filtered.filter(annotation => annotation.photo?.project?.id === filters.project)
    }

    if (filters.room !== 'all') {
      filtered = filtered.filter(annotation => annotation.roomId === filters.room)
    }

    if (filters.colorId !== 'all') {
      filtered = filtered.filter(annotation => annotation.colorId === filters.colorId)
    }

    if (filters.surfaceType !== 'all') {
      filtered = filtered.filter(annotation => annotation.surfaceType === filters.surfaceType)
    }

    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      if (filters.dateRange !== 'all') {
        filtered = filtered.filter(annotation => 
          new Date(annotation.createdAt) >= filterDate
        )
      }
    }

    setFilteredAnnotations(filtered)
    
    // Clear selections when filters change to avoid confusion
    setSelectedAnnotationIds(prev => {
      const filteredIds = new Set(filtered.map(a => a.id))
      const newSelection = new Set<string>()
      prev.forEach(id => {
        if (filteredIds.has(id)) {
          newSelection.add(id)
        }
      })
      return newSelection
    })
  }, [annotations, filters])

  const handleEditAnnotation = async (annotation: any) => {
    setSelectedAnnotation(annotation)
    setEditForm({
      colorId: annotation.colorId || '',
      surfaceType: annotation.surfaceType || '',
      notes: annotation.notes || '',
      roomId: annotation.roomId || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAnnotation || !selectedAnnotation.photo || !selectedAnnotation.id) {
      toast.error("Cannot update annotation: Missing data")
      return
    }

    try {
      const response = await fetch(`/api/photos/${selectedAnnotation.photo.id}/annotations/${selectedAnnotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const updatedAnnotation = await response.json()
        setAnnotations(prev => prev.map(ann => 
          ann.id === selectedAnnotation.id ? updatedAnnotation : ann
        ))
        setIsEditDialogOpen(false)
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

  const handleDeleteAnnotation = async (annotation: any) => {
    if (!annotation?.id || !annotation?.photo?.id) {
      toast.error("Cannot delete annotation: Invalid ID")
      return
    }

    try {
      const response = await fetch(`/api/photos/${annotation.photo.id}/annotations/${annotation.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAnnotations(prev => prev.filter(ann => ann.id !== annotation.id))
        setIsDeleteDialogOpen(false)
        toast.success("Annotation deleted successfully")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to delete annotation")
      }
    } catch (error) {
      console.error("Error deleting annotation:", error)
      toast.error("Error deleting annotation")
    }
  }

  // Toggle individual annotation selection
  const toggleAnnotationSelection = (annotationId: string) => {
    setSelectedAnnotationIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(annotationId)) {
        newSet.delete(annotationId)
      } else {
        newSet.add(annotationId)
      }
      return newSet
    })
  }

  // Select all filtered annotations
  const selectAllFiltered = () => {
    const allFilteredIds = filteredAnnotations
      .filter(a => a?.id)
      .map(a => a.id)
    setSelectedAnnotationIds(new Set(allFilteredIds))
  }

  // Deselect all annotations
  const deselectAll = () => {
    setSelectedAnnotationIds(new Set())
  }

  // Delete selected annotations
  const handleDeleteSelected = async () => {
    const selectedCount = selectedAnnotationIds.size
    if (selectedCount === 0) {
      toast.error("No annotations selected")
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedCount} selected annotation${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return
    }

    const annotationsToDelete = annotations.filter(a => 
      a?.id && 
      a?.photo?.id && 
      selectedAnnotationIds.has(a.id)
    )
    
    const deletePromises = annotationsToDelete.map(annotation => 
      fetch(`/api/photos/${annotation.photo.id}/annotations/${annotation.id}`, {
        method: 'DELETE'
      })
    )

    try {
      await Promise.all(deletePromises)
      setAnnotations(prev => prev.filter(ann => !selectedAnnotationIds.has(ann.id)))
      setSelectedAnnotationIds(new Set())
      toast.success(`Deleted ${selectedCount} annotation${selectedCount > 1 ? 's' : ''}`)
    } catch (error) {
      console.error("Error in bulk delete:", error)
      toast.error("Error deleting annotations")
    }
  }

  const exportAnnotations = () => {
    const exportData = filteredAnnotations.map(annotation => ({
      id: annotation.id,
      projectName: annotation.photo.project.name,
      clientName: annotation.photo.project.clientName,
      roomName: annotation.room?.name || 'Unassigned',
      photoFilename: annotation.photo.originalFilename,
      colorId: annotation.colorId,
      colorName: annotation.color?.name || 'Unknown',
      surfaceType: annotation.surfaceType,
      notes: annotation.notes,
      createdAt: annotation.createdAt
    }))

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annotations-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Annotations Management</h1>
            <p className="text-gray-600">
              Manage and organize photo annotations across all projects
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="px-3 py-1">
              {filteredAnnotations.length} annotation{filteredAnnotations.length !== 1 ? 's' : ''}
            </Badge>
            {selectedAnnotationIds.size > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {selectedAnnotationIds.size} selected
              </Badge>
            )}
            <Button onClick={exportAnnotations} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Selection Controls */}
        {filteredAnnotations.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={selectAllFiltered} 
              variant="outline" 
              size="sm"
              disabled={selectedAnnotationIds.size === filteredAnnotations.length}
            >
              Select All
            </Button>
            <Button 
              onClick={deselectAll} 
              variant="outline" 
              size="sm"
              disabled={selectedAnnotationIds.size === 0}
            >
              Deselect All
            </Button>
            {selectedAnnotationIds.size > 0 && (
              <Button 
                onClick={handleDeleteSelected} 
                variant="destructive" 
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedAnnotationIds.size})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search annotations..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={filters.project} onValueChange={(value) => setFilters(prev => ({ ...prev, project: value, room: 'all' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Filter */}
            <div className="space-y-2">
              <Label htmlFor="room">Room</Label>
              <Select value={filters.room} onValueChange={(value) => setFilters(prev => ({ ...prev, room: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {availableRooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Filter */}
            <div className="space-y-2">
              <Label htmlFor="colorId">Color</Label>
              <Select value={filters.colorId} onValueChange={(value) => setFilters(prev => ({ ...prev, colorId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All colors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colors</SelectItem>
                  {Array.from(new Set(annotations.filter(a => a && a.colorId).map(a => a.colorId))).map(colorId => {
                    const annotation = annotations.find(a => a && a.colorId === colorId)
                    const colorName = annotation?.color ? `${annotation.color.manufacturer} ${annotation.color.name}` : colorId
                    return (
                      <SelectItem key={colorId} value={colorId}>
                        {colorName}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Surface Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="surfaceType">Surface Type</Label>
              <Select value={filters.surfaceType} onValueChange={(value) => setFilters(prev => ({ ...prev, surfaceType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All surfaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surfaces</SelectItem>
                  {SURFACE_TYPES.map(surface => (
                    <SelectItem key={surface} value={surface}>
                      {surface.charAt(0).toUpperCase() + surface.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annotations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAnnotations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No annotations found</h3>
              <p className="text-gray-500 mb-4">
                {annotations.length === 0 
                  ? "No annotations have been created yet."
                  : "Try adjusting your filters to see more results."
                }
              </p>
              <Button asChild>
                <Link href="/dashboard/projects">
                  View Projects
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAnnotations
            .filter(annotation => annotation?.id && annotation?.photo?.id && annotation?.photo?.project)
            .map((annotation) => {
            const isBeingEdited = isEditDialogOpen && selectedAnnotation?.id === annotation.id
            return (
              <Card 
                key={annotation.id} 
                onClick={() => {
                  // Toggle highlighting on click
                  setHighlightedAnnotationId(prev => 
                    prev === annotation.id ? null : annotation.id
                  )
                }}
                className={`overflow-hidden transition-all duration-300 relative cursor-pointer ${
                  isBeingEdited 
                    ? 'border-4 border-blue-500 shadow-lg shadow-blue-200 bg-blue-50/50' 
                    : highlightedAnnotationId === annotation.id
                    ? 'border-4 border-green-500 bg-green-50/50 shadow-lg shadow-green-200'
                    : selectedAnnotationIds.has(annotation.id)
                    ? 'border-4 border-orange-500 bg-orange-50/30'
                    : 'border-2 border-gray-200 hover:bg-gray-50/50'
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                  {/* Checkbox */}
                  <div className="absolute top-3 left-3 z-10 sm:relative sm:top-0 sm:left-0 sm:w-12 sm:flex sm:items-center sm:justify-center sm:bg-gray-50 sm:border-r">
                    <Checkbox
                      checked={selectedAnnotationIds.has(annotation.id)}
                      onCheckedChange={(e) => {
                        toggleAnnotationSelection(annotation.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5"
                    />
                  </div>

                  {/* Photo thumbnail */}
                  <div className="w-full sm:w-32 h-48 sm:h-32 bg-gray-100 flex-shrink-0">
                    <div className="relative w-full h-full">
                      <PhotoThumbnail 
                        photoId={annotation.photo.id}
                        filename={annotation.photo.originalFilename || 'Unknown'}
                      />
                    </div>
                  </div>

                  {/* Annotation details */}
                  <div className="flex-1 p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {annotation.color && (
                            <Badge variant="secondary" className="text-xs">
                              {annotation.color.manufacturer} {annotation.color.name}
                            </Badge>
                          )}
                          {annotation.surfaceType && (
                            <Badge variant="outline" className="text-xs">
                              {annotation.surfaceType}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                          {annotation.photo?.project?.name || 'Unknown Project'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {annotation.room?.name || 'Unassigned Room'} • {annotation.photo?.originalFilename || 'Unknown'}
                        </p>
                        {annotation.notes && (
                          <p className="text-xs sm:text-sm text-gray-500 italic line-clamp-2">
                            "{annotation.notes}"
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Created: {new Date(annotation.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          asChild
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <Link href={`/dashboard/projects/${annotation.photo.project.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="ml-1 sm:ml-0 sm:sr-only lg:not-sr-only lg:ml-1">View Project</span>
                          </Link>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          asChild
                          className="flex-1 sm:flex-none text-xs sm:text-sm text-white"
                          style={{ backgroundColor: '#c47004' }}
                        >
                          <Link href={`/dashboard/photos/${annotation.photo.id}/annotate`}>
                            <PenTool className="h-4 w-4" />
                            <span className="ml-1 sm:ml-0 sm:sr-only lg:not-sr-only lg:ml-1">Annotate</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditAnnotation(annotation)
                          }}
                          className="flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="ml-1 sm:ml-0 sm:sr-only lg:not-sr-only lg:ml-1">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAnnotation(annotation)
                            setIsDeleteDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700 flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-1 sm:ml-0 sm:sr-only lg:not-sr-only lg:ml-1">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo Preview */}
            {selectedAnnotation && selectedAnnotation.photo && (
              <div className="rounded-lg overflow-hidden border bg-gray-50">
                <div className="flex items-start gap-4 p-4">
                  {/* Photo Thumbnail */}
                  <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                    <PhotoThumbnail 
                      photoId={selectedAnnotation.photo.id}
                      filename={selectedAnnotation.photo.originalFilename || 'Unknown'}
                    />
                  </div>
                  
                  {/* Photo Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {selectedAnnotation.photo.originalFilename || 'Unknown'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedAnnotation.photo?.project?.name || 'Unknown Project'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnnotation.color && (
                        <Badge variant="secondary">
                          {selectedAnnotation.color.manufacturer} {selectedAnnotation.color.name}
                        </Badge>
                      )}
                      {selectedAnnotation.surfaceType && (
                        <Badge variant="outline">
                          {selectedAnnotation.surfaceType}
                        </Badge>
                      )}
                      {selectedAnnotation.room && (
                        <Badge variant="outline">
                          {selectedAnnotation.room.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editColorCode">Color Code</Label>
                {editForm.colorId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setEditForm(prev => ({ ...prev, colorId: '' }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Select 
                value={editForm.colorId} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, colorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color..." />
                </SelectTrigger>
                <SelectContent>
                  {colors.map(color => (
                    <SelectItem key={color.id} value={color.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
                        />
                        <span>{color.name} - {color.manufacturer}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editRoom">Room</Label>
                {editForm.roomId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setEditForm(prev => ({ ...prev, roomId: '' }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Select 
                value={(() => {
                  // Ensure value is valid - check if roomId exists in allRooms
                  if (!editForm.roomId) return "unassigned"
                  const roomExists = allRooms.some((r: any) => r.id === editForm.roomId)
                  return roomExists ? editForm.roomId : "unassigned"
                })()} 
                onValueChange={(value) => setEditForm(prev => ({ 
                  ...prev, 
                  roomId: value === "unassigned" ? '' : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(() => {
                    // Group rooms by roomType
                    const grouped = allRooms.reduce((acc: any, room: any) => {
                      if (!room || !room.id) return acc
                      const type = room.roomType || 'Other'
                      if (!acc[type]) acc[type] = []
                      acc[type].push(room)
                      return acc
                    }, {})

                    return Object.entries(grouped)
                      .sort(([a], [b]) => (a as string).localeCompare(b as string))
                      .map(([roomType, roomsInType]: [string, any]) => (
                        <SelectGroup key={roomType}>
                          <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {roomType}
                          </SelectLabel>
                          {(roomsInType as any[]).filter(room => room && room.id).map(room => (
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="editSurface">Surface Type</Label>
                {editForm.surfaceType && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setEditForm(prev => ({ ...prev, surfaceType: '' }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="editNotes">Notes</Label>
                {editForm.notes && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setEditForm(prev => ({ ...prev, notes: '' }))}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <Textarea
                id="editNotes"
                placeholder="Additional notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delete Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this annotation? This action cannot be undone.</p>
            {selectedAnnotation && (
              <div className="rounded-lg overflow-hidden border bg-gray-50">
                <div className="flex items-start gap-4 p-4">
                  {/* Photo Thumbnail */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                    <PhotoThumbnail 
                      photoId={selectedAnnotation.photo.id}
                      filename={selectedAnnotation.photo.originalFilename}
                    />
                  </div>
                  
                  {/* Annotation Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {selectedAnnotation.photo.originalFilename}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedAnnotation.photo.project.name} • {selectedAnnotation.room?.name || 'Unassigned'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnnotation.color && (
                        <Badge variant="secondary">
                          {selectedAnnotation.color.manufacturer} {selectedAnnotation.color.name}
                        </Badge>
                      )}
                      {selectedAnnotation.surfaceType && (
                        <Badge variant="outline">
                          {selectedAnnotation.surfaceType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeleteAnnotation(selectedAnnotation)}
              >
                Delete Annotation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

