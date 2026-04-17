'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function DemoLoginButton({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    await signIn('demo', { callbackUrl })
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="secondary" className="w-full" size="lg">
      {loading ? 'Signing in…' : 'Continue as Demo User'}
    </Button>
  )
}
