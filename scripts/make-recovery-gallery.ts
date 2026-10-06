/**
 * Generate an HTML photo-review gallery from the recovery folders.
 *
 * Produces thumbnails + index.html so the consultant can visually review
 * recovered photos without opening each file.
 *
 * Run: npx tsx scripts/make-recovery-gallery.ts
 */

import { promises as fs } from "fs"
import path from "path"
import sharp from "sharp"

const SOURCES = [
  { dir: "/home/mark/recovery/photos", label: "Recovered client photos (from DOCX exports)" },
  { dir: "/home/mark/recovery/originals", label: "Original phone photos (Downloads, Mar–Apr 2026)" },
]
const OUT = "/home/mark/recovery/gallery"

async function main() {
  await fs.mkdir(path.join(OUT, "thumbs"), { recursive: true })
  const sections: { label: string; items: { src: string; name: string }[] }[] = []

  for (const s of SOURCES) {
    const items: { src: string; name: string }[] = []
    let files: string[] = []
    try {
      files = (await fs.readdir(s.dir)).filter((f) =>
        /\.(jpe?g|png|webp)$/i.test(f)
      )
    } catch {
      continue
    }
    files.sort()
    for (const f of files) {
      const srcPath = path.join(s.dir, f)
      const thumb = `thumbs/${s.label.split(" ")[0].toLowerCase()}-${f.replace(/\.[^.]+$/, "")}.jpg`
      try {
        const meta = await sharp(srcPath).metadata()
        await sharp(srcPath)
          .rotate()
          .resize({ width: 360, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(path.join(OUT, thumb))
        items.push({
          src: `../${s.dir.split("/").pop()}/${f}`,
          name: `${f} — ${meta.width}x${meta.height}`,
        })
      } catch (e: any) {
        console.error(`failed ${f}: ${e.message}`)
      }
    }
    sections.push({ label: s.label, items })
  }

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Recovery Photo Review</title>
<style>
 body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:2rem}
 h1{font-size:1.4rem} h2{font-size:1.1rem;margin-top:2rem;color:#9cf}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-top:1rem}
 .item{background:#1d1d1d;border-radius:8px;padding:.6rem}
 img{width:100%;border-radius:6px;display:block}
 .cap{font-size:.72rem;margin-top:.4rem;word-break:break-all;color:#bbb}
</style></head><body>
<h1>Recovery Photo Review — Color Consultant Pro</h1>
${sections
  .map(
    (s) => `<h2>${s.label} (${s.items.length})</h2>
<div class="grid">${s.items
      .map(
        (i) => `<div class="item"><a href="${i.src}" target="_blank"><img src="thumbs/${path.basename(i.src.split("/").pop()!.replace(/\.[^.]+$/, "") ? "" : "")}" loading="lazy"></a></div>`
      )
      .join("")}</div>`
  )
  .join("")}
</body></html>`

  // simpler html: fix img src to the thumbs we actually made
  const html2 = `<!doctype html>
<html><head><meta charset="utf-8"><title>Recovery Photo Review</title>
<style>
 body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:2rem}
 h2{font-size:1.1rem;margin-top:2rem;color:#9cf}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;margin-top:1rem}
 .item{background:#1d1d1d;border-radius:8px;padding:.6rem}
 img{width:100%;border-radius:6px;display:block}
 .cap{font-size:.72rem;margin-top:.4rem;word-break:break-all;color:#bbb}
</style></head><body>
<h1>Recovery Photo Review — Color Consultant Pro</h1>
${sections
  .map((s) => {
    const prefix = s.label.split(" ")[0].toLowerCase()
    const grid = s.items
      .map((i) => {
        const thumb = `thumbs/${prefix}-${path.basename(i.name.split(" — ")[0]).replace(/\.[^.]+$/, "")}.jpg`
        return `<div class="item"><a href="${i.src}" target="_blank"><img src="${thumb}" loading="lazy"></a><div class="cap">${i.name}</div></div>`
      })
      .join("")
    return `<h2>${s.label} (${s.items.length})</h2><div class="grid">${grid}</div>`
  })
  .join("")}
</body></html>`

  await fs.writeFile(path.join(OUT, "index.html"), html2)
  console.log(`gallery ready: ${OUT}/index.html (${sections.reduce((n, s) => n + s.items.length, 0)} photos)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
