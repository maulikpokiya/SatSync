import { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getAllEvents } from '@/lib/sheets/events'
import { getUserByEmail } from '@/lib/sheets/users'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EventModal } from '@/components/events/EventModal'
import { Calendar, ChevronRight, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasRole } from '@/types'
import type { Event } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const profile = session?.user?.email ? await getUserByEmail(session.user.email) : null
  const canManageEvents = hasRole(profile?.role, 'event_admin')

  const events = await getAllEvents()

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={canManageEvents ? <EventModal /> : undefined}
      />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your events and programs</p>
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <CardTitle className="text-lg mb-2">No events yet</CardTitle>
              <CardDescription className="max-w-sm mb-6">
                {canManageEvents
                  ? 'Create your first event to start building your program agenda.'
                  : 'No events have been created yet. Contact an admin to get started.'}
              </CardDescription>
              {canManageEvents && <EventModal />}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event: Event) => (
              <Card key={event.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      event.status === 'published' ? 'bg-green-100 text-green-700'
                      : event.status === 'draft' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <CardDescription>
                    {event.start_date
                      ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Dates TBD'}
                    {event.end_date && event.end_date !== event.start_date &&
                      ` — ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-4">{event.primary_timezone}</p>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/events/${event.slug}/agenda`}>
                        View Agenda <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {canManageEvents && (
                      <EventModal
                        event={event}
                        trigger={
                          <Button size="sm" variant="ghost" className="px-2">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
