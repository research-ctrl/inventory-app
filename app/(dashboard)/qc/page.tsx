import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'

export const metadata = { title: 'Quality Control | SMLS' }

export default async function QCPage() {
  const sb = await createClient()

  // Deliveries awaiting QC
  const { data: qcQueue } = await sb
    .from('deliveries')
    .select(`
      id, delivery_ref, status, created_at,
      purchase_order:purchase_orders(po_number, vendor:vendors(name))
    `)
    .in('status', ['qc_pending', 'qc_conditional'])
    .order('created_at')

  // Recent inspections
  const { data: recentInspections } = await sb
    .from('qc_inspections')
    .select(`
      id, inspection_ref, result, status, inspection_date,
      delivery:deliveries(delivery_ref)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Inspect incoming deliveries and manage QC outcomes"
      />

      {/* QC Queue */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Awaiting Inspection</h2>
          <p className="text-sm text-gray-500">{(qcQueue ?? []).length} deliveries in queue</p>
        </div>
        {(qcQueue ?? []).length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No deliveries awaiting QC
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(qcQueue ?? []).map((d: any) => (
              <Link
                key={d.id}
                href={`/qc/inspections/${d.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-blue-600">{d.delivery_ref}</p>
                  <p className="text-sm text-gray-600">{d.purchase_order?.vendor?.name}</p>
                  <p className="text-xs text-gray-400">PO: {d.purchase_order?.po_number}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Inspections */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Inspections</h2>
        </div>
        {(recentInspections ?? []).length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No inspections recorded yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(recentInspections ?? []).map((insp: any) => (
              <Link
                key={insp.id}
                href={`/qc/inspections/${insp.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {insp.inspection_ref}
                  </p>
                  <p className="text-xs text-gray-500">{insp.delivery?.delivery_ref}</p>
                </div>
                <div className="flex items-center gap-3">
                  {insp.result && <StatusBadge status={`qc_${insp.result}`} />}
                  <StatusBadge status={insp.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
