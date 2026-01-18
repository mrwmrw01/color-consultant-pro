
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { data: session, status } = useSession() || {}
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (requireAuth && status === "unauthenticated") {
      router.replace("/auth/signin")
      return
    }

    if (!requireAuth && status === "authenticated") {
      router.replace("/dashboard")
      return
    }
  }, [status, router, requireAuth])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (requireAuth && status === "unauthenticated") {
    return null
  }

  if (!requireAuth && status === "authenticated") {
    return null
  }

  return <>{children}</>
}
