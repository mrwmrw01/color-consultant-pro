
"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  FolderOpen, 
  Camera, 
  Palette, 
  FileText, 
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  Tag,
  Settings,
  Trash2,
  Building2
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React, { useState } from "react"
import type { LucideIcon } from "lucide-react"

type NavigationItem = {
  name: string
  href: string
  icon: LucideIcon
  description: string
  subItems?: Array<{
    name: string
    href: string
    icon: LucideIcon
    description: string
  }>
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and recent activity"
  },
  {
    name: "Clients",
    href: "/dashboard/clients",
    icon: Users,
    description: "Manage clients and properties"
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: FolderOpen,
    description: "Manage client projects"
  },
  {
    name: "Reports",
    href: "/dashboard/synopsis",
    icon: FileText,
    description: "Color specification reports"
  }
]

const quickActions = [
  {
    name: "New Project",
    href: "/dashboard/projects/new",
    icon: Plus,
    description: "Start a new consultation"
  },
  {
    name: "Upload Photos",
    href: "/dashboard/photos/upload",
    icon: Camera,
    description: "Add photos to projects"
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r" style={{ backgroundColor: '#fef3e8', borderColor: '#d2691e' }}>
        <div className="flex flex-col flex-1 min-h-0">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <div className="space-y-1">
              {navigation.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0
                const isExpanded = expandedItems.includes(item.name)
                const isActive = pathname === item.href || 
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                
                return (
                  <div key={item.name}>
                    {hasSubItems ? (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          "w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-left"
                        )}
                        style={isActive ? { backgroundColor: '#f97316', color: '#ffffff' } : { color: '#8b4513' }}
                        onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#ffffff')}
                        onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <item.icon
                          className="mr-3 h-5 w-5 flex-shrink-0"
                          style={{ color: isActive ? '#ffffff' : '#d2691e' }}
                        />
                        <span className="truncate flex-1">{item.name}</span>
                        {isExpanded ? (
                          <ChevronDown className="ml-2 h-4 w-4" style={{ color: isActive ? '#ffffff' : '#8b4513' }} />
                        ) : (
                          <ChevronRight className="ml-2 h-4 w-4" style={{ color: isActive ? '#ffffff' : '#8b4513' }} />
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                        )}
                        style={isActive ? { backgroundColor: '#f97316', color: '#ffffff', borderRight: '2px solid #c47004' } : { color: '#8b4513' }}
                        onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#ffffff')}
                        onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <item.icon
                          className="mr-3 h-5 w-5 flex-shrink-0"
                          style={{ color: isActive ? '#ffffff' : '#d2691e' }}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    )}

                    {/* Sub-menu items */}
                    {hasSubItems && isExpanded && (
                      <div className="ml-6 space-y-1 mt-1">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                              )}
                              style={isSubActive ? { backgroundColor: '#f97316', color: '#ffffff', borderRight: '2px solid #c47004' } : { color: '#8b4513' }}
                              onMouseEnter={(e) => !isSubActive && (e.currentTarget.style.backgroundColor = '#ffffff')}
                              onMouseLeave={(e) => !isSubActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <subItem.icon
                                className="mr-3 h-4 w-4 flex-shrink-0"
                                style={{ color: isSubActive ? '#ffffff' : '#d2691e' }}
                              />
                              <span className="truncate">{subItem.name}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b4513' }}>
                Quick Actions
              </h3>
              <div className="mt-2 space-y-1">
                {quickActions.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                    style={{ color: '#8b4513' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
                      e.currentTarget.style.color = '#412501'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#8b4513'
                    }}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                    <span className="truncate">{item.name}</span>
                    <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Maintenance */}
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b4513' }}>
                Maintenance
              </h3>
              <div className="mt-2 space-y-1">
                <Link
                  href="/dashboard/clients/maintenance"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ color: '#8b4513' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#412501'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8b4513'
                  }}
                >
                  <Users className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                  <span className="truncate">Client Maintenance</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                </Link>
                <Link
                  href="/dashboard/properties/maintenance"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ color: '#8b4513' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#412501'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8b4513'
                  }}
                >
                  <Building2 className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                  <span className="truncate">Property Maintenance</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                </Link>
                <Link
                  href="/dashboard/maintenance"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ color: '#8b4513' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#412501'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8b4513'
                  }}
                >
                  <Settings className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                  <span className="truncate">Project Management</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                </Link>
                <Link
                  href="/dashboard/photos/annotations"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ color: '#8b4513' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#412501'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8b4513'
                  }}
                >
                  <Tag className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                  <span className="truncate">Annotations Management</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                </Link>
                <Link
                  href="/dashboard/colors"
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ color: '#8b4513' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.color = '#412501'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8b4513'
                  }}
                >
                  <Palette className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                  <span className="truncate">Color Catalog</span>
                  <ChevronRight className="ml-auto h-4 w-4" style={{ color: '#8b4513' }} />
                </Link>
              </div>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t" style={{ borderColor: '#d2691e' }}>
            <div className="rounded-lg p-4" style={{ backgroundColor: '#ffffff' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: '#412501' }}>
                Professional Tools
              </h4>
              <p className="text-xs mb-3" style={{ color: '#8b4513' }}>
                Advanced annotation and reporting features for professional consultants.
              </p>
              <Button size="sm" className="w-full text-xs" asChild style={{ backgroundColor: '#c47004' }}>
                <Link href="/dashboard/help">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
