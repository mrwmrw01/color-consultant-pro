
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Building2, MapPin, FolderOpen, ArrowRight, Trash2, Edit } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { EditPropertyDialog } from "./edit-property-dialog"

interface PropertyCardProps {
  property: any
  clientId: string
}

export function PropertyCard({ property, clientId }: PropertyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete property")
      }

      toast.success("Property deleted successfully")
      setShowDeleteDialog(false)
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting property:", error)
      toast.error(error.message || "Failed to delete property")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasProjects = property._count?.projects > 0

  return (
    <>
    <Card className="hover:shadow-lg transition-shadow" style={{ borderColor: '#d2691e', borderWidth: '1px' }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Building2 className="h-5 w-5 flex-shrink-0" style={{ color: '#c47004' }} />
            <CardTitle className="text-lg" style={{ color: '#412501' }}>
              {property.name || property.address}
            </CardTitle>
          </div>
          {property.type && (
            <Badge variant="secondary" className="ml-2">
              {property.type}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        {property.address && (
          <div className="flex items-start gap-2 text-sm" style={{ color: '#8b4513' }}>
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{property.address}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm" style={{ color: '#8b4513' }}>
          <div className="flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span>{property._count?.projects || 0} {property._count?.projects === 1 ? 'project' : 'projects'}</span>
          </div>
        </div>

        {/* Notes Preview */}
        {property.notes && (
          <p className="text-sm line-clamp-2" style={{ color: '#8b4513' }}>
            {property.notes}
          </p>
        )}

        {/* Actions */}
        <div className="pt-2 flex gap-2">
          <Button asChild className="flex-1" style={{ backgroundColor: '#c47004' }}>
            <Link href={`/dashboard/clients/${clientId}/properties/${property.id}`}>
              View Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <EditPropertyDialog
            property={property}
            clientId={clientId}
            onPropertyUpdated={() => router.refresh()}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                style={{ color: '#c47004' }}
                title="Edit property"
              >
                <Edit className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            disabled={hasProjects}
            style={{ color: hasProjects ? '#9ca3af' : '#dc2626' }}
            className={hasProjects ? "cursor-not-allowed opacity-50" : ""}
            title={hasProjects ? "Cannot delete property with projects" : "Delete property"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: '#412501' }}>Delete Property</AlertDialogTitle>
          <AlertDialogDescription style={{ color: '#8b4513' }}>
            Are you sure you want to delete "{property.name || property.address}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            style={{ backgroundColor: '#dc2626' }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
