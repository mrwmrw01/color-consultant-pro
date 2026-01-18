
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Plus } from "lucide-react"
import toast from "react-hot-toast"
import { ROOM_HIERARCHY, type RoomType } from "@/lib/types"

interface QuickAddRoomProps {
  projectId: string
  onRoomAdded?: (roomId: string) => void
  trigger?: React.ReactNode
}

export function QuickAddRoom({ projectId, onRoomAdded, trigger }: QuickAddRoomProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    roomType: "" as RoomType | "",
    subType: "",
    customSubType: ""
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

    // Validate custom name requirements
    const needsCustomName = 
      formData.roomType === "Custom" ||
      formData.subType === "Enter Custom Name" ||
      formData.subType === "Custom Defined" ||
      formData.subType === "Custom" ||
      formData.subType === "Other"

    if (needsCustomName && !formData.customSubType.trim()) {
      toast.error("Please provide a custom room name")
      return
    }

    setIsLoading(true)

    try {
      const roomName = getRoomName()
      const payload = {
        name: roomName,
        roomType: formData.roomType,
        subType: formData.subType || null,
        description: null
      }

      const response = await fetch(`/api/projects/${projectId}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const newRoom = await response.json()
        toast.success("Room added successfully!")
        
        setOpen(false)
        setFormData({
          roomType: "",
          subType: "",
          customSubType: ""
        })
        
        if (onRoomAdded) {
          onRoomAdded(newRoom.id)
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

  const showCustomInput = 
    formData.roomType === "Custom" || 
    formData.subType === "Enter Custom Name" ||
    formData.subType === "Custom Defined" || 
    formData.subType === "Custom" ||
    formData.subType === "Other"

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-3 w-3" />
        New Room
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Quick Add Room</DialogTitle>
              <DialogDescription>
                Add a new room to this project
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

              {selectedRoomType && selectedRoomType !== "Custom" && (
                <div className="space-y-2">
                  <Label htmlFor="subType">Subtype (optional)</Label>
                  <Select 
                    value={formData.subType || undefined} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      subType: value || "",
                      customSubType: ""
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subtype..." />
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

              {showCustomInput && (
                <div className="space-y-2">
                  <Label htmlFor="customSubType">Custom Room Name *</Label>
                  <Input
                    id="customSubType"
                    placeholder="e.g., Butler's Pantry, Wine Cellar..."
                    value={formData.customSubType}
                    onChange={(e) => setFormData(prev => ({ ...prev, customSubType: e.target.value }))}
                    autoFocus
                  />
                </div>
              )}

              {getRoomName() && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-medium text-blue-900">Room name:</p>
                  <p className="text-sm text-blue-800">{getRoomName()}</p>
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
    </>
  )
}
