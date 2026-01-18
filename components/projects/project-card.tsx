
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Calendar, 
  MapPin, 
  Camera, 
  Users, 
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Clock
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface ProjectCardProps {
  project: any
  onProjectUpdated?: () => void
}

export function ProjectCard({ project, onProjectUpdated }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "completed":
        return "bg-green-100 text-green-800 border-green-300"
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === project.status) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update project status")
      }

      toast({
        title: "Status Updated",
        description: `Project marked as ${newStatus}`,
      })

      // Refresh the page to show updated data
      if (onProjectUpdated) {
        onProjectUpdated()
      }
    } catch (error) {
      console.error("Error updating project status:", error)
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }





  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-guru-charcoal group-hover:text-primary transition-colors">
              <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                {project.name}
              </Link>
            </h3>
            {project.property?.client && (
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{project.property.client.name}</span>
              </div>
            )}
          </div>
          
          {/* Status Change Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                disabled={isUpdating}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleStatusChange("active")}
                disabled={project.status === "active"}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Mark as Active
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusChange("completed")}
                disabled={project.status === "completed"}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Completed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="space-y-2">
          {project.property?.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{project.property.address}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Updated {formatDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {project._count?.photos || 0}
            </div>
            <div className="text-xs text-gray-600">Photos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {project.rooms?.length || 0}
            </div>
            <div className="text-xs text-gray-600">Rooms</div>
          </div>
          <div className="text-center">
            <Badge className={`text-xs ${getStatusColor(project.status)}`}>
              {project.status}
            </Badge>
          </div>
        </div>

        {/* Rooms Preview */}
        {project.rooms && project.rooms.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Rooms:</div>
            <div className="flex flex-wrap gap-1">
              {project.rooms.slice(0, 3).map((room: any) => (
                <Badge key={room.id} variant="outline" className="text-xs">
                  {room.name}
                </Badge>
              ))}
              {project.rooms.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.rooms.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/photos/upload?project=${project.id}`}>
              <Camera className="h-4 w-4 mr-1" />
              Add Photos
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/projects/${project.id}`}>
              <ArrowRight className="h-4 w-4 mr-1" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
