
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Building2 } from "lucide-react"
import Link from "next/link"
import { PropertyCard } from "./property-card"
import { motion } from "framer-motion"

interface PropertiesListProps {
  properties: any[]
  clientId: string
}

export function PropertiesList({ properties, clientId }: PropertiesListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter by search query
  const filteredProperties = searchQuery
    ? properties.filter((property) => 
        property.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : properties

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#412501' }}>Properties</h2>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            Manage properties for this client
          </p>
        </div>
        <Button asChild style={{ backgroundColor: '#c47004' }}>
          <Link href={`/dashboard/clients/${clientId}/properties/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Property
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      {properties.length > 0 && (
        <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties..."
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
      )}

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                {searchQuery ? "No properties found" : "No properties yet"}
              </h3>
              <p className="mb-6" style={{ color: '#8b4513' }}>
                {searchQuery ? "Try adjusting your search criteria" : "Add a property to get started"}
              </p>
              {!searchQuery && (
                <Button asChild style={{ backgroundColor: '#c47004' }}>
                  <Link href={`/dashboard/clients/${clientId}/properties/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <PropertyCard property={property} clientId={clientId} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
