
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building2, MapPin, Loader2 } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface CreatePropertyFormProps {
  clientId: string
  clientName: string
}

const PROPERTY_TYPES = [
  "Residential",
  "Commercial",
  "Apartment",
  "Condo",
  "Townhouse",
  "Office",
  "Retail",
  "Other"
]

export function CreatePropertyForm({ clientId, clientName }: CreatePropertyFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "",
    notes: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    if (!formData.address.trim() && !formData.name.trim()) {
      toast.error("Either property name or address is required")
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        clientId,
        name: formData.name.trim() || null,
        address: formData.address.trim() || null,
        type: formData.type || null,
        notes: formData.notes.trim() || null
      }

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Property created successfully!")
        router.push(`/dashboard/clients/${clientId}/properties/${data.id}`)
      } else {
        toast.error(data.error || "Failed to create property")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error creating property:", error)
      toast.error("Failed to create property")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href={`/dashboard/clients/${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {clientName}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Property</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Add a property for {clientName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Information
            </CardTitle>
            <CardDescription>
              Details about the property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Property Name</Label>
              <Input
                id="name"
                placeholder="e.g., Main Residence, Downtown Office"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-11 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Optional - A friendly name for the property
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-base">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="address"
                  placeholder="123 Main St, City, State, ZIP"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="pl-10 h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-base">Property Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger id="type" className="h-11">
                  <SelectValue placeholder="Select property type..." />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional information about the property..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
                className="text-base resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="flex-1 h-12 text-base font-semibold touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Property...
              </>
            ) : (
              "Create Property"
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            asChild 
            className="h-12 text-base touch-manipulation"
          >
            <Link href={`/dashboard/clients/${clientId}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
