
"use client"

import { useState, useEffect } from "react"
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
import { Plus, Loader2, Search } from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { PRODUCT_LINES, SHEEN_OPTIONS } from "@/lib/types"

interface AddColorSpecDialogProps {
  synopsisId: string
  projectId: string
  children?: React.ReactNode
  onSpecAdded?: () => void
}

interface Room {
  id: string
  name: string
}

interface ColorAvailability {
  id: string
  productLine: string
  sheen: string
}

interface Color {
  id: string
  colorCode: string
  name: string
  manufacturer: string
  hexColor?: string
  usageCount?: number
  availability: ColorAvailability[]
}

export function AddColorSpecDialog({ 
  synopsisId, 
  projectId, 
  children, 
  onSpecAdded 
}: AddColorSpecDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [colorSearch, setColorSearch] = useState("")
  const [filteredColors, setFilteredColors] = useState<Color[]>([])
  
  const [formData, setFormData] = useState({
    roomId: "",
    colorId: "",
    productLine: "",
    sheen: "",
    surfaceType: "",
    surfaceArea: "",
    quantity: "",
    notes: ""
  })

  const surfaceTypes = [
    { value: "wall", label: "Wall" },
    { value: "ceiling", label: "Ceiling" },
    { value: "trim", label: "Trim" },
    { value: "door", label: "Door" },
    { value: "window", label: "Window" },
    { value: "cabinet", label: "Cabinet" },
    { value: "other", label: "Other" }
  ]

  // Load rooms and colors when dialog opens
  useEffect(() => {
    if (open) {
      loadRooms()
      loadColors()
    }
  }, [open, projectId])

  // Filter colors based on search
  useEffect(() => {
    if (colorSearch.trim() === "") {
      setFilteredColors(colors.slice(0, 50)) // Limit to first 50 colors
    } else {
      const filtered = colors.filter(color => 
        color.name.toLowerCase().includes(colorSearch.toLowerCase()) ||
        color.manufacturer.toLowerCase().includes(colorSearch.toLowerCase()) ||
        color.colorCode.toLowerCase().includes(colorSearch.toLowerCase())
      ).slice(0, 50)
      setFilteredColors(filtered)
    }
  }, [colorSearch, colors])

  // Reset productLine and sheen when color changes
  useEffect(() => {
    if (formData.colorId) {
      setFormData(prev => ({ ...prev, productLine: "", sheen: "" }))
    }
  }, [formData.colorId])

  const loadRooms = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/rooms`)
      if (response.ok) {
        const roomsData = await response.json()
        setRooms(roomsData)
      }
    } catch (error) {
      console.error("Error loading rooms:", error)
    }
  }

  const loadColors = async () => {
    try {
      const response = await fetch(`/api/colors`)
      if (response.ok) {
        const colorsData = await response.json()
        setColors(colorsData)
        setFilteredColors(colorsData.slice(0, 50))
      }
    } catch (error) {
      console.error("Error loading colors:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.roomId || !formData.colorId || !formData.productLine || !formData.sheen || !formData.surfaceType) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/synopsis/${synopsisId}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Color specification added successfully!")
        
        setOpen(false)
        setFormData({
          roomId: "",
          colorId: "",
          productLine: "",
          sheen: "",
          surfaceType: "",
          surfaceArea: "",
          quantity: "",
          notes: ""
        })
        setColorSearch("")
        
        if (onSpecAdded) {
          onSpecAdded()
        } else {
          router.refresh()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add color specification")
      }
    } catch (error) {
      console.error("Error adding color specification:", error)
      toast.error("Failed to add color specification")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedColor = colors.find(c => c.id === formData.colorId)

  // Get available product lines for the selected color
  const availableProductLines = selectedColor
    ? Array.from(new Set(selectedColor.availability.map(a => a.productLine)))
    : []

  // Get available sheens for the selected color and product line
  const availableSheens = selectedColor && formData.productLine
    ? selectedColor.availability
        .filter(a => a.productLine === formData.productLine)
        .map(a => a.sheen)
    : []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Color Specification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Color Specification</DialogTitle>
            <DialogDescription>
              Add a new color specification to this synopsis.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room">Room *</Label>
                <Select 
                  value={formData.roomId || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roomId: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(() => {
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

              <div className="space-y-2">
                <Label htmlFor="surfaceType">Surface Type *</Label>
                <Select 
                  value={formData.surfaceType || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, surfaceType: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select surface..." />
                  </SelectTrigger>
                  <SelectContent>
                    {surfaceTypes.map(surface => (
                      <SelectItem key={surface.value} value={surface.value}>
                        {surface.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search colors by name or code..."
                    value={colorSearch}
                    onChange={(e) => setColorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select 
                  value={formData.colorId || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, colorId: value || "", productLine: "", sheen: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select color..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredColors.map(color => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border flex-shrink-0"
                            style={{ backgroundColor: color.hexColor || '#f3f4f6' }}
                          />
                          <span className="truncate">
                            {color.colorCode} - {color.name}
                          </span>
                          {(color.usageCount || 0) === 0 && (
                            <span className="text-green-600 text-xs font-semibold ml-2">NEW!</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedColor && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: selectedColor.hexColor || '#f3f4f6' }}
                  />
                  <div className="text-sm flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedColor.colorCode} - {selectedColor.name}</p>
                      {(selectedColor.usageCount || 0) === 0 && (
                        <span className="text-green-600 text-xs font-semibold">First Time Use!</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">{selectedColor.manufacturer}</p>
                    {(selectedColor.usageCount || 0) > 0 && (
                      <p className="text-gray-500 text-xs">Used {selectedColor.usageCount} times</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Product Line Selection */}
            {selectedColor && availableProductLines.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="productLine">Product Line *</Label>
                <Select 
                  value={formData.productLine || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, productLine: value || "", sheen: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product line..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProductLines.map(productLine => (
                      <SelectItem key={productLine} value={productLine}>
                        {productLine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sheen Selection */}
            {selectedColor && formData.productLine && availableSheens.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sheen">Sheen *</Label>
                <Select 
                  value={formData.sheen || undefined} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sheen: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sheen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheens.map(sheen => (
                      <SelectItem key={sheen} value={sheen}>
                        {sheen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="surfaceArea">Surface Area</Label>
                <Input
                  id="surfaceArea"
                  placeholder="e.g., North Wall, All Trim"
                  value={formData.surfaceArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, surfaceArea: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  placeholder="e.g., 2 gallons, 1 quart"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Specification
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
