import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSessionsByEvent } from '@/lib/sheets/sessions'
import { getSpeakersByEvent } from '@/lib/sheets/speakers'
import { getRoomsByLocation } from '@/lib/sheets/rooms'
import { getAllLocations, getLocationById } from '@/lib/sheets/locations'
import { getUserByEmail } from '@/lib/sheets/users'
import { Topbar } from '@/components/layout/Topbar'
import { EventModal } from '@/components/events/EventModal'
import { AgendaClient } from './AgendaClient'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { hasRole } from '@/types'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug(params.slug)
  return { title: event ? `${event.title} — Agenda` : 'Agenda' }
}

export default async function AgendaPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/login')

  const [event, profile] = await Promise.all([
    getEventBySlug(params.slug),
    getUserByEmail(session.user.email),
  ])

  if (!event) notFound()

  const [sessions, speakers, rooms, locations, eventLocation] = await Promise.all([
    getSessionsByEvent(event.id),
    getSpeakersByEvent(event.id),
    event.location_id ? getRoomsByLocation(event.location_id) : Promise.resolve([]),
    getAllLocations(),
    event.location_id ? getLocationById(event.location_id) : Promise.resolve(null),
  ])
  const canEdit = hasRole(profile?.role, 'editor')
  const canManageEvent = hasRole(profile?.role, 'event_admin')

  const dateRange = [event.start_date, event.end_date]
    .filter(Boolean)
    .map((d) => new Date(d!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    .join(' — ')

  return (
    <div className="flex flex-col h-full">
      <Topbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: event.title, href: `/events/${event.slug}/agenda` },
          { label: 'Agenda' },
        ]}
        actions={
          canManageEvent ? (
            <EventModal
              event={event}
              locations={locations}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit Event
                </Button>
              }
            />
          ) : undefined
        }
      />

      {/* Event header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateRange || 'Dates TBD'} · {event.primary_timezone}
              {eventLocation && ` · ${eventLocation.name}`}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            event.status === 'published' ? 'bg-green-100 text-green-700'
            : event.status === 'draft' ? 'bg-yellow-100 text-yellow-700'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AgendaClient event={event} sessions={sessions} canEdit={canEdit} rooms={rooms} speakers={speakers} />
      </div>
    </div>
  )
}
