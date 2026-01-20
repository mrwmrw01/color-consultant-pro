
"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  Camera, 
  X, 
  FileImage, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"

interface PhotoUploadProps {
  projects: any[]
  globalRooms: any[]
  preselectedProjectId?: string
}

interface UploadFile {
  file: File
  preview: string
  status: "pending" | "uploading" | "success" | "error"
  id: string
}

export function PhotoUpload({ projects, globalRooms, preselectedProjectId }: PhotoUploadProps) {
  const [selectedProject, setSelectedProject] = useState(preselectedProjectId || "")
  const [selectedRoom, setSelectedRoom] = useState("")
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update selected project when preselected project changes
  useEffect(() => {
    if (preselectedProjectId && preselectedProjectId !== selectedProject) {
      setSelectedProject(preselectedProjectId)
    }
  }, [preselectedProjectId])

  const selectedProjectData = projects.find(p => p.id === selectedProject)
  
  // Use global rooms directly
  const availableRooms = globalRooms

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    const newFiles: UploadFile[] = selectedFiles
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        id: Math.random().toString(36).substr(2, 9)
      }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    
    const newFiles: UploadFile[] = droppedFiles
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        id: Math.random().toString(36).substr(2, 9)
      }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const uploadFiles = async () => {
    if (!selectedProject) {
      toast.error("Please select a project")
      return
    }

    if (files.length === 0) {
      toast.error("Please select files to upload")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      
      // Add files to form data
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      
      formData.append('projectId', selectedProject)
      if (selectedRoom && selectedRoom !== "none") {
        formData.append('roomId', selectedRoom)
      }

      // Update file statuses to uploading
      setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const })))

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setFiles(prev => prev.map(f => ({ ...f, status: "success" as const })))
        setUploadProgress(100)
        toast.success(`Successfully uploaded ${data.photos.length} photos`)
        
        // Clear form after successful upload and redirect back to project
        setTimeout(() => {
          setFiles([])
          setUploadProgress(0)
          if (selectedProject) {
            router.push(`/dashboard/projects/${selectedProject}`)
          } else {
            router.push("/dashboard/projects")
          }
        }, 2000)
      } else {
        setFiles(prev => prev.map(f => ({ ...f, status: "error" as const })))
        toast.error(data.error || "Upload failed")
      }
    } catch (error) {
      setFiles(prev => prev.map(f => ({ ...f, status: "error" as const })))
      toast.error("Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={selectedProject ? `/dashboard/projects/${selectedProject}` : "/dashboard/projects"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
          <p className="text-gray-600 mt-1">
            Add photos to your consultation projects
          </p>
        </div>
      </div>

      {/* Project and Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Select the project and room for these photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-sm text-gray-500">
                  <Link href="/dashboard/projects/new" className="text-blue-600 hover:underline">
                    Create a project first
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room">Room (Optional)</Label>
              <Select 
                value={selectedRoom} 
                onValueChange={setSelectedRoom}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific room</SelectItem>
                  {availableRooms.map((room: any) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Photos</CardTitle>
          <CardDescription>
            Drag and drop images or click to browse. Supports JPG, PNG, and other image formats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          >
            <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add Photos to Project
            </h3>
            <p className="text-gray-600 mb-6">
              Take a photo or browse your files
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 h-12"
                variant="default"
              >
                <Camera className="h-5 w-5 mr-2" />
                Take Photo
              </Button>

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 h-12"
                variant="outline"
              >
                <Upload className="h-5 w-5 mr-2" />
                Browse Files
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Or drag and drop photos here
            </p>

            {/* Hidden camera input - uses rear camera on mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Hidden file input - for browsing */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* File Preview */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Selected Photos ({files.length})</CardTitle>
                <CardDescription>
                  Review your photos before uploading
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute top-2 right-2">
                          {file.status === "pending" && !isUploading && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {file.status === "uploading" && (
                            <div className="bg-blue-600 text-white p-2 rounded-full">
                              <Upload className="h-4 w-4 animate-bounce" />
                            </div>
                          )}
                          {file.status === "success" && (
                            <div className="bg-green-600 text-white p-2 rounded-full">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          )}
                          {file.status === "error" && (
                            <div className="bg-red-600 text-white p-2 rounded-full">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 truncate">{file.file.name}</p>
                      <Badge 
                        variant={
                          file.status === "success" ? "default" :
                          file.status === "error" ? "destructive" :
                          file.status === "uploading" ? "secondary" : "outline"
                        }
                        className="text-xs mt-1"
                      >
                        {file.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-4">
              <Button
                onClick={uploadFiles}
                disabled={!selectedProject || files.length === 0 || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-bounce" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
