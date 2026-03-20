'use client'

import type { ScoredVendor } from '@/components/vendors/vendor-scoring'

interface VendorComparisonProps {
  vendors: ScoredVendor[]
}

const SCORE_MAX: Record<string, number> = {
  rating: 25,
  payment_terms: 20,
  delivery_history: 25,
  po_count: 15,
  recent_activity: 15,
}

const SCORE_LABELS: Record<string, string> = {
  rating: 'Vendor Rating',
  payment_terms: 'Payment Terms',
  delivery_history: 'Delivery History',
  po_count: 'PO Volume',
  recent_activity: 'Recent Activity',
}

const RANK_STYLES: Record<number, { badge: string; label: string; card: string }> = {
  1: {
    badge: 'bg-yellow-400 text-yellow-900 ring-yellow-500',
    label: '#1 Gold',
    card: 'ring-2 ring-yellow-400 bg-yellow-50',
  },
  2: {
    badge: 'bg-gray-300 text-gray-800 ring-gray-400',
    label: '#2 Silver',
    card: 'ring-2 ring-gray-300 bg-gray-50',
  },
  3: {
    badge: 'bg-amber-600 text-white ring-amber-700',
    label: '#3 Bronze',
    card: 'ring-2 ring-amber-500 bg-amber-50',
  },
}

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">
        {value}/{max}
      </span>
    </div>
  )
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-400 text-sm">—</span>
  const full = Math.floor(rating)
  const empty = 5 - full
  return (
    <span className="flex items-center gap-0.5 text-amber-400 text-sm">
      {'★'.repeat(full)}
      <span className="text-gray-300">{'★'.repeat(empty)}</span>
      <span className="ml-1 text-gray-600 text-xs">{rating.toFixed(1)}</span>
    </span>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank]
  if (!style)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-300 ring-inset">
        #{rank}
      </span>
    )
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      {style.label}
    </span>
  )
}

export default function VendorComparison({ vendors }: VendorComparisonProps) {
  if (!vendors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">⚖️</div>
        <h3 className="text-base font-semibold text-gray-900">No vendors selected</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-sm">
          Select 2–4 vendors from the vendor list using the compare checkboxes, then return here.
        </p>
      </div>
    )
  }

  const top = vendors[0]
  const colCount = vendors.length

  return (
    <div className="space-y-8">
      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-40">Criteria</th>
              {vendors.map((v) => (
                <th
                  key={v.id}
                  className="px-4 py-3 text-left font-semibold text-gray-900 min-w-[180px]"
                >
                  {v.name}
                  {v.trade_name && (
                    <div className="text-xs font-normal text-gray-500">{v.trade_name}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Category */}
            <tr className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 font-medium">Category</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3 capitalize text-gray-700">
                  {v.category ?? '—'}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 font-medium">Rating</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3">
                  <StarDisplay rating={v.rating} />
                </td>
              ))}
            </tr>

            {/* Payment Terms */}
            <tr className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 font-medium">Payment Terms</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3 text-gray-700">
                  {v.payment_terms_days != null ? `${v.payment_terms_days} days` : '—'}
                </td>
              ))}
            </tr>

            {/* Total POs */}
            <tr className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 font-medium">Total POs</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3 text-gray-700">
                  {(v.purchase_orders ?? []).length}
                </td>
              ))}
            </tr>

            {/* Score breakdown */}
            {Object.entries(SCORE_LABELS).map(([key, label]) => (
              <tr key={key} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 font-medium">{label}</td>
                {vendors.map((v) => (
                  <td key={v.id} className="px-4 py-3">
                    <ScoreBar
                      value={v.score[key as keyof typeof v.score] as number}
                      max={SCORE_MAX[key]}
                    />
                  </td>
                ))}
              </tr>
            ))}

            {/* Total score */}
            <tr className="bg-blue-50 border-t-2 border-blue-100">
              <td className="px-4 py-3 font-bold text-gray-900">Total Score</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3">
                  <span className="text-lg font-bold text-blue-700">
                    {v.score.total.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/ 100</span>
                </td>
              ))}
            </tr>

            {/* Rank */}
            <tr className="bg-white">
              <td className="px-4 py-3 font-medium text-gray-500">Rank</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-4 py-3">
                  <RankBadge rank={v.rank} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommended vendor card */}
      {top && (
        <div
          className={`rounded-xl p-6 ${RANK_STYLES[1]?.card ?? 'bg-gray-50 ring-1 ring-gray-200'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RankBadge rank={1} />
                <span className="text-xs font-medium text-gray-500">Recommended Vendor</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{top.name}</h3>
              {top.trade_name && (
                <p className="text-sm text-gray-500">{top.trade_name}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                {top.category && (
                  <span>
                    <span className="font-medium">Category:</span>{' '}
                    <span className="capitalize">{top.category}</span>
                  </span>
                )}
                {top.payment_terms_days != null && (
                  <span>
                    <span className="font-medium">Payment:</span>{' '}
                    {top.payment_terms_days} days
                  </span>
                )}
                {top.rating != null && (
                  <span>
                    <span className="font-medium">Rating:</span>{' '}
                    {top.rating.toFixed(1)} / 5
                  </span>
                )}
                {(top.city || top.country) && (
                  <span>
                    <span className="font-medium">Location:</span>{' '}
                    {[top.city, top.country].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-black text-blue-700">
                {top.score.total.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">out of 100</div>
            </div>
          </div>

          {/* Score breakdown mini bars */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(SCORE_LABELS).map(([key, label]) => (
              <div key={key}>
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <ScoreBar
                  value={top.score[key as keyof typeof top.score] as number}
                  max={SCORE_MAX[key]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
