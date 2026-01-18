
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface CreateSynopsisDialogProps {
  projects: any[]
  onSynopsisCreated?: (synopsis: any) => void
  children?: React.ReactNode
}

export function CreateSynopsisDialog({ projects, onSynopsisCreated, children }: CreateSynopsisDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Pre-select project if only one is provided
  const defaultProjectId = projects.length === 1 ? projects[0].id : ""
  
  const [formData, setFormData] = useState({
    projectId: defaultProjectId,
    title: "",
    notes: "",
    generateFromAnnotations: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.projectId || !formData.title) {
      toast.error("Please select a project and enter a title")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/synopsis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const synopsis = await response.json()
        toast.success("Synopsis created successfully!")
        
        if (onSynopsisCreated) {
          onSynopsisCreated(synopsis)
        }
        
        setOpen(false)
        setFormData({
          projectId: defaultProjectId,
          title: "",
          notes: "",
          generateFromAnnotations: true
        })
        
        // Refresh the page to show the new synopsis
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create synopsis")
      }
    } catch (error) {
      console.error("Error creating synopsis:", error)
      toast.error("Failed to create synopsis")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === formData.projectId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Synopsis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Color Synopsis</DialogTitle>
            <DialogDescription>
              Generate a color specification report from your project annotations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                disabled={projects.length === 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.clientName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <p className="text-sm text-gray-600">
                  {selectedProject._count?.photos || 0} photos, {selectedProject._count?.rooms || 0} rooms
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Synopsis Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Living Room Color Specification"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate"
                checked={formData.generateFromAnnotations}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, generateFromAnnotations: checked as boolean }))
                }
              />
              <Label htmlFor="generate" className="text-sm">
                Auto-generate entries from photo annotations
              </Label>
            </div>
            
            {formData.generateFromAnnotations && (
              <p className="text-xs text-gray-600">
                This will automatically create synopsis entries based on color tags in your project photos.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Synopsis
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
