# Prototype Constraints

These constraints are intentional and non-negotiable for this repository state.

## Access model
- No sign-in, sign-up, or sign-out requirement for normal prototype usage.
- No auth middleware or route guards tied to authentication.
- No RLS or RBAC work added as part of the prototype flow.
- Operator identity is lightweight and stored in `localStorage` only for attribution.

## Data access
- No browser-side Supabase CRUD access.
- All database reads/writes happen through server actions, route handlers, or server-side service modules.
- Secrets remain server-side only.

## AI constraints
- AI provider keys remain server-side only.
- Chatbot answers must not invent stock, QC, delivery, material location, or recovery facts.
- Grounded tool data must be preferred over free-form generation.

## Workflow constraints
- Keep the lifecycle faithful to the material lifecycle map.
- Use sequence-based business IDs such as `REQ-0001`, `PO-0001`, and `PIN-000001`.
- Support pass / partial pass / fail exactly.
- Support accepted and rejected quantity handling.
- Support vendor return / replacement loop visibility.
- Support usage outcome capture for not used / leftover / scrap.
- Support reusable vs not reusable recovery branching.
