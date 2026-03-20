'use client'

interface Transaction {
  id: string
  transaction_type: string
  quantity: number
  quantity_before: number
  quantity_after: number
  reference_type: string | null
  notes: string | null
  created_at: string
  actor: { full_name: string | null } | null
}

interface TransactionLogProps {
  transactions: Transaction[]
}

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  receipt:    { label: 'Receipt',    classes: 'bg-green-100 text-green-800 ring-green-200' },
  issue:      { label: 'Issue',      classes: 'bg-red-100 text-red-800 ring-red-200' },
  return:     { label: 'Return',     classes: 'bg-blue-100 text-blue-800 ring-blue-200' },
  adjustment: { label: 'Adjustment', classes: 'bg-amber-100 text-amber-800 ring-amber-200' },
  transfer:   { label: 'Transfer',   classes: 'bg-purple-100 text-purple-800 ring-purple-200' },
  write_off:  { label: 'Write-off',  classes: 'bg-gray-100 text-gray-700 ring-gray-200' },
  reversal:   { label: 'Reversal',   classes: 'bg-slate-100 text-slate-700 ring-slate-200' },
}

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_BADGE[type] ?? { label: type, classes: 'bg-gray-100 text-gray-600 ring-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ring-1 ring-inset ${config.classes}`}>
      {config.label}
    </span>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TransactionLog({ transactions }: TransactionLogProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">
        No transactions recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['Date/Time', 'Type', 'Qty', 'Before → After', 'Reference', 'Notes', 'Actor'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const isPositive = tx.quantity > 0
            return (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {formatDateTime(tx.created_at)}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={tx.transaction_type} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-semibold tabular-nums ${
                      isPositive ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {tx.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                  <span className="text-gray-400">{tx.quantity_before}</span>
                  <span className="mx-1.5 text-gray-300">→</span>
                  <span className="font-medium text-gray-800">{tx.quantity_after}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {tx.reference_type ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-48 truncate">
                  {tx.notes ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {tx.actor?.full_name ?? 'Unknown'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
