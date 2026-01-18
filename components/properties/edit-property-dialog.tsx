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
import { Edit } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  type: z.enum(["residential", "commercial", "other"]).optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).optional()
})

interface EditPropertyDialogProps {
  property: any
  clientId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onPropertyUpdated?: () => void
}

export function EditPropertyDialog({ 
  property,
  clientId,
  trigger, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange, 
  onPropertyUpdated
}: EditPropertyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: property?.name || "",
      address: property?.address || "",
      city: property?.city || "",
      state: property?.state || "",
      zipCode: property?.zipCode || "",
      type: property?.type || "residential",
      contactName: property?.contactName || "",
      contactEmail: property?.contactEmail || "",
      contactPhone: property?.contactPhone || "",
      notes: property?.notes || "",
      status: property?.status || "active"
    },
  })

  // Reset form when property changes or dialog opens
  useEffect(() => {
    if (property && open) {
      form.reset({
        name: property.name || "",
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zipCode: property.zipCode || "",
        type: property.type || "residential",
        contactName: property.contactName || "",
        contactEmail: property.contactEmail || "",
        contactPhone: property.contactPhone || "",
        notes: property.notes || "",
        status: property.status || "active"
      })
    }
  }, [property, open, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!property?.id) {
      toast.error("No property selected")
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update property")
      }
      
      toast.success("Property updated successfully")
      setOpen(false)
      
      // Notify parent component and refresh
      if (onPropertyUpdated) {
        onPropertyUpdated()
      } else {
        router.refresh()
      }
      
    } catch (error) {
      console.error("Error updating property:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update property")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
    }
  }

  if (!property) {
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
        <Button onClick={() => setOpen(true)} type="button" variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      
      <DialogContent className="sm:max-w-[600px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle style={{ color: '#412501' }}>Edit Property</DialogTitle>
          <DialogDescription style={{ color: '#8b4513' }}>
            Update the property details and contact information.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="edit-property-form">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Property Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Office Building" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Springfield" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="IL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input placeholder="62701" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
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
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about the property..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            form="edit-property-form"
            style={{ backgroundColor: '#c47004' }}
          >
            {isLoading ? "Updating..." : "Update Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
