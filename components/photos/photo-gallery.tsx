
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Camera, Search, Filter, Plus, Grid, List, Upload } from "lucide-react"
import Link from "next/link"
import { PhotoCard } from "./photo-card"
import { motion } from "framer-motion"

interface PhotoGalleryProps {
  photos: any[]
  projects: any[]
  globalRooms: any[]
}

export function PhotoGallery({ photos, projects, globalRooms }: PhotoGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedRoom, setSelectedRoom] = useState("all")

  // Filter photos based on search and selections
  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch = photo.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.room?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesProject = selectedProject === "all" || photo.projectId === selectedProject
    const matchesRoom = selectedRoom === "all" || photo.roomId === selectedRoom
    
    return matchesSearch && matchesProject && matchesRoom
  })

  // All rooms are now global, available to all projects
  const availableRooms = globalRooms

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>Photo Gallery</h1>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            Manage and annotate your consultation photos
          </p>
        </div>
        <Button asChild style={{ backgroundColor: '#c47004' }}>
          <Link href="/dashboard/photos/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Photos
          </Link>
        </Button>
      </div>

      {/* Filters and Search */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="text-lg" style={{ color: '#412501' }}>Filter Photos</CardTitle>
              <CardDescription style={{ color: '#8b4513' }}>
                Find photos by project, room, or filename
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                style={viewMode === "grid" ? { backgroundColor: '#c47004' } : {}}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                style={viewMode === "list" ? { backgroundColor: '#c47004' } : {}}
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
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableRooms.length > 0 && (
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {availableRooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <span>
              Showing {filteredPhotos.length} of {photos.length} photos
            </span>
            {(searchQuery || selectedProject !== "all" || selectedRoom !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedProject("all")
                  setSelectedRoom("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid/List */}
      {filteredPhotos.length > 0 ? (
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <PhotoCard photo={photo} viewMode={viewMode} globalRooms={globalRooms} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {photos.length === 0 ? "No photos yet" : "No photos match your filters"}
              </h3>
              <p className="text-gray-600 mb-6">
                {photos.length === 0 
                  ? "Upload photos to start annotating and creating color specifications"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              <Button asChild>
                <Link href="/dashboard/photos/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  )
}
