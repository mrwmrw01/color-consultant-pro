

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Palette, 
  Search, 
  Plus, 
  Filter,
  Grid,
  List
} from "lucide-react"
import { ColorCard } from "./color-card"
import { AddCustomColorDialog } from "./add-custom-color-dialog"
import { TopColorsDisplay } from "./top-colors-display"
import { motion } from "framer-motion"

interface ColorManagementProps {
  colorCodes: any[]
}

export function ColorManagement({ colorCodes: initialColorCodes }: ColorManagementProps) {
  const [colorCodes, setColorCodes] = useState(initialColorCodes)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrand, setSelectedBrand] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const refreshColors = async () => {
    try {
      const response = await fetch('/api/colors')
      if (response.ok) {
        const updatedColors = await response.json()
        setColorCodes(updatedColors)
      }
    } catch (error) {
      console.error('Error refreshing colors:', error)
    }
  }

  // Get unique manufacturers
  const manufacturers = Array.from(new Set(colorCodes.map(color => color.manufacturer))).sort()

  // Filter colors
  const filteredColors = colorCodes.filter((color) => {
    const matchesSearch = 
      color.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      color.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      color.colorCode.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesBrand = selectedBrand === "all" || color.manufacturer === selectedBrand
    
    return matchesSearch && matchesBrand
  })

  const stats = {
    total: colorCodes.length,
    manufacturers: manufacturers.length,
    used: colorCodes.filter(c => c.usageCount > 0).length
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>Colors</h1>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            Define and manage paint colors by name, manufacturer, product line, and sheen
          </p>
        </div>
        <AddCustomColorDialog onColorAdded={refreshColors}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Color
          </Button>
        </AddCustomColorDialog>
      </div>

      {/* Compact Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card style={{ backgroundColor: '#ffffff', borderColor: '#f97316', borderWidth: '1px' }}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 flex-shrink-0" style={{ color: '#f97316' }} />
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: '#8b4513' }}>Total</p>
                <p className="text-lg font-semibold" style={{ color: '#c47004' }}>{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ffd8a8' }}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#d2691e' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: '#8b4513' }}>Brands</p>
                <p className="text-lg font-semibold" style={{ color: '#c47004' }}>{stats.manufacturers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#ffffff', borderColor: '#84cc16', borderWidth: '1px' }}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ecfccb' }}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#84cc16' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: '#8b4513' }}>Used</p>
                <p className="text-lg font-semibold" style={{ color: '#c47004' }}>{stats.used}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Most Used Colors */}
      <TopColorsDisplay colors={colorCodes} />

      {/* Filters */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#f97316', borderWidth: '2px' }}>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="text-lg" style={{ color: '#412501' }}>Browse Colors</CardTitle>
              <CardDescription style={{ color: '#8b4513' }}>Search by name, color code, or manufacturer</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search colors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm" style={{ color: '#8b4513' }}>
            <span>
              Showing {filteredColors.length} of {colorCodes.length} colors
            </span>
            {(searchQuery || selectedBrand !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedBrand("all")
                }}
                style={{ color: '#c47004' }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colors Grid/List */}
      {filteredColors.length > 0 ? (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredColors.map((color, index) => (
            <motion.div
              key={color.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.02 }}
            >
              <ColorCard color={color} viewMode={viewMode} onColorDeleted={refreshColors} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card style={{ backgroundColor: '#ffffff', borderColor: '#f97316', borderWidth: '2px' }}>
          <CardContent className="py-12">
            <div className="text-center">
              <Palette className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                No colors found
              </h3>
              <p className="mb-6" style={{ color: '#8b4513' }}>
                Try adjusting your search or filter criteria, or add a new color
              </p>
              <AddCustomColorDialog onColorAdded={refreshColors}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Color
                </Button>
              </AddCustomColorDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
