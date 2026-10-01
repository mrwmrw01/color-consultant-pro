import { jsPDF } from 'jspdf'
import fs from 'fs'

const ROOM_HIERARCHY = {
  'Custom': { label: 'Custom Room Name', subtypes: ['Enter Custom Name'] },
  'Bedroom': { label: 'Bedroom', subtypes: ['Primary', 'Guest', 'Kids', 'Other'] },
  'Bathroom': { label: 'Bathroom', subtypes: ['Master', 'Guest', 'Hall', 'Powder', 'Jack & Jill', 'Custom'] },
  'Living Areas': { label: 'Living Areas', subtypes: ['Living Room', 'Family Room', 'Den', 'Great Room', 'Other'] },
  'Kitchen': { label: 'Kitchen', subtypes: ["Main Kitchen", "Butler's Pantry", "Breakfast Nook", "Other"] },
  'Dining': { label: 'Dining', subtypes: ['Dining Room', 'Breakfast Area', 'Breakfast Room', 'Other'] },
  'Office/Study': { label: 'Office/Study', subtypes: ['Home Office', 'Study', 'Library', 'Craft Room', 'Other'] },
  'Utility Areas': { label: 'Utility Areas', subtypes: ['Laundry Room', 'Mudroom', 'Pantry', 'Storage', 'Other'] },
  'Entryway': { label: 'Entryway', subtypes: ['Foyer', 'Front Entry', 'Back Entry', 'Vestibule', 'Other'] },
  'Hallway': { label: 'Hallway', subtypes: ['Main Hall', 'Upstairs Hall', 'Basement Hall', 'Other'] },
  'Basement': { label: 'Basement', subtypes: ['Finished', 'Unfinished', 'Recreation Room', 'Other'] },
  'Attic': { label: 'Attic', subtypes: ['Finished', 'Unfinished', 'Storage', 'Other'] },
  'Garage': { label: 'Garage', subtypes: ['One Car', 'Two Car', 'Three Car', 'Workshop', 'Other'] },
  'Exterior - Body': { label: 'Exterior - Body', subtypes: ['Front Elevation', 'Side Elevation', 'Rear Elevation', 'Upper Story', 'Lower Story', 'Other'] },
  'Exterior - Trim & Detail': { label: 'Exterior - Trim & Detail', subtypes: ['Window Trim', 'Door Trim', 'Corner Boards', 'Fascia/Soffit', 'Gable Trim', 'Other'] },
  'Exterior - Accents': { label: 'Exterior - Accents', subtypes: ['Shutters', 'Front Door', 'Garage Door', 'Railings', 'Columns/Posts', 'Other'] },
  'Exterior - Foundation & Structure': { label: 'Exterior - Foundation & Structure', subtypes: ['Foundation', 'Brick/Stone', 'Chimney', 'Retaining Wall', 'Other'] },
  'Exterior - Other': { label: 'Exterior - Other', subtypes: ['Porch', 'Deck', 'Fence', 'Pergola', 'Outbuilding', 'Other'] },
  'Other': { label: 'Other', subtypes: ['Custom Defined'] },
}

const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
const pageW = doc.internal.pageSize.getWidth()
const pageH = doc.internal.pageSize.getHeight()
const margin = 50
const colWidth = (pageW - margin * 2 - 30) / 2  // 2 columns with 30pt gutter
let y = margin
let col = 0 // 0 = left, 1 = right

function getX() {
  return col === 0 ? margin : margin + colWidth + 30
}

function checkPage(needed) {
  if (y + needed > pageH - margin) {
    if (col === 0) {
      // Switch to right column
      col = 1
      y = 120 // below title area
    } else {
      // New page
      doc.addPage()
      col = 0
      y = margin + 20
    }
  }
}

// Title
doc.setFontSize(20)
doc.setFont('helvetica', 'bold')
doc.setTextColor(139, 69, 19) // #8b4513
doc.text('Color Consultant Pro', pageW / 2, y, { align: 'center' })
y += 28

doc.setFontSize(14)
doc.setFont('helvetica', 'normal')
doc.setTextColor(100, 100, 100)
doc.text('Room Names Reference', pageW / 2, y, { align: 'center' })
y += 12

// Divider line
doc.setDrawColor(196, 112, 4) // #c47004
doc.setLineWidth(1.5)
doc.line(margin, y, pageW - margin, y)
y += 20

// Section headers for interior vs exterior
const interiorKeys = Object.keys(ROOM_HIERARCHY).filter(k => !k.startsWith('Exterior') && k !== 'Other')
const exteriorKeys = Object.keys(ROOM_HIERARCHY).filter(k => k.startsWith('Exterior'))
const otherKeys = ['Other']

function drawSection(title, keys) {
  // Section header
  checkPage(30)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(196, 112, 4) // #c47004
  doc.text(title, getX(), y)
  y += 6
  doc.setDrawColor(196, 112, 4)
  doc.setLineWidth(0.5)
  doc.line(getX(), y, getX() + colWidth - 10, y)
  y += 14

  for (const key of keys) {
    const group = ROOM_HIERARCHY[key]
    const subtypeLines = group.subtypes.length
    const blockHeight = 18 + subtypeLines * 13 + 10

    checkPage(blockHeight)

    // Group header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(65, 37, 1) // #412501
    doc.text(group.label, getX(), y)
    y += 14

    // Subtypes
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    for (const subtype of group.subtypes) {
      const roomName = key === 'Custom' ? subtype :
        (subtype === 'Other' ? key : `${key} - ${subtype}`)
      doc.text(`  \u2022  ${roomName}`, getX() + 8, y)
      y += 13
    }
    y += 6
  }
}

const startY = y
drawSection('INTERIOR', interiorKeys)
drawSection('EXTERIOR', exteriorKeys)
drawSection('OTHER', otherKeys)

// Footer on each page
const pageCount = doc.getNumberOfPages()
for (let i = 1; i <= pageCount; i++) {
  doc.setPage(i)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text(`Color Consultant Pro  |  Room Reference  |  Page ${i} of ${pageCount}`, pageW / 2, pageH - 25, { align: 'center' })
}

const output = doc.output('arraybuffer')
const outPath = './public/room-names-reference.pdf'
fs.writeFileSync(outPath, Buffer.from(output))
console.log(`PDF generated: ${outPath}`)
