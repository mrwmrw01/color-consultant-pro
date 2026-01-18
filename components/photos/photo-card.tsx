
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Camera, 
  Calendar, 
  MapPin, 
  Palette, 
  Eye, 
  Edit,
  Download,
  MoreHorizontal,
  Trash2,
  DoorOpen,
  Loader2,
  Plus,
  Search
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { ROOM_HIERARCHY, type RoomType } from "@/lib/types"

interface PhotoCardProps {
  photo: any
  viewMode: "grid" | "list"
  globalRooms: any[]
}

export function PhotoCard({ photo, viewMode, globalRooms }: PhotoCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string>(photo.roomId || "none")
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false)
  const [showNewRoomDialog, setShowNewRoomDialog] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [roomSearchQuery, setRoomSearchQuery] = useState("")
  const [newRoomForm, setNewRoomForm] = useState({
    roomType: "" as RoomType | "",
    subType: "",
    customSubType: ""
  })
  const router = useRouter()

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        // Add cache-busting parameter to ensure we always get the latest version
        const cacheBuster = Date.now()
        const response = await fetch(`/api/photos/${photo.id}/url?t=${cacheBuster}`)
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
  }, [photo.id, photo.annotated_photo_path])

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
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
        // Refresh the page to update the photo list
        router.refresh()
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
      console.log('=== Room Update Debug ===')
      console.log('Photo ID:', photo.id)
      console.log('Selected Room ID:', selectedRoomId)
      console.log('Selected Room ID type:', typeof selectedRoomId)
      console.log('Global Rooms available:', globalRooms?.length)
      console.log('First 3 rooms:', globalRooms?.slice(0, 3).map(r => ({ id: r.id, name: r.name })))
      
      const selectedRoom = globalRooms?.find(r => r.id === selectedRoomId)
      console.log('Selected room details:', selectedRoom)
      
      const roomIdToSend = selectedRoomId === "none" ? null : selectedRoomId
      console.log('Room ID to send:', roomIdToSend)
      
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: roomIdToSend
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

  const getNewRoomName = () => {
    if (!newRoomForm.roomType) return ""
    
    const roomLabel = ROOM_HIERARCHY[newRoomForm.roomType]?.label
    if (!roomLabel) return ""
    
    // For "Custom" room type, use the custom name directly
    if (newRoomForm.roomType === "Custom") {
      return newRoomForm.customSubType.trim()
    }
    
    // If no subtype selected, return just the room label
    if (!newRoomForm.subType) return roomLabel
    
    // If subtype requires custom name, combine with custom input
    if (newRoomForm.subType === "Enter Custom Name" && newRoomForm.customSubType) {
      return newRoomForm.customSubType.trim()
    }
    
    if (newRoomForm.subType === "Custom Defined" && newRoomForm.customSubType) {
      return `${roomLabel} - ${newRoomForm.customSubType.trim()}`
    }
    
    if (newRoomForm.subType === "Custom" && newRoomForm.customSubType) {
      return `${roomLabel} - ${newRoomForm.customSubType.trim()}`
    }
    
    if (newRoomForm.subType === "Other" && newRoomForm.customSubType) {
      return `${roomLabel} - ${newRoomForm.customSubType.trim()}`
    }
    
    // Default: combine room label with subtype
    return `${roomLabel} - ${newRoomForm.subType}`
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newRoomForm.roomType) {
      toast.error("Please select a room type")
      return
    }

    // Validate custom name requirements
    const needsCustomName = 
      newRoomForm.roomType === "Custom" ||
      newRoomForm.subType === "Enter Custom Name" ||
      newRoomForm.subType === "Custom Defined" ||
      newRoomForm.subType === "Custom" ||
      newRoomForm.subType === "Other"

    if (needsCustomName && !newRoomForm.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    const roomName = getNewRoomName()
    
    if (!roomName || roomName.trim() === "") {
      toast.error("Please provide a valid room name")
      return
    }

    setIsCreatingRoom(true)

    try {
      const payload = {
        name: roomName.trim(),
        roomType: newRoomForm.roomType,
        subType: newRoomForm.subType || null,
        description: null
      }

      console.log("Creating room with payload:", payload)

      const response = await fetch(`/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const responseData = await response.json()
      console.log("Room creation response:", response.status, responseData)

      if (response.ok) {
        const newRoomId = responseData.id
        
        // Automatically assign the newly created room to this photo
        console.log("Auto-assigning new room to photo:", { photoId: photo.id, roomId: newRoomId })
        
        const assignResponse = await fetch(`/api/photos/${photo.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roomId: newRoomId
          })
        })

        if (assignResponse.ok) {
          toast.success(`Room "${roomName.trim()}" created and assigned!`)
          
          setShowNewRoomDialog(false)
          setNewRoomForm({
            roomType: "",
            subType: "",
            customSubType: ""
          })
          
          // Refresh to get updated rooms list and photo data
          router.refresh()
        } else {
          const assignError = await assignResponse.json()
          console.error("Failed to assign room to photo:", assignError)
          toast.success("Room created successfully!")
          toast.error(`Failed to assign room: ${assignError.error || 'Unknown error'}`)
          
          setShowNewRoomDialog(false)
          setNewRoomForm({
            roomType: "",
            subType: "",
            customSubType: ""
          })
          
          // Still select the newly created room in the dropdown
          setSelectedRoomId(newRoomId)
          
          // Refresh to get updated rooms list
          router.refresh()
        }
      } else {
        toast.error(responseData.error || "Failed to create room")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsCreatingRoom(false)
    }
  }

  // Filter rooms based on search query
  const filteredRooms = globalRooms?.filter(room => 
    room?.name?.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
    room?.roomType?.toLowerCase().includes(roomSearchQuery.toLowerCase())
  ) || []

  // Group filtered rooms by roomType
  const groupedRooms = filteredRooms.reduce((acc: any, room: any) => {
    if (!room || !room.id) return acc
    const type = room.roomType || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(room)
    return acc
  }, {})

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {isLoading ? (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              ) : imageUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={imageUrl}
                    alt={photo.originalFilename}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {photo.originalFilename}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>{photo.project?.name}</span>
                {photo.room && (
                  <>
                    <span>•</span>
                    <span>{photo.room.name}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatFileSize(photo.size)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(photo.createdAt)}
                </Badge>
                {photo.annotations?.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Palette className="h-3 w-3 mr-1" />
                    {photo.annotations.length} annotations
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Annotate
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Dialog open={isEditingRoom} onOpenChange={setIsEditingRoom}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedRoomId(photo.roomId || "none")
                          setRoomSearchQuery("")
                        }}
                      >
                        <DoorOpen className="mr-2 h-4 w-4" />
                        Assign Room
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Assign Room</DialogTitle>
                        <DialogDescription>
                          Choose a room for this photo or create a new one.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search rooms..."
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {/* Room Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="room-list">Room</Label>
                          <Select
                            value={selectedRoomId}
                            onValueChange={setSelectedRoomId}
                          >
                            <SelectTrigger id="room-list">
                              <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              <SelectItem value="none">No Room</SelectItem>
                              {Object.entries(groupedRooms)
                                .sort(([a], [b]) => (a as string).localeCompare(b as string))
                                .map(([roomType, roomsInType]: [string, any]) => (
                                  <SelectGroup key={roomType}>
                                    <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                      {roomType}
                                    </SelectLabel>
                                    {(roomsInType as any[]).map(room => (
                                      <SelectItem key={room.id} value={room.id} className="pl-6">
                                        {room.name}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                            </SelectContent>
                          </Select>
                          {photo.room && (
                            <p className="text-sm text-gray-500">
                              Current: {photo.room.name}
                            </p>
                          )}
                        </div>

                        {/* New Room Button */}
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowNewRoomDialog(true)
                              setIsEditingRoom(false)
                            }}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Room
                          </Button>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-600 focus:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Photo
                      </DropdownMenuItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full bg-gray-200 animate-pulse" />
          ) : imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt={photo.originalFilename}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" asChild>
                  <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 truncate mb-1">
            {photo.originalFilename}
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{photo.project?.name}</span>
            </div>
            
            {photo.room && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-4 h-3 mr-1" /> {/* Spacer */}
                <span className="truncate">{photo.room.name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(photo.createdAt)}
              </Badge>
              
              {photo.annotations?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  {photo.annotations.length}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/dashboard/photos/${photo.id}/annotate`}>
                <Edit className="h-4 w-4 mr-1" />
                Annotate
              </Link>
            </Button>
          </div>
          
          {/* Room edit and Delete buttons for grid view */}
          <div className="flex gap-2 mt-2">
            {/* Room Assignment Dialog */}
            <Dialog open={isEditingRoom} onOpenChange={setIsEditingRoom}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setSelectedRoomId(photo.roomId || "none")
                    setRoomSearchQuery("")
                  }}
                >
                  <DoorOpen className="h-4 w-4 mr-1" />
                  Room
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Assign Room</DialogTitle>
                  <DialogDescription>
                    Choose a room for this photo or create a new one.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search rooms..."
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Room Selection */}
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
                        {Object.entries(groupedRooms)
                          .sort(([a], [b]) => (a as string).localeCompare(b as string))
                          .map(([roomType, roomsInType]: [string, any]) => (
                            <SelectGroup key={roomType}>
                              <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {roomType}
                              </SelectLabel>
                              {(roomsInType as any[]).map(room => (
                                <SelectItem key={room.id} value={room.id} className="pl-6">
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                      </SelectContent>
                    </Select>
                    {photo.room && (
                      <p className="text-sm text-gray-500">
                        Current: {photo.room.name}
                      </p>
                    )}
                  </div>

                  {/* New Room Button */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewRoomDialog(true)
                        setIsEditingRoom(false)
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Room
                    </Button>
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

            {/* Delete Photo Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
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
        </div>
      </CardContent>

      {/* New Room Creation Dialog */}
      <Dialog open={showNewRoomDialog} onOpenChange={setShowNewRoomDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleCreateRoom}>
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
              <DialogDescription>
                Add a new room to your collection
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type *</Label>
                <Select 
                  value={newRoomForm.roomType || undefined} 
                  onValueChange={(value) => setNewRoomForm(prev => ({ 
                    ...prev, 
                    roomType: value as RoomType,
                    subType: "",
                    customSubType: ""
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_HIERARCHY).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newRoomForm.roomType && newRoomForm.roomType !== "Custom" && (
                <div className="space-y-2">
                  <Label htmlFor="subType">Subtype (optional)</Label>
                  <Select 
                    value={newRoomForm.subType || undefined} 
                    onValueChange={(value) => setNewRoomForm(prev => ({ 
                      ...prev, 
                      subType: value,
                      customSubType: ""
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subtype..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_HIERARCHY[newRoomForm.roomType as RoomType].subtypes.map(subType => (
                        <SelectItem key={subType} value={subType}>
                          {subType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(newRoomForm.roomType === "Custom" || 
                newRoomForm.subType === "Enter Custom Name" ||
                newRoomForm.subType === "Custom Defined" || 
                newRoomForm.subType === "Custom" ||
                newRoomForm.subType === "Other") && (
                <div className="space-y-2">
                  <Label htmlFor="customSubType">Custom Room Name *</Label>
                  <Input
                    id="customSubType"
                    placeholder="e.g., Butler's Pantry, Wine Cellar..."
                    value={newRoomForm.customSubType}
                    onChange={(e) => setNewRoomForm(prev => ({ ...prev, customSubType: e.target.value }))}
                    autoFocus
                  />
                </div>
              )}

              {getNewRoomName() && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-medium text-blue-900">Room name:</p>
                  <p className="text-sm text-blue-800">{getNewRoomName()}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowNewRoomDialog(false)
                  setIsEditingRoom(true)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingRoom}>
                {isCreatingRoom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
