
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Building2, Mail, Phone, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ClientCardProps {
  client: any
}

export function ClientCard({ client }: ClientCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow" style={{ borderColor: '#d2691e', borderWidth: '1px' }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: '#c47004' }} />
            <CardTitle className="text-lg" style={{ color: '#412501' }}>
              {client.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        {(client.email || client.phone) && (
          <div className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#8b4513' }}>
                <Mail className="h-4 w-4" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#8b4513' }}>
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm" style={{ color: '#8b4513' }}>
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span>{client._count?.properties || 0} {client._count?.properties === 1 ? 'property' : 'properties'}</span>
          </div>
        </div>

        {/* Notes Preview */}
        {client.notes && (
          <p className="text-sm line-clamp-2" style={{ color: '#8b4513' }}>
            {client.notes}
          </p>
        )}

        {/* Actions */}
        <div className="pt-2">
          <Button asChild className="w-full" style={{ backgroundColor: '#c47004' }}>
            <Link href={`/dashboard/clients/${client.id}`}>
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
