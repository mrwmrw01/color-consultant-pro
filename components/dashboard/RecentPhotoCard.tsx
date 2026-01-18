
"use client"

import { useState, useEffect } from "react"
import { Camera } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface RecentPhotoCardProps {
  photo: any
}

export function RecentPhotoCard({ photo }: RecentPhotoCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        const response = await fetch(`/api/photos/${photo.id}/url`)
        if (response.ok) {
          const data = await response.json()
          setImageUrl(data.url)
        } else {
          setHasError(true)
        }
      } catch (error) {
        console.error("Failed to fetch image URL:", error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageUrl()
  }, [photo.id])

  return (
    <Link href={`/dashboard/photos/${photo.id}/annotate`}>
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-10" />
        <div className="absolute bottom-2 left-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white font-medium truncate drop-shadow-lg">
            {photo.project?.name}
          </p>
        </div>
        
        {isLoading ? (
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        ) : imageUrl && !hasError ? (
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={photo.originalFilename || "Photo"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 33vw, 25vw"
              onError={() => setHasError(true)}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Camera className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>
    </Link>
  )
}
