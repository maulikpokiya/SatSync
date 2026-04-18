/**
 * events sheet columns (0-indexed):
 * A=id  B=title  C=slug  D=status  E=start_date  F=end_date
 * G=primary_timezone  H=location_id  I=created_by  J=created_at  K=updated_at
 */

import { randomUUID } from 'crypto'
import { getSheetsClient, SHEET_ID, TABS } from './client'
import type { Event, EventStatus } from '@/types'
import { MOCK_EVENTS } from './mock-data'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID
const RANGE = `${TABS.events}!A:K`
const HEADER = ['id','title','slug','status','start_date','end_date','primary_timezone','location_id','created_by','created_at','updated_at']

function rowToEvent(row: string[]): Event {
  return {
    id: row[0] ?? '',
    title: row[1] ?? '',
    slug: row[2] ?? '',
    status: (row[3] as EventStatus) || 'draft',
    start_date: row[4] || null,
    end_date: row[5] || null,
    primary_timezone: row[6] || 'America/Chicago',
    location_id: row[7] || null,
    created_by: row[8] || null,
    created_at: row[9] ?? new Date().toISOString(),
    updated_at: row[10] ?? new Date().toISOString(),
  }
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

async function getRows(): Promise<{ rows: string[][]; sheets: ReturnType<typeof getSheetsClient> }> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  return { rows: res.data.values ?? [], sheets }
}

export async function getAllEvents(): Promise<Event[]> {
  if (DEMO_MODE) return MOCK_EVENTS.filter((e) => e.status !== 'archived')
  const { rows } = await getRows()
  return rows.slice(1).filter((r) => r[0] && r[3] !== 'archived').map(rowToEvent)
}

export async function getAllEventsIncludingArchived(): Promise<Event[]> {
  if (DEMO_MODE) return MOCK_EVENTS
  const { rows } = await getRows()
  return rows.slice(1).filter((r) => r[0]).map(rowToEvent)
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  if (DEMO_MODE) return MOCK_EVENTS.find((e) => e.slug === slug) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[2] === slug)
  return row ? rowToEvent(row) : null
}

export async function getEventById(id: string): Promise<Event | null> {
  if (DEMO_MODE) return MOCK_EVENTS.find((e) => e.id === id) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToEvent(row) : null
}

export async function getPublishedEvents(): Promise<Event[]> {
  if (DEMO_MODE) return MOCK_EVENTS.filter((e) => e.status === 'published')
  const { rows } = await getRows()
  return rows.slice(1).filter((r) => r[3] === 'published').map(rowToEvent)
}

export async function createEvent(
  data: Pick<Event, 'title' | 'slug' | 'status' | 'start_date' | 'end_date' | 'primary_timezone' | 'location_id'> & { created_by: string }
): Promise<Event> {
  if (DEMO_MODE) {
    const now = new Date().toISOString()
    return { id: randomUUID(), ...data, created_at: now, updated_at: now }
  }
  const { rows, sheets } = await getRows()
  const now = new Date().toISOString()
  const id = randomUUID()

  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TABS.events}!A1:K1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  }

  const newRow = [
    id,
    data.title,
    data.slug || slugify(data.title),
    data.status || 'draft',
    data.start_date ?? '',
    data.end_date ?? '',
    data.primary_timezone || 'America/Chicago',
    data.location_id ?? '',
    data.created_by,
    now,
    now,
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  })

  return rowToEvent(newRow)
}

export async function updateEvent(
  id: string,
  updates: Partial<Pick<Event, 'title' | 'slug' | 'status' | 'start_date' | 'end_date' | 'primary_timezone' | 'location_id'>>
): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Event ${id} not found`)

  const existing = rowToEvent(rows[rowIndex])
  const updatedRow = [
    existing.id,
    updates.title ?? existing.title,
    updates.slug ?? existing.slug,
    updates.status ?? existing.status,
    updates.start_date !== undefined ? (updates.start_date ?? '') : (existing.start_date ?? ''),
    updates.end_date !== undefined ? (updates.end_date ?? '') : (existing.end_date ?? ''),
    updates.primary_timezone ?? existing.primary_timezone,
    updates.location_id !== undefined ? (updates.location_id ?? '') : (existing.location_id ?? ''),
    existing.created_by ?? '',
    existing.created_at,
    new Date().toISOString(),
  ]

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TABS.events}!A${sheetRow}:K${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}

/** Soft-delete: sets status to 'archived'. */
export async function deleteEvent(id: string): Promise<void> {
  await updateEvent(id, { status: 'archived' })
}
