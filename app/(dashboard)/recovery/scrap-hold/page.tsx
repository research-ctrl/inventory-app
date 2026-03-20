import { PageHeader } from '@/components/shared/page-header'
import { getRecoveryOperationsData } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'Scrap & Hold | SMLS' }

export default async function Page() {
  const data = await getRecoveryOperationsData()
  const rows = data.recoveries.filter((row: any) => ['scrapped', 'on_hold'].includes(row.status))

  return (
    <div className="space-y-6">
      <PageHeader title="Scrap / hold queue" description="Non-reusable materials remain auditable after assessment, with status-specific routing for hold or scrap." />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row: any) => (
          <div key={row.recovery_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.status}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{row.recovery_ref}</h2>
            <p className="mt-2 text-sm text-slate-600">{row.pin_number} · {row.pin_description}</p>
            <p className="mt-1 text-sm text-slate-700">Qty {row.quantity_returned} · Grade {row.condition_grade ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
