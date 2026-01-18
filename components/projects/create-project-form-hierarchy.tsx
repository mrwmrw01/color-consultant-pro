
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  Plus, 
  X, 
  FileText,
  Home,
  Loader2,
  Building2,
  Users
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { ROOM_HIERARCHY } from "@/lib/types"

interface Room {
  id: string
  name: string
  description: string
}

interface CreateProjectFormHierarchyProps {
  propertyId: string
  propertyName: string
  clientId: string
  clientName: string
}

export function CreateProjectFormHierarchy({ 
  propertyId, 
  propertyName, 
  clientId, 
  clientName 
}: CreateProjectFormHierarchyProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoom, setNewRoom] = useState({ name: "", description: "" })
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addRoom = () => {
    if (newRoom.name.trim()) {
      setRooms(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: newRoom.name.trim(),
        description: newRoom.description.trim()
      }])
      setNewRoom({ name: "", description: "" })
      setTimeout(() => {
        document.getElementById("roomName")?.focus()
      }, 50)
    }
  }

  const handleRoomKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addRoom()
    }
  }

  const removeRoom = (roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId))
  }

  const addPredefinedRoom = (roomName: string) => {
    if (!rooms.some(room => room.name === roomName)) {
      setRooms(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: roomName,
        description: ""
      }])
      setSelectedRoomType("")
      toast.success(`Added ${roomName}`)
    }
  }

  const handleRoomTypeSelect = (value: string) => {
    setSelectedRoomType(value)
    addPredefinedRoom(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    if (!formData.name.trim()) {
      toast.error("Project name is required")
      document.getElementById("name")?.focus()
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        propertyId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rooms: rooms.map(room => ({
          name: room.name.trim(),
          description: room.description.trim() || null
        }))
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Project created successfully!")
        router.push(`/dashboard/projects/${data.id}`)
      } else {
        toast.error(data.error || "Failed to create project")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href={`/dashboard/clients/${clientId}/properties/${propertyId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {propertyName}
          </Link>
        </Button>
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Project</h1>
          <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: '#8b4513' }}>
            <Users className="h-4 w-4" />
            <span>{clientName}</span>
            <span>→</span>
            <Building2 className="h-4 w-4" />
            <span>{propertyName}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Information
            </CardTitle>
            <CardDescription>
              Basic details about the consultation project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Project Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Kitchen & Living Room Consultation"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Project Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the consultation scope..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="text-base resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Rooms
            </CardTitle>
            <CardDescription>
              Add rooms that will be included in this consultation (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Add from Room Types */}
            <div className="space-y-2">
              <Label htmlFor="roomTypeSelect" className="text-base font-medium">Quick Add from Common Rooms:</Label>
              <Select value={selectedRoomType} onValueChange={handleRoomTypeSelect}>
                <SelectTrigger id="roomTypeSelect" className="h-11">
                  <SelectValue placeholder="Select a room type to add..." />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {Object.entries(ROOM_HIERARCHY).map(([roomType, config]) => (
                    <SelectGroup key={roomType}>
                      <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {config.label}
                      </SelectLabel>
                      {config.subtypes.map((subtype) => {
                        const roomName = roomType === 'Custom' ? subtype : 
                          (subtype === 'Other' ? roomType : `${roomType} - ${subtype}`)
                        return (
                          <SelectItem 
                            key={`${roomType}-${subtype}`} 
                            value={roomName}
                            className="pl-6"
                            disabled={rooms.some(room => room.name === roomName)}
                          >
                            {subtype === 'Other' ? roomType : subtype}
                            {rooms.some(room => room.name === roomName) && (
                              <span className="ml-2 text-xs text-muted-foreground">(added)</span>
                            )}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose from organized room categories or add a custom room below
              </p>
            </div>

            <Separator />

            {/* Manual Room Entry */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-base">Room Name</Label>
                  <Input
                    id="roomName"
                    placeholder="Living Room"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    onKeyPress={handleRoomKeyPress}
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomDescription" className="text-base">Description (Optional)</Label>
                  <Input
                    id="roomDescription"
                    placeholder="Main living area"
                    value={newRoom.description}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                    onKeyPress={handleRoomKeyPress}
                    className="h-11 text-base"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={addRoom}
                disabled={!newRoom.name.trim()}
                className="w-full h-11 text-base touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            {/* Added Rooms */}
            {rooms.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base">Added Rooms ({rooms.length}):</Label>
                <div className="flex flex-wrap gap-2">
                  {rooms.map(room => (
                    <Badge key={room.id} variant="outline" className="text-sm py-2 px-3 pr-1">
                      <span className="font-medium">{room.name}</span>
                      {room.description && (
                        <span className="hidden sm:inline text-xs text-gray-500 ml-1.5">
                          • {room.description}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-red-500 touch-manipulation"
                        onClick={() => removeRoom(room.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="flex-1 h-12 text-base font-semibold touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Project...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            asChild 
            className="h-12 text-base touch-manipulation"
          >
            <Link href={`/dashboard/clients/${clientId}/properties/${propertyId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
