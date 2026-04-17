import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { upsertUser, getUserByEmail } from '@/lib/sheets/users'
import { DEMO_USER } from '@/lib/sheets/mock-data'
import { randomUUID } from 'crypto'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ] : []),
    ...(DEMO_MODE ? [
      CredentialsProvider({
        id: 'demo',
        name: 'Demo Login',
        credentials: {},
        async authorize() {
          return { id: DEMO_USER.id, name: DEMO_USER.display_name, email: DEMO_USER.email, image: null }
        },
      }),
    ] : []),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    /**
     * Called after a successful sign-in.
     * Upserts the user in the Sheet and attaches their role to the token.
     */
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        if (account.provider === 'demo') {
          token.userId = DEMO_USER.id
          token.role = DEMO_USER.role
          token.home_timezone = DEMO_USER.home_timezone
        } else {
          // First sign-in via Google: upsert user in Sheets, attach role to token
          const existing = await getUserByEmail(user.email)
          const profile = await upsertUser({
            id: existing?.id ?? randomUUID(),
            email: user.email,
            display_name: user.name ?? null,
            avatar_url: user.image ?? null,
            role: existing?.role ?? null,
            home_timezone: existing?.home_timezone ?? 'America/Chicago',
          })
          token.userId = profile.id
          token.role = profile.role ?? null
          token.home_timezone = profile.home_timezone
        }
      }
      return token
    },

    /** Expose userId and role on the client-side session object. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as string | null
        session.user.home_timezone = token.home_timezone as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
}
