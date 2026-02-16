
import { useState, useEffect } from "react"
import { SynopsisData } from "@/lib/synopsis-generator"

export function usePhotoUrls(synopsis: SynopsisData | undefined) {
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!synopsis) return

    const loadUrls = async () => {
      // Collect all unique photo IDs
      const photoIds = new Set<string>()
      synopsis.roomData?.forEach((room: any) => {
        room.surfaces?.forEach((surface: any) => {
          surface.photos?.forEach((photo: any) => {
            photoIds.add(photo.id)
          })
        })
      })

      if (photoIds.size === 0) return

      try {
        const urlMap = new Map<string, string>()
        
        // Fetch signed URLs for each photo
        await Promise.all(
          Array.from(photoIds).map(async (photoId) => {
            try {
              const response = await fetch(`/api/photos/${photoId}/url`)
              if (response.ok) {
                const { url } = await response.json()
                urlMap.set(photoId, url)
              }
            } catch (err) {
              console.error(`Error loading URL for photo ${photoId}:`, err)
            }
          })
        )
        
        setPhotoUrls(urlMap)
      } catch (error) {
        console.error("Error loading photo URLs:", error)
      }
    }

    loadUrls()
  }, [synopsis])

  return photoUrls
}
