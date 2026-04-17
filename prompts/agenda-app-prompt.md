# Comprehensive Build Prompt: Multi-Region Multi-Event Agenda / Program Outline Application

---

## Overview

Build a full-stack, browser-based **multi-region, multi-event, multi-day agenda and program outline application**. This is a community/organizational event management tool for a multi-region spiritual and social organization (e.g., Satsang/Sabha programs). The application must support complex scheduling across time zones, audience segmentation, session categorization, and multiple levels of access.

---

## Recommended Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for public view SEO, file-based routing, server components |
| UI | Tailwind CSS + shadcn/ui | Rapid, accessible, consistent design system |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) | Google OAuth built-in, Row Level Security for RBAC, real-time subscriptions |
| Deployment | Vercel | Zero-config Next.js deployment, edge functions |
| PDF Export | react-pdf or Puppeteer (via API route) | Server-side PDF rendering |
| Calendar Export | ics npm package | iCal/ICS feed generation |
| Excel Export | exceljs | Spreadsheet exports |
| Drag & Drop | @dnd-kit/core | Accessible, touch-friendly drag-and-drop |
| Date/Time/TZ | date-fns-tz + Luxon | Reliable timezone conversion |

---

## 1. Authentication & User Management

### 1.1 Google OAuth via Supabase Auth
- Implement **Google Sign-In** as the primary authentication method using Supabase Auth.
- Also support **email/password** as a fallback.
- On first login, create a user profile record in the `users` table linked to `auth.users`.
- Store: `display_name`, `email`, `avatar_url`, `home_timezone`, `created_at`, `last_login`.
- Protect all non-public routes with a Next.js middleware auth guard that redirects unauthenticated users to `/login`.
- Session tokens should be stored in HTTP-only cookies via Supabase SSR helpers.

### 1.2 User Profile
- Users can edit their profile: display name, avatar, and preferred timezone.
- Show last-login timestamp in the profile page.

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Roles
Define the following roles with strictly enforced permissions. Roles are assigned per user globally and can also be scoped per-event.

| Role | Description |
|---|---|
| `super_admin` | Full access to everything: create/delete events, manage all users, assign roles |
| `event_admin` | Full CRUD on assigned events: sessions, speakers, rooms, attendees |
| `editor` | Can edit session details on assigned events; cannot create/delete events |
| `viewer` | Read-only access to non-public views on assigned events |
| `public` | No login required; can only access the Public View |

### 2.2 Enforcement
- Enforce RBAC at two layers:
  1. **Supabase Row Level Security (RLS)** policies on all tables — this is the security source of truth.
  2. **Next.js middleware + server components** — hide UI elements based on role, but never rely on this alone.
- Store role assignments in a `user_roles` table: `{ user_id, role, event_id (nullable) }`. A null `event_id` means the role applies globally.
- Provide an **Admin Panel** (`/admin/users`) where `super_admin` can:
  - View all users
  - Assign/change global or event-scoped roles
  - Revoke access
  - See audit log entries per user

---

## 3. Data Models

Define the following PostgreSQL tables in Supabase. Use UUIDs for all primary keys. Include `created_at`, `updated_at`, and `created_by` on every table.

### 3.1 `events`
```
id, title, description, status (draft|published|archived),
start_date, end_date, primary_timezone, logo_url, banner_url,
venue_name, venue_address, is_virtual, virtual_platform_url,
max_attendees, created_by, created_at, updated_at
```

### 3.2 `event_timezones`
```
id, event_id, timezone_name (IANA tz string), display_label, is_primary, sort_order
```
*(Allows showing e.g. "Chicago / NJ / London / Mumbai" simultaneously)*

### 3.3 `sessions`
```
id, event_id, title, description, objectives, prerequisites,
start_time (timestamptz), end_time (timestamptz),
category (enum), audience_type (enum), audience_values (text[]),
room_id, virtual_link, status (draft|confirmed|cancelled|postponed),
is_common (boolean — true = all-hands, false = breakout),
color_override, sort_order, created_by, created_at, updated_at
```

### 3.4 `session_categories` *(custom, per-org or per-event)*
```
id, event_id (nullable = global default), name, color_hex,
icon, sort_order, is_active
```
Seed with defaults: `Adhyatmik`, `Vyavharik`, `Free-Time`, `Aaram`, `Announcements`, `Meals`, `Travel`

### 3.5 `audience_groups` *(custom, per-org)*
```
id, group_type (age|gender|region|custom), name, sort_order, is_active
```
Seed with:
- Age: `Vadil`, `Yuva`, `Kishor`, `Balak`
- Gender: `Vadil Bhaio`, `Mahila`, `Yuvati`, `Kishor`, `Kishori`
- Region: `Chicago`, `NJ`, `Canada`, `UK`, `Australia`, `Remote`

### 3.6 `rooms`
```
id, event_id, name, capacity, floor, building,
virtual_link, notes, is_active
```

### 3.7 `speakers`
```
id, user_id (nullable — links to app user if they have an account),
full_name, display_name (Vakta name), bio, photo_url,
email, phone, organization, availability_notes,
confirmation_status (pending|confirmed|declined), created_at
```

### 3.8 `session_speakers`
```
id, session_id, speaker_id, role (primary|secondary|moderator|panelist), sort_order
```

### 3.9 `session_resources`
```
id, session_id, title, file_url, file_type, is_public, uploaded_by, created_at
```

### 3.10 `attendees`
```
id, event_id, user_id (nullable), full_name, email,
registration_status (registered|waitlisted|cancelled|attended),
region, age_group, gender_group, dietary_notes,
registered_at, checked_in_at, notes
```

### 3.11 `session_registrations`
```
id, session_id, attendee_id, registered_at, attended (boolean)
```

### 3.12 `audit_log`
```
id, user_id, action (created|updated|deleted|role_changed|login|export),
entity_type, entity_id, old_value (jsonb), new_value (jsonb),
ip_address, user_agent, created_at
```

---

## 4. Core Features

### 4.1 Event Management
- **Create / Edit / Delete Events** (`super_admin`, `event_admin` only).
- Events have a date range (multi-day supported), primary timezone, and optional additional display timezones.
- Events have a status: `Draft`, `Published`, `Archived`.
- Upload event logo and banner image (stored in Supabase Storage).
- Each event has a dedicated slug-based URL (e.g., `/events/chicago-satsang-2025`).
- **Dashboard summary card per event**: total sessions, total attendees, time breakdown by category, completion percentage.

### 4.2 Session Management
- Full CRUD on sessions within an event (authorized roles only).
- Sessions have:
  - **Title, description, objectives, prerequisites**
  - **Start and end time** (stored as UTC `timestamptz`, displayed in user's selected timezone)
  - **Category** (from `session_categories`)
  - **Target Audience**: select type (age group / gender group / region / all) and specific values. Multiple selections supported (e.g., a session for Kishor + Kishori).
  - **Common vs. Breakout**: mark as common/general (visible to all) or breakout (specific audience)
  - **Speaker(s)/Vakta(s)**: link one or more speakers with roles
  - **Room**: select from room list for the event
  - **Virtual Link**: optional URL for hybrid/virtual attendees
  - **Status**: Draft / Confirmed / Cancelled / Postponed
  - **Attachments**: upload PDFs, slides, documents
  - **Session color override**: optional color tag
- Sessions within the same time slot that are NOT marked common are treated as parallel breakout tracks.

### 4.3 Conflict Detection & Scheduling Guards
Automatically detect and warn (non-blocking) about:
- **Room conflict**: two sessions in the same room at overlapping times
- **Speaker conflict**: same speaker assigned to two overlapping sessions
- **Audience group conflict**: two non-common sessions targeting the same audience group at the same time
- Show conflict warnings inline in the session editor and in a dedicated **Conflicts Panel** on the agenda editor page.
- Highlight conflicting sessions visually (red border/badge) in the timeline view.
- Allow `event_admin`/`super_admin` to override and save anyway with a confirmation prompt.

### 4.4 Speaker / Vakta Management
- Dedicated Speaker Directory at `/admin/speakers`.
- Create, edit, delete speaker profiles with: name, display/Vakta name, bio, photo, contact info, organization, availability notes, confirmation status.
- Link speakers to an app user account (optional).
- From a speaker's profile page, see all sessions they are assigned to (across all events).
- Filter sessions by speaker in the agenda view.
- Speaker confirmation workflow: `pending` → `confirmed` / `declined`.

### 4.5 Room / Venue Management
- Per-event room list with name, capacity, floor/building, virtual link.
- Rooms show occupancy at any given time slot (used in conflict detection).
- Room utilization report: % of event time each room is in use.

### 4.6 Attendee Registration & Capacity
- Attendees can be imported via CSV or added manually.
- If `session.capacity` is defined (via room capacity or manual override), enforce registration limits with automatic waitlisting.
- Waitlist automatically promotes registrants when a spot opens.
- Check-in tracking: mark attendees as attended during the event (togglable).
- Per-session and per-event attendance reports.
- Attendee self-registration page (optional, toggled per event by admin): a public form at `/events/[slug]/register`.

---

## 5. Views

### 5.1 Detailed View (`/events/[slug]/agenda?view=detailed`)
- Full timeline/grid layout showing all sessions by day.
- Columns represent parallel tracks (breakout sessions side-by-side, common sessions spanning full width).
- Each session card shows: title, time, category badge, audience badge, speaker names, room.
- **Multi-timezone display**: dropdown or toggle at top of page to select which timezone(s) to display. Time labels on the left axis show time in 1-3 selected timezones simultaneously (stacked).
- Filter panel (sidebar or top bar): filter by category, audience group, speaker, room, status.
- Click any session card to open a slide-over/modal with full session details.
- Drag-and-drop rescheduling (authorized roles): drag a session card to a new time slot. Triggers conflict detection in real-time. Changes saved on drop confirmation.
- Color-coded by category (uses `session_categories.color_hex`).

### 5.2 Simplified View (`/events/[slug]/agenda?view=simple`)
- Clean, table-style list grouped by day.
- Each row: time, title, category, audience, speaker, room.
- No parallel track columns — breakout sessions shown sequentially with audience tag.
- Compact, easy to scan on mobile.

### 5.3 Print View (`/events/[slug]/agenda?view=print`)
- Optimized CSS print stylesheet (`@media print`).
- Removes navigation, filters, interactive elements.
- Clean typography: session blocks grouped by day with page-break-before on each new day.
- Shows event logo, event name, date range at the top.
- Footer on each page: event name, page number, generated timestamp.
- A "Print" button and a "Download PDF" button (server-rendered via API route using Puppeteer or react-pdf).
- Print layout respects the currently applied filters (e.g., print only Adhyatmik sessions, or only Yuva track).

### 5.4 Public View (`/events/[slug]` — no login required)
- Accessible to anyone without authentication.
- Shows only sessions with `status = confirmed`.
- Displays: session title, time (in the event's primary timezone + one user-selectable additional timezone), category, audience, speaker name(s), room name.
- Does NOT show: virtual links, internal notes, draft sessions, contact info.
- Includes the event banner, logo, dates, and venue.
- Shareable URL with optional date filter: `/events/[slug]?day=2025-07-04`.
- Embeddable: provide an `<iframe>` embed snippet that event organizers can paste into their website.
- Add a `robots.txt` and appropriate `<meta>` tags so only the public view is indexed by search engines.

### 5.5 Dashboard View (`/events/[slug]/dashboard`)
- Visible to authenticated users with at least `viewer` role on the event.
- Summary metrics:
  - Total sessions, total hours of programming
  - Breakdown by category (donut chart + table): hours and % for Adhyatmik, Vyavharik, Free-Time, Aaram, etc.
  - Breakdown by audience group (bar chart)
  - Total registered attendees, check-in rate
  - Sessions per day (bar chart)
  - Speaker count, room utilization
- Conflict count badge with link to conflict panel.
- Recent changes feed (from audit log).

---

## 6. Timezone Handling

- Store all times in UTC (`timestamptz`) in the database.
- Never store times as plain strings.
- Use **IANA timezone identifiers** throughout (e.g., `America/Chicago`, `America/New_York`, `Europe/London`, `Asia/Kolkata`).
- Each event has a `primary_timezone` and an optional list of `event_timezones` to display.
- In the agenda editor and views, the user can select their **display timezone** via a persistent dropdown. This preference is saved to their profile.
- In multi-timezone display mode, show stacked time labels: e.g., "9:00 AM CDT / 10:00 AM EDT / 2:00 PM BST".
- When creating/editing a session, the time picker shows times in the **event's primary timezone** and simultaneously shows the converted time in the user's home timezone as a helper label.
- DST transitions: use `date-fns-tz` or `Luxon` to handle Daylight Saving Time correctly — never use raw UTC offset math.
- iCal exports include proper `TZID` fields so calendar apps honor the original timezone.

---

## 7. Export Features

### 7.1 PDF Export
- From any view (detailed, simplified, print), provide a "Download PDF" button.
- The PDF respects currently applied filters.
- Two PDF layouts: **Program Booklet** (print view style, paginated by day) and **Speaker Schedule** (one page per speaker, listing their sessions).
- Server-side rendering via a Next.js API route using Puppeteer (headless Chrome) or react-pdf.

### 7.2 iCal / ICS Export
- "Add to Calendar" button per session and "Export Full Agenda" at the event level.
- Generates a valid `.ics` file with correct `DTSTART`, `DTEND`, `TZID`, `SUMMARY`, `DESCRIPTION`, `LOCATION` fields.
- Virtual sessions include the `virtual_link` in the `URL` and `DESCRIPTION` fields.
- Public view sessions generate public ICS with no sensitive info.

### 7.3 Excel Export
- Export full session list as `.xlsx` with columns: Day, Date, Start Time, End Time, Duration, Title, Category, Audience, Speaker(s), Room, Virtual Link, Status.
- Attendee list export: name, email, region, age group, gender group, registration status, check-in status.
- Speaker schedule export: speaker name, session title, date, time, room.

---

## 8. Audit Log & Version History

### 8.1 Audit Log
- Log every significant action to the `audit_log` table:
  - Session created / updated / deleted
  - Event created / updated / deleted
  - Role assigned / changed / revoked
  - Speaker confirmed / declined
  - Attendee checked in
  - Export generated
  - User login
- Each log entry stores: actor (user_id + name), action, entity type + ID, old value (full JSON snapshot), new value (full JSON snapshot), timestamp, IP address.
- Audit log is visible to `super_admin` and `event_admin` at `/admin/audit`.
- Filterable by: user, action type, entity type, date range.
- **Version History per session**: click "History" on any session to see a timeline of all changes with diff highlighting (old vs. new field values side by side).

### 8.2 Soft Deletes
- Never hard-delete sessions, speakers, or attendees. Use a `deleted_at` timestamp column.
- Deleted records are hidden from all views but accessible in the audit log and recoverable by `super_admin`.

---

## 9. Drag-and-Drop Rescheduling

- Implement drag-and-drop in the **Detailed View** for `event_admin` and `editor` roles.
- Use `@dnd-kit/core` for accessibility-compliant drag-and-drop.
- Dragging a session updates its `start_time` and `end_time` based on the new position on the timeline grid.
- While dragging, show a ghost preview in the target slot with the new time shown dynamically.
- On drop: run conflict detection instantly. If conflicts exist, show a modal listing them and ask the user to confirm or cancel.
- On confirm: save the new times optimistically (update UI immediately), then persist to Supabase. Show a toast notification on success or rollback on error.
- Drag handles are visible only to users with edit permissions.

---

## 10. Custom Category & Audience Group Management

### 10.1 Category Management (`/admin/categories`)
- `super_admin` can create, edit, reorder, and deactivate session categories.
- Each category has: name, color (hex color picker), icon (emoji or icon selector), sort order.
- Categories can be global (available to all events) or event-specific.
- Cannot delete a category that has sessions assigned — must deactivate it.
- Deactivated categories are hidden from the session editor but preserved on existing sessions.

### 10.2 Audience Group Management (`/admin/groups`)
- `super_admin` can create, edit, reorder, and deactivate audience groups.
- Groups have: name, type (age / gender / region / custom), sort order.
- Groups are global across all events.
- Seeded with the values specified in Section 3.5.

---

## 11. Notifications & Announcements *(Optional, Phase 2)*

- **In-app announcements**: `event_admin` can post announcements tied to an event, visible on the dashboard and agenda page.
- **Email notifications** via Supabase Edge Functions + Resend or SendGrid:
  - Speaker confirmation request email (sent when speaker is added to a session)
  - Speaker reminder email (24 hours before their session)
  - Attendee registration confirmation
  - Agenda change notification (when a confirmed session is modified or cancelled)

---

## 12. UI/UX Requirements

### General
- Fully responsive: desktop, tablet, and mobile.
- Dark mode support via Tailwind's `dark:` classes.
- Loading skeletons for all data-fetching states.
- Empty states with clear calls to action (not just blank screens).
- Toast notifications for all create/update/delete actions.
- Keyboard navigable — all interactive elements must be accessible via keyboard.
- ARIA labels on all icon-only buttons and form fields.

### Navigation
- Top navigation bar: logo, event switcher dropdown, user avatar menu (profile, sign out).
- Sidebar (desktop) / bottom sheet (mobile): links to Dashboard, Agenda (with view switcher), Speakers, Rooms, Attendees, Audit Log, Settings.
- Breadcrumb trail: Organization > Event Name > Section.

### Color Coding
- Sessions are color-coded by their category's `color_hex` on all agenda views.
- Breakout tracks use subtle left-border color differentiation by audience group type.
- Cancelled sessions shown with strikethrough and gray overlay.
- Postponed sessions shown with an amber warning badge.

### Session Editor
- Slide-over panel (not a full page) for creating and editing sessions.
- Real-time form validation with inline error messages.
- Auto-calculate duration from start/end time and show it as a helper label.
- Show "Similar sessions at this time" list below the time picker to aid scheduling decisions.

---

## 13. URL Structure

```
/                              → Landing / login
/login                         → Google Sign-In page
/dashboard                     → My events overview
/admin/users                   → User & role management (super_admin)
/admin/audit                   → Audit log (super_admin, event_admin)
/admin/categories              → Category management (super_admin)
/admin/groups                  → Audience group management (super_admin)
/admin/speakers                → Global speaker directory
/events/new                    → Create new event
/events/[slug]                 → Public view (no auth required)
/events/[slug]/register        → Attendee registration (public)
/events/[slug]/dashboard       → Event dashboard (auth required)
/events/[slug]/agenda          → Agenda (detailed/simple/print view via ?view= param)
/events/[slug]/sessions/new    → Create session (slide-over preferred)
/events/[slug]/sessions/[id]   → Session detail / edit
/events/[slug]/speakers        → Event speaker list
/events/[slug]/rooms           → Room management
/events/[slug]/attendees       → Attendee list
/events/[slug]/export          → Export hub (PDF, ICS, Excel)
/events/[slug]/settings        → Event settings (event_admin)
/profile                       → User profile & timezone preference
```

---

## 14. Security Requirements

- All Supabase tables must have RLS enabled — no table should have RLS disabled in production.
- API routes must re-validate the user's session server-side on every request — never trust client-provided role claims.
- File uploads (images, attachments) must be validated for file type and size server-side before writing to Supabase Storage.
- Public view API endpoints must never return draft sessions, virtual links, or attendee PII.
- Rate-limit the attendee registration endpoint to prevent abuse.
- CSRF protection is handled by Next.js Server Actions — use them for all mutations.
- Add `Content-Security-Policy`, `X-Frame-Options` (except for the embeddable public view iframe), and `Strict-Transport-Security` headers.
- The embeddable public view iframe should use a dedicated `/embed/[slug]` route with relaxed `X-Frame-Options` (`ALLOWALL`) but still restricted CSP.

---

## 15. Performance Requirements

- Public view must achieve a Lighthouse score of ≥ 90 (use Next.js static generation or ISR with a 60-second revalidation).
- Authenticated views use server components + Suspense for streaming.
- Implement optimistic UI updates for drag-and-drop and toggle actions.
- Paginate attendee lists (50 per page) and audit logs (100 per page).
- Use Supabase Realtime subscriptions to push live session updates to all connected agenda viewers (useful during the event itself so the displayed agenda updates automatically if a session is delayed or cancelled).
- Cache the public event page in Vercel's Edge Cache.

---

## 16. Build Phases (Recommended Order)

| Phase | Deliverables |
|---|---|
| 1 — Foundation | Supabase schema + RLS, Next.js project setup, Google Auth, user profiles, RBAC middleware |
| 2 — Events & Sessions | Event CRUD, session CRUD, session editor slide-over, basic agenda list view |
| 3 — Views | Detailed timeline view, simplified view, print view, public view |
| 4 — Timezone | Multi-timezone display, timezone-aware time picker, display timezone switcher |
| 5 — Speakers & Rooms | Speaker directory, room management, session-speaker linking |
| 6 — Conflict Detection | Conflict detection engine, conflict panel, visual conflict indicators |
| 7 — Dashboard & Charts | Event dashboard, category time breakdown charts, attendance metrics |
| 8 — Drag & Drop | Drag-and-drop rescheduling with conflict detection on drop |
| 9 — Exports | PDF export, ICS export, Excel export |
| 10 — Attendees | Attendee registration, capacity enforcement, waitlist, check-in |
| 11 — Audit Log | Audit logging on all mutations, audit log viewer, session version history |
| 12 — Custom Config | Category management UI, audience group management UI |
| 13 — Polish | Notifications, embed widget, Realtime subscriptions, performance, accessibility audit |

---

## 17. Seed Data

On first setup, seed the database with:
- One example organization
- One example event (3-day program) with 15 sample sessions covering all categories and audience types
- The default session categories (Adhyatmik, Vyavharik, Free-Time, Aaram, Announcements, Meals, Travel)
- The default audience groups (age, gender, region as listed in Section 3.5)
- Three demo user accounts: one `super_admin`, one `event_admin`, one `viewer`
- Five example speakers/Vaktaas
- Three example rooms

---

*End of prompt. Begin with Phase 1.*
