'use client'

import { useState } from 'react'
import { approveByToken } from '@/actions/approve-by-token'
import type { ApproveByTokenResult } from '@/actions/approve-by-token'

interface Props {
  token: string
  entityType: string
  entityRef: string
  entityTitle: string
  prefillDecision?: 'approve' | 'reject'
}

export default function ApproveClient({ token, entityType, entityRef, entityTitle, prefillDecision }: Props) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(prefillDecision ?? null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApproveByTokenResult | null>(null)

  async function handleSubmit(d: 'approve' | 'reject') {
    setLoading(true)
    setDecision(d)
    try {
      const res = await approveByToken(token, d, comment || undefined)
      setResult(res)
    } catch {
      setResult({ ok: false, error: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (result) {
    if (result.ok) {
      const isApproved = result.decision === 'approve'
      return (
        <div className="text-center py-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="text-4xl">{isApproved ? '✓' : '✗'}</span>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${isApproved ? 'text-green-700' : 'text-red-700'}`}>
            {isApproved ? 'Approved!' : 'Rejected'}
          </h1>
          <p className="text-gray-600 text-lg mb-1">
            {result.entityRef ?? entityRef} — {result.entityTitle ?? entityTitle}
          </p>
          <p className="text-gray-500 text-sm mt-4">
            {isApproved
              ? 'The decision has been recorded. The relevant parties have been notified.'
              : 'The decision has been recorded. The requester has been notified.'}
          </p>
          <p className="text-gray-400 text-xs mt-6">
            You may close this tab.
          </p>
        </div>
      )
    } else {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
            <span className="text-4xl">⚠</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-orange-700">Unable to Process</h1>
          <p className="text-gray-600 mb-6">{result.error}</p>
        </div>
      )
    }
  }

  // ── Action state ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* If a decision was pre-filled from URL, show confirmation prompt */}
      {prefillDecision && !decision && (
        <div className={`rounded-lg p-4 mb-6 ${prefillDecision === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-semibold ${prefillDecision === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
            You are about to {prefillDecision === 'approve' ? 'approve' : 'reject'} this {entityType.replace('_', ' ')}.
          </p>
        </div>
      )}

      {/* Comment field */}
      <div className="mb-6">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comment <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={decision === 'reject' || prefillDecision === 'reject'
            ? 'Reason for rejection (recommended)...'
            : 'Add a comment (optional)...'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={loading}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit('approve')}
          disabled={loading}
          className="flex-1 py-3 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && decision === 'approve' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Processing…
            </span>
          ) : '✓ Approve'}
        </button>
        <button
          onClick={() => handleSubmit('reject')}
          disabled={loading}
          className="flex-1 py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-base transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && decision === 'reject' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Processing…
            </span>
          ) : '✗ Reject'}
        </button>
      </div>
    </div>
  )
}
