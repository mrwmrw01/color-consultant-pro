"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Search, Trash2, Building2, FolderOpen, Edit } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { EditPropertyDialog } from "./edit-property-dialog"

interface PropertyMaintenanceProps {
  properties: any[]
}

export function PropertyMaintenance({ properties }: PropertyMaintenanceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [propertyToDelete, setPropertyToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Filter properties by search query
  const filteredProperties = searchQuery
    ? properties.filter((property) => 
        property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : properties

  const handleDelete = async () => {
    if (!propertyToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/properties/${propertyToDelete.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete property")
      }

      toast.success("Property deleted successfully")
      setPropertyToDelete(null)
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting property:", error)
      toast.error(error.message || "Failed to delete property")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>Property Maintenance</h1>
        <p className="mt-1" style={{ color: '#8b4513' }}>
          Manage and delete property information
        </p>
      </div>

      {/* Info Banner */}
      <Card style={{ backgroundColor: '#fef9c3', borderColor: '#eab308', borderWidth: '1px' }}>
        <CardContent className="p-3">
          <p className="text-sm" style={{ color: '#854d0e' }}>
            ℹ️ <strong>Note:</strong> Properties with projects cannot be deleted. Delete all projects first, then delete the property.
          </p>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search properties by address, name, client, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm" style={{ color: '#8b4513' }}>
                Found {filteredProperties.length} properties
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

      {/* Properties Table */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardContent className="p-0">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                {searchQuery ? "No properties found" : "No properties yet"}
              </h3>
              <p style={{ color: '#8b4513' }}>
                {searchQuery ? "Try adjusting your search criteria" : "Create a new property to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: '#412501' }}>Address</TableHead>
                    <TableHead style={{ color: '#412501' }}>Client</TableHead>
                    <TableHead style={{ color: '#412501' }}>City</TableHead>
                    <TableHead style={{ color: '#412501' }}>State</TableHead>
                    <TableHead style={{ color: '#412501' }}>Type</TableHead>
                    <TableHead style={{ color: '#412501' }}>Projects</TableHead>
                    <TableHead className="text-right" style={{ color: '#412501' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium" style={{ color: '#412501' }}>
                        <Link 
                          href={`/dashboard/clients/${property.clientId}/properties/${property.id}`}
                          className="hover:underline"
                        >
                          {property.address}
                        </Link>
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        <Link 
                          href={`/dashboard/clients/${property.clientId}`}
                          className="hover:underline"
                        >
                          {property.client?.name || "-"}
                        </Link>
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        {property.city || "-"}
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        {property.state || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: '#d2691e', color: '#8b4513' }}>
                          {property.type || "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        <div className="flex items-center gap-1">
                          <FolderOpen className="h-4 w-4" />
                          {property._count?.projects || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditPropertyDialog
                            property={property}
                            clientId={property.clientId}
                            onPropertyUpdated={() => router.refresh()}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{ color: '#c47004' }}
                                title="Edit property"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPropertyToDelete(property)}
                            style={{ color: property._count?.projects > 0 ? '#9ca3af' : '#dc2626' }}
                            disabled={property._count?.projects > 0}
                            title={property._count?.projects > 0 ? "Cannot delete property with projects" : "Delete property"}
                            className={property._count?.projects > 0 ? "cursor-not-allowed opacity-50" : ""}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#412501' }}>Delete Property</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#8b4513' }}>
              Are you sure you want to delete "{propertyToDelete?.address}"? This action cannot be undone.
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
    </div>
  )
}
