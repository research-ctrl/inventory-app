import { NextRequest, NextResponse } from 'next/server'
import { routeToProvider } from '@/lib/ai/provider-router'
import { applyGuardrails } from '@/lib/ai/guardrails'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { createClient } from '@/lib/supabase/server'
import { parsePrototypeOperator, resolvePrototypeActorId } from '@/lib/prototype/operator'

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function resolveChatActorId() {
  try {
    return await resolvePrototypeActorId('viewer')
  } catch {
    return null
  }
}

async function persistChatLog(operation: () => Promise<unknown>) {
  try {
    await operation()
  } catch {
    // Prototype mode should still answer even when optional chat logging tables
    // have not been migrated yet.
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = asString(body?.message)
    const provider = asString(body?.provider)
    const sessionId = asString(body?.sessionId)
    const operator = parsePrototypeOperator({
      operatorName: body?.operatorName,
      operatorTeam: body?.operatorTeam,
      operatorBadge: body?.operatorBadge,
    })

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const guard = applyGuardrails(message)
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason }, { status: 400 })
    }

    const supabase = await createClient()
    const actorId = await resolveChatActorId()

    let activeSessionId = sessionId || crypto.randomUUID()
    if (!sessionId && actorId) {
      await persistChatLog(async () => {
        const { data: createdSession } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: actorId,
            title: message.slice(0, 80),
            context: {
              operator_name: operator.name,
              operator_team: operator.team,
              provider_override: provider || null,
            },
          })
          .select('id')
          .single()

        if (createdSession?.id) activeSessionId = createdSession.id
      })
    }

    if (actorId) {
      await persistChatLog(async () => {
        await supabase.from('chat_messages').insert({
          session_id: activeSessionId,
          role: 'user',
          content: message,
        })
      })
    }

    const startedAt = Date.now()
    const result = await routeToProvider({
      messages: [{ role: 'user', content: message }],
      systemPrompt: SYSTEM_PROMPT,
      providerOverride: provider === 'gemini' || provider === 'grok' ? provider : undefined,
    })
    const latency = Date.now() - startedAt

    if (actorId) {
      await persistChatLog(async () => {
        await supabase.from('chat_messages').insert([
          {
            session_id: activeSessionId,
            role: 'tool',
            content: result.groundedAnswer,
            tool_calls: result.toolCalls,
          },
          {
            session_id: activeSessionId,
            role: 'assistant',
            content: result.response,
            tool_calls: result.toolCalls,
            latency_ms: latency,
          },
        ])
      })

      await persistChatLog(async () => {
        await supabase.from('audit_log').insert({
          actor_id: actorId,
          action: 'prototype_chat_query',
          entity_type: 'chat_session',
          entity_id: activeSessionId,
          new_data: {
            provider: result.provider,
            used_provider: result.usedProvider,
            operator_name: operator.name,
            operator_team: operator.team,
            message,
            tool_count: result.toolCalls.length,
          },
        })
      })
    }

    return NextResponse.json({
      sessionId: activeSessionId,
      provider: result.provider,
      usedProvider: result.usedProvider,
      response: result.response,
      groundedAnswer: result.groundedAnswer,
      toolCalls: result.toolCalls,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Chat request failed.' }, { status: 500 })
  }
}
