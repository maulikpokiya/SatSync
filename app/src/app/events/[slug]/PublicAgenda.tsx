'use client'

import { useState } from 'react'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants'
import type { Session } from '@/types'

interface Props {
  sessions: Session[]
  timezone: string
  tzAbbr: string
}

function fmt(utcIso: string | null, tz: string) {
  if (!utcIso) return '—'
  return new Date(utcIso).toLocaleTimeString('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export function PublicAgenda({ sessions, timezone, tzAbbr }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Only show categories that appear in this day's sessions
  const usedCategoryIds = Array.from(new Set(sessions.map((s) => s.category).filter(Boolean)))
  const usedCategories = CATEGORIES.filter((c) => usedCategoryIds.includes(c.id))

  const visible = activeCategory
    ? sessions.filter((s) => s.category === activeCategory)
    : sessions

  return (
    <div className="space-y-4">
      {/* Category filter pills */}
      {usedCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeCategory === null
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
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
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No sessions match this filter.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => {
            const cat = s.category ? CATEGORY_MAP[s.category] : null
            const isParallel = !s.is_common && s.audience_values.length > 0

            return (
              <div
                key={s.id}
                className="flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors"
                style={cat ? { borderLeftWidth: 3, borderLeftColor: cat.color } : undefined}
              >
                {/* Time column */}
                <div className="w-24 shrink-0 text-xs text-muted-foreground font-medium pt-0.5">
                  <div>{fmt(s.start_time, timezone)}</div>
                  {s.end_time && (
                    <div className="text-muted-foreground/60">→ {fmt(s.end_time, timezone)}</div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug">{s.title}</p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cat && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: cat.bg, color: cat.text, border: `1px solid ${cat.color}40` }}
                      >
                        {cat.label}
                      </span>
                    )}
                    {isParallel && s.audience_values.map((v) => (
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
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">All times shown in {tzAbbr}.</p>
    </div>
  )
}
