
import { prisma } from "@/lib/db"

export interface SynopsisData {
  project: {
    id: string
    name: string
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    address: string | null
  }
  colorSummary: {
    trim: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[]; isUniversal: boolean }>
    ceilings: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[]; isUniversal: boolean }>
    walls: Array<{ colorCode: string; name: string; manufacturer: string; productLines: string[] }>
  }
  roomData: Array<{
    roomName: string
    surfaces: Array<{
      surfaceType: string
      surfaceArea?: string
      colorCode: string
      colorName: string
      productLine: string
      sheen: string
      notes?: string
      photos: Array<{
        id: string
        cloudStoragePath: string
        fileName: string
      }>
    }>
  }>
}

export async function generateSynopsisFromAnnotations(projectId: string): Promise<SynopsisData> {
  // Fetch project with all related data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      property: {
        include: {
          client: true
        }
      },
      rooms: true,
      photos: {
        include: {
          annotations: {
            include: {
              color: {
                include: {
                  availability: true
                }
              },
              room: true
            }
          }
        }
      }
    }
  })

  if (!project) {
    throw new Error("Project not found")
  }

  // Organize data by surface type for summary
  const trimColors = new Map<string, { colorCode: string; name: string; manufacturer: string; productLines: Set<string> }>()
  const ceilingColors = new Map<string, { colorCode: string; name: string; manufacturer: string; productLines: Set<string> }>()
  const wallColors = new Map<string, { colorCode: string; name: string; manufacturer: string; productLines: Set<string> }>()

  // Track trim/ceiling colors per room for universal detection
  const trimByRoom = new Map<string, Set<string>>() // roomName -> Set of color codes
  const ceilingByRoom = new Map<string, Set<string>>() // roomName -> Set of color codes

  // Organize data by room
  const roomDataMap = new Map<string, Array<{
    surfaceType: string
    surfaceArea?: string
    colorCode: string
    colorName: string
    productLine: string
    sheen: string
    notes?: string
    photos: Array<{
      id: string
      cloudStoragePath: string
      fileName: string
    }>
  }>>()

  // Collect all annotations from photos (with photo reference)
  const allAnnotations: any[] = []
  for (const photo of project.photos) {
    for (const annotation of photo.annotations) {
      // Include annotations that have at least a color and surface type
      if (annotation.color && annotation.surfaceType) {
        // If productLine or sheen is missing, try to get from color's availability
        let productLine = annotation.productLine
        let sheen = annotation.sheen
        
        if ((!productLine || !sheen) && annotation.color.availability && annotation.color.availability.length > 0) {
          const firstAvailability = annotation.color.availability[0]
          if (!productLine) productLine = firstAvailability.productLine
          if (!sheen) sheen = firstAvailability.sheen
        }
        
        // Only include if we have all required fields (either from annotation or from availability)
        if (productLine && sheen) {
          allAnnotations.push({
            ...annotation,
            productLine,
            sheen,
            photoId: photo.id,
            photoCloudStoragePath: photo.cloud_storage_path,
            photoFileName: photo.filename
          })
        }
      }
    }
  }

  // Process all valid annotations
  for (const annotation of allAnnotations) {
    const colorKey = annotation.color.colorCode
    const surfaceType = annotation.surfaceType.toLowerCase()
    const productLineSheen = `${annotation.productLine} - ${annotation.sheen}`
    const roomName = annotation.room?.name || "Global/No Room Assigned"

    // Determine if this is trim, ceiling, or wall
    const isTrim = surfaceType.includes('trim') || surfaceType.includes('baseboard') || 
                   surfaceType.includes('molding') || surfaceType.includes('door') || 
                   surfaceType.includes('window') || surfaceType.includes('wainscoting')
    const isCeiling = surfaceType.includes('ceiling')
    const isWall = surfaceType.includes('wall')

    // Add to appropriate summary collection
    if (isTrim) {
      if (!trimColors.has(colorKey)) {
        trimColors.set(colorKey, {
          colorCode: annotation.color.colorCode,
          name: annotation.color.name,
          manufacturer: annotation.color.manufacturer,
          productLines: new Set()
        })
      }
      trimColors.get(colorKey)!.productLines.add(productLineSheen)
      
      // Track trim color by room
      if (!trimByRoom.has(roomName)) {
        trimByRoom.set(roomName, new Set())
      }
      trimByRoom.get(roomName)!.add(colorKey)
    } else if (isCeiling) {
      if (!ceilingColors.has(colorKey)) {
        ceilingColors.set(colorKey, {
          colorCode: annotation.color.colorCode,
          name: annotation.color.name,
          manufacturer: annotation.color.manufacturer,
          productLines: new Set()
        })
      }
      ceilingColors.get(colorKey)!.productLines.add(productLineSheen)
      
      // Track ceiling color by room
      if (!ceilingByRoom.has(roomName)) {
        ceilingByRoom.set(roomName, new Set())
      }
      ceilingByRoom.get(roomName)!.add(colorKey)
    } else if (isWall) {
      if (!wallColors.has(colorKey)) {
        wallColors.set(colorKey, {
          colorCode: annotation.color.colorCode,
          name: annotation.color.name,
          manufacturer: annotation.color.manufacturer,
          productLines: new Set()
        })
      }
      wallColors.get(colorKey)!.productLines.add(productLineSheen)
    }

    // Add to room data
    if (!roomDataMap.has(roomName)) {
      roomDataMap.set(roomName, [])
    }

    const annotationData = annotation.data as any
    const roomSurfaces = roomDataMap.get(roomName)!
    
    // Find if we already have this surface/color combination
    const existingSurface = roomSurfaces.find(s => 
      s.surfaceType === annotation.surfaceType &&
      s.colorCode === annotation.color.colorCode &&
      s.productLine === annotation.productLine &&
      s.sheen === annotation.sheen
    )

    if (existingSurface) {
      // Add photo if not already present
      const photoExists = existingSurface.photos.some(p => p.id === annotation.photoId)
      if (!photoExists) {
        existingSurface.photos.push({
          id: annotation.photoId,
          cloudStoragePath: annotation.photoCloudStoragePath,
          fileName: annotation.photoFileName
        })
      }
      // Combine notes if they exist (avoid duplicates)
      if (annotation.notes && (!existingSurface.notes || !existingSurface.notes.includes(annotation.notes))) {
        existingSurface.notes = existingSurface.notes 
          ? `${existingSurface.notes}; ${annotation.notes}`
          : annotation.notes
      }
    } else {
      // Create new surface entry
      roomSurfaces.push({
        surfaceType: annotation.surfaceType,
        surfaceArea: annotationData?.label || annotationData?.text,
        colorCode: annotation.color.colorCode,
        colorName: annotation.color.name,
        productLine: annotation.productLine,
        sheen: annotation.sheen,
        notes: annotation.notes || undefined,
        photos: [{
          id: annotation.photoId,
          cloudStoragePath: annotation.photoCloudStoragePath,
          fileName: annotation.photoFileName
        }]
      })
    }
  }

  // Smart Detection: Determine if trim/ceiling colors are universal
  // Trim is universal if: there's only one trim color across all rooms with trim
  const allTrimColors = new Set<string>()
  trimByRoom.forEach(colors => colors.forEach(c => allTrimColors.add(c)))
  const isTrimUniversal = allTrimColors.size === 1 && trimByRoom.size > 0

  // Ceiling is universal if: there's only one ceiling color across all rooms with ceilings
  const allCeilingColors = new Set<string>()
  ceilingByRoom.forEach(colors => colors.forEach(c => allCeilingColors.add(c)))
  const isCeilingUniversal = allCeilingColors.size === 1 && ceilingByRoom.size > 0

  // Convert maps to arrays for the result
  const colorSummary = {
    trim: Array.from(trimColors.values()).map(c => ({
      ...c,
      productLines: Array.from(c.productLines),
      isUniversal: isTrimUniversal && allTrimColors.has(c.colorCode)
    })).filter(c => c.isUniversal), // Only include universal trim in summary
    ceilings: Array.from(ceilingColors.values()).map(c => ({
      ...c,
      productLines: Array.from(c.productLines),
      isUniversal: isCeilingUniversal && allCeilingColors.has(c.colorCode)
    })).filter(c => c.isUniversal), // Only include universal ceilings in summary
    walls: Array.from(wallColors.values()).map(c => ({
      ...c,
      productLines: Array.from(c.productLines)
    }))
  }

  const roomData = Array.from(roomDataMap.entries()).map(([roomName, surfaces]) => ({
    roomName,
    surfaces
  }))

  return {
    project: {
      id: project.id,
      name: project.name,
      clientName: project.clientName || project.property?.client?.name || '',
      clientEmail: project.clientEmail || project.property?.client?.email || null,
      clientPhone: project.clientPhone || project.property?.client?.phone || null,
      address: project.address || project.property?.address || null
    },
    colorSummary,
    roomData
  }
}
