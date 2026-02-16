
"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "react-hot-toast"
import { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }))

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
