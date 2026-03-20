import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: 'QC Returns | SMLS' }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-yellow-300',
  shipped_to_vendor: 'bg-blue-100 text-blue-800 ring-blue-300',
  replacement_ordered: 'bg-indigo-100 text-indigo-800 ring-indigo-300',
  replacement_received: 'bg-green-100 text-green-800 ring-green-300',
  closed: 'bg-gray-100 text-gray-700 ring-gray-300',
  cancelled: 'bg-red-100 text-red-700 ring-red-300',
}

export default async function QCReturnsPage() {
  const sb = await createClient()
  const { data: returns } = await sb
    .from('qc_returns')
    .select(`
      id, return_ref, status, quantity_returned, return_reason,
      returned_at, replacement_expected, created_at,
      delivery:deliveries(delivery_ref),
      inspection:qc_inspections(inspection_ref, result)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Returns"
        description="Track rejected items and replacement deliveries"
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                'Return Ref',
                'Delivery',
                'Inspection',
                'Qty Returned',
                'Reason',
                'Status',
                'Replacement Expected',
              ].map(h => (
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
            {(returns ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No vendor returns recorded
                </td>
              </tr>
            ) : (
              (returns ?? []).map((ret: any) => (
                <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 whitespace-nowrap">
                    {ret.return_ref}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                    {ret.delivery?.delivery_ref ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {ret.inspection?.inspection_ref ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                    {ret.quantity_returned}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{ret.return_reason}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                        STATUS_COLORS[ret.status] ?? 'bg-gray-100 text-gray-700 ring-gray-300'
                      }`}
                    >
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {ret.replacement_expected
                      ? new Date(ret.replacement_expected).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
