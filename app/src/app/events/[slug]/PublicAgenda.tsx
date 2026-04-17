'use client'

import { CATEGORY_MAP } from '@/lib/constants'
import type { Session } from '@/types'

interface Props {
  allDays: { key: string; label: string; sessions: Session[] }[]
  timezone: string
  tzAbbr: string
}

function fmt(utcIso: string | null, tz: string) {
  if (!utcIso) return '—'
  return new Date(utcIso).toLocaleTimeString('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function PublicAgenda({ allDays, timezone, tzAbbr }: Props) {
  const columns = allDays.map((d) => ({
    ...d,
    sessions: [...d.sessions].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
  }))

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-3" style={{ minWidth: `${columns.length * 220}px` }}>
          {columns.map(({ key, label, sessions }) => (
            <div key={key} className="flex-1 min-w-[200px]">
              {/* Column header */}
              <div className="border border-border rounded-lg px-3 py-2 mb-2 text-center bg-muted/40">
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
              </div>
              {/* Sessions */}
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">None</p>
              ) : (
                <div className="space-y-1.5">
                  {sessions.map((s) => {
                    const cat = s.category ? CATEGORY_MAP[s.category] : null
                    const isParallel = !s.is_common && s.audience_values.length > 0
                    return (
                      <div
                        key={s.id}
                        className="rounded-lg border bg-card p-2.5"
                        style={cat ? { borderLeftWidth: 3, borderLeftColor: cat.color } : undefined}
                      >
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          {fmt(s.start_time, timezone)}
                          {s.end_time && <span className="text-muted-foreground/50"> – {fmt(s.end_time, timezone)}</span>}
                        </p>
                        <p className="text-xs font-medium leading-snug">{s.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {cat && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: cat.bg, color: cat.text }}>
                              {cat.label}
                            </span>
                          )}
                          {isParallel && s.audience_values.map((v) => (
                            <span key={v} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {v}
                            </span>
                          ))}
                          {s.is_common && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              All
                            </span>
                          )}
                          {s.room && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {s.room}
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
      </div>

      <p className="text-xs text-muted-foreground pt-2">All times shown in {tzAbbr}.</p>
    </div>
  )
}
