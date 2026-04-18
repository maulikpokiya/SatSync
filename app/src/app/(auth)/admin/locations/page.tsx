import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getUserByEmail } from '@/lib/sheets/users'
import { getAllLocations } from '@/lib/sheets/locations'
import { getAllRooms } from '@/lib/sheets/rooms'
import { Topbar } from '@/components/layout/Topbar'
import { hasRole } from '@/types'
import { LocationsClient } from './LocationsClient'

export const metadata: Metadata = { title: 'Locations' }

export default async function LocationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const profile = await getUserByEmail(session.user.email)
  if (!hasRole(profile?.role, 'event_admin')) redirect('/dashboard')

  const [locations, rooms] = await Promise.all([
    getAllLocations(),
    getAllRooms(),
  ])

  return (
    <div className="flex flex-col h-full">
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Locations' },
        ]}
      />
      <div className="flex-1 overflow-y-auto">
        <LocationsClient locations={locations} rooms={rooms} />
      </div>
    </div>
  )
}
