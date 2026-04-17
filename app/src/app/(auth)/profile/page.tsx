import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileForm } from './ProfileForm'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const profile = await getUserByEmail(session.user.email)
  if (!profile) redirect('/login')

  const initials = (profile.display_name ?? profile.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile.display_name ?? 'Set your name'}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm user={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Account Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {profile.last_login && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last sign in</span>
                <span>{new Date(profile.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {profile.role && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize">{profile.role.replace('_', ' ')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
