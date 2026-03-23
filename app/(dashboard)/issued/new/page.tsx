import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import IssueForm from '@/components/issues/issue-form'
import Link from 'next/link'

export const metadata = { title: 'New Issue | SMLS' }

export default async function NewIssuedPage() {
  const sb = await createClient()

  // Get available stock (approved PINs with stock > 0)
  const { data: stock } = await sb
    .from('v_stock_balance')
    .select('pin_id, pin_number, description, current_stock, unit, location_code')
    .gt('current_stock', 0)
    .eq('status', 'approved')
    .order('pin_number')

  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name')

  const { data: vessels } = await sb
    .from('vessels')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/issued" className="hover:text-gray-700">Issued Materials</Link>
        <span>/</span>
        <span className="text-gray-800">New Issue</span>
      </div>

      <PageHeader
        title="New Material Issue"
        description="Issue material to a shipbuilder or work order"
      />

      {(stock ?? []).length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-sm text-amber-800 font-medium">No available stock</p>
          <p className="text-xs text-amber-600 mt-1">
            There are no approved PINs with available stock. Intake a delivery first.
          </p>
          <Link
            href="/inventory"
            className="mt-3 inline-block text-sm text-amber-700 underline hover:text-amber-900"
          >
            Go to Inventory →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <IssueForm
            pins={(stock ?? []) as any}
            profiles={(profiles ?? []) as any}
            vessels={(vessels ?? []) as any}
          />
        </div>
      )}
    </div>
  )
}
