# Role Permissions

## Roles

| Role | Level | Description |
|------|-------|-------------|
| super_admin | 100 | Full system access |
| admin | 90 | Admin access, no destructive delete |
| procurement_manager | 70 | Manage procurement end-to-end |
| store_manager | 70 | Manage stores end-to-end |
| approver | 60 | Approve/reject requirements and POs |
| procurement_officer | 50 | Create and manage POs |
| store_keeper | 50 | Manage receiving and inventory |
| qc_inspector | 50 | Conduct QC inspections |
| engineer | 40 | Create requirements and issues |
| viewer | 10 | Read-only access |

## Permission Matrix
See `lib/permissions/matrix.ts` for the full machine-readable permission matrix.

## Enforcement Points
1. **Middleware**: Route-level auth check
2. **Server Actions**: `assertCan()` before any mutation
3. **UI**: Conditional rendering based on `useRole()` hook
