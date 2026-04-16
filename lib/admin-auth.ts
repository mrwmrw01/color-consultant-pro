import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export type AdminSession = {
  userId: string
  role: string
  email?: string
}

/**
 * Guards admin-only API routes.
 *
 * Returns either:
 *  - { ok: true, session } if the user is authenticated and has admin/consultant access
 *  - { ok: false, response } with a 401/403 NextResponse ready to return
 *
 * Allowed roles: "admin", "consultant" (consultants get catalog maintenance rights).
 * If you later add a dedicated "admin" role, tighten this.
 */
export async function requireAdmin(): Promise<
  { ok: true; session: AdminSession } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  const role = (session.user as any).role ?? "user"
  const allowed = ["admin", "consultant"]
  if (!allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 }),
    }
  }
  return {
    ok: true,
    session: {
      userId: session.user.id as string,
      role,
      email: session.user.email ?? undefined,
    },
  }
}
