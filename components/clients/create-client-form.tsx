
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Users, Mail, Phone, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

export function CreateClientForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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
    
    if (!formData.name.trim()) {
      toast.error("Client name is required")
      document.getElementById("name")?.focus()
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        notes: formData.notes.trim() || null
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Client created successfully!")
        router.push(`/dashboard/clients/${data.id}`)
      } else {
        toast.error(data.error || "Failed to create client")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error creating client:", error)
      toast.error("Failed to create client")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Client</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Add a new client to your portfolio
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Information
            </CardTitle>
            <CardDescription>
              Basic details about the client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Client Name *</Label>
              <Input
                id="name"
                placeholder="e.g., John Smith or Smith Family"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                className="h-11 text-base"
                autoComplete="name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 h-11 text-base"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10 h-11 text-base"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional information about the client..."
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
                Creating Client...
              </>
            ) : (
              "Create Client"
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            asChild 
            className="h-12 text-base touch-manipulation"
          >
            <Link href="/dashboard/clients">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
