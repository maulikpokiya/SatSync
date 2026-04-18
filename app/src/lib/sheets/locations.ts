/**
 * locations sheet columns (0-indexed):
 * A=id  B=region  C=name  D=address  E=created_at  F=updated_at
 */

import { randomUUID } from 'crypto'
import { getSheetsClient, SHEET_ID } from './client'
import type { Location, RegionId } from '@/types'
import { MOCK_LOCATIONS } from './mock-data'

const DEMO_MODE = !process.env.GOOGLE_SHEET_ID
const TAB = 'locations'
const RANGE = `${TAB}!A:F`
const HEADER = ['id', 'region', 'name', 'address', 'created_at', 'updated_at']

function rowToLocation(row: string[]): Location {
  return {
    id: row[0] ?? '',
    region: (row[1] as RegionId) || 'global',
    name: row[2] ?? '',
    address: row[3] || null,
    created_at: row[4] ?? new Date().toISOString(),
    updated_at: row[5] ?? new Date().toISOString(),
  }
}

async function getRows() {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  return { rows: res.data.values ?? [], sheets }
}

export async function getAllLocations(): Promise<Location[]> {
  if (DEMO_MODE) return MOCK_LOCATIONS.sort((a, b) => a.name.localeCompare(b.name))
  const { rows } = await getRows()
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map(rowToLocation)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getLocationById(id: string): Promise<Location | null> {
  if (DEMO_MODE) return MOCK_LOCATIONS.find((l) => l.id === id) ?? null
  const { rows } = await getRows()
  const row = rows.slice(1).find((r) => r[0] === id)
  return row ? rowToLocation(row) : null
}

export async function getLocationsByRegion(region: RegionId): Promise<Location[]> {
  if (DEMO_MODE) {
    return MOCK_LOCATIONS
      .filter((l) => l.region === region)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const { rows } = await getRows()
  return rows
    .slice(1)
    .filter((r) => r[0] && r[1] === region)
    .map(rowToLocation)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createLocation(
  data: { region: RegionId; name: string; address?: string | null }
): Promise<Location> {
  if (DEMO_MODE) {
    const now = new Date().toISOString()
    return {
      id: randomUUID(), region: data.region, name: data.name,
      address: data.address ?? null, created_at: now, updated_at: now,
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

  const newRow = [id, data.region, data.name, data.address ?? '', now, now]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [newRow] },
  })

  return rowToLocation(newRow)
}

export async function updateLocation(
  id: string,
  updates: { region?: RegionId; name?: string; address?: string | null }
): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Location ${id} not found`)

  const existing = rowToLocation(rows[rowIndex])
  const updatedRow = [
    existing.id,
    updates.region ?? existing.region,
    updates.name ?? existing.name,
    updates.address !== undefined ? (updates.address ?? '') : (existing.address ?? ''),
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
export async function deleteLocation(id: string): Promise<void> {
  if (DEMO_MODE) return
  const { rows, sheets } = await getRows()
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`Location ${id} not found`)

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A${sheetRow}:F${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '']] },
  })
}
