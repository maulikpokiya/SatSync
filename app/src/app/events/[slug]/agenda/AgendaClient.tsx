'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionEditor } from '@/components/sessions/SessionEditor'
import { CATEGORY_MAP } from '@/lib/constants'
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

function groupByDay(sessions: Session[], tz: string): Map<string, Session[]> {
  const map = new Map<string, Session[]>()
  for (const s of sessions) {
    const day = s.start_time
      ? new Date(s.start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
      : 'No date'
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(s)
  }
  return map
}

export function AgendaClient({ event, sessions, canEdit }: AgendaClientProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
  const days = Array.from(grouped.keys())

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Session
          </Button>
        )}
      </div>

      {/* Session list */}
      <div className="p-6 space-y-8">
        {sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <p className="text-lg font-medium">No sessions yet</p>
            <p className="text-sm">
              {canEdit ? 'Click "Add Session" to create the first session.' : 'Sessions will appear here once added.'}
            </p>
          </div>
        ) : (
          days.map((day) => (
            <section key={day}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border">
                {day}
              </h2>
              <div className="space-y-2">
                {grouped.get(day)!.map((s) => {
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
                })}
              </div>
            </section>
          ))
        )}
      </div>

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
