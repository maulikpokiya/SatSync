/**
 * users sheet columns (0-indexed):
 * A=id  B=email  C=display_name  D=role  E=home_timezone  F=avatar_url  G=created_at  H=last_login
 */

import { getSheetsClient, SHEET_ID, TABS } from './client'
import type { AppRole, User } from '@/types'

const RANGE = `${TABS.users}!A:H`

function rowToUser(row: string[]): User {
  return {
    id: row[0] ?? '',
    email: row[1] ?? '',
    display_name: row[2] || null,
    role: (row[3] as AppRole) || null,
    home_timezone: row[4] || 'America/Chicago',
    avatar_url: row[5] || null,
    created_at: row[6] ?? new Date().toISOString(),
    last_login: row[7] || null,
  }
}

/** Fetch all users (skips the header row). */
export async function getAllUsers(): Promise<User[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  const rows = res.data.values ?? []
  return rows.slice(1).filter((r) => r[0]).map(rowToUser)
}

/** Find a user by email. Returns null if not found. */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers()
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

/** Find a user by id. Returns null if not found. */
export async function getUserById(id: string): Promise<User | null> {
  const users = await getAllUsers()
  return users.find((u) => u.id === id) ?? null
}

/**
 * Upsert a user row. If a row with the same email exists, update it.
 * Otherwise append a new row. Returns the user.
 */
export async function upsertUser(data: Partial<User> & { email: string; id: string }): Promise<User> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  const rows = res.data.values ?? []

  // Find existing row index (1-based, accounting for header at row 1)
  const rowIndex = rows.findIndex((r, i) => i > 0 && r[1]?.toLowerCase() === data.email.toLowerCase())

  const now = new Date().toISOString()
  const existing = rowIndex > 0 ? rowToUser(rows[rowIndex]) : null

  const newRow = [
    data.id,
    data.email,
    data.display_name ?? existing?.display_name ?? '',
    data.role ?? existing?.role ?? '',
    data.home_timezone ?? existing?.home_timezone ?? 'America/Chicago',
    data.avatar_url ?? existing?.avatar_url ?? '',
    existing?.created_at ?? now,
    now, // last_login always updated on upsert
  ]

  if (rowIndex > 0) {
    // Update existing row (rowIndex is 0-based in the array; sheet rows are 1-based + 1 for header)
    const sheetRow = rowIndex + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TABS.users}!A${sheetRow}:H${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [newRow] },
    })
  } else {
    // Append new row
    if (rows.length === 0) {
      // Sheet is empty — write header first
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${TABS.users}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['id', 'email', 'display_name', 'role', 'home_timezone', 'avatar_url', 'created_at', 'last_login']],
        },
      })
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      requestBody: { values: [newRow] },
    })
  }

  return rowToUser(newRow)
}

/** Update specific fields on a user row. */
export async function updateUser(id: string, updates: { display_name?: string | null; home_timezone?: string; role?: AppRole | null }): Promise<void> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGE })
  const rows = res.data.values ?? []

  const rowIndex = rows.findIndex((r, i) => i > 0 && r[0] === id)
  if (rowIndex < 0) throw new Error(`User ${id} not found`)

  const existing = rowToUser(rows[rowIndex])
  const updatedRow = [
    existing.id,
    existing.email,
    updates.display_name !== undefined ? (updates.display_name ?? '') : (existing.display_name ?? ''),
    updates.role !== undefined ? (updates.role ?? '') : (existing.role ?? ''),
    updates.home_timezone ?? existing.home_timezone,
    existing.avatar_url ?? '',
    existing.created_at,
    existing.last_login ?? '',
  ]

  const sheetRow = rowIndex + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TABS.users}!A${sheetRow}:H${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}
