# SatSync — Local Setup Guide (Google Sheets Backend)

## Prerequisites

- Node.js 18+
- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)

---

## Step 1 — Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (e.g. `SatSync`)
2. Enable the following APIs (**APIs & Services → Library**):
   - **Google Sheets API**
   - **Google Drive API**

---

## Step 2 — OAuth 2.0 Credentials (for user sign-in)

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Under **Authorised redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click **Create** — copy the **Client ID** and **Client Secret**

---

## Step 3 — Service Account (for Sheets access)

1. Go to **APIs & Services → Credentials → Create Credentials → Service Account**
2. Give it a name (e.g. `satsync-sheets`) and click **Done**
3. Click the service account → **Keys** tab → **Add Key → Create new key → JSON**
4. A JSON file will download — you'll need `client_email` and `private_key` from it

---

## Step 4 — Google Sheet

1. Create a new Google Spreadsheet at [sheets.google.com](https://sheets.google.com)
2. Rename the default tab to `users`
3. Add a second tab named `events`
4. Add a third tab named `sessions`
5. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_IS_HERE/edit
   ```
6. Share the sheet with your **service account email** (from the JSON file) — give it **Editor** access

---

## Step 5 — Environment Variables

Copy the example file and fill it in:

```bash
cp app/.env.local.example app/.env.local
```

Generate a NextAuth secret:

```bash
openssl rand -base64 32
```

Then edit `app/.env.local`:

```env
NEXTAUTH_SECRET=<paste output from openssl above>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=<from Step 2>
GOOGLE_CLIENT_SECRET=<from Step 2>

GOOGLE_SHEET_ID=<from Step 4>

GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email from the JSON key file>

# Paste the private_key value from the JSON file — keep the \n characters
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

> **Note:** The private key must be wrapped in double quotes and keep the literal `\n` characters exactly as they appear in the JSON file.

---

## Step 6 — Install & Run

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with your Google account.

---

## Step 7 — Assign Yourself super_admin

On first sign-in the app creates your row in the `users` sheet tab. To get admin access:

1. Open your Google Sheet
2. Go to the `users` tab
3. Find your row (matched by email)
4. Set column **D** (`role`) to `super_admin`
5. Refresh the app — you'll now see the **Users & Roles** admin page in the sidebar

> All subsequent role assignments can be done through the app UI at `/admin/users`.

---

## Sheet Structure Reference

### `users` tab

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | email | display_name | role | home_timezone | avatar_url | created_at | last_login |

**Valid roles:** `super_admin`, `event_admin`, `editor`, `viewer`

### `events` tab

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | title | slug | status | start_date | end_date | primary_timezone | created_by | created_at | updated_at |

**Valid statuses:** `draft`, `published`, `archived`

### `sessions` tab

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id | event_id | title | description | objectives | prerequisites | start_time | end_time | category | audience_type | audience_values | room | virtual_link | status | is_common | color_override | sort_order | created_by | created_at | updated_at |

- `start_time` / `end_time`: ISO 8601 UTC strings (e.g. `2025-07-04T14:00:00.000Z`)
- `audience_values`: comma-separated string (e.g. `Yuva,Kishor`)
- `is_common`: `TRUE` or `FALSE`
- **Valid statuses:** `draft`, `confirmed`, `cancelled`, `postponed`
- **Valid categories:** `adhyatmik`, `vyavharik`, `free_time`, `aaram`, `meals`, `announcements`, `travel`

> The app creates header rows and appends data automatically — you do not need to manually add headers.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Error: Your client secret is invalid` | Double-check `GOOGLE_CLIENT_SECRET` in `.env.local` |
| `Error: could not read from spreadsheet` | Make sure the sheet is shared with the service account email |
| `Error parsing private key` | Ensure the key is wrapped in double quotes and `\n` chars are preserved |
| Redirect to `/login?error=` after sign-in | The OAuth redirect URI doesn't match — check Step 2 |
| Admin page not visible | Set `role` to `super_admin` directly in the `users` sheet tab (Step 7) |
