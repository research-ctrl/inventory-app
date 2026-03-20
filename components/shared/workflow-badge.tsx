'use client'

import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import { ArrowRight } from 'lucide-react'

interface WorkflowEvent {
  from_status: string
  to_status: string
  event: string
  actor_id: string
  comment?: string | null
  created_at: string
  actor?: {
    full_name?: string | null
    email?: string | null
  } | null
}

interface WorkflowHistoryProps {
  history: WorkflowEvent[]
}

function actorLabel(event: WorkflowEvent): string {
  if (event.actor?.full_name) return event.actor.full_name
  if (event.actor?.email) return event.actor.email
  return event.actor_id ?? 'Unknown'
}

function eventLabel(event: string): string {
  return event
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function WorkflowHistory({ history }: WorkflowHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4">No workflow history available.</p>
    )
  }

  return (
    <ol className="relative space-y-0">
      {history.map((event, idx) => {
        const isLast = idx === history.length - 1
        return (
          <li key={idx} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200"
                aria-hidden="true"
              />
            )}

            {/* Timeline dot */}
            <div className="relative mt-0.5 flex h-6 w-6 flex-none items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white ring-offset-1" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Event label + transition */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-gray-900">
                  {eventLabel(event.event)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <StatusBadge status={event.from_status} size="sm" />
                  <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <StatusBadge status={event.to_status} size="sm" />
                </span>
              </div>

              {/* Meta: actor + timestamp */}
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{actorLabel(event)}</span>
                {' · '}
                <time dateTime={event.created_at}>
                  {formatDateTime(event.created_at)}
                </time>
              </p>

              {/* Optional comment */}
              {event.comment && (
                <p className="mt-1.5 text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
                  {event.comment}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
