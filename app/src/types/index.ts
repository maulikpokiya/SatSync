export type {
  AppRole, EventStatus, SessionStatus, AudienceType, CategoryId, RegionId,
  User, Event, Session, Speaker, Location, Room,
} from './database'

export const ROLE_HIERARCHY: Record<import('./database').AppRole, number> = {
  super_admin: 4,
  event_admin: 3,
  editor: 2,
  viewer: 1,
}

export function hasRole(
  userRole: import('./database').AppRole | null | undefined,
  requiredRole: import('./database').AppRole
): boolean {
  if (!userRole) return false
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
