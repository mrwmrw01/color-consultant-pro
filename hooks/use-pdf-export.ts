
import { useState } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { toast } from "react-hot-toast"
import { SynopsisData } from "@/lib/synopsis-generator"

interface UsePdfExportProps {
  synopsis: SynopsisData | null
  elementRef: React.RefObject<HTMLElement>
  photoUrls: Map<string, string>
}

export function usePdfExport({ synopsis, elementRef, photoUrls }: UsePdfExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const convertImageToBase64 = async (photoId: string): Promise<string> => {
    try {
      // Use server-side API to convert image to base64 (avoids CORS issues)
      const response = await fetch(`/api/photos/${photoId}/base64`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const { base64 } = await response.json()
      console.log('Base64 conversion successful, length:', base64?.length || 0)
      return base64 || ''
    } catch (error) {
      console.error('Error converting image to base64:', error)
      // Return empty string on error
      return ''
    }
  }

  const exportPdf = async () => {
    try {
      setIsExporting(true)
      toast('Preparing PDF export...', { icon: '📄' })

      if (!elementRef.current) {
        throw new Error("Synopsis content not found")
      }

      // Clone the element to avoid modifying the original
      const element = elementRef.current.cloneNode(true) as HTMLElement
      
      // Show hidden elements marked for PDF
      const pdfVisibleElements = element.querySelectorAll('[data-pdf-visible="true"]')
      pdfVisibleElements.forEach(el => {
        (el as HTMLElement).classList.remove('hidden')
      })
      
      // Remove all buttons (both with and without images)
      const buttons = element.querySelectorAll('button')
      buttons.forEach(btn => {
        // If button contains an image, extract the image first
        const imgs = btn.querySelectorAll('img')
        if (imgs.length > 0) {
          const parent = btn.parentElement
          if (parent) {
            // Replace button with its images in a container div
            const container = document.createElement('div')
            container.className = 'relative w-[102px] h-[102px] rounded overflow-hidden border-2 border-gray-200 flex-shrink-0'
            imgs.forEach(img => container.appendChild(img.cloneNode(true)))
            parent.replaceChild(container, btn)
          }
        } else {
          btn.remove()
        }
      })

      // Create a map of photo URLs to photo IDs from synopsis data
      const urlToPhotoId = new Map<string, string>()
      if (synopsis) {
        synopsis.roomData.forEach((room) => {
          room.surfaces.forEach((surface) => {
            surface.photos?.forEach((photo) => {
              const url = photoUrls.get(photo.id)
              if (url) {
                urlToPhotoId.set(url, photo.id)
              }
            })
          })
        })
      }

      // Find and convert all images to base64
      const images = element.querySelectorAll('img')
      console.log(`Found ${images.length} images to convert for PDF`)
      
      if (images.length > 0) {
        toast(`Converting ${images.length} images...`, { icon: '🖼️' })
        
        const conversionPromises = Array.from(images).map(async (img, index) => {
          // Get the actual displayed src
          let srcToConvert = img.src || img.getAttribute('src') || ''
          
          console.log(`Processing image ${index + 1}/${images.length}:`, srcToConvert)
          
          if (srcToConvert && !srcToConvert.startsWith('data:')) {
            try {
              // Find the photo ID for this URL
              const photoId = urlToPhotoId.get(srcToConvert)
              
              if (photoId) {
                // Use the server-side API to get base64
                const base64 = await convertImageToBase64(photoId)
                
                if (base64) {
                  img.setAttribute('src', base64)
                  img.removeAttribute('srcset')
                  img.removeAttribute('sizes')
                  
                  // Set explicit dimensions
                  const width = img.getAttribute('width') || '102'
                  const height = img.getAttribute('height') || '102'
                  img.style.width = `${width}px`
                  img.style.height = `${height}px`
                  img.style.objectFit = 'cover'
                  img.style.display = 'block'
                  
                  console.log(`✓ Converted image ${index + 1}`)
                  return true
                } else {
                  console.warn(`⚠ Empty base64 for image ${index + 1}`)
                  return false
                }
              } else {
                console.warn(`⚠ No photo ID found for image ${index + 1}`)
                return false
              }
            } catch (err) {
              console.error(`✗ Failed to convert image ${index + 1}:`, err)
              return false
            }
          } else if (srcToConvert.startsWith('data:')) {
            console.log(`✓ Image ${index + 1} already base64`)
            return true
          }
          
          return false
        })
        
        const results = await Promise.all(conversionPromises)
        const successCount = results.filter(Boolean).length
        console.log(`Successfully converted ${successCount}/${images.length} images`)
        
        if (successCount === 0 && images.length > 0) {
          throw new Error('Failed to convert any images. Please try again.')
        }
      }

      console.log('Generating PDF document...')
      toast('Rendering content to canvas...', { icon: '⏳' })

      // Prepare element for rendering with proper page dimensions
      // US Letter: 8.5" x 11" at 96 DPI = 816 x 1056 pixels
      const pageWidthPx = 816
      const pageHeightPx = 1056
      const marginPx = 48  // 0.5 inch margins
      const contentWidthPx = pageWidthPx - (marginPx * 2) // 720px
      
      element.style.width = `${contentWidthPx}px`
      element.style.padding = `${marginPx}px`
      element.style.backgroundColor = '#ffffff'
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.boxSizing = 'border-box'
      document.body.appendChild(element)

      try {
        // Render the element to canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 0,
          removeContainer: false,
          width: pageWidthPx,
          windowWidth: pageWidthPx
        })

        toast('Creating PDF...', { icon: '📄' })

        // Create PDF with same dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [pageWidthPx, pageHeightPx],
          compress: true
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const imgWidth = pageWidthPx
        const imgHeight = (canvas.height * pageWidthPx) / canvas.width
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(imgHeight / pageHeightPx)
        console.log(`PDF generation: ${totalPages} pages needed, canvas height: ${canvas.height}px, scaled height: ${imgHeight}px`)
        toast(`Generating ${totalPages} page(s)...`, { icon: '📄' })
        
        // Add pages using jsPDF's automatic pagination
        let heightLeft = imgHeight
        let position = 0
        let pageNum = 0
        
        while (heightLeft > 0) {
          if (pageNum > 0) {
            pdf.addPage()
            position = -(pageNum * pageHeightPx)
          }
          
          pdf.addImage(
            imgData,
            'JPEG',
            0,
            position,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'
          )
          
          heightLeft -= pageHeightPx
          pageNum++
          console.log(`Added page ${pageNum}/${totalPages}`)
        }

        // Download the PDF
        const filename = `${synopsis?.project.clientName || 'Project'}_Color_Synopsis.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
        pdf.save(filename)

        toast.success("PDF exported successfully!")
      } finally {
        // Clean up: remove temporary element
        document.body.removeChild(element)
      }
    } catch (error: any) {
      console.error("Error exporting PDF:", error)
      const errorMessage = error?.message || 'Unknown error occurred'
      toast.error(`Failed to export PDF: ${errorMessage}`)
    } finally {
      setIsExporting(false)
    }
  }

  return { exportPdf, isExporting }
}
