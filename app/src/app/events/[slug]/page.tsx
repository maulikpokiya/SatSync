import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEventBySlug } from '@/lib/sheets/events'
import { getSessionsByEvent } from '@/lib/sheets/sessions'
import { CATEGORY_MAP } from '@/lib/constants'
import { PublicAgenda } from './PublicAgenda'
import { PrintButton } from './PrintButton'
import type { Session } from '@/types'

interface Props {
  params: { slug: string }
  searchParams: { day?: string }
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
  // Same month: "Fri, July 4 – Sun, July 6, 2025"
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
  return new Date(utcIso).toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
}

export default async function PublicEventPage({ params, searchParams }: Props) {
  const event = await getEventBySlug(params.slug)
  if (!event || event.status === 'archived') notFound()

  const allSessions = await getSessionsByEvent(event.id)
  const confirmed = allSessions.filter((s) => s.status === 'confirmed')

  // Build ordered day list from confirmed sessions
  const dayMap = new Map<string, { label: string; sessions: Session[] }>()
  for (const s of confirmed) {
    if (!s.start_time) continue
    const key = getDayKey(s.start_time, event.primary_timezone)
    const label = getDayLabel(s.start_time, event.primary_timezone)
    if (!dayMap.has(key)) dayMap.set(key, { label, sessions: [] })
    dayMap.get(key)!.sessions.push(s)
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const activeDay = searchParams.day && dayMap.has(searchParams.day)
    ? searchParams.day
    : days[0]?.[0] ?? null

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
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Program Agenda</p>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{dateRange} · {tzAbbr}</p>
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

        {/* Day tabs */}
        {days.length > 1 && (
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto pb-0 -mb-px">
              {days.map(([key, { label }]) => (
                <Link
                  key={key}
                  href={`/events/${event.slug}?day=${key}`}
                  className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    key === activeDay
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {label.split(',')[0]}{/* Just "Friday", "Saturday", etc. */}
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    {label.split(', ')[1]?.split(',')[0]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Sessions */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {confirmed.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No sessions published yet</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : activeDay ? (
          <PublicAgenda
            sessions={dayMap.get(activeDay)?.sessions ?? []}
            timezone={event.primary_timezone}
            tzAbbr={tzAbbr}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 border-t border-border mt-4">
        <p className="text-xs text-muted-foreground text-center">
          {event.title} · Powered by SatSync
        </p>
      </footer>
    </div>
  )
}
