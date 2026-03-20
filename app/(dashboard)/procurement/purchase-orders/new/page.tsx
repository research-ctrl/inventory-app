import { getServerSession } from '@/lib/auth/session'
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
  const { role } = await getServerSession()
  const canCreate = ALLOWED_ROLES.includes(role)

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
        description={canCreate
          ? 'Create a new purchase order for an approved vendor'
          : 'Prototype mode keeps this page visible without login. Actions still require backend seed data and the relevant tables.'}
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
