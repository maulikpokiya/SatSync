import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSessionsByEvent } from '@/lib/sheets/sessions'
import { getSpeakersByEvent } from '@/lib/sheets/speakers'
import { getRoomsByLocation } from '@/lib/sheets/rooms'
import { getLocationById } from '@/lib/sheets/locations'
import { PublicAgenda } from './PublicAgenda'
import { PrintButton } from './PrintButton'
import type { Session } from '@/types'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug(params.slug)
  if (!event) return { title: 'Event Not Found' }
  return {
    title: event.title,
    description: `Agenda for ${event.title}`,
    robots: { index: true, follow: true },
  }
}

function formatDateRange(start: string | null, end: string | null, tz: string) {
  if (!start) return 'Dates TBD'
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
  if (!end || end === start) return fmt(start)
  const s = new Date(start), e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    const startShort = new Date(start).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'long', day: 'numeric' })
    const endShort = new Date(end).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', day: 'numeric', year: 'numeric' })
    return `${startShort} – ${endShort}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

function getDayLabel(utcIso: string, tz: string) {
  return new Date(utcIso).toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  })
}

function getDayKey(utcIso: string, tz: string) {
  return new Date(utcIso).toLocaleDateString('en-CA', { timeZone: tz })
}

export default async function PublicEventPage({ params }: Props) {
  const event = await getEventBySlug(params.slug)
  if (!event || event.status === 'archived') notFound()

  const [allSessions, speakers, rooms, eventLocation] = await Promise.all([
    getSessionsByEvent(event.id),
    getSpeakersByEvent(event.id),
    event.location_id ? getRoomsByLocation(event.location_id) : Promise.resolve([]),
    event.location_id ? getLocationById(event.location_id) : Promise.resolve(null),
  ])
  const confirmed = allSessions.filter((s) => s.status === 'confirmed')

  const dayMap = new Map<string, { label: string; sessions: Session[] }>()
  for (const s of confirmed) {
    if (!s.start_time) continue
    const key = getDayKey(s.start_time, event.primary_timezone)
    const label = getDayLabel(s.start_time, event.primary_timezone)
    if (!dayMap.has(key)) dayMap.set(key, { label, sessions: [] })
    dayMap.get(key)!.sessions.push(s)
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const tzAbbr = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: event.primary_timezone, timeZoneName: 'short' })
        .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? event.primary_timezone
    } catch { return event.primary_timezone }
  })()

  const dateRange = formatDateRange(event.start_date, event.end_date, event.primary_timezone)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Program Agenda</p>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{dateRange} · {tzAbbr}</p>
              {eventLocation && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {eventLocation.name}{eventLocation.address && ` — ${eventLocation.address}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {event.status === 'published' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  Published
                </span>
              )}
              <PrintButton />
            </div>
          </div>
        </div>
      </header>

      {/* Sessions */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {confirmed.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No sessions published yet</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <PublicAgenda
            allDays={days.map(([key, { label, sessions: ds }]) => ({ key, label, sessions: ds }))}
            timezone={event.primary_timezone}
            tzAbbr={tzAbbr}
            rooms={rooms}
            speakers={speakers}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 border-t border-border mt-4">
        <p className="text-xs text-muted-foreground text-center">
          {event.title} · Powered by SatSync
        </p>
      </footer>
    </div>
  )
}
