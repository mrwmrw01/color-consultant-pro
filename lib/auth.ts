
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          companyName: user.companyName || undefined,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin"
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.firstName = user.firstName || undefined
        token.lastName = user.lastName || undefined
        token.companyName = user.companyName || undefined
        token.authTime = Date.now()
        return token
      }
      if (!token.id) return token

      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { name: true, firstName: true, lastName: true, companyName: true, passwordChangedAt: true },
      })
      // Revoke sessions of deleted users and sessions signed in before the
      // last password change (tokens from before authTime existed count as 0).
      // next-auth treats the error as signed out and clears the cookie.
      if (!current || (current.passwordChangedAt && current.passwordChangedAt.getTime() > (token.authTime ?? 0))) {
        throw new Error("Session revoked")
      }

      // useSession().update() after a profile edit: reload from the database
      // rather than trusting client-supplied values
      if (trigger === "update") {
        token.name = current.name
        token.firstName = current.firstName || undefined
        token.lastName = current.lastName || undefined
        token.companyName = current.companyName || undefined
      }
      return token
    },
    async session({ session, token }) {
      // Ensure user ID is properly set from both token.sub and token.id
      session.user.id = (token.id as string) || (token.sub as string)
      session.user.role = token.role as string
      session.user.firstName = token.firstName as string
      session.user.lastName = token.lastName as string
      session.user.companyName = token.companyName as string
      return session
    }
  },
  debug: false,
}
