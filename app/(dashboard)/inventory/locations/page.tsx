import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import Link from 'next/link'

export const metadata = { title: 'Store Locations | SMLS' }

export default async function LocationsPage() {
  const sb = await createClient()

  // Get all locations
  const { data: locations } = await sb
    .from('store_locations')
    .select('*')
    .order('warehouse')
    .order('code')

  // Get stock balance by location
  const { data: stockByLocation } = await sb
    .from('v_stock_balance')
    .select('location_code, pin_id, current_stock, status')

  // Build per-location summary
  const locationSummary: Record<
    string,
    { pinCount: number; totalStock: number; activeCount: number }
  > = {}

  for (const row of stockByLocation ?? []) {
    const code = row.location_code ?? '__none__'
    if (!locationSummary[code]) {
      locationSummary[code] = { pinCount: 0, totalStock: 0, activeCount: 0 }
    }
    locationSummary[code].pinCount += 1
    locationSummary[code].totalStock += row.current_stock ?? 0
    if (row.status === 'approved') locationSummary[code].activeCount += 1
  }

  // Group locations by warehouse
  const byWarehouse: Record<string, typeof locations> = {}
  for (const loc of locations ?? []) {
    const wh = loc.warehouse ?? 'Other'
    if (!byWarehouse[wh]) byWarehouse[wh] = []
    byWarehouse[wh]!.push(loc)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Locations"
        description={`${(locations ?? []).length} locations across ${Object.keys(byWarehouse).length} warehouse${Object.keys(byWarehouse).length !== 1 ? 's' : ''}`}
      >
        <Link
          href="/inventory"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          ← Inventory
        </Link>
      </PageHeader>

      {Object.entries(byWarehouse).map(([warehouse, locs]) => (
        <div key={warehouse} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">{warehouse}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {(locs ?? []).length} location{(locs ?? []).length !== 1 ? 's' : ''}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {['Code', 'Name', 'Type', 'PINs', 'Active PINs', 'Total Stock Items'].map((h) => (
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
              {(locs ?? []).map((loc: any) => {
                const summary = locationSummary[loc.code] ?? {
                  pinCount: 0,
                  totalStock: 0,
                  activeCount: 0,
                }
                return (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-800">
                        {loc.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{loc.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {loc.location_type ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-gray-900">
                      {summary.pinCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-green-700 font-medium">
                      {summary.activeCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-600">
                      {summary.totalStock > 0
                        ? summary.totalStock.toFixed(summary.totalStock % 1 === 0 ? 0 : 2)
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {(locations ?? []).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-400">No store locations configured.</p>
        </div>
      )}
    </div>
  )
}
