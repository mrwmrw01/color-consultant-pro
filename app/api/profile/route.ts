import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  companyName: z.string().trim().max(200).optional().default(""),
})

/**
 * PATCH /api/profile
 * Update the signed-in user's name and company
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = profileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    )
  }

  const { firstName, lastName, companyName } = parsed.data
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      companyName: companyName || null,
    },
    select: { firstName: true, lastName: true, companyName: true, email: true },
  })

  return NextResponse.json(user)
}
