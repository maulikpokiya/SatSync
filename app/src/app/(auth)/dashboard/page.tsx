import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Fetch events the user has a role on (or all published events)
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })

  const eventCount = events?.length ?? 0

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Dashboard' }]} />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your events and programs</p>
        </div>

        {eventCount === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <CardTitle className="text-lg mb-2">No events yet</CardTitle>
              <CardDescription className="max-w-sm mb-6">
                Create your first event to start building your program agenda. You can add sessions,
                speakers, and rooms once the event is set up.
              </CardDescription>
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
                <span className="ml-2 text-xs opacity-60">(Phase 2)</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events?.map((event: (typeof events)[number]) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        event.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : event.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <CardDescription>
                    {event.start_date
                      ? new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Dates TBD'}{' '}
                    {event.end_date &&
                      event.end_date !== event.start_date &&
                      `— ${new Date(event.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{event.primary_timezone}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
