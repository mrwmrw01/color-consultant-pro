
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
import { Search, Pencil, Trash2, Users, Building2 } from "lucide-react"
import { toast } from "sonner"
import { EditClientDialog } from "./edit-client-dialog"

interface ClientMaintenanceProps {
  clients: any[]
}

export function ClientMaintenance({ clients }: ClientMaintenanceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [clientToEdit, setClientToEdit] = useState<any>(null)
  const [clientToDelete, setClientToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Filter clients by search query
  const filteredClients = searchQuery
    ? clients.filter((client) => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients

  const handleDelete = async () => {
    if (!clientToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete client")
      }

      toast.success("Client deleted successfully")
      setClientToDelete(null)
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting client:", error)
      toast.error(error.message || "Failed to delete client")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>Client Maintenance</h1>
        <p className="mt-1" style={{ color: '#8b4513' }}>
          Edit and delete client information
        </p>
      </div>

      {/* Info Banner */}
      <Card style={{ backgroundColor: '#fef9c3', borderColor: '#eab308', borderWidth: '1px' }}>
        <CardContent className="p-3">
          <p className="text-sm" style={{ color: '#854d0e' }}>
            ℹ️ <strong>Note:</strong> Clients with properties cannot be deleted. Delete all properties first, then delete the client.
          </p>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm" style={{ color: '#8b4513' }}>
                Found {filteredClients.length} clients
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

      {/* Clients Table */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                {searchQuery ? "No clients found" : "No clients yet"}
              </h3>
              <p style={{ color: '#8b4513' }}>
                {searchQuery ? "Try adjusting your search criteria" : "Create a new client to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ color: '#412501' }}>Client Name</TableHead>
                    <TableHead style={{ color: '#412501' }}>Contact</TableHead>
                    <TableHead style={{ color: '#412501' }}>Email</TableHead>
                    <TableHead style={{ color: '#412501' }}>Phone</TableHead>
                    <TableHead style={{ color: '#412501' }}>Type</TableHead>
                    <TableHead style={{ color: '#412501' }}>Status</TableHead>
                    <TableHead style={{ color: '#412501' }}>Properties</TableHead>
                    <TableHead className="text-right" style={{ color: '#412501' }}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium" style={{ color: '#412501' }}>
                        {client.name}
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        {client.contactName || "-"}
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        {client.email || "-"}
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        {client.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: '#d2691e', color: '#8b4513' }}>
                          {client.type === "business" ? "Business" : "Individual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={client.status === "active" ? "default" : "secondary"}
                          style={client.status === "active" ? { backgroundColor: '#16a34a' } : {}}
                        >
                          {client.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#8b4513' }}>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {client._count?.properties || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClientToEdit(client)}
                            style={{ color: '#c47004' }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClientToDelete(client)}
                            style={{ color: client._count?.properties > 0 ? '#9ca3af' : '#dc2626' }}
                            disabled={client._count?.properties > 0}
                            title={client._count?.properties > 0 ? "Cannot delete client with properties" : "Delete client"}
                            className={client._count?.properties > 0 ? "cursor-not-allowed opacity-50" : ""}
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

      {/* Edit Dialog */}
      {clientToEdit && (
        <EditClientDialog
          client={clientToEdit}
          open={!!clientToEdit}
          onOpenChange={(open) => !open && setClientToEdit(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#412501' }}>Delete Client</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#8b4513' }}>
              Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be undone.
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
