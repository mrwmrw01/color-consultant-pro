/**
 * Server-side PDF renderer for the Synopsis Studio.
 *
 * Generates the Word-doc-style HTML that weasyprint converts to PDF.
 * Uses the same format Mark approved in the Henderson mockups:
 *   - Header (client info + date)
 *   - Disclaimer
 *   - Specifications heading
 *   - Universal specs with exceptions
 *   - 4-column room grid (deduped against universals)
 *   - Client acknowledgment / signature block
 */

import type { StudioData, UniversalSpec, StudioRoom, StudioSurface } from "./synopsis-studio-data"

// --- Helpers ---

const HEX_FALLBACK = "#e0e0e0"

function swatch(hex: string | null, size = 14): string {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:3px;border:1px solid #999;background:${hex || HEX_FALLBACK};vertical-align:middle;margin-right:4px;"></span>`
}

function fmtSurface(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function surfaceMatchesUniversal(s: StudioSurface, universals: UniversalSpec[]): string | null {
  for (const u of universals) {
    const matchTypes =
      u.surfaceType === "trim"
        ? ["trim", "baseboard", "molding", "door", "window", "wainscoting"]
        : ["ceiling"]
    const st = s.surfaceType.toLowerCase()
    if (matchTypes.some((m) => st.includes(m)) && s.colorCode === u.dominant.colorCode) {
      return u.surfaceType
    }
  }
  return null
}

// --- Universal summary row ---

function universalRow(label: string, u: UniversalSpec, showExceptions: boolean): string {
  const d = u.dominant
  let excHtml = ""
  if (showExceptions && u.exceptions.length > 0) {
    const lines = u.exceptions
      .map(
        (e) =>
          `<div class="exc-line"><strong>${e.roomName}:</strong> ${e.colorCode} ${e.colorName} <em>(${e.productLine} - ${e.sheen})</em></div>`
      )
      .join("")
    excHtml = `<div class="exc-block"><div class="exc-title">Exceptions:</div>${lines}</div>`
  }
  return `<tr><td>${swatch(d.hexColor)} <strong>${label}:</strong> ${d.colorCode} ${d.colorName}${excHtml}</td><td>${d.productLine} - ${d.sheen}</td></tr>`
}

// --- Room cell ---

function roomCell(room: StudioRoom, universals: UniversalSpec[]): string {
  const suppressed = new Set<string>()
  const visible: StudioSurface[] = []
  const sigs = new Set<string>()

  for (const s of room.surfaces) {
    const uMatch = surfaceMatchesUniversal(s, universals)
    if (uMatch) {
      suppressed.add(uMatch)
      continue
    }
    const sig = `${s.surfaceType}|${s.colorCode}|${s.productLine}|${s.sheen}`
    if (sigs.has(sig)) continue
    sigs.add(sig)
    visible.push(s)
  }

  const blocks = visible.map((s, i) => {
    const notes = s.notes ? `<div class="notes"><em>${s.notes}</em></div>` : ""
    return `<div class="surface-entry"><span class="ann-num">${i + 1}</span> <span class="surface-type">${fmtSurface(s.surfaceType)}</span><div class="color-line">${swatch(s.hexColor)} <strong>${s.colorCode} ${s.colorName}</strong></div><div class="product-line"><em>${s.productLine} - ${s.sheen}</em></div>${notes}</div>`
  })

  if (blocks.length === 0) {
    blocks.push(`<div class="surface-entry"><em>All surfaces per universal.</em></div>`)
  }

  const supNote =
    suppressed.size > 0
      ? `<div class="sup-note"><em>${[...suppressed].map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")} per universal</em></div>`
      : ""

  return `<td class="room-cell"><div class="room-name">${room.roomName}:</div>${blocks.join("")}${supNote}</td>`
}

// --- Room grid ---

function roomGrid(rooms: StudioRoom[], universals: UniversalSpec[]): string {
  const cols = 4
  const tables: string[] = []
  for (let i = 0; i < rooms.length; i += cols) {
    const group = rooms.slice(i, i + cols)
    const cells = group.map((r) => roomCell(r, universals))
    while (cells.length < cols) cells.push(`<td class="room-cell"></td>`)
    tables.push(`<table class="room-grid"><tr>${cells.join("")}</tr></table>`)
  }
  return tables.join("\n")
}

// --- Walls summary row ---

function wallsRow(palette: StudioData["wallPalette"]): string {
  if (!palette.length) return ""
  const colors = palette.map((c) => `${c.colorCode} ${c.colorName}`).join(", ")
  const products = [...new Set(palette.flatMap((c) => c.productLines))].join("<br>")
  return `<tr><td><strong>Walls:</strong> ${colors}</td><td>${products}</td></tr>`
}

// --- Main renderer ---

export interface RenderOptions {
  showExceptions?: boolean
  consultantName?: string
  companyName?: string
}

export function renderSynopsisHtml(data: StudioData, opts: RenderOptions = {}): string {
  const { showExceptions = true, consultantName, companyName } = opts
  const p = data.project
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  const consultant = consultantName || "Color Consultant"
  const company = companyName || "Color Guru"

  const trimU = data.universals.find((u) => u.surfaceType === "trim")
  const ceilingU = data.universals.find((u) => u.surfaceType === "ceiling")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
@page{size:letter;margin:0.75in 0.9in;@bottom-right{content:"Page " counter(page) " of " counter(pages);font-size:9pt;color:#666;font-family:Calibri,Arial,sans-serif;}}
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#000;}
.header-block{margin-bottom:20px;}.header-block .line{margin:0;padding:2px 0;}.header-block .client-name{font-weight:700;}.date-right{float:right;}
.disclaimer{font-size:10pt;text-align:justify;margin:16px 0 10px 0;}.thanks{font-style:italic;margin-bottom:24px;}
h1{font-size:14pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:2px;margin:20px 0 14px 0;border-top:1px solid #000;border-bottom:1px solid #000;padding:8px 0;}
.colors-products-label{font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;}
table.summary{width:100%;border-collapse:collapse;margin-bottom:20px;}table.summary td{border:1px solid #000;padding:8px 10px;vertical-align:top;font-size:10.5pt;}table.summary td:first-child{width:60%;}table.summary td:last-child{width:40%;}
.exc-block{margin-top:6px;padding-left:12px;border-left:2px solid #c0392b;}.exc-title{font-size:9pt;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;}.exc-line{font-size:10pt;padding:1px 0;}
table.room-grid{width:100%;border-collapse:collapse;margin-bottom:14px;page-break-inside:avoid;}
.room-cell{border:1px solid #000;padding:8px;vertical-align:top;width:25%;font-size:9.5pt;line-height:1.35;}
.room-name{font-weight:700;font-size:10pt;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #999;}
.surface-entry{margin-bottom:8px;padding-bottom:6px;border-bottom:1px dotted #ccc;}.surface-entry:last-of-type{border-bottom:none;}
.ann-num{display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;background:#e74c3c;color:white;border-radius:50%;font-size:8.5pt;font-weight:700;margin-right:4px;}
.surface-type{font-weight:700;font-size:9.5pt;text-transform:capitalize;}.color-line{margin-top:2px;}.product-line{font-size:9pt;color:#333;margin-top:1px;}
.notes{font-size:8.5pt;color:#555;margin-top:3px;padding-left:6px;border-left:2px solid #ddd;}
.sup-note{font-size:8.5pt;color:#888;margin-top:6px;padding-top:4px;border-top:1px dashed #ccc;}
.page-break{page-break-before:always;}
.sig-section{margin-top:36px;}.sig-line{display:inline-block;border-bottom:1px solid #000;width:280px;margin-right:30px;}.sig-label{font-size:9pt;margin-top:4px;display:inline-block;width:280px;margin-right:30px;}
</style>
</head>
<body>

<div class="header-block">
<p class="line client-name">${p.clientName}</p>
<p class="line">${p.address || ""}</p>
<p class="line">${p.clientEmail || ""}</p>
<p class="line">${p.clientPhone || ""} <span class="date-right">${today}</span></p>
</div>

<p class="disclaimer">${company} provides color consultations. Recommendations by ${company} are suggestions only and do not warrant or guarantee client's satisfaction with their color choices, products, services, or workmanship. Client is solely responsible for all color choices, products, services and communications. Payments shall be made to ${company}, are due at time of consultation, and are non-refundable.</p>
<p class="thanks">Thank you for choosing ${company}, a guide through your paint journey.</p>

<div class="colors-products-label"><span>Colors</span><span>Products &amp; Sheen</span></div>
<h1>Specifications</h1>

<table class="summary"><tbody>
${trimU ? universalRow("All Trim", trimU, showExceptions) : ""}
${ceilingU ? universalRow("Ceilings", ceilingU, showExceptions) : ""}
${wallsRow(data.wallPalette)}
</tbody></table>

${roomGrid(data.rooms, data.universals)}

<div class="sig-section page-break">
<h1>Client Acknowledgment</h1>
<p class="disclaimer">I/we acknowledge receipt of this Color Specification Synopsis and accept the selections as documented above, including all universal specifications and their stated room-specific exceptions. Any changes requested after this date will be handled as a formal revision with change log attached.</p>
<div style="margin-top:60px;"><span class="sig-line"></span><span class="sig-line"></span></div>
<div><span class="sig-label">Client Signature</span><span class="sig-label">Date</span></div>
<p style="margin-top:40px;text-align:center;font-size:9pt;">${company} &middot; Color Specification Synopsis &middot; Confidential<br>Prepared exclusively for ${p.clientName} &middot; ${today}</p>
</div>

</body></html>`
}
