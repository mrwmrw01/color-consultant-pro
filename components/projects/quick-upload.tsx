
"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface QuickUploadProps {
  projects: any[]
}

export function QuickUpload({ projects }: QuickUploadProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Get active projects only
  const activeProjects = projects.filter(p => p.status === "active")

  const handleFileSelect = () => {
    if (!selectedProjectId) {
      toast({
        title: "No project selected",
        description: "Please select a project first",
        variant: "destructive",
      })
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedProjectId) return

    setUploading(true)
    setUploadProgress(0)

    try {
      let uploadedCount = 0
      const totalFiles = files.length

      // Upload all files at once
      const formData = new FormData()
      
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i])
      }
      
      formData.append("projectId", selectedProjectId)

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload photos")
      }

      uploadedCount = files.length
      setUploadProgress(100)

      toast({
        title: "Upload successful",
        description: `${uploadedCount} photo${uploadedCount > 1 ? 's' : ''} uploaded successfully`,
      })

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Refresh the page to show updated photo counts
      setTimeout(() => {
        router.refresh()
      }, 500)

    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photos",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Card style={{ backgroundColor: '#ffffff', borderColor: '#c47004', borderWidth: '2px' }}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3e8' }}>
              <Upload className="h-6 w-6" style={{ color: '#c47004' }} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold" style={{ color: '#412501' }}>Quick Upload</p>
              <p className="text-sm" style={{ color: '#8b4513' }}>Upload photos to a project</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={uploading || activeProjects.length === 0}
            >
              <SelectTrigger className="flex-1" style={{ borderColor: '#d2691e' }}>
                <SelectValue placeholder={activeProjects.length === 0 ? "No active projects" : "Select a project"} />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({project._count?.photos || 0} photos)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleFileSelect}
              disabled={!selectedProjectId || uploading || activeProjects.length === 0}
              style={{ backgroundColor: '#c47004' }}
              className="whitespace-nowrap"
            >
              {uploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  {uploadProgress}%
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Select Photos
                </>
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {activeProjects.length === 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#8b4513' }}>
              <AlertCircle className="h-4 w-4" />
              <span>Create an active project to upload photos</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
