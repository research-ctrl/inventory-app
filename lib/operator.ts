// Server-side type definition for operator identity.
// The actual values come from localStorage on the client
// and are passed to server actions as parameters.
// NO auth enforcement — purely for attribution and audit trail.

export type Operator = {
  id: string    // profiles UUID — used for actor_id in workflow/transactions
  name: string  // display name
  role: string  // role string (display only — no security enforcement)
  email: string
}

export const ANONYMOUS_OPERATOR_ID = '00000000-0000-0000-0000-000000000001' // admin profile UUID from seed
