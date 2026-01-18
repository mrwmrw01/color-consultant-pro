
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  FolderOpen, 
  CheckCircle2,
  Clock
} from "lucide-react"
import Link from "next/link"
import { ProjectCard } from "./project-card"
import { QuickUpload } from "./quick-upload"
import { motion } from "framer-motion"

interface ProjectsListProps {
  projects: any[]
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const router = useRouter()

  const handleProjectDeleted = () => {
    console.log('handleProjectDeleted called - refreshing projects list')
    // Force a hard refresh to ensure we get the latest data
    window.location.reload()
  }
  
  const handleProjectUpdated = () => {
    console.log('handleProjectUpdated called - refreshing projects list')
    // Force a hard refresh to ensure we get the latest data
    window.location.reload()
  }

  // Separate projects by status
  const activeProjects = projects.filter(p => p.status === "active")
  const completedProjects = projects.filter(p => p.status === "completed")

  // Filter by search query
  const filterBySearch = (projectList: any[]) => {
    if (!searchQuery) return projectList
    return projectList.filter((project) => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.property?.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.property?.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredActiveProjects = filterBySearch(activeProjects)
  const filteredCompletedProjects = filterBySearch(completedProjects)

  const renderProjectGrid = (projectsList: any[], emptyMessage: string) => {
    if (projectsList.length === 0) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                {emptyMessage}
              </h3>
              <p className="mb-6" style={{ color: '#8b4513' }}>
                {searchQuery ? "Try adjusting your search criteria" : "Add a client and property first to create projects"}
              </p>
              {!searchQuery && (
                <Button asChild style={{ backgroundColor: '#c47004' }}>
                  <Link href="/dashboard/clients">
                    <Plus className="mr-2 h-4 w-4" />
                    Go to Clients
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectsList.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <ProjectCard 
              project={project} 
              onProjectUpdated={handleProjectUpdated}
            />
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>All Projects</h1>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            View all consultation projects across clients and properties
          </p>
        </div>
        <Button asChild style={{ backgroundColor: '#c47004' }}>
          <Link href="/dashboard/clients">
            <Plus className="mr-2 h-4 w-4" />
            View Clients
          </Link>
        </Button>
      </div>

      {/* Quick Upload */}
      <QuickUpload projects={projects} />

      {/* Search Bar */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects by name, client, property, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm" style={{ color: '#8b4513' }}>
                Found {filteredActiveProjects.length + filteredCompletedProjects.length} projects
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSearchQuery("")}
                style={{ color: '#c47004' }}
              >
                Clear Search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Active and Completed */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: '#ffffff' }}>
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Active ({filteredActiveProjects.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({filteredCompletedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {renderProjectGrid(filteredActiveProjects, "No active projects")}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {renderProjectGrid(filteredCompletedProjects, "No completed projects")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
