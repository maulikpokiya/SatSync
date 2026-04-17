import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { upsertUser, getUserByEmail } from '@/lib/sheets/users'
import { randomUUID } from 'crypto'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    /**
     * Called after a successful sign-in.
     * Upserts the user in the Sheet and attaches their role to the token.
     */
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        // First sign-in: upsert user in Sheets, attach role to token
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
