
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  Camera, 
  Users, 
  MapPin, 
  Calendar,
  FileText,
  Edit,
  Plus,
  Home,
  Palette,
  MoreHorizontal,
  Trash2
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { PhotoCard } from "../photos/photo-card"
import { PhotoImage } from "../photos/photo-image"
import { EditProjectDialog } from "./edit-project-dialog"
import { RoomSelector } from "./room-selector"
import { SynopsisViewer } from "../synopsis-viewer"
import { motion } from "framer-motion"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProjectDetailProps {
  project: any
  globalRooms: any[]
}

export function ProjectDetail({ project: initialProject, globalRooms }: ProjectDetailProps) {
  const [project, setProject] = useState(initialProject)
  const [deleteRoomDialogOpen, setDeleteRoomDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const [sortByRoom, setSortByRoom] = useState(true) // Auto-sort by room name enabled by default
  const router = useRouter()
  
  const refreshProject = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`)
      if (response.ok) {
        const updatedProject = await response.json()
        setProject(updatedProject)
      }
    } catch (error) {
      console.error('Error refreshing project:', error)
    }
  }

  const handleDeleteRoom = async () => {
    if (deletingRoom || !selectedRoom) return

    setDeletingRoom(true)
    try {
      console.log('Deleting room:', selectedRoom.id, selectedRoom.name)
      
      // Add a small delay to ensure session is stable
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response = await fetch(`/api/projects/${project.id}/rooms/${selectedRoom.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError)
        throw new Error('Invalid response from server')
      }

      console.log('Delete room response:', { 
        status: response.status, 
        ok: response.ok,
        data 
      })

      if (!response.ok) {
        const errorMessage = data?.error || data?.details || `HTTP ${response.status}: Failed to delete room`
        console.error('Delete room failed with error:', errorMessage)
        throw new Error(errorMessage)
      }

      if (data.success && data.deletedRoom) {
        console.log('Successfully deleted room:', data.deletedRoom)
        toast.success(`Room "${data.deletedRoom.name}" deleted successfully`)
        setDeleteRoomDialogOpen(false)
        setSelectedRoom(null)
        
        // Refresh the project data to show updated room list
        await refreshProject()
        
      } else {
        console.error('Delete response missing success or deletedRoom:', data)
        throw new Error('Server did not confirm successful deletion')
      }
      
    } catch (error) {
      console.error('Error deleting room:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to delete room: ${errorMessage}`)
    } finally {
      setDeletingRoom(false)
    }
  }

  const openDeleteRoomDialog = (room: any) => {
    setSelectedRoom(room)
    setDeleteRoomDialogOpen(true)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalAnnotations = project.photos.reduce((sum: number, photo: any) => 
    sum + (photo.annotations?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            {project.description || "Paint consultation project"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/projects/${project.id}/synopsis`}>
              <FileText className="h-4 w-4 mr-2" />
              View Synopsis
            </Link>
          </Button>
          <EditProjectDialog project={project} onProjectUpdated={refreshProject} />
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href={`/dashboard/photos/upload?project=${project.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-600">Photos</p>
                      <Badge variant="secondary">{project.photos?.length || 0}</Badge>
                    </div>
                    {project.photos && project.photos.length > 0 ? (
                      <p className="text-sm text-gray-500 mt-2">
                        Upload more photos
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        Upload photos to get started
                      </p>
                    )}
                  </div>
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link href={`/dashboard/projects/${project.id}/synopsis`} className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-600">Color Synopses</p>
                      <Badge variant="secondary">{project.synopsis?.length || 0}</Badge>
                    </div>
                    {project.synopsis && project.synopsis.length > 0 ? (
                      <p className="text-sm text-gray-500 mt-2">
                        {project.synopsis.length === 1 ? 'View synopsis' : `View all ${project.synopsis.length} synopses`}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        Create a color synopsis
                      </p>
                    )}
                  </div>
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600">Client Name</div>
              <div className="text-sm mt-1">{project.clientName}</div>
            </div>
            {project.clientEmail && (
              <div>
                <div className="text-sm font-medium text-gray-600">Email</div>
                <div className="text-sm mt-1">{project.clientEmail}</div>
              </div>
            )}
            {project.clientPhone && (
              <div>
                <div className="text-sm font-medium text-gray-600">Phone</div>
                <div className="text-sm mt-1">{project.clientPhone}</div>
              </div>
            )}
            {project.address && (
              <div>
                <div className="text-sm font-medium text-gray-600">Address</div>
                <div className="text-sm mt-1">{project.address}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {formatDate(project.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Updated {formatDate(project.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="photos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="photos">Photos ({project.photos?.length || 0})</TabsTrigger>
          <TabsTrigger value="annotations">Annotations ({totalAnnotations})</TabsTrigger>
          <TabsTrigger value="rooms">Rooms ({project.rooms?.length || 0})</TabsTrigger>
          <TabsTrigger value="synopsis">Synopsis ({project.synopsis?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Photos</h3>
            <Button asChild>
              <Link href={`/dashboard/photos/upload?project=${project.id}`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Photos
              </Link>
            </Button>
          </div>

          {project.photos && project.photos.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {project.photos.map((photo: any, index: number) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <PhotoCard photo={photo} viewMode="grid" globalRooms={globalRooms} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No photos yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Upload photos to start annotating
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/photos/upload?project=${project.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Photos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="annotations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Color Annotations</h3>
            <Button asChild>
              <Link href={`/dashboard/photos/upload?project=${project.id}`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Photos to Annotate
              </Link>
            </Button>
          </div>

          {totalAnnotations > 0 ? (
            <div className="space-y-6">
              {/* Sort Toggle */}
              <div className="flex items-center justify-end gap-2 pb-2">
                <Button
                  variant={sortByRoom ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortByRoom(!sortByRoom)}
                >
                  {sortByRoom ? "Sorted by Room" : "Sort by Room"}
                </Button>
              </div>
              
              {/* Group annotations by room */}
              {(sortByRoom 
                ? [...(project.rooms || [])].sort((a: any, b: any) => a.name.localeCompare(b.name))
                : project.rooms || []
              ).map((room: any) => {
                const roomPhotos = project.photos.filter((photo: any) => photo.roomId === room.id)
                const roomAnnotations = roomPhotos.reduce((sum: number, photo: any) => 
                  sum + (photo.annotations?.length || 0), 0)
                
                if (roomAnnotations === 0) return null

                return (
                  <Card key={room.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          {room.name}
                          <Badge variant="secondary">
                            {roomAnnotations} annotations
                          </Badge>
                        </CardTitle>
                        {room.roomType && (
                          <Badge variant="outline">
                            {room.roomType}
                            {room.subType && ` - ${room.subType}`}
                          </Badge>
                        )}
                      </div>
                      {room.description && (
                        <CardDescription>{room.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roomPhotos
                          .filter((photo: any) => photo.annotations && photo.annotations.length > 0)
                          .map((photo: any) => (
                            <div key={photo.id} className="space-y-2">
                              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <PhotoImage
                                  photoId={photo.id}
                                  alt={photo.filename}
                                  aspectRatio="auto"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-black/70 text-white">
                                    {photo.annotations.length} annotations
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{photo.filename}</p>
                                <div className="flex flex-wrap gap-1">
                                  {photo.annotations.slice(0, 3).map((annotation: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {annotation.color?.name || annotation.color?.code || `Color ${idx + 1}`}
                                    </Badge>
                                  ))}
                                  {photo.annotations.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{photo.annotations.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full" 
                                asChild
                              >
                                <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit Annotations
                                </Link>
                              </Button>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Unassigned photos with annotations */}
              {(() => {
                const unassignedPhotos = project.photos.filter((photo: any) => 
                  !photo.roomId && photo.annotations && photo.annotations.length > 0)
                
                if (unassignedPhotos.length === 0) return null

                return (
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-gray-500" />
                        Unassigned Photos
                        <Badge variant="secondary">
                          {unassignedPhotos.reduce((sum: number, photo: any) => 
                            sum + (photo.annotations?.length || 0), 0)} annotations
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Photos with annotations that haven't been assigned to a room
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unassignedPhotos.map((photo: any) => (
                          <div key={photo.id} className="space-y-2">
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                              <PhotoImage
                                photoId={photo.id}
                                alt={photo.filename}
                                aspectRatio="auto"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-black/70 text-white">
                                  {photo.annotations.length} annotations
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{photo.filename}</p>
                              <div className="flex flex-wrap gap-1">
                                {photo.annotations.slice(0, 3).map((annotation: any, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {annotation.color?.name || annotation.color?.code || `Color ${idx + 1}`}
                                  </Badge>
                                ))}
                                {photo.annotations.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{photo.annotations.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full" 
                              asChild
                            >
                              <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit Annotations
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Palette className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No annotations yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Upload photos and start annotating to track color selections
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/photos/upload?project=${project.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Photos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Rooms</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={sortByRoom ? "default" : "outline"}
                size="sm"
                onClick={() => setSortByRoom(!sortByRoom)}
              >
                {sortByRoom ? "Sorted A-Z" : "Sort A-Z"}
              </Button>
              <RoomSelector projectId={project.id} onRoomAdded={refreshProject}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </RoomSelector>
            </div>
          </div>

          {project.rooms && project.rooms.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(sortByRoom 
                ? [...project.rooms].sort((a: any, b: any) => a.name.localeCompare(b.name))
                : project.rooms
              ).map((room: any) => (
                <Card key={room.id} className="group hover:shadow-lg transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{room.name}</CardTitle>
                        {room.description && (
                          <CardDescription>{room.description}</CardDescription>
                        )}
                        {room.roomType && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {room.roomType}
                            </Badge>
                            {room.subType && (
                              <Badge variant="outline" className="text-xs">
                                {room.subType}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => openDeleteRoomDialog(room)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {room.photos?.length || 0} photos
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No rooms defined
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add rooms to organize your photos
                  </p>
                  <RoomSelector projectId={project.id} onRoomAdded={refreshProject}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Room
                    </Button>
                  </RoomSelector>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="synopsis">
          <SynopsisViewer projectId={project.id} />
        </TabsContent>
      </Tabs>

      {/* Delete Room Confirmation Dialog */}
      <AlertDialog open={deleteRoomDialogOpen} onOpenChange={setDeleteRoomDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRoom?.name}"? This action cannot be undone. 
              All annotations and synopsis entries associated with this room will also be permanently deleted.
              Photos associated with this room will remain but will no longer be assigned to a room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={deletingRoom}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingRoom ? "Deleting..." : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
