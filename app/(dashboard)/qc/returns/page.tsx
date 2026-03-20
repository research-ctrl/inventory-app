import { PageHeader } from '@/components/shared/page-header'
import { getQcLifecycleQueue } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'QC Returns | SMLS' }

export default async function Page() {
  const rows = (await getQcLifecycleQueue()).filter((row) => row.vendorReturn)

  return (
    <div className="space-y-6">
      <PageHeader title="Vendor returns & replacements" description="Rejected QC quantities loop back into delivery tracking until replacement deliveries are received." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Rejected qty</th>
                <th className="px-4 py-3">Return status</th>
                <th className="px-4 py-3">Replacement loop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row: any) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.delivery_ref}</td>
                  <td className="px-4 py-3 text-slate-600">{row.purchase_order?.vendor?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-900">{row.vendorReturn.rejected_qty}</td>
                  <td className="px-4 py-3 text-slate-700">{row.vendorReturn.return_status}</td>
                  <td className="px-4 py-3 text-slate-700">{row.vendorReturn.replacement_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
