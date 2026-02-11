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
  zoomLevel?: number
  onZoomChange?: (zoom: number) => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
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
  onAnnotationSelect,
  zoomLevel = 100,
  onZoomChange,
  onSwipeLeft,
  onSwipeRight
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
  
  // Pinch-to-zoom state
  const [pinchState, setPinchState] = useState<{
    isPinching: boolean
    startDistance: number
    startZoom: number
    lastCenter: Point | null
  }>({
    isPinching: false,
    startDistance: 0,
    startZoom: 100,
    lastCenter: null
  })

  // Swipe detection state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const SWIPE_THRESHOLD = 50 // Minimum distance for swipe
  const SWIPE_TIMEOUT = 300 // Maximum time for swipe (ms)

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

  // Convert touch coordinates to canvas coordinates with proper scaling
  const getTouchCanvasCoordinates = useCallback((event: React.TouchEvent<HTMLCanvasElement>, touchIndex: number = 0) => {
    const canvas = canvasRef.current
    if (!canvas || !isImageLoaded || event.touches.length <= touchIndex) return { x: 0, y: 0 }

    const touch = event.touches[touchIndex]
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
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
    if (!isImageLoaded || canvasDimensions.width === 0 || canvasDimensions.height === 0) {
      return imageCoords
    }
    
    return {
      x: (imageCoords.x / imageDimensions.width) * canvasDimensions.width,
      y: (imageCoords.y / imageDimensions.height) * canvasDimensions.height
    }
  }, [imageDimensions, canvasDimensions, isImageLoaded])

  // Get distance between two touch points for pinch gesture
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Get center point between two touches
  const getTouchCenter = useCallback((touches: React.TouchList): Point => {
    if (touches.length < 2) return { x: 0, y: 0 }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }, [])

  // Check if an annotation was clicked/tapped and handle selection
  const getAnnotationAtPoint = useCallback((coords: Point) => {
    // Search in reverse order to select topmost annotation first
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i]
      const annotData = annotation.data || annotation
      
      // Check if coordinates are near this annotation
      const canvasCoords = annotData.coordinates?.map((point: Point) => 
        imageToCanvasCoordinates(point)
      )
      
      if (canvasCoords && canvasCoords.length > 0) {
        // For color tags, check distance to first point (tag location)
        if (annotation.type === 'colorTag' || annotData.type === 'colorTag') {
          const tagPoint = canvasCoords[0]
          const distance = Math.sqrt(
            Math.pow(coords.x - tagPoint.x, 2) + 
            Math.pow(coords.y - tagPoint.y, 2)
          )
          if (distance < 30) { // 30px hit radius for tags
            return annotation
          }
        }
        
        // For drawings, check if point is near any line segment
        if (annotation.type === 'drawing' || annotData.type === 'drawing') {
          for (let j = 0; j < canvasCoords.length - 1; j++) {
            const p1 = canvasCoords[j]
            const p2 = canvasCoords[j + 1]
            const dist = pointToLineDistance(coords, p1, p2)
            if (dist < 10) { // 10px hit radius for lines
              return annotation
            }
          }
        }
      }
    }
    return null
  }, [annotations, imageToCanvasCoordinates])

  // Calculate distance from point to line segment
  const pointToLineDistance = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2)
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2))
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
    t = Math.max(0, Math.min(1, t))
    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2))
  }

  // Shared logic for starting drawing/annotation
  const handleStart = useCallback((coords: Point) => {
    // Check if clicking on an existing annotation to drag it
    if (tool.type === 'pen' || tool.type === 'colorTag') {
      const clickedAnnotation = getAnnotationAtPoint(coords)
      if (clickedAnnotation && clickedAnnotation.id) {
        // Start dragging this annotation
        const annotData = clickedAnnotation.data || clickedAnnotation
        const canvasCoords = annotData.coordinates?.map((point: Point) => 
          imageToCanvasCoordinates(point)
        )
        if (canvasCoords && canvasCoords.length > 0) {
          const firstPoint = canvasCoords[0]
          setDraggingAnnotation({
            id: clickedAnnotation.id,
            type: clickedAnnotation.type,
            offset: {
              x: coords.x - firstPoint.x,
              y: coords.y - firstPoint.y
            }
          })
          // Select the annotation
          onAnnotationSelect?.(clickedAnnotation.id)
          return
        }
      }
    }

    // Deselect when clicking on empty area
    onAnnotationSelect?.(null)

    if (tool.type === 'pen') {
      setIsDrawing(true)
      setCurrentPath([coords])
    } else if (tool.type === 'text') {
      // For text tool, immediately request text input
      if (onTextAnnotationRequest) {
        onTextAnnotationRequest({
          coordinates: [canvasToImageCoordinates(coords)],
          type: 'text'
        })
      }
    } else if (tool.type === 'colorTag') {
      // For color tag, immediately create the annotation
      onAnnotationCreate({
        type: 'colorTag',
        coordinates: [canvasToImageCoordinates(coords)],
        width: 20,
        height: 20
      })
    }
  }, [tool.type, canvasToImageCoordinates, onAnnotationCreate, onTextAnnotationRequest, getAnnotationAtPoint, imageToCanvasCoordinates, onAnnotationSelect])

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(event)
    handleStart(coords)
  }, [getCanvasCoordinates, handleStart])

  const startTouch = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch-to-zoom with two fingers
    if (event.touches.length === 2 && onZoomChange) {
      event.preventDefault()
      const distance = getTouchDistance(event.touches)
      const center = getTouchCenter(event.touches)
      setPinchState({
        isPinching: true,
        startDistance: distance,
        startZoom: zoomLevel,
        lastCenter: center
      })
      return
    }
    
    // Single finger - track for swipe detection
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })
      
      event.preventDefault() // Prevent scrolling while drawing
      const coords = getTouchCanvasCoordinates(event, 0)
      handleStart(coords)
    }
  }, [getTouchCanvasCoordinates, handleStart, getTouchDistance, getTouchCenter, zoomLevel, onZoomChange])

  // Shared logic for drawing/dragging
  const handleMove = useCallback((coords: Point) => {
    // Handle dragging annotation
    if (draggingAnnotation) {
      setDragPosition(coords)
      return
    }

    if (!isDrawing || tool.type !== 'pen') return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

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
  }, [isDrawing, tool, draggingAnnotation])

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(event)
    handleMove(coords)
  }, [getCanvasCoordinates, handleMove])

  const handleTouch = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    // Handle pinch zoom movement
    if (pinchState.isPinching && event.touches.length === 2 && onZoomChange) {
      event.preventDefault()
      const currentDistance = getTouchDistance(event.touches)
      if (currentDistance > 0 && pinchState.startDistance > 0) {
        const scale = currentDistance / pinchState.startDistance
        const newZoom = Math.round(Math.max(50, Math.min(200, pinchState.startZoom * scale)))
        onZoomChange(newZoom)
      }
      return
    }
    
    // Single finger - drawing mode
    if (event.touches.length === 1 && !pinchState.isPinching) {
      event.preventDefault() // Prevent scrolling while drawing
      const coords = getTouchCanvasCoordinates(event, 0)
      handleMove(coords)
    }
  }, [getTouchCanvasCoordinates, handleMove, pinchState, getTouchDistance, onZoomChange])

  // Shared logic for stopping drawing/dragging
  const handleStop = useCallback((coords?: Point) => {
    // Handle finishing drag of annotation
    if (draggingAnnotation && coords) {
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
  }, [isDrawing, tool, currentPath, canvasToImageCoordinates, onAnnotationCreate, draggingAnnotation, onAnnotationUpdate])

  const stopDrawing = useCallback((event?: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = event ? getCanvasCoordinates(event) : undefined
    handleStop(coords)
  }, [getCanvasCoordinates, handleStop])

  const stopTouch = useCallback((event?: React.TouchEvent<HTMLCanvasElement>) => {
    // End pinch gesture
    if (pinchState.isPinching) {
      setPinchState(prev => ({ ...prev, isPinching: false, lastCenter: null }))
      return
    }
    
    // Check for swipe
    if (touchStart && event && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y
      const deltaTime = Date.now() - touchStart.time
      
      // Only detect swipe if it was quick and mostly horizontal
      if (deltaTime < SWIPE_TIMEOUT && Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Check if we didn't draw anything (no drawing if path is empty and not dragging)
        if (currentPath.length === 0 && !draggingAnnotation && !isDrawing) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight()
            setTouchStart(null)
            return
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft()
            setTouchStart(null)
            return
          }
        }
      }
    }
    
    setTouchStart(null)
    
    if (event) {
      event.preventDefault()
      // For touch end, we need to use changedTouches instead of touches
      const touch = event.changedTouches[0]
      if (touch) {
        const canvas = canvasRef.current
        if (canvas && isImageLoaded) {
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height
          const coords = {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
          }
          handleStop(coords)
          return
        }
      }
    }
    handleStop()
  }, [handleStop, isImageLoaded, pinchState, touchStart, currentPath.length, draggingAnnotation, isDrawing, onSwipeLeft, onSwipeRight])

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
      if ((annotation.type === 'text' || annotData.type === 'text') && annotData.coordinates) {
        const coord = displayCoord || imageToCanvasCoordinates(annotData.coordinates[0])
        const text = annotData.text || 'Text'
        
        // Highlight background
        if (isHighlighted) {
          ctx.save()
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
          ctx.fillRect(coord.x - 4, coord.y - 14, ctx.measureText(text).width + 8, 20)
          ctx.restore()
        }
        
        ctx.font = 'bold 14px sans-serif'
        ctx.fillStyle = annotData.strokeStyle || '#dc2626'
        ctx.globalAlpha = 1
        ctx.fillText(text, coord.x, coord.y)
      }
      
      // Color tag annotations
      if ((annotation.type === 'colorTag' || annotData.type === 'colorTag') && annotData.coordinates) {
        const coord = displayCoord || imageToCanvasCoordinates(annotData.coordinates[0])
        const color = annotation.color
        const colorCode = color?.colorCode || 'TAG'
        
        // Tag circle radius
        const tagRadius = 12
        
        // Highlight effect
        if (isHighlighted) {
          ctx.save()
          ctx.shadowColor = '#3b82f6'
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.arc(coord.x, coord.y, tagRadius + 4, 0, 2 * Math.PI)
          ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
          ctx.fill()
          ctx.restore()
        }
        
        // Draw tag circle
        ctx.beginPath()
        ctx.arc(coord.x, coord.y, tagRadius, 0, 2 * Math.PI)
        ctx.fillStyle = color?.hexColor || '#dc2626'
        ctx.globalAlpha = 0.9
        ctx.fill()
        
        // Draw border
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.globalAlpha = 1
        ctx.stroke()
        
        // Draw color code text next to tag
        ctx.font = 'bold 12px sans-serif'
        ctx.fillStyle = '#1f2937'
        ctx.globalAlpha = 1
        
        // Measure text for background
        const textMetrics = ctx.measureText(colorCode)
        const padding = 4
        const bgWidth = textMetrics.width + padding * 2
        const bgHeight = 18
        
        // Draw text background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.fillRect(coord.x + tagRadius + 5, coord.y - bgHeight/2, bgWidth, bgHeight)
        
        // Draw text
        ctx.fillStyle = '#1f2937'
        ctx.fillText(colorCode, coord.x + tagRadius + 5 + padding, coord.y)
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
          onTouchStart={startTouch}
          onTouchMove={handleTouch}
          onTouchEnd={stopTouch}
          onTouchCancel={stopTouch}
          style={{
            zIndex: 10,
            cursor: getCursorStyle(),
            touchAction: 'none' // Prevent default touch behaviors like scrolling
          }}
        />
      </div>
      
      {/* Pinch-to-zoom hint for mobile */}
      {pinchState.isPinching && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm pointer-events-none z-20">
          {zoomLevel}%
        </div>
      )}
    </div>
  )
})
