import { PageHeader } from '@/components/shared/page-header'
import { OperatorAttributionFields } from '@/components/layout/operator-identity'
import { getQcLifecycleQueue } from '@/lib/db/queries/lifecycle'
import { recordQcDisposition } from '@/actions/lifecycle'
import { StatusBadge } from '@/components/shared/status-badge'

export const metadata = { title: 'Quality Control | SMLS' }

function fmtDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function Page() {
  const queue = await getQcLifecycleQueue()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Capture exact pass / partial pass / fail decisions, vendor return actions, and replacement loops back into delivery tracking."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready for pass</p>
          <p className="mt-2 text-3xl font-bold text-emerald-800">{queue.filter((row) => row.status === 'received' || row.status === 'qc_pending').length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Partial-pass / returns</p>
          <p className="mt-2 text-3xl font-bold text-amber-800">{queue.filter((row) => row.vendorReturn).length}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Replacement loop open</p>
          <p className="mt-2 text-3xl font-bold text-blue-800">{queue.filter((row) => row.vendorReturn?.replacement_status === 'awaiting_replacement_delivery').length}</p>
        </div>
      </div>

      <div className="space-y-5">
        {queue.map((delivery: any) => (
          <section key={delivery.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{delivery.delivery_ref}</h2>
                  <StatusBadge status={delivery.status} />
                  {delivery.disposition?.result && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      Logged QC: {delivery.disposition.result.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  PO {delivery.purchase_order?.po_number ?? '—'} · Vendor {delivery.purchase_order?.vendor?.name ?? '—'} · Received {fmtDate(delivery.actual_received_date)}
                </p>
                {delivery.vendorReturn && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Vendor return status: <strong>{delivery.vendorReturn.return_status}</strong>
                    {delivery.vendorReturn.replacement_status ? ` · Replacement: ${delivery.vendorReturn.replacement_status}` : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Line</th>
                    <th className="px-3 py-3">Material</th>
                    <th className="px-3 py-3">Received</th>
                    <th className="px-3 py-3">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(delivery.delivery_items ?? []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 text-slate-500">{item.line_number}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="font-mono text-xs text-slate-500">{item.part_number ?? '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.quantity_received} / {item.quantity_expected} {item.unit}</td>
                      <td className="px-3 py-3">
                        <form action={recordQcDisposition} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
                          <OperatorAttributionFields />
                          <input type="hidden" name="deliveryId" value={delivery.id} />
                          <input type="hidden" name="deliveryItemId" value={item.id} />
                          <input type="hidden" name="receivedQty" value={item.quantity_received ?? 0} />
                          <input type="hidden" name="description" value={item.description} />
                          <input type="hidden" name="partNumber" value={item.part_number ?? ''} />
                          <input type="hidden" name="unit" value={item.unit} />

                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>QC result</span>
                            <select name="result" defaultValue="pass" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                              <option value="pass">Pass</option>
                              <option value="partial_pass">Partial pass</option>
                              <option value="fail">Fail</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>Accepted qty</span>
                            <input name="acceptedQty" type="number" min="0" step="0.001" defaultValue={item.quantity_received ?? 0} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>Rejected qty</span>
                            <input name="rejectedQty" type="number" min="0" step="0.001" defaultValue="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>Replacement loop</span>
                            <select name="replacementRequired" defaultValue="no" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                              <option value="no">No replacement</option>
                              <option value="yes">Vendor replacement required</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>Inventory category</span>
                            <input name="category" defaultValue="Mechanical" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600">
                            <span>Lifecycle phase</span>
                            <input name="phase" defaultValue="intake_pending" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          </label>
                          <label className="space-y-1 text-xs font-medium text-slate-600 lg:col-span-2">
                            <span>Inspector remarks</span>
                            <input name="remarks" defaultValue={delivery.notes ?? ''} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          </label>
                          <div className="lg:col-span-4 flex justify-end">
                            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                              Save QC disposition
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
