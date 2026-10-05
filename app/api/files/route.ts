import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"
import { getStorageDriverName, getLocalUploadsDir, getContentType } from "@/lib/storage"

export const dynamic = "force-dynamic"

/**
 * Serves files stored with STORAGE_DRIVER=local.
 * Used as the photo <img> source (same-origin, carries session cookies).
 */
export async function GET(request: NextRequest) {
  if (getStorageDriverName() !== "local") {
    return NextResponse.json(
      { error: "File serving only available with STORAGE_DRIVER=local" },
      { status: 404 }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 })
  }

  const dir = path.resolve(getLocalUploadsDir())
  const target = path.resolve(dir, key)
  if (!target.startsWith(dir + path.sep)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  try {
    const buffer = await fs.readFile(target)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": getContentType(key),
        "Cache-Control": "private, max-age=300",
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
