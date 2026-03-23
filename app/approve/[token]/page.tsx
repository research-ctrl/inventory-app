import { getApprovalDetailsByToken } from '@/actions/approve-by-token'
import ApproveClient from './approve-client'

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ decision?: string }>
}

export const dynamic = 'force-dynamic'

export default async function ApprovePage({ params, searchParams }: PageProps) {
  const { token } = await params
  const { decision: rawDecision } = await searchParams
  const prefillDecision = rawDecision === 'approve' || rawDecision === 'reject'
    ? (rawDecision as 'approve' | 'reject')
    : undefined

  const details = await getApprovalDetailsByToken(token)

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!details || !details.found) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <span className="text-4xl">🔗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Link Not Found</h1>
          <p className="text-gray-500">This approval link is invalid or has expired.</p>
        </div>
      </Layout>
    )
  }

  // ── Already decided ────────────────────────────────────────────────────────
  if (details.alreadyDecided) {
    const isApproved = details.status === 'approved'
    const isRejected = details.status === 'rejected'
    return (
      <Layout>
        <div className="text-center py-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            isApproved ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">{isApproved ? '✓' : isRejected ? '✗' : 'ℹ'}</span>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${
            isApproved ? 'text-green-700' : isRejected ? 'text-red-700' : 'text-gray-700'
          }`}>
            Already {details.status ? details.status.charAt(0).toUpperCase() + details.status.slice(1) : 'Decided'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            This item has already been decided. No further action is needed.
          </p>
          <div className="mt-6 bg-gray-50 rounded-lg p-4 text-left max-w-sm mx-auto">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Item Details</p>
            <p className="text-sm font-medium text-gray-800">{details.entityRef}</p>
            <p className="text-sm text-gray-600">{details.entityTitle}</p>
          </div>
        </div>
      </Layout>
    )
  }

  // ── Pending — show approve/reject UI ──────────────────────────────────────
  const entityTypeLabel = details.entityType === 'purchase_order' ? 'Purchase Order'
    : details.entityType === 'requirement' ? 'Requirement'
    : details.entityType ?? 'Item'

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase font-semibold text-blue-600 tracking-widest mb-1">{entityTypeLabel}</p>
        <h1 className="text-2xl font-bold text-gray-900">{details.entityTitle}</h1>
        <p className="text-sm text-gray-500 mt-1">Ref: {details.entityRef}</p>
      </div>

      {/* Details card */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6 space-y-2">
        {details.entityAmount && (
          <Row label="Amount" value={details.entityAmount} />
        )}
        {details.entityUrgency && (
          <Row label="Urgency" value={details.entityUrgency.toUpperCase()} />
        )}
        {details.requesterName && (
          <Row label="Requested by" value={details.requesterName} />
        )}
      </div>

      {/* Approve / Reject form */}
      <ApproveClient
        token={token}
        entityType={details.entityType ?? 'item'}
        entityRef={details.entityRef ?? ''}
        entityTitle={details.entityTitle ?? ''}
        prefillDecision={prefillDecision}
      />
    </Layout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-16 pb-16 px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-700 text-white text-xs font-bold tracking-widest px-4 py-2 rounded-lg mb-2">
            SMLS
          </div>
          <p className="text-gray-500 text-sm">Shipyard Material Lifecycle System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your decision is recorded securely. This link can only be used once.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
