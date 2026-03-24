'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface RequirementData {
  id: string
  ref_number: string
  title: string
  description?: string
  requested_by_profile?: {
    id: string
    full_name?: string
    email?: string
  }
}

interface TokenData {
  id: string
  requirement_id: string
  approver_email: string
  action: string
  expires_at: string
  used_at?: string
  requirements?: RequirementData | RequirementData[]
}

interface InventoryReleaseApprovalClientProps {
  token: string
  tokenData: TokenData
  onApprove: (token: string, comment?: string) => Promise<{ success: boolean; error?: string; requirementId?: string }>
  onDeny: (token: string, reason?: string) => Promise<{ success: boolean; error?: string; requirementId?: string }>
}

export default function InventoryReleaseApprovalClient({
  token,
  tokenData,
  onApprove,
  onDeny,
}: InventoryReleaseApprovalClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [decision, setDecision] = useState<'approve' | 'deny' | null>(null)
  const [comment, setComment] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Extract requirement data
  const req = Array.isArray(tokenData.requirements)
    ? tokenData.requirements[0]
    : tokenData.requirements

  if (!req) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Invalid Request</h2>
        <p className="text-red-800">Unable to load requirement details</p>
      </div>
    )
  }

  async function handleApprove() {
    setIsLoading(true)
    try {
      const result = await onApprove(token, comment)
      if (result.success) {
        setResult({
          success: true,
          message: 'Inventory release has been approved! The procurement team will now process the inventory release.',
        })
      } else {
        setResult({
          success: false,
          message: result.error || 'Failed to approve release',
        })
      }
    } finally {
      setIsLoading(false)
      setDecision(null)
    }
  }

  async function handleDeny() {
    setIsLoading(true)
    try {
      const result = await onDeny(token, comment)
      if (result.success) {
        setResult({
          success: true,
          message: 'Inventory release has been denied. The procurement team has been notified.',
        })
      } else {
        setResult({
          success: false,
          message: result.error || 'Failed to deny release',
        })
      }
    } finally {
      setIsLoading(false)
      setDecision(null)
    }
  }

  // Show result message
  if (result) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          {result.success ? (
            <>
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-green-900 mb-2">Request Processed</h2>
                <p className="text-green-800">{result.message}</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
                <p className="text-red-800">{result.message}</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Requirement: <span className="font-mono font-semibold">{req.ref_number}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Title: <span className="font-semibold">{req.title}</span>
          </p>
        </div>
      </div>
    )
  }

  // Show approval form
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Approve Inventory Release</h1>
      <p className="text-gray-600 mb-6">Please review the requirement and approve or deny the inventory release</p>

      {/* Requirement Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Requirement ID</div>
          <div className="font-mono text-lg font-semibold text-gray-900">{req.ref_number}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</div>
          <div className="text-lg font-semibold text-gray-900">{req.title}</div>
        </div>

        {req.description && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</div>
            <div className="text-gray-700 mt-1 whitespace-pre-wrap">{req.description}</div>
          </div>
        )}

        {req.requested_by_profile && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested By</div>
            <div className="text-gray-900">
              {req.requested_by_profile.full_name || req.requested_by_profile.email || 'Unknown'}
            </div>
          </div>
        )}
      </div>

      {/* Decision Section */}
      {!decision ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 font-medium">What would you like to do?</p>

          <div className="flex gap-3">
            <button
              onClick={() => setDecision('approve')}
              className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              disabled={isLoading}
            >
              <CheckCircle className="inline h-4 w-4 mr-2" />
              Approve Release
            </button>

            <button
              onClick={() => setDecision('deny')}
              className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              disabled={isLoading}
            >
              <XCircle className="inline h-4 w-4 mr-2" />
              Deny Release
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-4">
              {decision === 'approve'
                ? 'Please confirm you approve the inventory release:'
                : 'Please provide a reason for denying the release:'}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={decision === 'approve' ? 'Optional comment...' : 'Reason for denial (required)...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              disabled={isLoading}
              required={decision === 'deny'}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setDecision(null)
                setComment('')
              }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>

            <button
              onClick={decision === 'approve' ? handleApprove : handleDeny}
              className={`flex-1 px-4 py-2 text-white font-semibold rounded-lg transition-colors ${
                decision === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
              }`}
              disabled={isLoading || (decision === 'deny' && !comment.trim())}
            >
              {isLoading ? 'Processing...' : decision === 'approve' ? 'Approve' : 'Deny'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
        <p>Approver Email: {tokenData.approver_email}</p>
        <p>Token Expires: {new Date(tokenData.expires_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}
