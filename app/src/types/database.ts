export type AppRole = 'super_admin' | 'event_admin' | 'editor' | 'viewer'
export type EventStatus = 'draft' | 'published' | 'archived'

/** Matches the columns in the `users` sheet tab */
export interface User {
  id: string
  email: string
  display_name: string | null
  role: AppRole | null        // global role — stored directly on the user row
  home_timezone: string
  avatar_url: string | null
  created_at: string
  last_login: string | null
}

/** Matches the columns in the `events` sheet tab */
export interface Event {
  id: string
  title: string
  slug: string
  status: EventStatus
  start_date: string | null
  end_date: string | null
  primary_timezone: string
  created_by: string | null   // user id
  created_at: string
  updated_at: string
}
