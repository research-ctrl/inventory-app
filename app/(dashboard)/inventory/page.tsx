import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { OperatorAttributionFields } from '@/components/layout/operator-identity'
import { processInventoryIntake } from '@/actions/lifecycle'
import { getInventoryOverview, getPrototypeReferenceData, getQcLifecycleQueue } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'Inventory | SMLS' }

export default async function Page() {
  const [{ stock, transactions }, referenceData, qcQueue] = await Promise.all([
    getInventoryOverview(),
    getPrototypeReferenceData(),
    getQcLifecycleQueue(),
  ])

  const pendingIntake = qcQueue.filter((row) => row.disposition?.intake_status === 'pending' && !row.intake)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Intake & Ledger"
        description="Generate PINs, assign category/location/phase, and post auditable ledger entries for every accepted quantity."
      >
        <div className="flex gap-2">
          <Link href="/inventory/pins" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">PIN registry</Link>
          <Link href="/inventory/transactions" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Transaction ledger</Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">PINs in stock</p><p className="mt-2 text-3xl font-bold text-blue-900">{stock.length}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pending intake</p><p className="mt-2 text-3xl font-bold text-emerald-900">{pendingIntake.length}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Low stock lines</p><p className="mt-2 text-3xl font-bold text-amber-900">{stock.filter((row: any) => row.is_low_stock).length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Ledger rows</p><p className="mt-2 text-3xl font-bold text-slate-900">{transactions.length}</p></div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inventory intake queue</h2>
            <p className="text-sm text-slate-600">Accepted quantities from QC are turned into new PIN records here, with location and phase assignment captured at intake.</p>
          </div>
        </div>

        <div className="space-y-4">
          {pendingIntake.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No accepted quantities are waiting for intake.</p>}
          {pendingIntake.map((delivery: any) => (
            <form key={delivery.id} action={processInventoryIntake} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <OperatorAttributionFields />
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="acceptedQty" value={delivery.disposition.accepted_qty} />
              <input type="hidden" name="description" value={delivery.disposition.description} />
              <input type="hidden" name="partNumber" value={delivery.disposition.part_number ?? ''} />
              <input type="hidden" name="unit" value={delivery.disposition.unit} />
              <div className="lg:col-span-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <strong>{delivery.delivery_ref}</strong> · Accepted {delivery.disposition.accepted_qty} {delivery.disposition.unit} · QC result {delivery.disposition.result.replace('_', ' ')}
              </div>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Category</span>
                <input name="category" defaultValue={delivery.disposition.category ?? 'Mechanical'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Lifecycle phase</span>
                <input name="phase" defaultValue={delivery.disposition.phase ?? 'ready_for_issue'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Store location</span>
                <select name="locationId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900" defaultValue={referenceData.locations[0]?.id ?? ''}>
                  {referenceData.locations.map((location: any) => (
                    <option key={location.id} value={location.id}>[{location.code}] {location.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Min / Max stock</span>
                <div className="grid grid-cols-2 gap-2">
                  <input name="minStockLevel" type="number" defaultValue="1" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  <input name="maxStockLevel" type="number" defaultValue="10" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                </div>
              </label>
              <div className="lg:col-span-4 flex justify-end">
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Generate PIN & post receipt</button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Current stock overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stock.slice(0, 12).map((row: any) => (
                <tr key={row.pin_id}>
                  <td className="px-4 py-3 font-mono text-blue-700"><Link href={`/inventory/pins/${row.pin_id}`}>{row.pin_number}</Link></td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{row.description}</p><p className="font-mono text-xs text-slate-500">{row.part_number ?? '—'}</p></td>
                  <td className="px-4 py-3 text-slate-600">{row.location_code ? `[${row.location_code}] ${row.location_name}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-900">{row.current_stock} {row.unit}</td>
                  <td className="px-4 py-3 text-slate-900">{row.quantity_available ?? row.current_stock} {row.unit}</td>
                  <td className="px-4 py-3">{row.is_low_stock ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Low stock</span> : <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">Healthy</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
