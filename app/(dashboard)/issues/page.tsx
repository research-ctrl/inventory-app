import { PageHeader } from '@/components/shared/page-header'
import { OperatorAttributionFields } from '@/components/layout/operator-identity'
import { captureUsageOutcome, dispatchIssueToOperations } from '@/actions/lifecycle'
import { getIssueOperationsData } from '@/lib/db/queries/lifecycle'
import { StatusBadge } from '@/components/shared/status-badge'

export const metadata = { title: 'Material Issues | SMLS' }

export default async function Page() {
  const data = await getIssueOperationsData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue & Distribution"
        description="Dispatch stock directly into shipbuilder operations, then capture not used, leftover, and scrap outcomes for recovery assessment."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Shipbuilder issue / distribution</h2>
          <p className="text-sm text-slate-600">This posts an issue record, approves it, and writes the inventory ledger deduction as a single operator action.</p>
        </div>

        <form action={dispatchIssueToOperations} className="grid gap-3 lg:grid-cols-4">
          <OperatorAttributionFields />
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>PIN</span>
            <select name="pinId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              {data.stock.map((row: any) => (
                <option key={row.pin_id} value={row.pin_id}>{row.pin_number} · {row.description} · {row.quantity_available ?? row.current_stock} {row.unit}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Shipbuilder operator</span>
            <select name="issuedTo" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              {data.profiles.map((profile: any) => (
                <option key={profile.id} value={profile.id}>{profile.full_name ?? profile.email} · {profile.role}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Vessel / project</span>
            <select name="vesselId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">No vessel link</option>
              {data.vessels.map((vessel: any) => (
                <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Quantity</span>
            <input name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Unit</span>
            <input name="unit" defaultValue="EA" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Work order</span>
            <input name="workOrder" placeholder="WO-2026-0142" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 lg:col-span-2">
            <span>Purpose</span>
            <input name="purpose" placeholder="Shipbuilder distribution note" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Expected return</span>
            <input name="expectedReturnDate" type="date" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="lg:col-span-4 flex justify-end">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Dispatch to operations</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Issued materials and usage outcomes</h2>
          <p className="mt-1 text-sm text-slate-600">Capture not used, leftover, and scrap quantities to feed the recovery assessment queue.</p>
        </div>
        <div className="space-y-4 p-6">
          {data.issues.map((issue: any) => {
            const outstanding = Number(issue.quantity ?? 0) - Number(issue.quantity_returned ?? 0)
            return (
              <div key={issue.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{issue.issue_number}</h3>
                      <StatusBadge status={issue.status} />
                    </div>
                    <p className="text-sm text-slate-600">{issue.pin?.pin_number} · {issue.pin?.description} · Vessel {issue.vessel?.name ?? '—'} · Outstanding {outstanding} {issue.unit}</p>
                  </div>
                </div>
                <form action={captureUsageOutcome} className="mt-4 grid gap-3 lg:grid-cols-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <OperatorAttributionFields />
                  <input type="hidden" name="issueId" value={issue.id} />
                  <input type="hidden" name="pinId" value={issue.pin_id ?? ''} />
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    <span>Not used</span>
                    <input name="notUsedQty" type="number" min="0" step="0.001" defaultValue="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    <span>Leftover</span>
                    <input name="leftoverQty" type="number" min="0" step="0.001" defaultValue="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    <span>Scrap</span>
                    <input name="scrapQty" type="number" min="0" step="0.001" defaultValue="0" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    <span>Recovery location</span>
                    <select name="recoveryLocationId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                      <option value="">No location</option>
                      {data.locations.map((location: any) => (
                        <option key={location.id} value={location.id}>[{location.code}] {location.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium text-slate-600">
                    <span>Notes</span>
                    <input name="notes" placeholder="Usage outcome notes" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <div className="lg:col-span-5 flex justify-end">
                    <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Capture usage outcomes</button>
                  </div>
                </form>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
