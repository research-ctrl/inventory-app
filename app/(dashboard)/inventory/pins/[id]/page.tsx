import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { getTraceabilityForPin } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'PIN Traceability | SMLS' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const trace = await getTraceabilityForPin((await params).id)
  if (!trace.pin) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={trace.pin.pin_number} description="Lifecycle traceability from stock creation through issue, recovery, and genealogy." />

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p><p className="mt-2 text-lg font-semibold text-slate-900">{trace.pin.description}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p><p className="mt-2 text-lg font-semibold text-slate-900">{trace.pin.category ?? '—'}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p><p className="mt-2 text-lg font-semibold text-slate-900">{trace.pin.location?.code ? `[${trace.pin.location.code}] ${trace.pin.location.name}` : '—'}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Origin</p><p className="mt-2 text-lg font-semibold text-slate-900">{trace.pin.origin_type ?? '—'} · {trace.pin.origin_reference ?? '—'}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upstream chain</p><p className="mt-2 text-sm font-semibold text-slate-900">{trace.upstream?.purchase_order?.requirement?.ref_number ?? '—'} → {trace.upstream?.purchase_order?.po_number ?? '—'} → {trace.upstream?.delivery_ref ?? trace.pin.origin_reference ?? '—'}</p></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ledger history</h2>
        <div className="mt-4 space-y-3">
          {trace.transactions.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{row.transaction_type} · {row.quantity}</p>
              <p className="mt-1 text-sm text-slate-600">{row.quantity_before} → {row.quantity_after} · {row.notes ?? 'No notes'} · {new Date(row.created_at).toLocaleString('en-GB')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Issue / recovery chain</h2>
          <div className="mt-4 space-y-3">
            {trace.issues.map((issue: any) => (
              <div key={issue.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{issue.issue_number} · {issue.status}</p>
                <p className="mt-1 text-sm text-slate-600">Qty {issue.quantity} · Returned {issue.quantity_returned} · Vessel {issue.vessel?.name ?? '—'}</p>
              </div>
            ))}
            {trace.recoveries.map((recovery: any) => (
              <div key={recovery.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{recovery.recovery_ref} · {recovery.status}</p>
                <p className="mt-1 text-sm text-slate-600">Outcome {recovery.outcome ?? 'pending'} · Qty {recovery.quantity_returned} · Derived PIN {recovery.derived_pin_id ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Genealogy & prototype audit</h2>
          <div className="mt-4 space-y-3">
            {trace.genealogy.map((row: any) => (
              <div key={`${row.pin_id}-${row.depth}`} className="rounded-xl border border-slate-200 p-4">
                <p className="font-mono text-sm font-semibold text-slate-900">{row.pin_number}</p>
                <p className="mt-1 text-sm text-slate-600">Depth {row.depth} · Parent {row.parent_pin_number ?? 'root'} · {row.lineage}</p>
              </div>
            ))}
            {trace.audit.map((row: any) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{row.action}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(row.created_at).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
