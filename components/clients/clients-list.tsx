
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, Building2 } from "lucide-react"
import Link from "next/link"
import { ClientCard } from "./client-card"
import { motion } from "framer-motion"

interface ClientsListProps {
  clients: any[]
}

export function ClientsList({ clients }: ClientsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  // Filter by search query
  const filteredClients = searchQuery
    ? clients.filter((client) => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients

  return (
    <div className="space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>Clients</h1>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            Manage your client relationships
          </p>
        </div>
        <Button asChild style={{ backgroundColor: '#c47004' }}>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Link>
        </Button>
      </div>

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

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>
                {searchQuery ? "No clients found" : "No clients yet"}
              </h3>
              <p className="mb-6" style={{ color: '#8b4513' }}>
                {searchQuery ? "Try adjusting your search criteria" : "Create a new client to get started"}
              </p>
              {!searchQuery && (
                <Button asChild style={{ backgroundColor: '#c47004' }}>
                  <Link href="/dashboard/clients/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Client
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <ClientCard client={client} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
