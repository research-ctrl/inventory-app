'use server'

import { routeToProvider } from '@/lib/ai/provider-router'
import { applyGuardrails } from '@/lib/ai/guardrails'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { chatMessageSchema } from '@/lib/validations/chat'

export async function sendChatMessage(formData: FormData) {
  const { message } = chatMessageSchema.parse(Object.fromEntries(formData))
  const guard = applyGuardrails(message)
  if (!guard.allowed) return { error: guard.reason }

  const result = await routeToProvider({
    messages: [{ role: 'user', content: message }],
    systemPrompt: SYSTEM_PROMPT,
  })

  return { response: result.response, toolCalls: result.toolCalls, provider: result.provider }
}
