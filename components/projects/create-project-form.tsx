
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
  MapPin, 
  Users, 
  FileText,
  Home,
  Loader2
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { ROOM_HIERARCHY } from "@/lib/types"

interface Room {
  id: string
  name: string
  description: string
}

export function CreateProjectForm() {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    address: ""
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoom, setNewRoom] = useState({ name: "", description: "" })
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameError, setNameError] = useState("")
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Check if project name already exists (debounced)
  const checkProjectName = async (name: string) => {
    if (!name.trim()) {
      setNameError("")
      return
    }

    setIsCheckingName(true)
    try {
      const response = await fetch(`/api/projects/check-name?name=${encodeURIComponent(name.trim())}`)
      const data = await response.json()
      
      if (data.exists) {
        setNameError(`A project named "${name}" already exists`)
      } else {
        setNameError("")
      }
    } catch (error) {
      console.error("Error checking project name:", error)
    } finally {
      setIsCheckingName(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Debounced name check for project name field
    if (field === "name") {
      // Clear any existing timeout
      if (checkTimeout) {
        clearTimeout(checkTimeout)
      }

      // Clear error immediately if name is empty
      if (!value.trim()) {
        setNameError("")
        return
      }

      // Set new timeout to check name after 500ms
      const timeout = setTimeout(() => {
        checkProjectName(value)
      }, 500)
      
      setCheckTimeout(timeout)
    }
  }

  const addRoom = () => {
    if (newRoom.name.trim()) {
      setRooms(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: newRoom.name.trim(),
        description: newRoom.description.trim()
      }])
      setNewRoom({ name: "", description: "" })
      // Focus back on room name input for quick consecutive additions
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
      // Reset the dropdown
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
    
    // Prevent double submission
    if (isLoading || isCheckingName) {
      return
    }
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Project name is required")
      document.getElementById("name")?.focus()
      return
    }

    // Check for name errors
    if (nameError) {
      toast.error(nameError)
      document.getElementById("name")?.focus()
      return
    }
    
    if (!formData.clientName.trim()) {
      toast.error("Client name is required")
      document.getElementById("clientName")?.focus()
      return
    }

    setIsLoading(true)

    try {
      // Prepare payload with properly formatted data
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim() || null,
        clientPhone: formData.clientPhone.trim() || null,
        address: formData.address.trim() || null,
        rooms: rooms.map(room => ({
          name: room.name.trim(),
          description: room.description.trim() || null
        }))
      }

      console.log("Submitting project payload:", payload)

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
        console.error("API error response:", data)
        console.error("Response status:", response.status)
        
        // Show detailed error message
        let errorMessage = "Failed to create project"
        if (data.details && Array.isArray(data.details)) {
          errorMessage += ": " + data.details.map((d: any) => d.message).join(", ")
        } else if (data.message) {
          errorMessage += ": " + data.message
        } else if (data.error) {
          errorMessage = data.error
        }
        
        toast.error(errorMessage)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      const errorMessage = error instanceof Error ? error.message : "Network error occurred"
      toast.error(`Failed to create project: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Project</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Create a new consultation project
          </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Project Name *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    placeholder="e.g., Johnson Family Home"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className={`h-11 text-base ${nameError ? "border-red-500" : ""}`}
                  />
                  {isCheckingName && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {nameError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {nameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-base">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="pl-10 h-11 text-base"
                  />
                </div>
              </div>
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

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Information
            </CardTitle>
            <CardDescription>
              Contact details for the client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-base">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Sarah Johnson"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  required
                  className="h-11 text-base"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-base">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="sarah@email.com"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange("clientEmail", e.target.value)}
                  className="h-11 text-base"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="text-base">Phone Number</Label>
              <Input
                id="clientPhone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                className="h-11 text-base"
                autoComplete="tel"
                inputMode="tel"
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
            <Link href="/dashboard/projects">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
