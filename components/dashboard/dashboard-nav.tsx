
"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Palette, 
  Menu, 
  LogOut, 
  User, 
  Settings,
  Home,
  FolderOpen,
  Camera,
  FileText,
  Plus,
  Tag,
  ChevronRight,
  ChevronDown,
  Wrench,
  Users,
  Building2
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: FolderOpen,
  },
  {
    name: "Color Catalog",
    href: "/dashboard/colors",
    icon: Palette,
  },
  {
    name: "Synopsis Forms",
    href: "/dashboard/synopsis",
    icon: FileText,
  }
]

const quickActions = [
  {
    name: "New Client",
    href: "/dashboard/clients/new",
    icon: Plus,
  }
]

export function DashboardNav() {
  const { data: session } = useSession() || {}
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const userInitials = session?.user?.firstName && session?.user?.lastName 
    ? `${session.user.firstName[0]}${session.user.lastName[0]}`
    : session?.user?.name?.split(' ')?.map(n => n[0])?.join('') || 'U'

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0" style={{ backgroundColor: '#fef3e8' }}>
                <SheetHeader className="p-6 border-b" style={{ borderColor: '#d2691e' }}>
                  <SheetTitle className="flex items-center gap-2" style={{ color: '#412501' }}>
                    <Palette className="h-6 w-6" style={{ color: '#c47004' }} />
                    Color Consultant Pro
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-[calc(100vh-5rem)] overflow-y-auto">
                  {/* Navigation */}
                  <nav className="flex-1 px-4 py-6 space-y-2">
                    <div className="space-y-1">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href || 
                          (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                            )}
                            style={isActive ? { backgroundColor: '#f97316', color: '#ffffff' } : { color: '#8b4513' }}
                          >
                            <item.icon
                              className="mr-3 h-5 w-5 flex-shrink-0"
                              style={{ color: isActive ? '#ffffff' : '#d2691e' }}
                            />
                            <span className="truncate">{item.name}</span>
                          </Link>
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
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                            style={{ color: '#8b4513' }}
                          >
                            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                            <span className="truncate">{item.name}</span>
                            <ChevronRight className="ml-auto h-4 w-4" />
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
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                          style={{ color: '#8b4513' }}
                        >
                          <Users className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                          <span className="truncate">Client Maintenance</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Link>
                        <Link
                          href="/dashboard/properties/maintenance"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                          style={{ color: '#8b4513' }}
                        >
                          <Building2 className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                          <span className="truncate">Property Maintenance</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Link>
                        <Link
                          href="/dashboard/maintenance"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                          style={{ color: '#8b4513' }}
                        >
                          <Wrench className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                          <span className="truncate">Project Management</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Link>
                        <Link
                          href="/dashboard/photos/annotations"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                          style={{ color: '#8b4513' }}
                        >
                          <Tag className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: '#d2691e' }} />
                          <span className="truncate">Annotations Management</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
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
                      <Button 
                        size="sm" 
                        className="w-full text-xs" 
                        asChild 
                        style={{ backgroundColor: '#c47004' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link href="/dashboard/help">
                          Learn More
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Link href="/dashboard" className="flex items-center gap-2">
              <Palette className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Paint Consultant Pro
              </span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-gray-600">
              Welcome, {session?.user?.firstName || session?.user?.name}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full"
                  aria-label="User menu"
                  title="Open user menu"
                  onClick={(e) => {
                    // Dropdown handles the click, this just makes it explicit for testing
                    e.currentTarget.setAttribute('data-state', 'open')
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">
                      {session?.user?.firstName} {session?.user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session?.user?.email}
                    </p>
                    {session?.user?.companyName && (
                      <p className="text-xs text-muted-foreground">
                        {session.user.companyName}
                      </p>
                    )}
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
