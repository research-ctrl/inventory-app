import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { getInventoryOverview } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'PIN Registry | SMLS' }

export default async function Page() {
  const { stock } = await getInventoryOverview()

  return (
    <div className="space-y-6">
      <PageHeader title="PIN registry" description="All inventory items with sequence-based business IDs, current location, and ledger-derived stock status." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Current stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stock.map((row: any) => (
                <tr key={row.pin_id}>
                  <td className="px-4 py-3 font-mono text-blue-700"><Link href={`/inventory/pins/${row.pin_id}`}>{row.pin_number}</Link></td>
                  <td className="px-4 py-3 text-slate-900">{row.description}</td>
                  <td className="px-4 py-3 text-slate-700">{row.category ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.location_code ? `[${row.location_code}] ${row.location_name}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-900">{row.current_stock} {row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
