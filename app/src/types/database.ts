export type AppRole = 'super_admin' | 'event_admin' | 'editor' | 'viewer'
export type EventStatus = 'draft' | 'published' | 'archived'
export type AuditAction =
  | 'login'
  | 'logout'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'role_assigned'
  | 'role_revoked'
  | 'speaker_confirmed'
  | 'speaker_declined'
  | 'attendee_checked_in'
  | 'export_generated'

export interface User {
  id: string
  display_name: string | null
  email: string
  avatar_url: string | null
  home_timezone: string
  created_at: string
  last_login: string | null
}

export interface Event {
  id: string
  title: string
  slug: string
  status: EventStatus
  start_date: string | null
  end_date: string | null
  primary_timezone: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: AppRole
  event_id: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: AuditAction | string
  entity_type: string | null
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Joined types used in UI
export interface UserWithRoles extends User {
  roles: UserRole[]
}

export interface UserRoleWithUser extends UserRole {
  user: User
}
