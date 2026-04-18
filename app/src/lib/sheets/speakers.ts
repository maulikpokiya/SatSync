/**
 * speakers sheet columns (0-indexed):
 * A=id  B=event_id  C=name  D=created_at  E=updated_at
 */

import { randomUUID } from 'crypto'
import { getSheetsClient, SHEET_ID } from './client'
import type { Speaker } from '@/types'
import { MOCK_SPEAKERS } from './mock-data'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID
const TAB = 'speakers'
const RANGE = `${TAB}!A:E`
const HEADER = ['id', 'event_id', 'name', 'created_at', 'updated_at']

function rowToSpeaker(row: string[]): Speaker {
  return {
    id: row[0] ?? '',
    event_id: row[1] ?? '',
    name: row[2] ?? '',
    created_at: row[3] ?? new Date().toISOString(),
    updated_at: row[4] ?? new Date().toISOString(),
  }
}

async function getRows() {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  return { rows: res.data.values ?? [], sheets }
}

export async function getSpeakersByEvent(eventId: string): Promise<Speaker[]> {
  if (DEMO_MODE) {
    return MOCK_SPEAKERS
      .filter((s) => s.event_id === eventId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const { rows } = await getRows()
  return rows
    .slice(1)
    .filter((r) => r[0] && r[1] === eventId)
    .map(rowToSpeaker)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getSpeakerById(id: string): Promise<Speaker | null> {
  if (DEMO_MODE) return MOCK_SPEAKERS.find((s) => s.id === id) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToSpeaker(row) : null
}

export async function createSpeaker(
  data: { event_id: string; name: string }
): Promise<Speaker> {
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
      range: `${TAB}!A1:E1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  }

  const newRow = [id, data.event_id, data.name, now, now]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  })

  return rowToSpeaker(newRow)
}

export async function updateSpeaker(
  id: string,
  updates: { name?: string }
): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Speaker ${id} not found`)

  const existing = rowToSpeaker(rows[rowIndex])
  const updatedRow = [
    existing.id,
    existing.event_id,
    updates.name ?? existing.name,
    existing.created_at,
    new Date().toISOString(),
  ]

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:E${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}

/** Hard-delete: clears the row so it's filtered out on reads. */
export async function deleteSpeaker(id: string): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Speaker ${id} not found`)

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:E${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '']] },
  })
}
