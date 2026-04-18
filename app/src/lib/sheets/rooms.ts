/**
 * rooms sheet columns (0-indexed):
 * A=id  B=location_id  C=name  D=capacity  E=created_at  F=updated_at
 */

import { randomUUID } from 'crypto'
import { getSheetsClient, SHEET_ID } from './client'
import type { Room } from '@/types'
import { MOCK_ROOMS } from './mock-data'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID
const TAB = 'rooms'
const RANGE = `${TAB}!A:F`
const HEADER = ['id', 'location_id', 'name', 'capacity', 'created_at', 'updated_at']

function rowToRoom(row: string[]): Room {
  return {
    id: row[0] ?? '',
    location_id: row[1] ?? '',
    name: row[2] ?? '',
    capacity: row[3] ? parseInt(row[3], 10) || null : null,
    created_at: row[4] ?? new Date().toISOString(),
    updated_at: row[5] ?? new Date().toISOString(),
  }
}

async function getRows() {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  return { rows: res.data.values ?? [], sheets }
}

export async function getRoomsByLocation(locationId: string): Promise<Room[]> {
  if (DEMO_MODE) {
    return MOCK_ROOMS
      .filter((r) => r.location_id === locationId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const { rows } = await getRows()
  return rows
    .slice(1)
    .filter((r) => r[0] && r[1] === locationId)
    .map(rowToRoom)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllRooms(): Promise<Room[]> {
  if (DEMO_MODE) return MOCK_ROOMS.sort((a, b) => a.name.localeCompare(b.name))
  const { rows } = await getRows()
  return rows.slice(1).filter((r) => r[0]).map(rowToRoom).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getRoomById(id: string): Promise<Room | null> {
  if (DEMO_MODE) return MOCK_ROOMS.find((r) => r.id === id) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToRoom(row) : null
}

export async function createRoom(
  data: { location_id: string; name: string; capacity?: number | null }
): Promise<Room> {
  if (DEMO_MODE) {
    const now = new Date().toISOString()
    return {
      id: randomUUID(), location_id: data.location_id, name: data.name,
      capacity: data.capacity ?? null, created_at: now, updated_at: now,
    }
  }
  const { rows, sheets } = await getRows()
  const now = new Date().toISOString()
  const id = randomUUID()

  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1:F1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  }

  const newRow = [
    id, data.location_id, data.name,
    data.capacity != null ? String(data.capacity) : '',
    now, now,
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  })

  return rowToRoom(newRow)
}

export async function updateRoom(
  id: string,
  updates: { name?: string; capacity?: number | null }
): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Room ${id} not found`)

  const existing = rowToRoom(rows[rowIndex])
  const updatedRow = [
    existing.id,
    existing.location_id,
    updates.name ?? existing.name,
    updates.capacity !== undefined
      ? (updates.capacity != null ? String(updates.capacity) : '')
      : (existing.capacity != null ? String(existing.capacity) : ''),
    existing.created_at,
    new Date().toISOString(),
  ]

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:F${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}

/** Hard-delete: clears the row so it's filtered out on reads. */
export async function deleteRoom(id: string): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Room ${id} not found`)

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:F${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '']] },
  })
}
