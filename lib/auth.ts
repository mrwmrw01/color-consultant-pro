
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.firstName = user.firstName || undefined
        token.lastName = user.lastName || undefined
        token.companyName = user.companyName || undefined
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
