
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2, Home } from "lucide-react"
import toast from "react-hot-toast"
import { ROOM_HIERARCHY, type RoomType } from "@/lib/types"

interface RoomSelectorProps {
  projectId: string
  children?: React.ReactNode
  onRoomAdded?: () => void
}

export function RoomSelector({ projectId, children, onRoomAdded }: RoomSelectorProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    roomType: "" as RoomType | "",
    subType: "",
    customSubType: "",
    description: ""
  })

  const selectedRoomType = formData.roomType as RoomType
  const availableSubTypes = selectedRoomType ? ROOM_HIERARCHY[selectedRoomType].subtypes : []

  const getRoomName = () => {
    if (!formData.roomType) return ""
    
    const roomLabel = ROOM_HIERARCHY[formData.roomType].label
    
    // For "Custom" room type, use the custom name directly
    if (formData.roomType === "Custom" && formData.customSubType) {
      return formData.customSubType
    }
    
    if (!formData.subType) return roomLabel
    
    if (formData.subType === "Custom Defined" && formData.customSubType) {
      return `${roomLabel} - ${formData.customSubType}`
    }
    
    if (formData.subType === "Custom" && formData.customSubType) {
      return `${roomLabel} - ${formData.customSubType}`
    }
    
    if (formData.subType === "Other" && formData.customSubType) {
      return `${roomLabel} - ${formData.customSubType}`
    }
    
    return `${roomLabel} - ${formData.subType}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.roomType) {
      toast.error("Please select a room type")
      return
    }

    // Require custom name for "Custom" room type
    if (formData.roomType === "Custom" && !formData.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    if (formData.subType === "Enter Custom Name" && !formData.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    if (formData.subType === "Custom Defined" && !formData.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    if (formData.subType === "Custom" && !formData.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    if (formData.subType === "Other" && !formData.customSubType.trim()) {
      toast.error("Please provide a specific room name")
      return
    }

    setIsLoading(true)

    try {
      const roomName = getRoomName()
      const payload = {
        name: roomName,
        roomType: formData.roomType,
        subType: formData.subType || null,
        description: formData.description || null
      }

      const response = await fetch(`/api/projects/${projectId}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success("Room added successfully!")
        
        setOpen(false)
        setFormData({
          roomType: "",
          subType: "",
          customSubType: "",
          description: ""
        })
        
        if (onRoomAdded) {
          onRoomAdded()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add room")
      }
    } catch (error) {
      console.error("Error adding room:", error)
      toast.error("Failed to add room")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Add New Room
            </DialogTitle>
            <DialogDescription>
              Select a room type and subtype to add to your project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomType">Room Type *</Label>
              <Select 
                value={formData.roomType || undefined} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  roomType: value as RoomType || "",
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

            {selectedRoomType && (
              <div className="space-y-2">
                <Label htmlFor="subType">Room Subtype</Label>
                <Select 
                  value={formData.subType || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    subType: value || "",
                    customSubType: ""
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtype (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubTypes.map(subType => (
                      <SelectItem key={subType} value={subType}>
                        {subType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.roomType === "Custom" || 
              formData.subType === "Enter Custom Name" ||
              formData.subType === "Custom Defined" || 
              formData.subType === "Custom" ||
              formData.subType === "Other") && (
              <div className="space-y-2">
                <Label htmlFor="customSubType">
                  {formData.roomType === "Custom" || formData.subType === "Enter Custom Name"
                    ? "Custom Room Name *"
                    : formData.subType === "Custom Defined" 
                    ? "Custom Room Name *" 
                    : formData.subType === "Custom"
                    ? "Custom Room Name *"
                    : "Specific Room Name *"}
                </Label>
                <Input
                  id="customSubType"
                  placeholder={
                    formData.roomType === "Custom" || formData.subType === "Enter Custom Name"
                      ? "e.g., Butler's Pantry, Wine Cellar, Theater Room..."
                      : formData.subType === "Custom Defined" 
                      ? "e.g., My Custom Room" 
                      : formData.subType === "Custom"
                      ? "e.g., Custom Bathroom"
                      : "e.g., Children's Bathroom"
                  }
                  value={formData.customSubType}
                  onChange={(e) => setFormData(prev => ({ ...prev, customSubType: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional notes about this room..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {getRoomName() && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">Room will be named:</p>
                <p className="text-blue-800">{getRoomName()}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
