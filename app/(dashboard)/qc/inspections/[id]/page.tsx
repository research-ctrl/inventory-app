import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import QCInspectionForm from '@/components/qc/qc-inspection-form'
import QCReturnForm from '@/components/qc/qc-return-form'

export const metadata = { title: 'QC Inspection | SMLS' }

export default async function QCInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  let delivery: any = null
  let inspection: any = null

  // Try loading as delivery ID first
  const { data: deliveryData } = await sb
    .from('deliveries')
    .select(`
      id, delivery_ref, status, created_at,
      delivery_items(id, description, part_number, quantity_expected, quantity_received, unit, condition_notes),
      purchase_order:purchase_orders(id, po_number, vendor:vendors(id, name))
    `)
    .eq('id', id)
    .single()

  if (deliveryData) {
    delivery = deliveryData
    // Check for existing inspection on this delivery
    const { data: inspData } = await sb
      .from('qc_inspections')
      .select('*, qc_defects(*)')
      .eq('delivery_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    inspection = inspData
  } else {
    // Try as inspection ID
    const { data: inspData } = await sb
      .from('qc_inspections')
      .select(`
        *, qc_defects(*),
        delivery:deliveries(
          id, delivery_ref, status,
          delivery_items(id, description, part_number, quantity_expected, quantity_received, unit, condition_notes),
          purchase_order:purchase_orders(id, po_number, vendor:vendors(id, name))
        )
      `)
      .eq('id', id)
      .single()

    if (!inspData) notFound()
    inspection = inspData
    delivery = (inspData as any).delivery
  }

  if (!delivery) notFound()

  const deliveryForForm = {
    id: delivery.id,
    delivery_ref: delivery.delivery_ref,
    po_number: delivery.purchase_order?.po_number,
    vendor_name: delivery.purchase_order?.vendor?.name,
    delivery_items: delivery.delivery_items ?? [],
  }

  const totalRejected: number = inspection?.rejected_qty ?? 0
  const isCompleted =
    inspection &&
    ['qc_passed', 'qc_failed', 'qc_conditional'].includes(inspection.status)

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`QC: ${delivery.delivery_ref}`}
        description={`${delivery.purchase_order?.vendor?.name ?? ''} — ${delivery.purchase_order?.po_number ?? ''}`}
      >
        <StatusBadge status={delivery.status} />
      </PageHeader>

      {/* Completed inspection — show results summary */}
      {isCompleted ? (
        <div className="space-y-4">
          {/* Result card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Inspection Result</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Inspection Ref</p>
                <p className="font-mono font-medium text-sm mt-0.5">
                  {inspection.inspection_ref}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Result</p>
                <div className="mt-0.5">
                  <StatusBadge status={`qc_${inspection.result}`} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={inspection.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Accepted Qty</p>
                <p className="text-lg font-semibold text-emerald-700 mt-0.5">
                  {inspection.accepted_qty ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Rejected Qty</p>
                <p className="text-lg font-semibold text-red-700 mt-0.5">
                  {inspection.rejected_qty ?? '—'}
                </p>
              </div>
              {inspection.inspection_date && (
                <div>
                  <p className="text-xs text-gray-500">Inspection Date</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {new Date(inspection.inspection_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {inspection.remarks && (
              <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                {inspection.remarks}
              </p>
            )}
          </div>

          {/* Defects */}
          {(inspection.qc_defects?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Defects Recorded</h3>
              <div className="space-y-2">
                {inspection.qc_defects.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <span
                      className={`mt-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
                        d.severity === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : d.severity === 'major'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {d.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Qty affected: {d.quantity_affected} —{' '}
                        {d.disposition?.replace(/_/g, ' ')}
                        {d.defect_code && ` (${d.defect_code})`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor return section for failed/conditional results */}
          {(inspection.result === 'fail' || inspection.result === 'conditional') &&
            totalRejected > 0 && (
              <div className="bg-white rounded-xl border border-orange-200 p-6">
                <h3 className="font-semibold text-orange-800 mb-4">
                  Vendor Return / Replacement
                </h3>
                <QCReturnForm
                  inspectionId={inspection.id}
                  deliveryId={delivery.id}
                  vendorId={delivery.purchase_order?.vendor?.id}
                  poId={delivery.purchase_order?.id}
                  rejectedQuantity={totalRejected}
                />
              </div>
            )}
        </div>
      ) : (
        /* Active or new inspection — show the inspection form */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <QCInspectionForm
            delivery={deliveryForForm}
            existingInspection={
              inspection
                ? { id: inspection.id, status: inspection.status, result: inspection.result }
                : undefined
            }
          />
        </div>
      )}
    </div>
  )
}
