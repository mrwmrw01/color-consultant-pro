
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"

interface DeleteAllProjectsDialogProps {
  projectCount: number
  onProjectsDeleted: () => void
}

export function DeleteAllProjectsDialog({ 
  projectCount, 
  onProjectsDeleted 
}: DeleteAllProjectsDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const expectedConfirmText = "DELETE ALL PROJECTS"
  const isConfirmed = confirmText === expectedConfirmText

  const handleDelete = async () => {
    if (!isConfirmed) return

    try {
      setIsDeleting(true)
      
      const response = await fetch("/api/projects?action=deleteAll", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete projects")
      }

      toast.success(data.message || `Successfully deleted ${data.deletedCount} projects`)
      setOpen(false)
      setConfirmText("")
      onProjectsDeleted()

    } catch (error: any) {
      console.error("Delete all projects error:", error)
      toast.error(error.message || "Failed to delete projects")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setOpen(newOpen)
      if (!newOpen) {
        setConfirmText("")
      }
    }
  }

  if (projectCount === 0) {
    return null // Don't show the button if there are no projects
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 px-0"
        >
          <Trash2 className="mr-3 h-4 w-4 flex-shrink-0" />
          <span className="truncate">Delete All Projects</span>
          {projectCount > 0 && (
            <span className="ml-auto text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
              {projectCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete All Projects
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all {projectCount} of your projects and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>This action will delete:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All {projectCount} projects</li>
              <li>All associated photos and annotations</li>
              <li>All rooms and their data</li>
              <li>All color synopsis and entries</li>
            </ul>
            <p className="mt-2">
              <strong>User accounts and color codes will remain intact.</strong>
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{expectedConfirmText}</code> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type confirmation text..."
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Projects
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
