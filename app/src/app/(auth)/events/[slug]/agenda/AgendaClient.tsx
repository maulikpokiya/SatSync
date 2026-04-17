'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ExternalLink, LayoutList, AlignJustify, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionEditor } from '@/components/sessions/SessionEditor'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants'
import type { Event, Session } from '@/types'

interface AgendaClientProps {
  event: Event
  sessions: Session[]
  canEdit: boolean
}

function formatTime(utcIso: string | null, tz: string): string {
  if (!utcIso) return '—'
  return new Date(utcIso).toLocaleTimeString('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function getDayKey(utcIso: string, tz: string) {
  return new Date(utcIso).toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD for stable sort
}

function getDayLabel(utcIso: string, tz: string) {
  return new Date(utcIso).toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
  })
}

function groupByDay(sessions: Session[], tz: string): Map<string, { label: string; sessions: Session[] }> {
  const map = new Map<string, { label: string; sessions: Session[] }>()
  for (const s of sessions) {
    const key = s.start_time ? getDayKey(s.start_time, tz) : 'no-date'
    const label = s.start_time ? getDayLabel(s.start_time, tz) : 'No date'
    if (!map.has(key)) map.set(key, { label, sessions: [] })
    map.get(key)!.sessions.push(s)
  }
  return map
}

export function AgendaClient({ event, sessions, canEdit }: AgendaClientProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [view, setView] = useState<'detailed' | 'compact' | 'grid'>('detailed')
  const router = useRouter()

  function openNew() { setEditingSession(undefined); setEditorOpen(true) }
  function openEdit(s: Session) { setEditingSession(s); setEditorOpen(true) }

  async function handleDelete(s: Session) {
    if (!confirm(`Delete session "${s.title}"?`)) return
    setDeletingId(s.id)
    const res = await fetch(`/api/events/${event.slug}/sessions/${s.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Session removed')
      router.refresh()
    } else {
      toast.error('Failed to remove session')
    }
    setDeletingId(null)
  }

  const grouped = groupByDay(sessions, event.primary_timezone)
  const days = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
  const currentDayKey = activeDay ?? days[0]?.[0] ?? null

  const daySessionsRaw = currentDayKey ? (grouped.get(currentDayKey)?.sessions ?? []) : sessions

  // In grid view show categories across all days; otherwise scope to active day
  const categorySource = view === 'grid' ? sessions : daySessionsRaw
  const usedCategoryIds = Array.from(new Set(categorySource.map((s) => s.category).filter(Boolean)))
  const usedCategories = CATEGORIES.filter((c) => usedCategoryIds.includes(c.id))

  const daySessions = activeCategory
    ? daySessionsRaw.filter((s) => s.category === activeCategory)
    : daySessionsRaw

  // Grid: all days with category filter applied per column
  const gridColumns = days.map(([key, { label, sessions: ds }]) => ({
    key,
    label,
    sessions: (activeCategory ? ds.filter((s) => s.category === activeCategory) : ds)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
  }))

  return (
    <>
      {/* Action bar — always one compact row */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border bg-background gap-2">
        <span className="text-sm text-muted-foreground shrink-0">
          {view === 'grid' ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''}` : `${daySessions.length} session${daySessions.length !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView('detailed')}
              className={`px-2.5 py-1.5 transition-colors ${view === 'detailed' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Detailed view"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('compact')}
              className={`px-2.5 py-1.5 border-l border-border transition-colors ${view === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Compact view"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-2.5 py-1.5 border-l border-border transition-colors ${view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="All days grid"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Public view link */}
          <a
            href={`/events/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Public view</span>
          </a>
          {canEdit && (
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Add Session</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Day tabs — hidden in grid view */}
      {days.length > 1 && view !== 'grid' && (
        <div className="flex gap-1 overflow-x-auto px-4 sm:px-6 pt-3 border-b border-border bg-background">
          {days.map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => { setActiveDay(key); setActiveCategory(null) }}
              className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                key === currentDayKey
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Category filter pills — full-width scrollable row, only when needed */}
      {usedCategories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 sm:px-6 py-2.5 border-b border-border bg-background">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
              activeCategory === null
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground'
            }`}
          >
            All
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className="shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap"
              style={
                activeCategory === cat.id
                  ? { backgroundColor: cat.color, color: '#fff', borderColor: cat.color }
                  : { backgroundColor: cat.bg, color: cat.text, borderColor: cat.color + '60' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Session list */}
      {view === 'grid' ? (
        /* ── Grid view: all days side by side ── */
        <div className="overflow-x-auto p-4 sm:p-6">
          {sessions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-3">
              <p className="text-lg font-medium">No sessions yet</p>
              <p className="text-sm">{canEdit ? 'Click "Add" to create the first session.' : 'Sessions will appear here once added.'}</p>
            </div>
          ) : (
            <div className="flex gap-3" style={{ minWidth: `${gridColumns.length * 220}px` }}>
              {gridColumns.map(({ key, label, sessions: colSessions }) => (
                <div key={key} className="flex-1 min-w-[200px]">
                  {/* Column header */}
                  <div className="sticky top-0 z-10 bg-background border border-border rounded-lg px-3 py-2 mb-2 text-center">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{colSessions.length} session{colSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                  {/* Sessions */}
                  {colSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">None</p>
                  ) : (
                    <div className="space-y-1.5">
                      {colSessions.map((s) => {
                        const cat = s.category ? CATEGORY_MAP[s.category] : null
                        return (
                          <div
                            key={s.id}
                            className="group rounded-lg border bg-card p-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                            style={cat ? { borderLeftWidth: 3, borderLeftColor: cat.color } : undefined}
                            onClick={() => canEdit && openEdit(s)}
                          >
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              {formatTime(s.start_time, event.primary_timezone)}
                              {s.end_time && <span className="text-muted-foreground/50"> – {formatTime(s.end_time, event.primary_timezone)}</span>}
                            </p>
                            <p className="text-xs font-medium leading-snug">{s.title}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {cat && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: cat.bg, color: cat.text }}>
                                  {cat.label}
                                </span>
                              )}
                              {s.room && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {s.room}
                                </span>
                              )}
                              {s.status !== 'draft' && s.status !== 'confirmed' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                  {s.status}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className={view === 'compact' ? 'px-6 py-3' : 'p-6 space-y-2'}>
        {sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <p className="text-lg font-medium">No sessions yet</p>
            <p className="text-sm">
              {canEdit ? 'Click "Add Session" to create the first session.' : 'Sessions will appear here once added.'}
            </p>
          </div>
        ) : daySessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No sessions match this filter.</p>
        ) : view === 'compact' ? (
          /* Compact view */
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left font-medium pb-2 w-28">Time</th>
                <th className="text-left font-medium pb-2">Title</th>
                <th className="text-left font-medium pb-2 hidden sm:table-cell">Category</th>
                <th className="text-left font-medium pb-2 hidden sm:table-cell">Audience</th>
                <th className="text-left font-medium pb-2 hidden sm:table-cell">Room</th>
                <th className="text-left font-medium pb-2 w-16">Status</th>
                {canEdit && <th className="w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {daySessions.map((s) => {
                const cat = s.category ? CATEGORY_MAP[s.category] : null
                return (
                  <tr key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 text-xs text-muted-foreground font-medium whitespace-nowrap align-middle">
                      {formatTime(s.start_time, event.primary_timezone)}
                      {s.end_time && <span className="text-muted-foreground/60"> – {formatTime(s.end_time, event.primary_timezone)}</span>}
                    </td>
                    <td className="py-2 pr-4 font-medium align-middle">
                      <div className="flex items-center gap-2">
                        {cat && <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                        {s.title}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground hidden sm:table-cell align-middle">
                      {cat?.label ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground hidden sm:table-cell align-middle">
                      {s.is_common ? 'All' : s.audience_values.join(', ') || '—'}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground hidden sm:table-cell align-middle">
                      {s.room ?? '—'}
                    </td>
                    <td className="py-2 pr-4 align-middle">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        s.status === 'confirmed' ? 'bg-green-100 text-green-700'
                        : s.status === 'cancelled' ? 'bg-red-100 text-red-600'
                        : s.status === 'postponed' ? 'bg-amber-100 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-2 align-middle">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(s)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(s)}
                            disabled={deletingId === s.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          /* Detailed view */
          daySessions.map((s) => {
            const cat = s.category ? CATEGORY_MAP[s.category] : null
            return (
              <div
                key={s.id}
                className="group flex items-start gap-4 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                style={cat ? { borderLeftWidth: 3, borderLeftColor: cat.color, backgroundColor: cat.bg + '66' } : undefined}
              >
                {/* Time */}
                <div className="w-28 shrink-0 text-xs text-muted-foreground pt-0.5 font-medium">
                  <div>{formatTime(s.start_time, event.primary_timezone)}</div>
                  {s.end_time && (
                    <div className="text-muted-foreground/60">→ {formatTime(s.end_time, event.primary_timezone)}</div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="font-medium text-sm leading-snug">{s.title}</span>
                    {s.status !== 'draft' && s.status !== 'confirmed' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {s.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {cat && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cat.bg, color: cat.text, border: `1px solid ${cat.color}40` }}>
                        {cat.label}
                      </span>
                    )}
                    {s.audience_type !== 'all' && s.audience_values.map((v) => (
                      <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {v}
                      </span>
                    ))}
                    {s.is_common && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        All
                      </span>
                    )}
                    {s.room && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {s.room}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s)}
                      disabled={deletingId === s.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      )}

      <SessionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        eventSlug={event.slug}
        eventTimezone={event.primary_timezone}
        session={editingSession}
      />
    </>
  )
}
