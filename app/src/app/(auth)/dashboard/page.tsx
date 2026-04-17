import { Metadata } from 'next'
import { getAllEvents } from '@/lib/sheets/events'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus } from 'lucide-react'
import type { Event } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const events = await getAllEvents()

  return (
    <>
      <Topbar breadcrumbs={[{ label: 'Dashboard' }]} />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your events and programs</p>
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <CardTitle className="text-lg mb-2">No events yet</CardTitle>
              <CardDescription className="max-w-sm mb-6">
                Add rows to the <strong>events</strong> tab in your Google Sheet, or create an
                event through the app once Phase 2 is built.
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
            {events.map((event: Event) => (
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
                      : 'Dates TBD'}
                    {event.end_date &&
                      event.end_date !== event.start_date &&
                      ` — ${new Date(event.end_date).toLocaleDateString('en-US', {
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
