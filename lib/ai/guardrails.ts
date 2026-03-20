const BLOCKED_PATTERNS = [
  /ignore (previous|all|any) instructions/i,
  /jailbreak/i,
  /you are now/i,
  /bypass guardrails/i,
]

const FACTUAL_PATTERNS = [
  /stock/i,
  /inventory/i,
  /delivery/i,
  /qc/i,
  /recovery/i,
  /where is/i,
  /status/i,
  /pin-/i,
  /req-/i,
  /po-/i,
  /dlv-/i,
  /iss-/i,
  /rec-/i,
]

export function applyGuardrails(input: string): { allowed: boolean; reason?: string; requiresGrounding: boolean } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return { allowed: false, reason: 'Input violates chatbot safety rules.', requiresGrounding: true }
    }
  }

  const requiresGrounding = FACTUAL_PATTERNS.some((pattern) => pattern.test(input))
  return { allowed: true, requiresGrounding }
}
