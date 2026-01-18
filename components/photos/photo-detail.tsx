
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft,
  Edit,
  Download,
  Calendar,
  MapPin,
  Tag,
  Palette,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  DoorOpen
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

interface PhotoDetailProps {
  photo: any
}

export function PhotoDetail({ photo }: PhotoDetailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string>(photo.roomId || "none")
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false)
  const [hasAnnotatedVersion, setHasAnnotatedVersion] = useState(false)
  const [isShowingAnnotated, setIsShowingAnnotated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const response = await fetch(`/api/photos/${photo.id}/url`)
        if (response.ok) {
          const data = await response.json()
          setImageUrl(data.url)
          setHasAnnotatedVersion(data.hasAnnotatedVersion || false)
          setIsShowingAnnotated(data.isAnnotated || false)
        }
      } catch (error) {
        console.error("Failed to fetch image URL:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [photo.id])

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDeletePhoto = async () => {
    setIsDeleting(true)
    try {
      console.log("Deleting photo with ID:", photo.id)
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success("Photo deleted successfully")
        // Navigate back to gallery
        router.push("/dashboard/photos")
      } else {
        const errorData = await response.json()
        console.error("Delete photo failed:", errorData)
        toast.error(`Failed to delete photo: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error deleting photo:", error)
      toast.error("Error deleting photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateRoom = async () => {
    setIsUpdatingRoom(true)
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: selectedRoomId === "none" ? null : selectedRoomId
        })
      })

      if (response.ok) {
        toast.success("Room assignment updated successfully")
        setIsEditingRoom(false)
        // Refresh the page to show updated data
        router.refresh()
      } else {
        const errorData = await response.json()
        console.error("Update room failed:", errorData)
        toast.error(`Failed to update room: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error updating room:", error)
      toast.error("Error updating room assignment")
    } finally {
      setIsUpdatingRoom(false)
    }
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
              <h1 className="text-2xl font-bold text-gray-900">
                Photo Details
              </h1>
              <p className="text-sm text-gray-600">
                {photo.originalFilename}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Image and Action Buttons */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo */}
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-gray-600">Loading photo...</span>
                      </div>
                    </div>
                  ) : imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={photo.originalFilename}
                      fill
                      className="object-contain"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Failed to load image</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Annotation count and annotated version overlays */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    {photo.annotations?.length > 0 && (
                      <Badge variant="secondary" className="bg-black/50 text-white border-0">
                        <Palette className="h-3 w-3 mr-1" />
                        {photo.annotations.length} annotations
                      </Badge>
                    )}
                    {hasAnnotatedVersion && (
                      <Badge variant="secondary" className="bg-green-600/90 text-white border-0">
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isShowingAnnotated ? "Annotated Preview" : "Has Annotated Version"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="flex-1 min-w-[150px]">
                    <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Annotate Photo
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="flex-1 min-w-[150px]">
                    <Download className="h-4 w-4 mr-2" />
                    Download Photo
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[150px] text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Photo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{photo.originalFilename}"? 
                          This will also delete all annotations on this photo. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeletePhoto}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? "Deleting..." : "Delete Photo"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Project</label>
                  <p className="text-sm">
                    <Link 
                      href={`/dashboard/projects/${photo.project.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {photo.project.name}
                    </Link>
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Client</label>
                  <p className="text-sm">{photo.project.clientName}</p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">Room</label>
                    <Dialog open={isEditingRoom} onOpenChange={setIsEditingRoom}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => setSelectedRoomId(photo.roomId || "none")}
                        >
                          <DoorOpen className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Room</DialogTitle>
                          <DialogDescription>
                            Choose a room for this photo or leave it unassigned.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="room">Room</Label>
                            <Select
                              value={selectedRoomId}
                              onValueChange={setSelectedRoomId}
                            >
                              <SelectTrigger id="room">
                                <SelectValue placeholder="Select a room" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                <SelectItem value="none">No Room</SelectItem>
                                {(() => {
                                  const rooms = (photo.project.rooms || []) as any[]
                                  // Group rooms by room type for hierarchical display
                                  const grouped = rooms.reduce((acc: Record<string, any[]>, room: any) => {
                                    const type = room.roomType || 'Other'
                                    if (!acc[type]) acc[type] = []
                                    acc[type].push(room)
                                    return acc
                                  }, {} as Record<string, any[]>)

                                  return Object.entries(grouped)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([roomType, roomsInType]: [string, any[]]) => (
                                      <div key={roomType}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                          {roomType}
                                        </div>
                                        {roomsInType.map((room: any) => (
                                          <SelectItem key={room.id} value={room.id} className="pl-6">
                                            {room.name}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ))
                                })()}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditingRoom(false)}
                            disabled={isUpdatingRoom}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleUpdateRoom}
                            disabled={isUpdatingRoom}
                          >
                            {isUpdatingRoom ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Room'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm">
                    {photo.room ? photo.room.name : (
                      <span className="text-gray-400 italic">No room assigned</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={photo.project.status === "active" ? "default" : "secondary"}>
                      {photo.project.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Annotations */}
            {photo.annotations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Annotations ({photo.annotations.length})
                  </CardTitle>
                  <CardDescription>
                    Color tags and markings on this photo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {photo.annotations.map((annotation: any, index: number) => (
                    <div key={annotation.id || index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {annotation.colorCode}
                        </Badge>
                        <span className="text-xs text-gray-500 capitalize">
                          {annotation.type}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>
                          <span className="font-medium">Surface:</span> {annotation.surfaceType}
                        </p>
                        {annotation.notes && (
                          <p>
                            <span className="font-medium">Notes:</span> {annotation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
