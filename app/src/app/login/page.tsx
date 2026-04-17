import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/config'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { DemoLoginButton } from '@/components/auth/DemoLoginButton'

export const metadata: Metadata = { title: 'Sign In — SatSync' }

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sidebar mb-2">
            <span className="text-2xl font-bold text-sidebar-primary">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SatSync</h1>
          <p className="text-sm text-muted-foreground">
            Event agenda management for your community
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          {process.env.GOOGLE_CLIENT_ID ? (
            <GoogleSignInButton />
          ) : (
            <DemoLoginButton />
          )}
          <p className="text-center text-xs text-muted-foreground">
            {process.env.GOOGLE_CLIENT_ID
              ? 'Contact your administrator if you need access.'
              : 'Running in demo mode — no setup required.'}
          </p>
        </div>
      </div>
    </div>
  )
}
