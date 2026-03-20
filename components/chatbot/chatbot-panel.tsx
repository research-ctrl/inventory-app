'use client'

import { useMemo, useState } from 'react'
import { Loader2, Send, ShieldCheck, Wrench } from 'lucide-react'
import { OperatorAttributionFields } from '@/components/layout/operator-identity'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'Where is PIN-000001 stored right now?',
  'What is the status of PO-0001?',
  'Show the QC result for DLV-0001.',
  'Trace the genealogy of PIN-000005.',
  'How do I capture leftover and scrap in this prototype?',
]

function readOperator() {
  if (typeof window === 'undefined') return { operatorName: '', operatorTeam: '', operatorBadge: '' }
  try {
    const parsed = JSON.parse(window.localStorage.getItem('smls.prototype.operator') ?? '{}')
    return {
      operatorName: parsed.name ?? '',
      operatorTeam: parsed.team ?? '',
      operatorBadge: parsed.badge ?? '',
    }
  } catch {
    return { operatorName: '', operatorTeam: '', operatorBadge: '' }
  }
}

export function ChatbotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string>('')
  const [provider, setProvider] = useState<'default' | 'gemini' | 'grok'>('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastToolCount, setLastToolCount] = useState(0)
  const promptCount = useMemo(() => messages.filter((message) => message.role === 'user').length, [messages])

  async function sendMessage(message: string) {
    const trimmed = message.trim()
    if (!trimmed) return

    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const operator = readOperator()
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId || undefined,
          provider: provider === 'default' ? undefined : provider,
          ...operator,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Chat request failed.')

      if (payload.sessionId) setSessionId(payload.sessionId)
      setLastToolCount(Array.isArray(payload.toolCalls) ? payload.toolCalls.length : 0)
      setMessages((current) => [...current, { role: 'assistant', content: payload.response }])
    } catch (err: any) {
      setError(err.message ?? 'Chat request failed.')
      setMessages((current) => [...current, { role: 'assistant', content: 'I could not complete that request. Please try a more specific operational question.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Operational assistant</h2>
          <p className="mt-1 text-sm text-slate-600">Ask grounded questions about stock, requirements, POs, deliveries, QC, locations, genealogy, and recovery. The assistant will only answer from verified tool data and documentation.</p>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{promptCount} prompts this session</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{lastToolCount} tools used last turn</span>
            {sessionId && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono">session {sessionId.slice(0, 8)}</span>}
          </div>

          <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                Start with a specific operational question. Example: <strong>"Where is PIN-000001 stored right now?"</strong>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${message.role === 'user' ? 'ml-8 bg-blue-600 text-white' : 'mr-8 border border-slate-200 bg-white text-slate-800'}`}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">{message.role === 'user' ? 'Operator' : 'Assistant'}</p>
                <div className="whitespace-pre-wrap leading-6">{message.content}</div>
              </div>
            ))}
            {loading && (
              <div className="mr-8 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Working through grounded tools…
              </div>
            )}
          </div>

          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void sendMessage(input)
            }}
            className="space-y-3"
          >
            <OperatorAttributionFields />
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Ask an operational question…"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value as 'default' | 'gemini' | 'grok')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="default">Default from env</option>
                  <option value="gemini">Gemini</option>
                  <option value="grok">Grok</option>
                </select>
              </label>
              <button disabled={loading || !input.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Send className="h-4 w-4" />
                Ask assistant
              </button>
            </div>
          </form>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="font-semibold">Grounded answers only</h3>
          </div>
          <p className="mt-2 text-sm text-emerald-900">The assistant does not invent stock, QC, delivery, or recovery facts. If data is missing, it will say so.</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-2 text-blue-800">
            <Wrench className="h-4 w-4" />
            <h3 className="font-semibold">Available tools</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-blue-900">
            <li>• Stock lookup and material location</li>
            <li>• Requirement / PO / delivery / QC status</li>
            <li>• Recovery status and genealogy tracing</li>
            <li>• SOP and user-guide placeholder search</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
