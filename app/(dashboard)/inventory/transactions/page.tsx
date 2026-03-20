import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import Link from 'next/link'

export const metadata = { title: 'Transactions | SMLS' }

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  receipt:    { label: 'Receipt',    classes: 'bg-green-100 text-green-800 ring-green-200' },
  issue:      { label: 'Issue',      classes: 'bg-red-100 text-red-800 ring-red-200' },
  return:     { label: 'Return',     classes: 'bg-blue-100 text-blue-800 ring-blue-200' },
  adjustment: { label: 'Adjustment', classes: 'bg-amber-100 text-amber-800 ring-amber-200' },
  transfer:   { label: 'Transfer',   classes: 'bg-purple-100 text-purple-800 ring-purple-200' },
  write_off:  { label: 'Write-off',  classes: 'bg-gray-100 text-gray-700 ring-gray-200' },
  reversal:   { label: 'Reversal',   classes: 'bg-slate-100 text-slate-700 ring-slate-200' },
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function TransactionsPage() {
  const sb = await createClient()

  const { data: transactions } = await sb
    .from('inventory_transactions')
    .select(`
      *,
      pin:inventory_pins(pin_number, description),
      actor:profiles(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Transactions"
        description={`${(transactions ?? []).length} most recent transactions`}
      >
        <Link
          href="/inventory"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          ← Inventory
        </Link>
      </PageHeader>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date/Time', 'PIN', 'Type', 'Qty', 'Before → After', 'Reference', 'Notes', 'Actor'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(transactions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                (transactions ?? []).map((tx: any) => {
                  const isPositive = tx.quantity > 0
                  const badge = TYPE_BADGE[tx.transaction_type] ?? {
                    label: tx.transaction_type,
                    classes: 'bg-gray-100 text-gray-600 ring-gray-200',
                  }
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {tx.pin ? (
                          <Link
                            href={`/inventory/pins/${tx.pin_id}`}
                            className="font-mono text-xs text-blue-600 hover:underline block"
                          >
                            {tx.pin.pin_number}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-gray-400">{tx.pin_id}</span>
                        )}
                        {tx.pin?.description && (
                          <span className="text-xs text-gray-400 block truncate max-w-32">
                            {tx.pin.description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ring-1 ring-inset ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
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
                        <span className="text-gray-400">{tx.quantity_before ?? 0}</span>
                        <span className="mx-1.5 text-gray-300">→</span>
                        <span className="font-medium text-gray-800">{tx.quantity_after ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {tx.reference_type ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-40 truncate">
                        {tx.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {tx.actor?.full_name ?? 'Unknown'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
