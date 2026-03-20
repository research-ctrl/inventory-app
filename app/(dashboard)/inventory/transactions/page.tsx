import { PageHeader } from '@/components/shared/page-header'
import { getInventoryOverview } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'Inventory Transactions | SMLS' }

export default async function Page() {
  const { transactions } = await getInventoryOverview()

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory transaction ledger" description="Receipt, issue, return, and write-off movements with before/after balances for audit visibility." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Before → After</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.map((row: any) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-600">{new Date(row.created_at).toLocaleString('en-GB')}</td>
                  <td className="px-4 py-3"><p className="font-mono text-slate-900">{row.pin?.pin_number}</p><p className="text-xs text-slate-500">{row.pin?.description}</p></td>
                  <td className="px-4 py-3 text-slate-700">{row.transaction_type}</td>
                  <td className="px-4 py-3 text-slate-900">{row.quantity}</td>
                  <td className="px-4 py-3 text-slate-700">{row.quantity_before} → {row.quantity_after}</td>
                  <td className="px-4 py-3 text-slate-600">{row.reference_type} · {row.reference_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
