import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'

export const metadata = { title: 'PINs | SMLS' }

interface SearchParams {
  category?: string
  status?: string
  q?: string
}

export default async function PinsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const sb = await createClient()

  // Get all stock from the view
  let query = sb.from('v_stock_balance').select('*').order('pin_number')

  // Apply server-side filters
  if (params.status) query = query.eq('status', params.status)
  if (params.category) query = query.eq('category', params.category)

  const { data: stock } = await query

  // Get distinct categories for filter
  const { data: categoryRows } = await sb
    .from('inventory_pins')
    .select('category')
    .not('category', 'is', null)

  const categories = Array.from(
    new Set((categoryRows ?? []).map((r: any) => r.category).filter(Boolean))
  ).sort() as string[]

  const statuses = ['approved', 'on_hold', 'scrapped', 'quarantined']

  // Client-side text search filter
  const q = params.q?.toLowerCase() ?? ''
  const rows = (stock ?? []).filter((r: any) => {
    if (!q) return true
    return (
      r.pin_number?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.part_number?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader title="All PINs" description={`${rows.length} PIN${rows.length !== 1 ? 's' : ''} in inventory`}>
        <Link
          href="/inventory"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          ← Inventory
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="PIN, description, part no…"
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none w-56"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              name="category"
              defaultValue={params.category ?? ''}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Filter
          </button>
          {(params.category || params.status || params.q) && (
            <Link
              href="/inventory/pins"
              className="h-9 px-4 inline-flex items-center bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['PIN Number', 'Description', 'Part No.', 'Category', 'Unit', 'Location', 'Stock', 'Status'].map(
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No PINs match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr
                    key={row.pin_id}
                    className={`hover:bg-gray-50 ${row.is_low_stock ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/pins/${row.pin_id}`}
                        className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {row.pin_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-48 truncate">{row.description}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {row.part_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.category ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.unit}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {row.location_code ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
