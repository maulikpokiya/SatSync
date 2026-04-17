import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getAllUsers, getUserByEmail } from '@/lib/sheets/users'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AssignRoleForm } from './AssignRoleForm'
import type { AppRole } from '@/types'

export const metadata: Metadata = { title: 'Users & Roles' }

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  event_admin: 'bg-blue-100 text-blue-700 border-blue-200',
  editor: 'bg-amber-100 text-amber-700 border-amber-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const me = await getUserByEmail(session.user.email)
  if (me?.role !== 'super_admin') redirect('/dashboard')

  const users = await getAllUsers()

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Users & Roles' }]} />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="text-muted-foreground mt-1">
            Manage access. You can also edit the <strong>users</strong> sheet tab directly.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Users</CardTitle>
            <CardDescription>{users.length} registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const initials = (u.display_name ?? u.email)
                      .split(/[\s@]/).slice(0, 2)
                      .map((s: string) => s[0]?.toUpperCase() ?? '').join('')

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.display_name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {u.role ? (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No role</span>
                          )}
                        </td>
                        <td className="py-3">
                          {u.id !== me?.id ? (
                            <AssignRoleForm userId={u.id} currentRole={u.role} />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">You</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
