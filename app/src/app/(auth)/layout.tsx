import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { Sidebar } from '@/components/layout/Sidebar'
import type { AppRole } from '@/types'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const profile = await getUserByEmail(session.user.email)
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={profile} globalRole={profile.role as AppRole | null} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
