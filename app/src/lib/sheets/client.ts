import { google } from 'googleapis'

/**
 * Returns an authenticated Google Sheets API client using the service account.
 * Called server-side only.
 */
export function getSheetsClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export const SHEET_ID = process.env.GOOGLE_SHEET_ID!

/** Tab names in the spreadsheet */
export const TABS = {
  users: 'users',
  events: 'events',
  sessions: 'sessions',
  speakers: 'speakers',
  locations: 'locations',
  rooms: 'rooms',
} as const
