
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Building2, 
  FolderOpen, 
  Camera, 
  Palette, 
  FileText, 
  Plus, 
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface DashboardOverviewProps {
  clients: any[]
  stats: {
    totalClients: number
    totalProperties: number
    totalProjects: number
    totalPhotos: number
    activeProjects: number
    totalColors: number
  }
  user: any
}

export function DashboardOverview({ clients, stats, user }: DashboardOverviewProps) {
  return (
    <div className="space-y-8" style={{ backgroundColor: '#fef3e8', padding: '2rem', borderRadius: '0.5rem' }}>
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#412501' }}>
            Welcome back, {user?.firstName || user?.name}! 
          </h1>
          <p className="mt-1" style={{ color: '#8b4513' }}>
            Here's what's happening with your consultations today
          </p>
        </div>
        <Button asChild className="w-full lg:w-auto" style={{ backgroundColor: '#c47004' }}>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card style={{ backgroundColor: '#ffffff', borderColor: '#c47004', borderWidth: '1px' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-8 w-8 mb-2" style={{ color: '#c47004' }} />
              <p className="text-2xl font-bold" style={{ color: '#412501' }}>{stats.totalClients}</p>
              <p className="text-xs" style={{ color: '#8b4513' }}>Clients</p>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#ffffff', borderColor: '#d2691e', borderWidth: '1px' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Building2 className="h-8 w-8 mb-2" style={{ color: '#d2691e' }} />
              <p className="text-2xl font-bold" style={{ color: '#412501' }}>{stats.totalProperties}</p>
              <p className="text-xs" style={{ color: '#8b4513' }}>Properties</p>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#ffffff', borderColor: '#f97316', borderWidth: '1px' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <FolderOpen className="h-8 w-8 mb-2" style={{ color: '#f97316' }} />
              <p className="text-2xl font-bold" style={{ color: '#412501' }}>{stats.totalProjects}</p>
              <p className="text-xs" style={{ color: '#8b4513' }}>Projects</p>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#ffffff', borderColor: '#8b4513', borderWidth: '1px' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <FolderOpen className="h-8 w-8 mb-2" style={{ color: '#8b4513' }} />
              <p className="text-2xl font-bold" style={{ color: '#412501' }}>{stats.activeProjects}</p>
              <p className="text-xs" style={{ color: '#8b4513' }}>Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#c47004', borderWidth: '1px' }}>
        <CardHeader>
          <CardTitle style={{ color: '#412501' }}>Quick Actions</CardTitle>
          <CardDescription style={{ color: '#8b4513' }}>Common tasks to help you work efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/dashboard/clients/new">
                <div>
                  <Plus className="h-5 w-5 mb-2" />
                  <div className="text-left">
                    <p className="font-medium">New Client</p>
                    <p className="text-sm text-gray-600">Add a new client</p>
                  </div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/dashboard/projects/new">
                <div>
                  <FolderOpen className="h-5 w-5 mb-2" />
                  <div className="text-left">
                    <p className="font-medium">New Project</p>
                    <p className="text-sm text-gray-600">Create a new project</p>
                  </div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/dashboard/photos/upload">
                <div>
                  <Camera className="h-5 w-5 mb-2" />
                  <div className="text-left">
                    <p className="font-medium">Upload Photos</p>
                    <p className="text-sm text-gray-600">Add project images</p>
                  </div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start" asChild>
              <Link href="/dashboard/synopsis">
                <div>
                  <FileText className="h-5 w-5 mb-2" />
                  <div className="text-left">
                    <p className="font-medium">Color Synopsis</p>
                    <p className="text-sm text-gray-600">Generate reports</p>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Clients */}
      <Card style={{ backgroundColor: '#ffffff', borderColor: '#f97316', borderWidth: '1px' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#412501' }}>Recent Clients</CardTitle>
              <CardDescription style={{ color: '#8b4513' }}>Your latest client activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/clients" style={{ color: '#c47004' }}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <div className="space-y-4">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
                  <div className="flex-1">
                    <h4 className="font-medium" style={{ color: '#412501' }}>{client.name}</h4>
                    {client.email && (
                      <p className="text-sm" style={{ color: '#8b4513' }}>{client.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: '#8b4513' }}>
                        {client._count?.properties || 0} {client._count?.properties === 1 ? 'property' : 'properties'}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/clients/${client.id}`}>
                      <ArrowRight className="h-4 w-4" style={{ color: '#c47004' }} />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#d2691e' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#412501' }}>No clients yet</h3>
              <p className="mb-4" style={{ color: '#8b4513' }}>Add your first client to get started</p>
              <Button asChild style={{ backgroundColor: '#c47004' }}>
                <Link href="/dashboard/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
