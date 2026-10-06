/**
 * Export ALL data reachable through the production app's API.
 *
 * The prod build (paint.weadtech.net) is an April-2026 working-tree build whose
 * database is unreachable directly, but every record is readable through its
 * authenticated API. This script logs in with the consultant's credentials and
 * dumps clients, properties, projects (incl. photo metadata), annotations,
 * synopses, colors and rooms to JSON files.
 *
 * Usage:
 *   PROD_EMAIL=<login email> PROD_PASSWORD=<password> \
 *     npx tsx scripts/export-prod-data.ts
 *
 * Optional: PROD_BASE_URL (default https://paint.weadtech.net)
 *           OUT_DIR (default /home/mark/recovery/prod-export)
 *
 * Read-only: performs only GET requests after login.
 */

import { writeFile, mkdir } from "fs/promises"
import path from "path"

const BASE = (process.env.PROD_BASE_URL || "https://paint.weadtech.net").replace(/\/$/, "")
const OUT = process.env.OUT_DIR || "/home/mark/recovery/prod-export"

interface CookieJar {
  cookies: Map<string, string>
  ingest(setCookies: string[]): void
  header(): string
}

function makeJar(): CookieJar {
  const cookies = new Map<string, string>()
  return {
    cookies,
    ingest(setCookies: string[]) {
      for (const sc of setCookies) {
        const [pair] = sc.split(";")
        const idx = pair.indexOf("=")
        if (idx === -1) continue
        const name = pair.slice(0, idx).trim()
        let value = pair.slice(idx + 1)
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        cookies.set(name, value)
      }
    },
    header() {
      return Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
    },
  }
}

async function request(
  jar: CookieJar,
  url: string,
  init?: RequestInit
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      cookie: jar.header(),
      ...(init?.headers || {}),
    },
    redirect: "manual",
  })
  jar.ingest(res.headers.getSetCookie())
  const text = await res.text()
  let body: any = text
  try {
    body = JSON.parse(text)
  } catch {
    /* keep raw */
  }
  return { status: res.status, body, headers: res.headers }
}

async function main() {
  const email = process.env.PROD_EMAIL
  const password = process.env.PROD_PASSWORD
  if (!email || !password) {
    console.error(
      "Set PROD_EMAIL and PROD_PASSWORD env vars (the consultant's paint.weadtech.net login)."
    )
    process.exit(1)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outDir = path.join(OUT, stamp)
  await mkdir(outDir, { recursive: true })
  const save = async (name: string, data: unknown) => {
    const file = path.join(outDir, name)
    await writeFile(file, JSON.stringify(data, null, 2))
    console.log(`  saved ${name} (${(JSON.stringify(data)?.length || 0).toLocaleString()} bytes)`)
    return data
  }

  const jar = makeJar()

  console.log(`→ ${BASE}  (export dir: ${outDir})`)

  // 1. CSRF
  const csrf = await request(jar, `${BASE}/api/auth/csrf`)
  if (csrf.status !== 200 || !csrf.body?.csrfToken) {
    console.error("CSRF failed:", csrf.status, JSON.stringify(csrf.body))
    process.exit(1)
  }

  // 2. Login (credentials provider)
  const form = new URLSearchParams()
  form.set("csrfToken", csrf.body.csrfToken)
  form.set("email", email)
  form.set("password", password)
  form.set("callbackUrl", `${BASE}/dashboard`)
  form.set("json", "true")
  const login = await request(jar, `${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  })
  if (login.status !== 200 || login.body?.url === `${BASE}/api/auth/error`) {
    console.error("Login failed:", login.status, JSON.stringify(login.body))
    process.exit(1)
  }

  // 3. Confirm session
  const session = await request(jar, `${BASE}/api/auth/session`)
  if (!session.body?.user) {
    console.error("Session check failed:", JSON.stringify(session.body))
    process.exit(1)
  }
  console.log(`✓ logged in as ${session.body.user.email}`)

  // 4. Dump collections
  const collections = [
    "clients",
    "properties",
    "projects",
    "rooms",
    "colors",
    "synopsis",
  ]
  const data: Record<string, any> = {}
  for (const name of collections) {
    const r = await request(jar, `${BASE}/api/${name}`)
    if (r.status !== 200) {
      console.warn(`  ⚠ ${name}: HTTP ${r.status}`)
      continue
    }
    data[name] = await save(`${name}.json`, r.body)
  }

  // 5. Per-project photos come embedded in /api/projects; pull annotations per photo
  const projects: any[] =
    data.projects?.map
      ? Array.isArray(data.projects)
        ? data.projects
        : (data.projects.items ?? data.projects.data ?? [])
      : []
  const photos: any[] = []
  for (const p of projects) {
    for (const ph of p.photos ?? []) {
      photos.push(ph)
    }
  }
  console.log(`\nFound ${projects.length} projects, ${photos.length} photos`)

  const annotations: Record<string, any> = {}
  const photoUrls: Record<string, any> = {}
  for (const ph of photos) {
    const id = ph.id
    if (!id) continue
    const [annRes, urlRes] = await Promise.all([
      request(jar, `${BASE}/api/photos/${id}/annotations`),
      request(jar, `${BASE}/api/photos/${id}/url`),
    ])
    if (annRes.status === 200) annotations[id] = annRes.body
    if (urlRes.status === 200) photoUrls[id] = urlRes.body
    process.stdout.write(".")
  }
  if (photos.length) process.stdout.write("\n")
  await save("photo-annotations.json", annotations)
  await save("photo-urls.json", photoUrls)

  // 6. Per-synopsis detail
  const synopses: any[] =
    data.synopsis?.map
      ? Array.isArray(data.synopsis)
        ? data.synopsis
        : (data.synopsis.items ?? data.synopsis.data ?? [])
      : []
  const synopsisDetails: Record<string, any> = {}
  for (const s of synopses) {
    const id = s.id
    if (!id) continue
    const r = await request(jar, `${BASE}/api/synopsis/${id}`)
    if (r.status === 200) synopsisDetails[id] = r.body
  }
  await save("synopsis-details.json", synopsisDetails)

  // 7. Manifest
  await save("manifest.json", {
    exportedAt: new Date().toISOString(),
    baseUrl: BASE,
    user: session.body.user,
    counts: {
      clients: Array.isArray(data.clients) ? data.clients.length : data.clients?.length ?? "?",
      properties: Array.isArray(data.properties) ? data.properties.length : data.properties?.length ?? "?",
      projects: projects.length,
      photos: photos.length,
      annotations: Object.keys(annotations).length,
      synopses: synopses.length,
    },
  })

  console.log("\n✓ Export complete:", outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
