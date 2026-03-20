import { env } from '@/lib/env'
import type { AIRequest, ProviderAdapterResponse } from '../provider-router'

export async function generateWithGemini(request: AIRequest): Promise<ProviderAdapterResponse> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: request.messages
        .filter((message) => message.role !== 'system')
        .map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      generationConfig: {
        temperature: 0.2,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${text}`)
  }

  const payload = await response.json()
  const content = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join('\n')?.trim()
  if (!content) throw new Error('Gemini returned no content')

  return {
    provider: 'gemini',
    content,
    raw: payload,
  }
}
