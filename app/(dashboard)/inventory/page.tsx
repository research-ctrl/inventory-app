import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'

export const metadata = { title: 'Inventory | SMLS' }

export default async function InventoryPage() {
  const sb = await createClient()

  const { data: stock } = await sb
    .from('v_stock_balance')
    .select('*')
    .order('pin_number')

  const total = (stock ?? []).length
  const lowStock = (stock ?? []).filter((p: any) => p.is_low_stock).length
  const onHold = (stock ?? []).filter((p: any) => p.status === 'on_hold').length
  const scrapped = (stock ?? []).filter((p: any) => p.status === 'scrapped').length

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock levels and PIN management">
        <div className="flex gap-2">
          <Link
            href="/inventory/pins"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            All PINs
          </Link>
          <Link
            href="/inventory/transactions"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Transactions
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total PINs', value: total, colorClass: 'text-blue-600' },
          { label: 'Low Stock', value: lowStock, colorClass: 'text-amber-600' },
          { label: 'On Hold', value: onHold, colorClass: 'text-orange-600' },
          { label: 'Scrapped', value: scrapped, colorClass: 'text-red-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.colorClass}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Current Stock</h2>
          <span className="text-xs text-gray-400">Showing up to 50 items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['PIN', 'Description', 'Category', 'Location', 'Stock', 'Status'].map((h) => (
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
              {(stock ?? []).slice(0, 50).map((row: any) => (
                <tr
                  key={row.pin_id}
                  className={`hover:bg-gray-50 ${row.is_low_stock ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/pins/${row.pin_id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      {row.pin_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-56 truncate">{row.description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.category ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">
                    {row.location_code ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        row.is_low_stock ? 'text-amber-700' : 'text-gray-900'
                      }`}
                    >
                      {row.current_stock}{' '}
                      <span className="font-normal text-gray-400 text-xs">{row.unit}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {(stock ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(stock ?? []).length > 50 && (
          <div className="px-6 py-3 border-t border-gray-100 text-center">
            <Link href="/inventory/pins" className="text-sm text-blue-600 hover:underline">
              View all {(stock ?? []).length} PINs →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
