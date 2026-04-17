/**
 * sessions sheet columns (0-indexed):
 * A=id  B=event_id  C=title  D=description  E=objectives  F=prerequisites
 * G=start_time  H=end_time  I=category  J=audience_type  K=audience_values
 * L=room  M=virtual_link  N=status  O=is_common  P=color_override
 * Q=sort_order  R=created_by  S=created_at  T=updated_at
 */

import { randomUUID } from 'crypto'
import { getSheetsClient, SHEET_ID } from './client'
import type { Session, SessionStatus, AudienceType, CategoryId } from '@/types'
import { MOCK_SESSIONS } from './mock-data'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID
const TAB = 'sessions'
const RANGE = `${TAB}!A:T`
const HEADER = [
  'id','event_id','title','description','objectives','prerequisites',
  'start_time','end_time','category','audience_type','audience_values',
  'room','virtual_link','status','is_common','color_override',
  'sort_order','created_by','created_at','updated_at',
]

function rowToSession(row: string[]): Session {
  return {
    id: row[0] ?? '',
    event_id: row[1] ?? '',
    title: row[2] ?? '',
    description: row[3] || null,
    objectives: row[4] || null,
    prerequisites: row[5] || null,
    start_time: row[6] || null,
    end_time: row[7] || null,
    category: (row[8] as CategoryId) || null,
    audience_type: (row[9] as AudienceType) || 'all',
    audience_values: row[10] ? row[10].split(',').map((s) => s.trim()).filter(Boolean) : [],
    room: row[11] || null,
    virtual_link: row[12] || null,
    status: (row[13] as SessionStatus) || 'draft',
    is_common: row[14] === 'TRUE',
    color_override: row[15] || null,
    sort_order: parseInt(row[16] ?? '0', 10) || 0,
    created_by: row[17] || null,
    created_at: row[18] ?? new Date().toISOString(),
    updated_at: row[19] ?? new Date().toISOString(),
  }
}

async function getRows() {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  return { rows: res.data.values ?? [], sheets }
}

export async function getSessionsByEvent(eventId: string): Promise<Session[]> {
  if (DEMO_MODE) {
    return MOCK_SESSIONS
      .filter((s) => s.event_id === eventId && s.status !== 'cancelled')
      .sort((a, b) => {
        if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
        return a.sort_order - b.sort_order
      })
  }
  const { rows } = await getRows()
  return rows
    .slice(1)
    .filter((r) => r[0] && r[1] === eventId && r[13] !== 'cancelled')
    .map(rowToSession)
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time)
      return a.sort_order - b.sort_order
    })
}

export async function getSessionById(id: string): Promise<Session | null> {
  if (DEMO_MODE) return MOCK_SESSIONS.find((s) => s.id === id) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToSession(row) : null
}

export async function createSession(
  data: Omit<Session, 'id' | 'created_at' | 'updated_at'> & { created_by: string }
): Promise<Session> {
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
      range: `${TAB}!A1:T1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  }

  const newRow = [
    id,
    data.event_id,
    data.title,
    data.description ?? '',
    data.objectives ?? '',
    data.prerequisites ?? '',
    data.start_time ?? '',
    data.end_time ?? '',
    data.category ?? '',
    data.audience_type ?? 'all',
    Array.isArray(data.audience_values) ? data.audience_values.join(',') : '',
    data.room ?? '',
    data.virtual_link ?? '',
    data.status ?? 'draft',
    data.is_common ? 'TRUE' : 'FALSE',
    data.color_override ?? '',
    String(data.sort_order ?? 0),
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

  return rowToSession(newRow)
}

export async function updateSession(
  id: string,
  updates: Partial<Omit<Session, 'id' | 'event_id' | 'created_at' | 'created_by'>>
): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Session ${id} not found`)

  const existing = rowToSession(rows[rowIndex])
  const updatedRow = [
    existing.id,
    existing.event_id,
    updates.title ?? existing.title,
    updates.description !== undefined ? (updates.description ?? '') : (existing.description ?? ''),
    updates.objectives !== undefined ? (updates.objectives ?? '') : (existing.objectives ?? ''),
    updates.prerequisites !== undefined ? (updates.prerequisites ?? '') : (existing.prerequisites ?? ''),
    updates.start_time !== undefined ? (updates.start_time ?? '') : (existing.start_time ?? ''),
    updates.end_time !== undefined ? (updates.end_time ?? '') : (existing.end_time ?? ''),
    updates.category !== undefined ? (updates.category ?? '') : (existing.category ?? ''),
    updates.audience_type ?? existing.audience_type,
    updates.audience_values !== undefined
      ? updates.audience_values.join(',')
      : existing.audience_values.join(','),
    updates.room !== undefined ? (updates.room ?? '') : (existing.room ?? ''),
    updates.virtual_link !== undefined ? (updates.virtual_link ?? '') : (existing.virtual_link ?? ''),
    updates.status ?? existing.status,
    (updates.is_common !== undefined ? updates.is_common : existing.is_common) ? 'TRUE' : 'FALSE',
    updates.color_override !== undefined ? (updates.color_override ?? '') : (existing.color_override ?? ''),
    String(updates.sort_order !== undefined ? updates.sort_order : existing.sort_order),
    existing.created_by ?? '',
    existing.created_at,
    new Date().toISOString(),
  ]

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:T${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}

/** Soft-delete: sets status to 'cancelled'. */
export async function deleteSession(id: string): Promise<void> {
  await updateSession(id, { status: 'cancelled' })
}
