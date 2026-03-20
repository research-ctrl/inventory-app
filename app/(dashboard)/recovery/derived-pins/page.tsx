import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { getRecoveryOperationsData } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'Derived PINs | SMLS' }

export default async function Page() {
  const data = await getRecoveryOperationsData()
  const rows = data.genealogy.filter((row: any) => row.depth > 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Derived PIN genealogy" description="Trace reusable and repaired material into newly derived PIN records with parent-child lineage." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Lineage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row: any) => (
                <tr key={row.pin_id}>
                  <td className="px-4 py-3 font-mono text-blue-700"><Link href={`/inventory/pins/${row.pin_id}`}>{row.pin_number}</Link></td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.parent_pin_number}</td>
                  <td className="px-4 py-3 text-slate-700">{row.origin_type} · {row.recovery_ref ?? row.origin_reference}</td>
                  <td className="px-4 py-3 text-slate-600">{row.lineage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
