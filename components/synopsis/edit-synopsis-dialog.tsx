

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface EditSynopsisDialogProps {
  synopsis: any
  onSynopsisUpdated?: (synopsis: any) => void
  children?: React.ReactNode
}

export function EditSynopsisDialog({ synopsis, onSynopsisUpdated, children }: EditSynopsisDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    notes: ""
  })

  // Initialize form data when synopsis changes
  useEffect(() => {
    if (synopsis) {
      setFormData({
        title: synopsis.title || "",
        notes: synopsis.notes || ""
      })
    }
  }, [synopsis])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title) {
      toast.error("Please enter a title")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/synopsis/${synopsis.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.title,
          notes: formData.notes
        })
      })

      if (response.ok) {
        const updatedSynopsis = await response.json()
        toast.success("Synopsis updated successfully!")
        
        if (onSynopsisUpdated) {
          onSynopsisUpdated(updatedSynopsis)
        }
        
        setOpen(false)
        
        // Refresh the page to show the updated synopsis
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update synopsis")
      }
    } catch (error) {
      console.error("Error updating synopsis:", error)
      toast.error("Failed to update synopsis")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && synopsis) {
      // Reset form data when dialog opens
      setFormData({
        title: synopsis.title || "",
        notes: synopsis.notes || ""
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Synopsis</DialogTitle>
            <DialogDescription>
              Update the synopsis title and notes. Color specifications can be managed separately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-info">Project</Label>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium">{synopsis?.project?.name}</div>
                <div className="text-xs">{synopsis?.project?.clientName}</div>
              </div>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Synopsis
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

