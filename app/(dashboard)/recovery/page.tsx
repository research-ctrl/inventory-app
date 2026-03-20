import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { OperatorAttributionFields } from '@/components/layout/operator-identity'
import { assessRecoveryFlow } from '@/actions/lifecycle'
import { getRecoveryOperationsData } from '@/lib/db/queries/lifecycle'
import { StatusBadge } from '@/components/shared/status-badge'

export const metadata = { title: 'Recovery | SMLS' }

export default async function Page() {
  const data = await getRecoveryOperationsData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recovery Assessment"
        description="Assess returned materials, decide reusable vs not reusable, derive new PINs where required, and route non-reusable stock to hold or scrap."
      >
        <div className="flex gap-2">
          <Link href="/recovery/derived-pins" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Derived PINs</Link>
          <Link href="/recovery/scrap-hold" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Scrap / hold</Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recovery queue</p><p className="mt-2 text-3xl font-bold text-blue-900">{data.recoveries.length}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Reusable path</p><p className="mt-2 text-3xl font-bold text-emerald-900">{data.recoveries.filter((row: any) => ['reuse', 'repair'].includes(row.outcome)).length}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Derived genealogy nodes</p><p className="mt-2 text-3xl font-bold text-amber-900">{data.genealogy.filter((row: any) => row.depth > 0).length}</p></div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Scrap / hold items</p><p className="mt-2 text-3xl font-bold text-rose-900">{data.recoveries.filter((row: any) => ['scrapped', 'on_hold'].includes(row.status)).length}</p></div>
      </div>

      <div className="space-y-4">
        {data.recoveries.map((recovery: any) => (
          <section key={recovery.recovery_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{recovery.recovery_ref}</h2>
                  <StatusBadge status={recovery.status} />
                </div>
                <p className="text-sm text-slate-600">Issue {recovery.issue_number ?? '—'} · Source {recovery.pin_number} · Returned {recovery.quantity_returned} · Current outcome {recovery.outcome ?? 'pending'}</p>
              </div>
            </div>

            <form action={assessRecoveryFlow} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
              <OperatorAttributionFields />
              <input type="hidden" name="recoveryId" value={recovery.recovery_id} />
              <input type="hidden" name="unit" value="EA" />
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Decision path</span>
                <select name="decision" defaultValue="reuse_existing" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="reuse_existing">Reusable → return to existing PIN</option>
                  <option value="derive_new">Reusable → derive new PIN</option>
                  <option value="repair_derive">Repairable → derive repaired PIN</option>
                  <option value="hold">Not reusable → hold</option>
                  <option value="scrap">Not reusable → scrap</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Condition grade</span>
                <select name="conditionGrade" defaultValue={recovery.condition_grade ?? 'B'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="scrap">Scrap</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Location</span>
                <select name="locationId" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="">No location</option>
                  {data.locations.map((location: any) => (
                    <option key={location.id} value={location.id}>[{location.code}] {location.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>Derived category</span>
                <input name="derivedCategory" defaultValue="Recovered" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600 lg:col-span-2">
                <span>Condition notes</span>
                <input name="conditionNotes" defaultValue={recovery.condition_notes ?? ''} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600 lg:col-span-2">
                <span>Disposition notes</span>
                <input name="dispositionNotes" defaultValue={recovery.outcome ? `${recovery.outcome} disposition` : ''} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600 lg:col-span-2">
                <span>Derived PIN description</span>
                <input name="derivedDescription" defaultValue={recovery.pin_description ? `${recovery.pin_description} (Recovered)` : ''} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <div className="lg:col-span-4 flex justify-end">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Apply recovery decision</button>
              </div>
            </form>
          </section>
        ))}
      </div>
    </div>
  )
}
