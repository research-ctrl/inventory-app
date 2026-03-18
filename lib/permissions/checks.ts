import type { Role } from "@/lib/auth/roles";
import { PERMISSIONS, type Action, type Resource } from "./matrix";

export function can(role: Role, resource: Resource, action: Action): boolean {
  const resourcePerms = PERMISSIONS[role]?.[resource];
  return resourcePerms?.includes(action) ?? false;
}

export function assertCan(role: Role, resource: Resource, action: Action): void {
  if (!can(role, resource, action)) {
    throw new Error(
      `Role "${role}" is not allowed to "${action}" on "${resource}".`
    );
  }
}
