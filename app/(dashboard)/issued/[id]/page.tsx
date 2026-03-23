import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import IssueDetail from '@/components/issues/issue-detail'
import Link from 'next/link'

export const metadata = { title: 'Issued Material Detail | SMLS' }

export default async function IssuedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()
  const sb = await createClient()

  const { data: issue } = await sb
    .from('material_issues')
    .select(`
      *,
      pin:inventory_pins(pin_number, description, category, unit),
      issued_to_profile:profiles!material_issues_issued_to_fkey(full_name, role, email),
      issued_by_profile:profiles!material_issues_issued_by_fkey(full_name),
      approved_by_profile:profiles!material_issues_approved_by_fkey(full_name),
      vessel:vessels(name, imo_number),
      recoveries(id, recovery_ref, status, outcome, condition_grade, assessed_at)
    `)
    .eq('id', id)
    .single()

  if (!issue) notFound()

  const { data: history } = await sb
    .from('workflow_history')
    .select('*, actor:profiles(full_name)')
    .eq('entity_type', 'issue')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/issued" className="hover:text-gray-700">Issued Materials</Link>
        <span>/</span>
        <span className="font-mono text-gray-800">{issue.issue_number}</span>
      </div>

      <PageHeader
        title={issue.issue_number}
        description={issue.purpose ?? 'Material Issue'}
      />

      <IssueDetail issue={issue as any} workflowHistory={history ?? []} />
    </div>
  )
}
