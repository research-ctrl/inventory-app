import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVendors } from '@/lib/db/queries/vendors'
import { getRequirements } from '@/lib/db/queries/requirements'
import { PageHeader } from '@/components/shared/page-header'
import PoForm from '@/components/procurement/po-form'

export const metadata = { title: 'New Purchase Order | SMLS' }

const ALLOWED_ROLES = ['admin', 'super_admin', 'procurement_manager', 'procurement_officer']

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ requirement_id?: string }> 
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single() as { data: { role: string } | null; error: any }

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect('/procurement/purchase-orders')
  }

  const [vendorList, reqList] = await Promise.all([
    getVendors({ is_approved: true }),
    getRequirements({ status: 'approved' }),
  ])

  // If a requirement_id was passed in URL, find it
  let initialRequirement = null
  if (sp.requirement_id) {
    const req = reqList.find((r: any) => r.id === sp.requirement_id)
    if (req) {
      initialRequirement = {
        id: req.id,
        ref_number: req.ref_number ?? '',
        title: req.title ?? '',
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order for an approved vendor"
      />
      <PoForm
        vendors={vendorList as any}
        requirements={reqList.map((r: any) => ({
          id: r.id,
          ref_number: r.ref_number,
          title: r.title,
        }))}
        initialRequirement={initialRequirement}
      />
    </div>
  )
}
