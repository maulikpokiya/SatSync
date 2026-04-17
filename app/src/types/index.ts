export type {
  AppRole,
  EventStatus,
  AuditAction,
  User,
  Event,
  UserRole,
  AuditLog,
  UserWithRoles,
  UserRoleWithUser,
} from './database'

export interface AuthUser {
  id: string
  email: string
  profile: import('./database').User | null
  globalRole: import('./database').AppRole | null
}

// Helper: role hierarchy for comparisons
export const ROLE_HIERARCHY: Record<import('./database').AppRole, number> = {
  super_admin: 4,
  event_admin: 3,
  editor: 2,
  viewer: 1,
}

export function hasRole(
  userRole: import('./database').AppRole | null,
  requiredRole: import('./database').AppRole
): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
