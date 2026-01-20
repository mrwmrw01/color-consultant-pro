

"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Copy, Eye, Trash2, Sparkles } from "lucide-react"
import toast from "react-hot-toast"

interface ColorCardProps {
  color: any
  viewMode: "grid" | "list"
  onColorDeleted?: () => void
}

export function ColorCard({ color, viewMode, onColorDeleted }: ColorCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const copyColorInfo = () => {
    const info = `${color.colorCode} - ${color.name} - ${color.manufacturer}`
    navigator.clipboard.writeText(info)
    toast.success(`Copied color info to clipboard`)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/colors?id=${color.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete color')
      }

      toast.success(`Color "${color.colorCode}" deleted successfully`)
      setShowDeleteDialog(false)
      onColorDeleted?.()
    } catch (error: any) {
      console.error('Error deleting color:', error)
      toast.error(error.message || 'Failed to delete color')
    } finally {
      setIsDeleting(false)
    }
  }

  // Group availability by product line
  const availabilityByProduct = color.availability?.reduce((acc: any, avail: any) => {
    if (!acc[avail.productLine]) {
      acc[avail.productLine] = []
    }
    acc[avail.productLine].push(avail.sheen)
    return acc
  }, {}) || {}

  // Check if this is the first time the color is being used
  const isFirstUse = !color.firstUsedAt && color.usageCount === 0

  if (viewMode === "list") {
    return (
      <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Color?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{color.colorCode} - {color.name}</strong>?
              This action cannot be undone. This color can only be deleted if it is not being used in any projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Color Card */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Color Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" style={{ color: '#111827' }}>{color.name}</h3>
                {isFirstUse && (
                  <Badge 
                    className="font-black border border-gray-900"
                    style={{ color: '#ffffff !important', backgroundColor: '#84cc16 !important' }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    First Use
                  </Badge>
                )}
              </div>
              <div className="mb-2">
                <span className="text-base font-medium" style={{ color: '#111827' }}>{color.colorCode}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold" style={{ color: '#111827 !important' }}>{color.manufacturer}</p>
              </div>
              
              {color.usageCount > 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Used {color.usageCount}x
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyColorInfo}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
    )
  }

  return (
    <>
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Color?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{color.colorCode} - {color.name}</strong>?
            This action cannot be undone. This color can only be deleted if it is not being used in any projects.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    {/* Color Card */}
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        {/* Color Name and Code */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold" style={{ color: '#111827 !important' }}>{color.name}</h3>
            {isFirstUse && (
              <Badge 
                className="font-black border border-gray-900"
                style={{ color: '#ffffff !important', backgroundColor: '#84cc16 !important' }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                First Use
              </Badge>
            )}
          </div>
          
          <div className="mb-2">
            <span className="text-base font-medium" style={{ color: '#111827 !important' }}>{color.colorCode}</span>
          </div>
        </div>

        {/* Color Info */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-bold" style={{ color: '#111827 !important' }}>{color.manufacturer}</p>
              {color.colorFamily && (
                <Badge variant="outline" className="text-xs border-gray-600 font-medium" style={{ color: '#111827 !important', backgroundColor: '#ffffff !important' }}>
                  {color.colorFamily}
                </Badge>
              )}
            </div>
          </div>

          {/* Usage info */}
          {color.usageCount > 0 && (
            <Badge variant="outline" className="text-xs border-gray-600 font-medium" style={{ color: '#111827 !important', backgroundColor: '#ffffff !important' }}>
              <Eye className="h-3 w-3 mr-1" />
              {color.usageCount}x used
            </Badge>
          )}

          <div className="pt-2 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 border-gray-600 hover:bg-gray-100 font-bold" style={{ color: '#111827 !important', backgroundColor: '#ffffff' }} onClick={copyColorInfo}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Info
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="hover:bg-red-50 border-red-500 font-bold"
              style={{ color: '#991b1b' }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
