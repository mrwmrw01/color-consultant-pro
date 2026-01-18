
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit, Plus, X, Home, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ROOM_HIERARCHY } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "completed", "archived"])
})

interface Room {
  id: string
  name: string
  description: string
  isNew?: boolean
  toDelete?: boolean
}

interface EditProjectDialogProps {
  project: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onProjectUpdated?: () => void
}

export function EditProjectDialog({ 
  project, 
  trigger, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange, 
  onProjectUpdated
}: EditProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [newRoom, setNewRoom] = useState({ name: "", description: "" })
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [nameError, setNameError] = useState("")
  const router = useRouter()
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      clientName: project?.clientName || "",
      clientEmail: project?.clientEmail || "",
      clientPhone: project?.clientPhone || "",
      address: project?.address || "",
      status: project?.status || "active"
    },
  })

  // Reset form and rooms when project changes or dialog opens
  useEffect(() => {
    if (project && open) {
      form.reset({
        name: project.name || "",
        description: project.description || "",
        clientName: project.clientName || "",
        clientEmail: project.clientEmail || "",
        clientPhone: project.clientPhone || "",
        address: project.address || "",
        status: project.status || "active"
      })
      
      // Initialize rooms from project
      setRooms(project.rooms?.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description || "",
        isNew: false,
        toDelete: false
      })) || [])
      
      setNewRoom({ name: "", description: "" })
      setNameError("")
      setIsCheckingName(false)
    }
  }, [project, open, form])

  const addRoom = () => {
    if (newRoom.name.trim()) {
      setRooms(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: newRoom.name.trim(),
        description: newRoom.description.trim(),
        isNew: true
      }])
      setNewRoom({ name: "", description: "" })
    }
  }

  const removeRoom = (roomId: string) => {
    setRooms(prev => {
      const room = prev.find(r => r.id === roomId)
      if (room?.isNew) {
        // If it's a new room, just remove it from the list
        return prev.filter(r => r.id !== roomId)
      } else {
        // If it's an existing room, mark it for deletion
        return prev.map(r => r.id === roomId ? { ...r, toDelete: true } : r)
      }
    })
  }

  const addPredefinedRoom = (roomName: string) => {
    if (!rooms.some(room => room.name === roomName && !room.toDelete)) {
      setRooms(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name: roomName,
        description: "",
        isNew: true
      }])
    }
  }

  // Check if project name already exists (excluding current project)
  const checkProjectName = async (name: string) => {
    if (!name.trim() || !project?.id) {
      setNameError("")
      return
    }

    // If name hasn't changed, no need to check
    if (name.trim() === project.name) {
      setNameError("")
      return
    }

    setIsCheckingName(true)
    try {
      const response = await fetch(`/api/projects/check-name?name=${encodeURIComponent(name.trim())}`)
      const data = await response.json()
      
      if (data.exists) {
        setNameError(`A project named "${name}" already exists`)
      } else {
        setNameError("")
      }
    } catch (error) {
      console.error("Error checking project name:", error)
    } finally {
      setIsCheckingName(false)
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!project?.id) {
      toast.error("No project selected")
      return
    }

    // Check for name errors before submitting
    if (nameError) {
      toast.error(nameError)
      return
    }
    
    setIsLoading(true)
    
    try {
      // Update project details
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update project")
      }

      // Handle room changes
      const roomsToCreate = rooms.filter(r => r.isNew && !r.toDelete)
      const roomsToDelete = rooms.filter(r => r.toDelete && !r.isNew)

      // Create new rooms
      for (const room of roomsToCreate) {
        try {
          await fetch(`/api/projects/${project.id}/rooms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: room.name,
              description: room.description || null
            }),
          })
        } catch (error) {
          console.error(`Failed to create room ${room.name}:`, error)
          toast.error(`Failed to create room "${room.name}"`)
        }
      }

      // Delete marked rooms
      for (const room of roomsToDelete) {
        try {
          await fetch(`/api/projects/${project.id}/rooms/${room.id}`, {
            method: "DELETE"
          })
        } catch (error) {
          console.error(`Failed to delete room ${room.name}:`, error)
          toast.error(`Failed to delete room "${room.name}"`)
        }
      }
      
      toast.success("Project updated successfully")
      setOpen(false)
      
      // Notify parent component and refresh
      if (onProjectUpdated) {
        onProjectUpdated()
      } else {
        // Force page refresh as fallback
        window.location.reload()
      }
      
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update project")
    } finally {
      setIsLoading(false)
    }
  }



  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset form and errors when closing dialog
      form.reset()
      setNameError("")
      setIsCheckingName(false)
    }
  }

  if (!project) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}>
          {trigger}
        </DialogTrigger>
      ) : (
        <Button onClick={() => setOpen(true)} type="button">
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      )}
      
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the project details, client information, and rooms.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="edit-project-form">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Kitchen Renovation" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            // Debounced check
                            const timeout = setTimeout(() => {
                              checkProjectName(e.target.value)
                            }, 500)
                            return () => clearTimeout(timeout)
                          }}
                          className={nameError ? "border-red-500" : ""}
                        />
                        {isCheckingName && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {nameError && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                        <X className="h-3 w-3" />
                        {nameError}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the project..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rooms Section */}
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Rooms</h3>
              </div>

              {/* Quick Add Buttons */}
              <div>
                <div className="text-sm font-medium mb-2">Quick Add Common Rooms:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(ROOM_HIERARCHY).slice(0, 8).map(roomType => (
                    <Button
                      key={roomType}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPredefinedRoom(roomType)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {roomType}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Manual Room Entry */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Name</label>
                  <Input
                    placeholder="Living Room"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Optional"
                    value={newRoom.description}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">&nbsp;</label>
                  <Button
                    type="button"
                    onClick={addRoom}
                    disabled={!newRoom.name.trim()}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Added/Existing Rooms */}
              {rooms.filter(r => !r.toDelete).length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Rooms ({rooms.filter(r => !r.toDelete).length}):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.filter(r => !r.toDelete).map(room => (
                      <Badge key={room.id} variant="outline" className="text-sm py-1 px-2 flex items-center gap-2">
                        <span>
                          {room.name}
                          {room.isNew && <span className="text-xs text-green-600 ml-1">(new)</span>}
                        </span>
                        {room.description && (
                          <span className="text-xs text-gray-500">
                            • {room.description}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 text-gray-400 hover:text-red-500"
                          onClick={() => removeRoom(room.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {rooms.some(r => r.toDelete) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">
                    Rooms to be deleted ({rooms.filter(r => r.toDelete).length}):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.filter(r => r.toDelete).map(room => (
                      <Badge key={room.id} variant="destructive" className="text-sm py-1 px-2 opacity-60">
                        <Trash2 className="h-3 w-3 mr-1" />
                        {room.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </Form>
        </ScrollArea>

        <DialogFooter className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} form="edit-project-form">
            {isLoading ? "Updating..." : "Update Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
      

    </Dialog>
  )
}

