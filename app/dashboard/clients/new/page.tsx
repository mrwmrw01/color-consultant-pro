
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { CreateClientForm } from "@/components/clients/create-client-form"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function NewClientPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  return (
    <div className="p-8 rounded-lg" style={{ backgroundColor: '#fef3e8' }}>
      <CreateClientForm />
    </div>
  )
}
