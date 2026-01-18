
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Plus, 
  Calendar, 
  Users, 
  ArrowRight,
  Download,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  Sparkles
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
import { motion } from "framer-motion"
import { CreateSynopsisDialog } from "./create-synopsis-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SynopsisListProps {
  synopsis: any[]
  projects: any[]
}

export function SynopsisList({ synopsis, projects }: SynopsisListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSynopsis, setSelectedSynopsis] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const exportSynopsis = async (synopsisId: string, title: string) => {
    try {
      const response = await fetch(`/api/synopsis/${synopsisId}/export?format=excel`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_color_synopsis.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleDeleteSynopsis = async () => {
    if (deleting || !selectedSynopsis) return

    setDeleting(true)
    try {
      console.log('Deleting synopsis:', selectedSynopsis.id, selectedSynopsis.title)
      
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
        console.error('Failed to parse response JSON:', jsonError)
        throw new Error('Invalid response from server')
      }

      console.log('Delete response:', { 
        status: response.status, 
        ok: response.ok,
        data 
      })

      if (!response.ok) {
        const errorMessage = data?.error || data?.details || `HTTP ${response.status}: Failed to delete synopsis`
        console.error('Delete failed with error:', errorMessage)
        throw new Error(errorMessage)
      }

      if (data.success) {
        console.log('Successfully deleted synopsis:', selectedSynopsis.title)
        toast.success(`Synopsis "${selectedSynopsis.title}" deleted successfully`)
        setDeleteDialogOpen(false)
        setSelectedSynopsis(null)
        
        // Refresh the page to show updated list
        router.refresh()
        
      } else {
        console.error('Delete response missing success confirmation:', data)
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

  const openDeleteDialog = (synopsisItem: any) => {
    setSelectedSynopsis(synopsisItem)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Color Synopsis Forms</h1>
          <p className="text-gray-600 mt-1">
            Generate and manage color specification reports
          </p>
        </div>
      </div>

      {/* Tabs for different synopsis types */}
      <Tabs defaultValue="auto" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Auto-Generated
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manual Forms
          </TabsTrigger>
        </TabsList>

        {/* Auto-Generated Synopsis Tab */}
        <TabsContent value="auto" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Synopsis reports auto-generated from annotated photos with thumbnail previews
            </p>
          </div>

          {projects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Users className="h-4 w-4" />
                            {project.clientName}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Auto
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {project._count.photos} photos
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {project._count.rooms} rooms
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/dashboard/projects/${project.id}/synopsis`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Synopsis
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No projects yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create a project and annotate photos to generate automatic synopsis
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/projects/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manual Synopsis Forms Tab */}
        <TabsContent value="manual" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Manually created synopsis forms with editable color specifications
            </p>
            <CreateSynopsisDialog projects={projects} />
          </div>

          {synopsis.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {synopsis.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Users className="h-4 w-4" />
                            {item.project.name}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {item.entries?.length || 0} entries
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/synopsis/${item.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(item)}
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
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(item.createdAt).toLocaleDateString()}
                      </div>

                      {item.notes && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/dashboard/synopsis/${item.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => exportSynopsis(item.id, item.title)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No manual forms yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create custom synopsis forms with editable color specifications
                  </p>
                  <CreateSynopsisDialog projects={projects}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Manual Form
                    </Button>
                  </CreateSynopsisDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
