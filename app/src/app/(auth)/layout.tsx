import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { AppRole } from '@/types'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  // Fetch global role (event_id IS NULL)
  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authUser.id)
    .is('event_id', null)
    .order('role', { ascending: true })
    .limit(1)
    .maybeSingle()

  const globalRole = (roleRow?.role ?? null) as AppRole | null

  if (!profile) {
    // Profile should have been created by the trigger; redirect to avoid blank state
    redirect('/login?error=profile_missing')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={profile} globalRole={globalRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
