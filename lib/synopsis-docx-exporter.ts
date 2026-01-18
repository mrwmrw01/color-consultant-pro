
import { Document, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, BorderStyle, TextRun, ImageRun } from "docx"
import { SynopsisData } from "./synopsis-generator"
import { getFileBuffer } from "./s3"

export async function createSynopsisDocument(data: SynopsisData, includePhotos: boolean = true): Promise<Document> {
  const { project, colorSummary, roomData } = data

  // Format date
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Create document sections
  const sections: any[] = []

  // Header with client info
  sections.push(
    new Paragraph({
      text: project.clientName,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: project.address || "",
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: project.clientEmail || "",
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: `${project.clientPhone || ""}                ${dateStr}`,
      spacing: { after: 200 }
    })
  )

  // Disclaimer
  sections.push(
    new Paragraph({
      text: "Color Guru provides color consultations. Recommendations by Color Guru are suggestions only and do not warrant or guarantee clients satisfaction with their color choices, products, services, or workmanship. Client is solely responsible for all color choices, products, services and communications. Payments shall be made to Color Guru, are due at time of consultation, and are non-refundable.",
      spacing: { after: 100 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Thank you for choosing Color Guru, a guide through your paint journey.",
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  )

  // Colors & Products heading
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Colors                                                      Products & Sheen",
          bold: true
        })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: "SPECIFICATIONS",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  )

  // Color Summary Table
  const summaryRows: TableRow[] = []

  if (colorSummary.trim.length > 0) {
    const trimColorsList = colorSummary.trim.map(c => `${c.colorCode} ${c.name}`).join(", ")
    const trimProductsList = [...new Set(colorSummary.trim.flatMap(c => c.productLines))].join("\n")
    
    summaryRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: `All Trim: ${trimColorsList}` })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: trimProductsList })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
  }

  if (colorSummary.ceilings.length > 0) {
    const ceilingColorsList = colorSummary.ceilings.map(c => `${c.colorCode} ${c.name}`).join(", ")
    const ceilingProductsList = [...new Set(colorSummary.ceilings.flatMap(c => c.productLines))].join("\n")
    
    summaryRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: `Ceilings: ${ceilingColorsList}` })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: ceilingProductsList })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
  }

  if (colorSummary.walls.length > 0) {
    const wallColorsList = colorSummary.walls.map(c => `${c.colorCode} ${c.name}`).join(", ")
    const wallProductsList = [...new Set(colorSummary.walls.flatMap(c => c.productLines))].join("\n")
    
    summaryRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: `Walls: ${wallColorsList}` })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: wallProductsList })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
  }

  if (summaryRows.length > 0) {
    sections.push(
      new Table({
        rows: summaryRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    )
  }

  // Room-by-room tables
  // Group rooms into tables of max 4 columns
  for (let i = 0; i < roomData.length; i += 4) {
    const roomGroup = roomData.slice(i, i + 4)
    
    // Create header row with room names
    const headerCells = roomGroup.map(room => 
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: room.roomName + ":", bold: true })]
        })],
        width: { size: 25, type: WidthType.PERCENTAGE }
      })
    )

    // Find max number of surfaces in this group
    const maxSurfaces = Math.max(...roomGroup.map(r => r.surfaces.length))

    // Create rows for each surface
    const roomRows: TableRow[] = [
      new TableRow({ children: headerCells })
    ]

    for (let surfaceIdx = 0; surfaceIdx < maxSurfaces; surfaceIdx++) {
      const surfaceCells = await Promise.all(roomGroup.map(async room => {
        const surface = room.surfaces[surfaceIdx]
        if (!surface) {
          return new TableCell({
            children: [new Paragraph({ text: "" })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          })
        }

        const surfaceLabel = surface.surfaceArea ? `${surface.surfaceType} (${surface.surfaceArea})` : surface.surfaceType
        
        const cellChildren: Paragraph[] = [
          new Paragraph({ text: surfaceLabel }),
          new Paragraph({
            children: [new TextRun({ text: `${surface.colorCode} ${surface.colorName}`, bold: true })]
          }),
          new Paragraph({
            children: [new TextRun({ text: `${surface.productLine} - ${surface.sheen}`, italics: true })]
          })
        ]

        // Add notes if present
        if (surface.notes) {
          cellChildren.push(
            new Paragraph({
              children: [new TextRun({ text: surface.notes, italics: true })],
              spacing: { before: 50 }
            })
          )
        }

        // Add photos if available and includePhotos is true
        if (includePhotos && surface.photos && surface.photos.length > 0) {
          // Add up to 2 thumbnail photos per surface
          const photosToInclude = surface.photos.slice(0, 2)
          
          for (const photo of photosToInclude) {
            try {
              const imageBuffer = await getFileBuffer(photo.cloudStoragePath)
              
              cellChildren.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: Uint8Array.from(imageBuffer),
                      transformation: {
                        width: 120,
                        height: 90
                      },
                      type: "jpg"
                    })
                  ],
                  spacing: { before: 100, after: 100 }
                })
              )
            } catch (error) {
              console.error(`Failed to load photo ${photo.fileName}:`, error)
              // Continue without this photo
            }
          }
        }
        
        return new TableCell({
          children: cellChildren,
          width: { size: 25, type: WidthType.PERCENTAGE }
        })
      }))

      roomRows.push(new TableRow({ children: surfaceCells }))
    }

    sections.push(
      new Table({
        rows: roomRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    )
  }

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  })
}
