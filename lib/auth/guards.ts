import type { Role } from "./roles";
import { ROLE_HIERARCHY } from "./roles";

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function requireRole(userRole: Role | undefined, requiredRole: Role): void {
  if (!userRole) throw new Error("Unauthenticated");
  if (!canAccess(userRole, requiredRole)) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}`);
  }
}
