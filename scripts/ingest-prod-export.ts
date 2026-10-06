/**
 * Ingest a prod-export folder (from scripts/export-prod-data.ts) into the
 * database configured by DATABASE_URL.
 *
 * Rebuilds the client → property → project hierarchy with dedupe (by
 * userId+name / clientId+address / userId+name), writes an id-mapping and a
 * reconciliation report. Photos/annotations/synopses are NOT recreated as rows
 * (their bytes died with the S3 bucket) — they remain preserved in the export
 * JSON and are listed in the report for re-upload via
 * scripts/restore-recovered-data.ts.
 *
 * Run: npx tsx --require dotenv/config scripts/ingest-prod-export.ts <export-dir>
 */

import { PrismaClient } from "@prisma/client"
import { readFile, writeFile, mkdir } from "fs/promises"
import path from "path"

const prisma = new PrismaClient()

async function loadJson(dir: string, name: string): Promise<any> {
  try {
    return JSON.parse(await readFile(path.join(dir, name), "utf-8"))
  } catch {
    return null
  }
}

function asList(x: any): any[] {
  if (Array.isArray(x)) return x
  if (x && Array.isArray(x.items)) return x.items
  if (x && Array.isArray(x.data)) return x.data
  return []
}

async function main() {
  const exportDir = process.argv[2]
  if (!exportDir) {
    console.error("Usage: npx tsx scripts/ingest-prod-export.ts <export-dir>")
    process.exit(1)
  }

  const manifest = await loadJson(exportDir, "manifest.json")
  const targetUserEmail = process.env.INGEST_USER_EMAIL
  if (!targetUserEmail) {
    console.error("Set INGEST_USER_EMAIL=<login email of the owner user>")
    process.exit(1)
  }
  const user = await prisma.user.findUnique({ where: { email: targetUserEmail } })
  if (!user) {
    console.error(`User not found locally: ${targetUserEmail}`)
    process.exit(1)
  }
  console.log(`Ingesting into user ${user.email} (${user.id})`)

  const report: any = {
    exportedAt: manifest?.exportedAt,
    created: { clients: 0, properties: 0, projects: 0 },
    existing: { clients: 0, properties: 0, projects: 0 },
    clientIdMap: {} as Record<string, string>,
    propertyIdMap: {} as Record<string, string>,
    projectIdMap: {} as Record<string, string>,
    photosPreservedInExport: 0,
    annotationsPreservedInExport: 0,
  }

  const clients = asList(await loadJson(exportDir, "clients.json"))
  for (const c of clients) {
    const existing = await prisma.client.findFirst({
      where: { userId: user.id, name: c.name },
    })
    if (existing) {
      report.existing.clients++
      report.clientIdMap[c.id] = existing.id
      continue
    }
    const created = await prisma.client.create({
      data: {
        userId: user.id,
        name: c.name,
        contactName: c.contactName ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        type: c.type ?? "individual",
        status: c.status ?? "active",
        notes: c.notes ?? null,
      },
    })
    report.created.clients++
    report.clientIdMap[c.id] = created.id
  }
  console.log(
    `clients: ${report.created.clients} created, ${report.existing.clients} existing`
  )

  const properties = asList(await loadJson(exportDir, "properties.json"))
  for (const p of properties) {
    const mappedClientId = report.clientIdMap[p.clientId] ?? p.clientId
    const existing = await prisma.property.findFirst({
      where: { clientId: mappedClientId, address: p.address },
    })
    if (existing) {
      report.existing.properties++
      report.propertyIdMap[p.id] = existing.id
      continue
    }
    const created = await prisma.property.create({
      data: {
        clientId: mappedClientId,
        name: p.name ?? p.address ?? "Property",
        address: p.address ?? "",
        city: p.city ?? null,
        state: p.state ?? null,
        zipCode: p.zipCode ?? null,
        type: p.type ?? "residential",
        status: p.status ?? "active",
      },
    })
    report.created.properties++
    report.propertyIdMap[p.id] = created.id
  }
  console.log(
    `properties: ${report.created.properties} created, ${report.existing.properties} existing`
  )

  const projects = asList(await loadJson(exportDir, "projects.json"))
  for (const p of projects) {
    const existing = await prisma.project.findFirst({
      where: { userId: user.id, name: p.name },
    })
    if (existing) {
      report.existing.projects++
      report.projectIdMap[p.id] = existing.id
      continue
    }
    const mappedPropertyId =
      report.propertyIdMap[p.propertyId] ?? p.propertyId ?? null
    const created = await prisma.project.create({
      data: {
        userId: user.id,
        propertyId: mappedPropertyId,
        name: p.name,
        description: p.description ?? null,
        status: p.status ?? "active",
        clientName: p.clientName ?? null,
        clientEmail: p.clientEmail ?? null,
        clientPhone: p.clientPhone ?? null,
        address: p.address ?? null,
      },
    })
    report.created.projects++
    report.projectIdMap[p.id] = created.id
    for (const ph of p.photos ?? []) {
      report.photosPreservedInExport++
    }
  }
  console.log(
    `projects: ${report.created.projects} created, ${report.existing.projects} existing (${report.photosPreservedInExport} photo rows noted)`
  )

  const annotations = await loadJson(exportDir, "photo-annotations.json")
  if (annotations && typeof annotations === "object") {
    report.annotationsPreservedInExport = Object.keys(annotations).length
  }

  const outDir = path.join(exportDir, "ingest-report")
  await mkdir(outDir, { recursive: true })
  await writeFile(
    path.join(outDir, "reconciliation.json"),
    JSON.stringify(report, null, 2)
  )
  console.log(`Report: ${path.join(outDir, "reconciliation.json")}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
