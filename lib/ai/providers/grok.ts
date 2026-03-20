import { env } from '@/lib/env'
import type { AIRequest, ProviderAdapterResponse } from '../provider-router'

export async function generateWithGrok(request: AIRequest): Promise<ProviderAdapterResponse> {
  if (!env.GROK_API_KEY) throw new Error('GROK_API_KEY not configured')

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      temperature: 0.2,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((message) => ({ role: message.role, content: message.content })),
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Grok request failed: ${response.status} ${text}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Grok returned no content')

  return {
    provider: 'grok',
    content,
    raw: payload,
  }
}
