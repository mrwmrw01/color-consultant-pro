

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2, Palette } from "lucide-react"
import toast from "react-hot-toast"

interface AddCustomColorDialogProps {
  children?: React.ReactNode
  onColorAdded?: () => void
}

export function AddCustomColorDialog({ children, onColorAdded }: AddCustomColorDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [existingColorFamilies, setExistingColorFamilies] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    colorCode: "",
    name: "",
    manufacturer: "",
    rgbColor: "",
    hexColor: "#ffffff",
    colorFamily: "",
    notes: ""
  })

  // Fetch existing color families
  useEffect(() => {
    const fetchColorFamilies = async () => {
      try {
        const response = await fetch('/api/colors')
        if (response.ok) {
          const colors = await response.json()
          const families = Array.from(
            new Set(colors.map((c: any) => c.colorFamily).filter(Boolean))
          ).sort() as string[]
          setExistingColorFamilies(families)
        }
      } catch (error) {
        console.error('Error fetching color families:', error)
      }
    }

    if (open) {
      fetchColorFamilies()
    }
  }, [open])

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
      const r = parseInt(result[1], 16)
      const g = parseInt(result[2], 16)
      const b = parseInt(result[3], 16)
      return `${r}, ${g}, ${b}`
    }
    return ""
  }

  const handleHexChange = (hex: string) => {
    setFormData(prev => ({
      ...prev,
      hexColor: hex,
      rgbColor: hexToRgb(hex)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.colorCode || !formData.name || !formData.manufacturer) {
      toast.error("Please fill in color code, name, and manufacturer")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/colors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Color added successfully!")
        
        setOpen(false)
        setFormData({
          colorCode: "",
          name: "",
          manufacturer: "",
          rgbColor: "",
          hexColor: "#ffffff",
          colorFamily: "",
          notes: ""
        })
        
        if (onColorAdded) {
          onColorAdded()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add color")
      }
    } catch (error) {
      console.error("Error adding color:", error)
      toast.error("Failed to add color")
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
            Add Color
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" style={{ color: '#f97316' }} />
            Add New Color
          </DialogTitle>
          <DialogDescription>
            Add a new paint color to your catalog. Product lines and sheens can be selected when tagging photos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Color Code */}
            <div className="space-y-2">
              <Label htmlFor="colorCode">
                Color Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="colorCode"
                placeholder="e.g., SW 7005, BM OC-17"
                value={formData.colorCode}
                onChange={(e) => setFormData(prev => ({ ...prev, colorCode: e.target.value }))}
                required
              />
            </div>

            {/* Color Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Color Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Extra White, Cloud White"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Manufacturer */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer">
                Manufacturer <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.manufacturer}
                onValueChange={(value) => setFormData(prev => ({ ...prev, manufacturer: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sherwin Williams">Sherwin Williams</SelectItem>
                  <SelectItem value="Benjamin Moore">Benjamin Moore</SelectItem>
                  <SelectItem value="Behr">Behr</SelectItem>
                  <SelectItem value="PPG">PPG</SelectItem>
                  <SelectItem value="Valspar">Valspar</SelectItem>
                  <SelectItem value="Custom">Custom/Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Picker and RGB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hexColor">Hex Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="hexColor"
                    type="color"
                    value={formData.hexColor}
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.hexColor}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rgbColor">RGB Color</Label>
                <Input
                  id="rgbColor"
                  placeholder="e.g., 238, 237, 231"
                  value={formData.rgbColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, rgbColor: e.target.value }))}
                />
              </div>
            </div>

            {/* Color Family */}
            <div className="space-y-2">
              <Label htmlFor="colorFamily">Color Family (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.colorFamily}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, colorFamily: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="White">White</SelectItem>
                    <SelectItem value="Off-White">Off-White</SelectItem>
                    <SelectItem value="Beige">Beige</SelectItem>
                    <SelectItem value="Gray">Gray</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Yellow">Yellow</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Purple">Purple</SelectItem>
                    <SelectItem value="Brown">Brown</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                    {existingColorFamilies.map(family => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or type custom..."
                  value={formData.colorFamily}
                  onChange={(e) => setFormData(prev => ({ ...prev, colorFamily: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional information about this color..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Adding..." : "Add Color"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
