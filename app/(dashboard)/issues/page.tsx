import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import Link from 'next/link'

export const metadata = { title: 'Material Issues | SMLS' }

export default async function IssuesPage() {
  const sb = await createClient()

  const { data: issues } = await sb
    .from('material_issues')
    .select(`
      id, issue_number, status, quantity, quantity_returned, unit, purpose, work_order,
      issued_at, created_at, usage_outcome,
      pin:inventory_pins(pin_number, description),
      issued_to_profile:profiles!material_issues_issued_to_fkey(full_name, role),
      vessel:vessels(name)
    `)
    .order('created_at', { ascending: false })

  const allIssues = issues ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Issues"
        description="Issue and track materials distributed to shipbuilding operations"
      >
        <Link
          href="/issues/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Issue
        </Link>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(['draft', 'pending_approval', 'approved', 'issued'] as const).map((s) => {
          const count = allIssues.filter((i: any) => i.status === s).length
          return (
            <div key={s} className="bg-white rounded-xl border border-gray-200 p-4">
              <StatusBadge status={s} />
              <p className="text-2xl font-bold mt-2 text-gray-900">{count}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Issue #', 'PIN', 'Issued To', 'Vessel', 'Qty', 'Status', 'Outcome'].map((h) => (
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
              {allIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No material issues found.{' '}
                    <Link href="/issues/new" className="text-blue-600 hover:underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                allIssues.map((issue: any) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/issues/${issue.id}`}
                        className="font-mono text-xs text-blue-600 hover:underline"
                      >
                        {issue.issue_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700">{issue.pin?.pin_number}</p>
                      <p className="text-xs text-gray-500 truncate max-w-32">
                        {issue.pin?.description}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {issue.issued_to_profile?.full_name ?? '—'}
                      {issue.issued_to_profile?.role && (
                        <span className="block text-xs text-gray-400">
                          {issue.issued_to_profile.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {issue.vessel?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {issue.quantity}{' '}
                      <span className="text-gray-400 text-xs">{issue.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-4 py-3">
                      {issue.usage_outcome ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            issue.usage_outcome === 'scrap'
                              ? 'bg-red-100 text-red-700'
                              : issue.usage_outcome === 'leftover'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {issue.usage_outcome.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
