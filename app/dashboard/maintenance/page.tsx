
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle, Loader2, FolderOpen, Calendar, Users } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

interface Project {
  id: string
  name: string
  clientName: string
  address?: string
  status: string
  createdAt: string
  updatedAt: string
  _count?: {
    photos?: number
    rooms?: number
  }
}

export default function MaintenancePage() {
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [deleteMode, setDeleteMode] = useState<"selected" | "all">("selected")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/projects')
      if (response.ok) {
        const projectsData = await response.json()
        setProjects(projectsData)
      } else {
        toast.error('Failed to load projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Error loading projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== "loading") {
      fetchProjects()
    }
  }, [status])

  const handleSelectProject = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId])
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(projects.map(p => p.id))
    } else {
      setSelectedProjects([])
    }
  }

  const handleBulkSelect = (criteria: string) => {
    let filtered: Project[] = []
    
    switch (criteria) {
      case "active":
        filtered = projects.filter(p => p.status === "active")
        break
      case "completed":
        filtered = projects.filter(p => p.status === "completed")
        break
      case "archived":
        filtered = projects.filter(p => p.status === "archived")
        break
      case "empty":
        filtered = projects.filter(p => (!p._count?.photos || p._count.photos === 0) && (!p._count?.rooms || p._count.rooms === 0))
        break
      case "old":
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        filtered = projects.filter(p => new Date(p.updatedAt) < sixMonthsAgo)
        break
      case "none":
        filtered = []
        break
      default:
        break
    }
    
    setSelectedProjects(filtered.map(p => p.id))
  }

  const handleDelete = async () => {

    console.log('='.repeat(80))
    console.log('MAINTENANCE PAGE: Starting delete operation')
    console.log('Delete mode:', deleteMode)
    console.log('Selected projects:', selectedProjects)
    
    try {
      setIsDeleting(true)

      if (deleteMode === "all") {
        console.log('Executing DELETE ALL operation...')
        // Delete all projects using bulk delete API
        const response = await fetch("/api/projects?action=deleteAll", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        console.log('Response status:', response.status)
        const data = await response.json()
        console.log('Response data:', data)

        if (!response.ok) {
          console.error('❌ Delete all failed:', data)
          throw new Error(data.error || data.details || "Failed to delete all projects")
        }

        console.log('✓ Successfully deleted all projects')
        toast.success(`Successfully deleted ${data.deletedCount} projects`)
        setProjects([])
        setSelectedProjects([])
        
      } else if (selectedProjects.length === 1) {
        console.log('Executing SINGLE DELETE operation...')
        // Delete single project using individual delete API
        const projectId = selectedProjects[0]
        console.log('Project ID to delete:', projectId)
        
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        console.log('Response status:', response.status)
        const data = await response.json()
        console.log('Response data:', data)

        if (!response.ok) {
          console.error('❌ Single delete failed:', data)
          throw new Error(data.error || data.details || "Failed to delete project")
        }

        console.log('✓ Successfully deleted project')
        toast.success(data.message || `Successfully deleted project`)
        
        // Remove deleted project from state
        setProjects(prev => prev.filter(p => p.id !== projectId))
        setSelectedProjects([])
        
      } else {
        console.log('Executing MULTIPLE DELETE operation...')
        console.log('Number of projects to delete:', selectedProjects.length)
        // Delete multiple selected projects using bulk delete API
        const response = await fetch("/api/projects?action=deleteMultiple", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ projectIds: selectedProjects })
        })

        console.log('Response status:', response.status)
        const data = await response.json()
        console.log('Response data:', data)

        if (!response.ok) {
          console.error('❌ Multiple delete failed:', data)
          throw new Error(data.error || data.details || "Failed to delete selected projects")
        }

        console.log('✓ Successfully deleted multiple projects')
        toast.success(`Successfully deleted ${data.deletedCount} project${data.deletedCount !== 1 ? 's' : ''}`)
        
        // Remove deleted projects from state
        setProjects(prev => prev.filter(p => !selectedProjects.includes(p.id)))
        setSelectedProjects([])
      }

      setDeleteDialogOpen(false)
      console.log('='.repeat(80))

    } catch (error: any) {
      console.error('='.repeat(80))
      console.error('❌ MAINTENANCE PAGE DELETE ERROR')
      console.error('Error message:', error.message)
      console.error('Full error:', error)
      console.error('='.repeat(80))
      toast.error(error.message || "Failed to delete projects")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setDeleteDialogOpen(newOpen)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
        <p className="text-gray-600 mt-2">Manage and maintain your project data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Project Deletion
          </CardTitle>
          <CardDescription>
            Delete individual projects or perform bulk deletion operations. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No projects found</p>
            </div>
          ) : (
            <>
              {/* Bulk Selection Tools */}
              <div className="flex flex-wrap gap-4 items-center border-b pb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedProjects.length === projects.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({projects.length})
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="bulk-select" className="text-sm">Quick Select:</Label>
                  <Select value="" onValueChange={handleBulkSelect}>
                    <SelectTrigger className="w-48" id="bulk-select">
                      <SelectValue placeholder="Select by criteria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Clear Selection</SelectItem>
                      <SelectItem value="active">Active Projects</SelectItem>
                      <SelectItem value="completed">Completed Projects</SelectItem>
                      <SelectItem value="archived">Archived Projects</SelectItem>
                      <SelectItem value="empty">Empty Projects (No Photos/Rooms)</SelectItem>
                      <SelectItem value="old">Older than 6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedProjects.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedProjects.length} selected
                  </Badge>
                )}
              </div>

              {/* Projects List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center space-x-4 p-3 border rounded-lg transition-colors ${
                      selectedProjects.includes(project.id) 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                        <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.clientName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.updatedAt)}
                        </span>
                        <span>
                          {project._count?.photos || 0} photos, {project._count?.rooms || 0} rooms
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delete Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteMode("selected")
                    setDeleteDialogOpen(true)
                  }}
                  disabled={selectedProjects.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedProjects.length})
                </Button>

                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setDeleteMode("all")
                    setDeleteDialogOpen(true)
                  }}
                  disabled={projects.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Projects ({projects.length})
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {deleteMode === "all" ? "Delete All Projects" : `Delete ${selectedProjects.length} Project${selectedProjects.length !== 1 ? 's' : ''}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "all" 
                ? `This will permanently delete all ${projects.length} of your projects and cannot be undone.`
                : `This will permanently delete the selected ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''} and cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>This action will delete:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  {deleteMode === "all" 
                    ? `All ${projects.length} projects` 
                    : `${selectedProjects.length} selected project${selectedProjects.length !== 1 ? 's' : ''}`
                  }
                </li>
                <li>All associated photos and annotations</li>
                <li>All rooms and their data</li>
                <li>All color synopsis and entries</li>
              </ul>
              <p className="mt-2">
                <strong>User accounts and color codes will remain intact.</strong>
              </p>
            </AlertDescription>
          </Alert>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel disabled={isDeleting}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  Yes
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
