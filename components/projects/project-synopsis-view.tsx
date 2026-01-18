
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Sparkles,
  Calendar,
  Eye,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
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
import Link from "next/link"
import { SynopsisViewer } from "@/components/synopsis-viewer"
import { CreateSynopsisDialog } from "@/components/synopsis/create-synopsis-dialog"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProjectSynopsisViewProps {
  project: any
}

export function ProjectSynopsisView({ project }: ProjectSynopsisViewProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSynopsis, setSelectedSynopsis] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedView, setSelectedView] = useState<'auto' | string>('auto')
  const router = useRouter()

  const handleDeleteSynopsis = async () => {
    if (deleting || !selectedSynopsis) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/synopsis/${selectedSynopsis.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.details || 'Failed to delete synopsis'
        throw new Error(errorMessage)
      }

      if (data.success) {
        toast.success(`Synopsis "${selectedSynopsis.title}" deleted successfully`)
        setDeleteDialogOpen(false)
        setSelectedSynopsis(null)
        
        // If we were viewing this synopsis, switch to auto view
        if (selectedView === selectedSynopsis.id) {
          setSelectedView('auto')
        }
        
        // Refresh the page
        router.refresh()
      } else {
        throw new Error('Server did not confirm successful deletion')
      }
      
    } catch (error) {
      console.error('Error deleting synopsis:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to delete synopsis: ${errorMessage}`)
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (synopsis: any) => {
    setSelectedSynopsis(synopsis)
    setDeleteDialogOpen(true)
  }

  const handleSynopsisCreated = () => {
    router.refresh()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/projects/${project.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Color Synopsis</h1>
            <p className="text-gray-600 mt-1">
              {project.name} - {project.clientName}
            </p>
          </div>
        </div>
        <CreateSynopsisDialog 
          projects={[project]} 
          onSynopsisCreated={handleSynopsisCreated}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Synopsis
          </Button>
        </CreateSynopsisDialog>
      </div>

      {/* Synopsis Selector */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          {/* Auto-Generated Synopsis Tab */}
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Auto-Generated Synopsis
          </TabsTrigger>
          
          {/* Manual Synopsis Tabs */}
          {project.synopsis && project.synopsis.length > 0 && project.synopsis.map((syn: any) => (
            <TabsTrigger key={syn.id} value={syn.id} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {syn.title}
              <Badge variant="secondary" className="ml-1">
                {syn._count?.entries || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Auto-Generated Synopsis Content */}
        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    Auto-Generated Synopsis
                  </CardTitle>
                  <CardDescription className="mt-2">
                    This synopsis is automatically generated from all color annotations in this project.
                    It updates in real-time as you add or modify annotations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <SynopsisViewer projectId={project.id} />
        </TabsContent>

        {/* Manual Synopsis Content */}
        {project.synopsis && project.synopsis.length > 0 && project.synopsis.map((syn: any) => (
          <TabsContent key={syn.id} value={syn.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {syn.title}
                    </CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(syn.createdAt).toLocaleDateString()}
                      </div>
                      {syn.notes && (
                        <div className="mt-2 text-sm">{syn.notes}</div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {syn._count?.entries || 0} entries
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/synopsis/${syn.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View & Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(syn)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Synopsis
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <Button asChild>
                    <Link href={`/dashboard/synopsis/${syn.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Full Synopsis Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Empty State for Manual Synopsis */}
      {(!project.synopsis || project.synopsis.length === 0) && selectedView === 'auto' && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Named Synopsis Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create custom synopsis forms with specific titles to organize different color specifications for this project. You can have multiple synopsis per client (e.g., "First Floor Colors", "Second Floor Colors", "Exterior Colors", etc.)
              </p>
              <CreateSynopsisDialog 
                projects={[project]} 
                onSynopsisCreated={handleSynopsisCreated}
              >
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Named Synopsis
                </Button>
              </CreateSynopsisDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Synopsis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSynopsis?.title}"? This action cannot be undone. 
              All synopsis entries and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSynopsis}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Synopsis"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
