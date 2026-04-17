/**
 * events sheet columns (0-indexed):
 * A=id  B=title  C=slug  D=status  E=start_date  F=end_date  G=primary_timezone  H=created_by  I=created_at  J=updated_at
 */

import { getSheetsClient, SHEET_ID, TABS } from './client'
import type { Event } from '@/types'

const RANGE = `${TABS.events}!A:J`
const HEADER = ['id', 'title', 'slug', 'status', 'start_date', 'end_date', 'primary_timezone', 'created_by', 'created_at', 'updated_at']

function rowToEvent(row: string[]): Event {
  return {
    id: row[0] ?? '',
    title: row[1] ?? '',
    slug: row[2] ?? '',
    status: (row[3] as Event['status']) || 'draft',
    start_date: row[4] || null,
    end_date: row[5] || null,
    primary_timezone: row[6] || 'America/Chicago',
    created_by: row[7] || null,
    created_at: row[8] ?? new Date().toISOString(),
    updated_at: row[9] ?? new Date().toISOString(),
  }
}

export async function getAllEvents(): Promise<Event[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  const rows = res.data.values ?? []
  return rows.slice(1).filter((r) => r[0]).map(rowToEvent)
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const events = await getAllEvents()
  return events.find((e) => e.slug === slug) ?? null
}

export async function getPublishedEvents(): Promise<Event[]> {
  const events = await getAllEvents()
  return events.filter((e) => e.status === 'published')
}
