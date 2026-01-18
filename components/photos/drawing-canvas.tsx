"use client"

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import Image from "next/image"

interface DrawingCanvasProps {
  imageUrl: string
  tool: {
    type: 'pen' | 'text' | 'colorTag'
    color: string
    strokeWidth: number
    opacity: number
  }
  annotations: any[]
  onAnnotationCreate: (data: any) => void
  onTextAnnotationRequest?: (data: any) => void
  onAnnotationUpdate?: (annotationId: string, newCoordinates: Point[]) => void
  highlightedAnnotationId?: string | null
  onAnnotationSelect?: (annotationId: string | null) => void
}

interface Point {
  x: number
  y: number
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(function DrawingCanvas({ 
  imageUrl, 
  tool, 
  annotations, 
  onAnnotationCreate,
  onTextAnnotationRequest,
  onAnnotationUpdate,
  highlightedAnnotationId,
  onAnnotationSelect
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Expose the canvas element through the ref
  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [draggingAnnotation, setDraggingAnnotation] = useState<{ id: string; type: string; offset: Point } | null>(null)
  const [dragPosition, setDragPosition] = useState<Point | null>(null)

  // Set up canvas when image loads and container resizes
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    
    if (!canvas || !container || !isImageLoaded) return

    const containerRect = container.getBoundingClientRect()
    const aspectRatio = imageDimensions.width / imageDimensions.height
    
    let displayWidth = containerRect.width
    let displayHeight = displayWidth / aspectRatio
    
    if (displayHeight > containerRect.height) {
      displayHeight = containerRect.height
      displayWidth = displayHeight * aspectRatio
    }
    
    // Set canvas size to match display size
    canvas.width = displayWidth
    canvas.height = displayHeight
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`
    
    setCanvasDimensions({ width: displayWidth, height: displayHeight })
    
    // Redraw existing annotations after canvas resize
    redrawAnnotations()
  }, [imageDimensions, isImageLoaded])

  // Load image and get dimensions
  useEffect(() => {
    if (!imageUrl) return

    const img = new window.Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      setIsImageLoaded(true)
    }
    img.onerror = () => {
      console.error("Failed to load image")
    }
    img.src = imageUrl
  }, [imageUrl])

  // Setup canvas when image loads or container size changes
  useEffect(() => {
    setupCanvas()
    
    const handleResize = () => {
      setupCanvas()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setupCanvas])

  // Convert mouse coordinates to canvas coordinates with proper scaling
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !isImageLoaded) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }, [isImageLoaded])

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoordinates = useCallback((canvasCoords: Point) => {
    if (!isImageLoaded || canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      return canvasCoords
    }
    
    return {
      x: (canvasCoords.x / canvasDimensions.width) * imageDimensions.width,
      y: (canvasCoords.y / canvasDimensions.height) * imageDimensions.height
    }
  }, [imageDimensions, canvasDimensions, isImageLoaded])

  // Convert image coordinates back to canvas coordinates for display
  const imageToCanvasCoordinates = useCallback((imageCoords: Point) => {
    if (!isImageLoaded || imageDimensions.width === 0 || imageDimensions.height === 0) {
      return imageCoords
    }
    
    return {
      x: (imageCoords.x / imageDimensions.width) * canvasDimensions.width,
      y: (imageCoords.y / imageDimensions.height) * canvasDimensions.height
    }
  }, [imageDimensions, canvasDimensions, isImageLoaded])

  // Check if click is on a text or colorTag annotation
  const getAnnotationAtPoint = useCallback((canvasCoords: Point) => {
    if (!isImageLoaded) return null
    
    // Check annotations in reverse order (last drawn on top)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      const annotData = annotation.data || annotation
      
      if ((annotation.type === 'text' || annotData.type === 'text') && annotData.coordinates && annotData.coordinates[0]) {
        const coord = imageToCanvasCoordinates(annotData.coordinates[0])
        const fontSize = Math.max(12, Math.floor(canvasDimensions.width / 50))
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) continue
        
        ctx.font = `${fontSize}px Arial`
        const textMetrics = ctx.measureText(annotData.text || '')
        const padding = 4
        
        // Check if click is within text bounds
        if (canvasCoords.x >= coord.x - padding &&
            canvasCoords.x <= coord.x + textMetrics.width + padding &&
            canvasCoords.y >= coord.y - padding &&
            canvasCoords.y <= coord.y + fontSize + padding) {
          return { annotation, index: i }
        }
      }
      
      if ((annotation.type === 'colorTag' || annotData.type === 'colorTag') && annotData.coordinates && annotData.coordinates[0]) {
        const coord = imageToCanvasCoordinates(annotData.coordinates[0])
        const tagRadius = Math.max(10, Math.floor(canvasDimensions.width / 60))
        
        // Check if click is within circle
        const dx = canvasCoords.x - coord.x
        const dy = canvasCoords.y - coord.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= tagRadius) {
          return { annotation, index: i }
        }
      }
    }
    
    return null
  }, [annotations, isImageLoaded, imageToCanvasCoordinates, canvasDimensions])

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(event)
    
    // Check if we're clicking on an existing text or colorTag annotation
    const clickedAnnotation = getAnnotationAtPoint(coords)
    
    if (clickedAnnotation) {
      const annotation = clickedAnnotation.annotation
      const annotData = annotation.data || annotation
      
      // If we're in pen tool mode or clicking an annotation, select it for highlighting
      if (tool.type === 'pen' || annotation.type === 'text' || annotation.type === 'colorTag') {
        // Notify parent about the selection
        if (onAnnotationSelect && annotation.id) {
          onAnnotationSelect(annotation.id)
        }
      }
      
      // If it's a draggable annotation (text or colorTag), set up dragging
      if (annotation.type === 'text' || annotation.type === 'colorTag') {
        const annotCoord = imageToCanvasCoordinates(annotData.coordinates[0])
        setDraggingAnnotation({
          id: annotation.id,
          type: annotation.type,
          offset: {
            x: coords.x - annotCoord.x,
            y: coords.y - annotCoord.y
          }
        })
        return
      }
    }
    
    // If no annotation was clicked, proceed with drawing tools
    if (tool.type === 'pen') {
      setIsDrawing(true)
      setCurrentPath([coords])
    } else if (tool.type === 'colorTag') {
      // Create color tag annotation immediately at the clicked position
      const imageCoords = canvasToImageCoordinates(coords)
      
      if (isNaN(imageCoords.x) || isNaN(imageCoords.y) || imageCoords.x < 0 || imageCoords.y < 0) {
        console.error("Invalid coordinates for color tag:", imageCoords)
        return
      }
      
      onAnnotationCreate({
        type: 'colorTag',
        coordinates: [imageCoords],
        bounds: { 
          x: imageCoords.x, 
          y: imageCoords.y, 
          width: 20, 
          height: 20 
        }
      })
    } else if (tool.type === 'text') {
      // For text tool, request text input via dialog
      const imageCoords = canvasToImageCoordinates(coords)
      
      if (isNaN(imageCoords.x) || isNaN(imageCoords.y) || imageCoords.x < 0 || imageCoords.y < 0) {
        console.error("Invalid coordinates for text annotation:", imageCoords)
        return
      }
      
      if (onTextAnnotationRequest) {
        onTextAnnotationRequest({
          type: 'text',
          coordinates: [imageCoords],
          bounds: { 
            x: imageCoords.x, 
            y: imageCoords.y, 
            width: 100, 
            height: 20 
          }
        })
      }
    }
  }, [tool.type, getCanvasCoordinates, canvasToImageCoordinates, onAnnotationCreate, onTextAnnotationRequest, getAnnotationAtPoint, imageToCanvasCoordinates, onAnnotationSelect])

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle dragging annotation
    if (draggingAnnotation) {
      const coords = getCanvasCoordinates(event)
      setDragPosition(coords)
      return
    }
    
    if (!isDrawing || tool.type !== 'pen') return
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    
    const coords = getCanvasCoordinates(event)
    setCurrentPath(prev => {
      const newPath = [...prev, coords]
      
      // Draw the current stroke on canvas with applied opacity and stroke width
      ctx.globalAlpha = tool.opacity
      ctx.strokeStyle = tool.color
      ctx.lineWidth = tool.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      if (newPath.length > 1) {
        const prevPoint = newPath[newPath.length - 2]
        ctx.beginPath()
        ctx.moveTo(prevPoint.x, prevPoint.y)
        ctx.lineTo(coords.x, coords.y)
        ctx.stroke()
      }
      
      return newPath
    })
  }, [isDrawing, tool, getCanvasCoordinates, draggingAnnotation])

  const stopDrawing = useCallback((event?: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle finishing drag of annotation
    if (draggingAnnotation && event) {
      const coords = getCanvasCoordinates(event)
      const newCanvasCoords = {
        x: coords.x - draggingAnnotation.offset.x,
        y: coords.y - draggingAnnotation.offset.y
      }
      const newImageCoords = canvasToImageCoordinates(newCanvasCoords)
      
      // Save the new position
      if (onAnnotationUpdate && !isNaN(newImageCoords.x) && !isNaN(newImageCoords.y)) {
        onAnnotationUpdate(draggingAnnotation.id, [newImageCoords])
      }
      
      setDraggingAnnotation(null)
      setDragPosition(null)
      return
    }
    
    if (isDrawing && tool.type === 'pen' && currentPath.length > 1) {
      // Convert canvas coordinates to image coordinates for storage
      const imageCoords = currentPath.map(point => canvasToImageCoordinates(point))
      
      const validCoords = imageCoords.filter(coord => 
        !isNaN(coord.x) && !isNaN(coord.y) && coord.x >= 0 && coord.y >= 0
      )
      
      if (validCoords.length > 1) {
        // Save the drawing path as annotation with current tool settings
        onAnnotationCreate({
          type: 'drawing',
          coordinates: validCoords,
          strokeStyle: tool.color,
          strokeWidth: tool.strokeWidth,
          opacity: tool.opacity
        })
      } else {
        console.error("Invalid drawing path - insufficient valid coordinates:", imageCoords)
      }
    }
    
    setIsDrawing(false)
    setCurrentPath([])
    setDraggingAnnotation(null)
    setDragPosition(null)
  }, [isDrawing, tool, currentPath, canvasToImageCoordinates, onAnnotationCreate, draggingAnnotation, getCanvasCoordinates, onAnnotationUpdate])

  // Redraw all existing annotations on canvas
  const redrawAnnotations = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !isImageLoaded) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw existing annotations
    annotations.forEach(annotation => {
      const annotData = annotation.data || annotation
      const isHighlighted = highlightedAnnotationId === annotation.id
      
      // If this annotation is being dragged, calculate its temporary position
      let displayCoord: Point | null = null
      if (draggingAnnotation && annotation.id === draggingAnnotation.id && dragPosition) {
        displayCoord = {
          x: dragPosition.x - draggingAnnotation.offset.x,
          y: dragPosition.y - draggingAnnotation.offset.y
        }
      }
      
      // Drawing/pen annotations
      if ((annotation.type === 'drawing' || annotData.type === 'drawing') && annotData.coordinates) {
        const canvasCoords = annotData.coordinates.map((point: Point) => 
          imageToCanvasCoordinates(point)
        )
        
        // Apply highlight glow effect for drawing annotations
        if (isHighlighted && canvasCoords.length > 1) {
          ctx.save()
          ctx.shadowColor = '#3b82f6' // Blue glow
          ctx.shadowBlur = 15
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = (annotData.strokeWidth || 3) + 4
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          
          ctx.beginPath()
          ctx.moveTo(canvasCoords[0].x, canvasCoords[0].y)
          canvasCoords.forEach((point: Point) => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
          ctx.restore()
        }
        
        // Draw the actual annotation
        ctx.globalAlpha = annotData.opacity || 1
        ctx.strokeStyle = annotData.strokeStyle || '#dc2626'
        ctx.lineWidth = annotData.strokeWidth || 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        if (canvasCoords.length > 1) {
          ctx.beginPath()
          ctx.moveTo(canvasCoords[0].x, canvasCoords[0].y)
          canvasCoords.forEach((point: Point) => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
        }
      }
      
      // Text annotations
      else if ((annotation.type === 'text' || annotData.type === 'text') && annotData.text && annotData.coordinates && annotData.coordinates[0]) {
        // Use displayCoord if dragging, otherwise use stored coordinates
        const coord = displayCoord || imageToCanvasCoordinates(annotData.coordinates[0])
        
        // Set up text style - scale font size based on canvas size
        const fontSize = Math.max(12, Math.floor(canvasDimensions.width / 50))
        ctx.font = `${fontSize}px Arial`
        ctx.textBaseline = 'top'
        
        // Measure text for background
        const textMetrics = ctx.measureText(annotData.text)
        const padding = 4
        
        // Apply highlight glow effect
        if (isHighlighted) {
          ctx.save()
          ctx.shadowColor = '#3b82f6' // Blue glow
          ctx.shadowBlur = 20
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          
          // Draw highlight background
          ctx.fillStyle = '#3b82f6'
          ctx.globalAlpha = 0.3
          ctx.fillRect(
            coord.x - padding - 4,
            coord.y - padding - 4,
            textMetrics.width + (padding * 2) + 8,
            fontSize + (padding * 2) + 8
          )
          ctx.restore()
        }
        
        // Draw background
        ctx.fillStyle = '#000000'
        ctx.globalAlpha = 0.8
        ctx.fillRect(
          coord.x - padding,
          coord.y - padding,
          textMetrics.width + (padding * 2),
          fontSize + (padding * 2)
        )
        
        // Draw text
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 1
        ctx.fillText(annotData.text, coord.x, coord.y)
      }
      
      // Color tag annotations
      else if ((annotation.type === 'colorTag' || annotData.type === 'colorTag') && annotData.coordinates && annotData.coordinates[0]) {
        // Use displayCoord if dragging, otherwise use stored coordinates
        const coord = displayCoord || imageToCanvasCoordinates(annotData.coordinates[0])
        const color = annotation.color?.hexColor || '#dc2626'
        const colorCode = annotation.color?.colorCode || annotation.color?.name || 'TAG'
        
        // Scale tag size based on canvas size
        const tagRadius = Math.max(10, Math.floor(canvasDimensions.width / 60))
        const fontSize = Math.max(10, Math.floor(canvasDimensions.width / 60))
        
        // Apply highlight glow effect
        if (isHighlighted) {
          ctx.save()
          ctx.shadowColor = '#3b82f6' // Blue glow
          ctx.shadowBlur = 20
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
          
          // Draw highlight circle
          ctx.fillStyle = '#3b82f6'
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          ctx.arc(coord.x, coord.y, tagRadius + 8, 0, 2 * Math.PI)
          ctx.fill()
          ctx.restore()
        }
        
        // Draw circle
        ctx.fillStyle = color
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(coord.x, coord.y, tagRadius, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw white border
        ctx.strokeStyle = isHighlighted ? '#3b82f6' : '#ffffff'
        ctx.lineWidth = isHighlighted ? 3 : 2
        ctx.globalAlpha = 1
        ctx.stroke()
        
        // Draw label if color info exists
        if (annotation.color) {
          ctx.font = `bold ${fontSize}px Arial`
          ctx.textBaseline = 'middle'
          const textMetrics = ctx.measureText(colorCode)
          const padding = 6
          
          // Draw label background
          ctx.fillStyle = isHighlighted ? '#3b82f6' : '#000000'
          ctx.globalAlpha = 0.85
          ctx.fillRect(
            coord.x + tagRadius + 5,
            coord.y - (fontSize / 2) - 4,
            textMetrics.width + (padding * 2),
            fontSize + 8
          )
          
          // Draw label text
          ctx.fillStyle = '#ffffff'
          ctx.globalAlpha = 1
          ctx.fillText(colorCode, coord.x + tagRadius + 5 + padding, coord.y)
        }
      }
    })
    
    // Reset context
    ctx.globalAlpha = 1
  }, [annotations, isImageLoaded, imageToCanvasCoordinates, canvasDimensions, draggingAnnotation, dragPosition, highlightedAnnotationId])

  // Redraw annotations when they change
  useEffect(() => {
    redrawAnnotations()
  }, [redrawAnnotations])

  const getCursorStyle = () => {
    if (draggingAnnotation) return 'move'
    switch (tool.type) {
      case 'pen': return 'crosshair'
      case 'colorTag': return 'pointer'
      case 'text': return 'text'
      default: return 'default'
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="relative w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" 
      style={{ aspectRatio: '16/12', minHeight: '400px' }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={imageUrl}
          alt="Photo for annotation"
          fill
          className="object-contain"
          priority
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
      
      {/* Canvas wrapper to ensure proper positioning */}
      <div 
        className="relative" 
        style={{ 
          width: canvasDimensions.width ? `${canvasDimensions.width}px` : '100%',
          height: canvasDimensions.height ? `${canvasDimensions.height}px` : '100%'
        }}
      >
        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={(e) => stopDrawing(e)}
          onMouseLeave={(e) => stopDrawing(e)}
          style={{ 
            zIndex: 10,
            cursor: getCursorStyle()
          }}
        />
      </div>
    </div>
  )
})
