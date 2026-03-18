const BLOCKED_PATTERNS = [
  /ignore (previous|all|any) instructions/i,
  /jailbreak/i,
  /you are now/i,
];

export function applyGuardrails(input: string): { allowed: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return { allowed: false, reason: "Input violates content policy." };
    }
  }
  return { allowed: true };
}
