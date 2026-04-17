import { Metadata } from 'next'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

export const metadata: Metadata = {
  title: 'Sign In — SatSync',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sidebar mb-2">
            <span className="text-2xl font-bold text-sidebar-primary">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SatSync</h1>
          <p className="text-sm text-muted-foreground">
            Event agenda management for your community
          </p>
        </div>

        {/* Sign-in Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <GoogleSignInButton />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
