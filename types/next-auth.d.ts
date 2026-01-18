
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      firstName?: string
      lastName?: string
      companyName?: string
      role: string
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    role: string
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    firstName?: string
    lastName?: string
    companyName?: string
  }
}
