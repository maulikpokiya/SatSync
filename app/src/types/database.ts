export type AppRole = 'super_admin' | 'event_admin' | 'editor' | 'viewer'
export type EventStatus = 'draft' | 'published' | 'archived'
export type SessionStatus = 'draft' | 'confirmed' | 'cancelled' | 'postponed'
export type AudienceType = 'all' | 'age' | 'gender' | 'region' | 'custom'
export type CategoryId =
  | 'adhyatmik'
  | 'vyavharik'
  | 'free_time'
  | 'aaram'
  | 'meals'
  | 'announcements'
  | 'travel'

export type RegionId =
  | 'chicago'
  | 'houston'
  | 'nj-east'
  | 'nj-west'
  | 'atlanta'
  | 'london'
  | 'toronto'
  | 'global'

/** Matches the columns in the `users` sheet tab */
export interface User {
  id: string
  email: string
  display_name: string | null
  role: AppRole | null
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
  location_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Matches the columns in the `sessions` sheet tab */
export interface Session {
  id: string
  event_id: string
  title: string
  description: string | null
  objectives: string | null
  prerequisites: string | null
  start_time: string | null        // ISO 8601 UTC e.g. "2025-07-04T14:00:00Z"
  end_time: string | null
  category: CategoryId | null
  audience_type: AudienceType
  audience_values: string[]        // parsed from comma-separated sheet cell
  room_id: string | null
  virtual_link: string | null
  status: SessionStatus
  is_common: boolean
  color_override: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
  speaker_ids: string[]            // parsed from comma-separated sheet cell
}

/** Matches the columns in the `speakers` sheet tab */
export interface Speaker {
  id: string
  event_id: string
  name: string
  created_at: string
  updated_at: string
}

/** Matches the columns in the `locations` sheet tab */
export interface Location {
  id: string
  region: RegionId
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

/** Matches the columns in the `rooms` sheet tab */
export interface Room {
  id: string
  location_id: string
  name: string
  capacity: number | null
  created_at: string
  updated_at: string
}
