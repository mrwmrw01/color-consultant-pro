import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { SynopsisDraftEditor } from "@/components/synopsis/synopsis-draft-editor"
import { Toaster } from "@/components/ui/sonner"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SynopsisDraftPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const { projectId } = await params

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      photos: {
        select: {
          id: true,
          originalFilename: true,
          thumbnail_path: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!project) {
    redirect("/dashboard/projects")
  }

  const photos = project.photos.map((p) => ({
    id: p.id,
    filename: p.originalFilename,
    hasThumbnail: !!p.thumbnail_path,
  }))

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <SynopsisDraftEditor projectId={project.id} projectName={project.name} photos={photos} />
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
