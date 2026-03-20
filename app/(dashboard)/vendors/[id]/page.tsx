import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVendorById } from '@/lib/db/queries/vendors'
import { getPurchaseOrders } from '@/lib/db/queries/purchase-orders'
import { PageHeader } from '@/components/shared/page-header'
import VendorDetail from '@/components/vendors/vendor-detail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const vendor = await getVendorById((await params).id)
    return { title: `${vendor.name} | Vendors | SMLS` }
  } catch {
    return { title: 'Vendor | SMLS' }
  }
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  let vendor
  try {
    vendor = await getVendorById((await params).id)
  } catch {
    notFound()
  }

  const purchaseOrders = await getPurchaseOrders({ vendor_id: (await params).id })

  return (
    <VendorDetail
      vendor={vendor}
      purchaseOrders={purchaseOrders}
      role={profile?.role ?? 'viewer'}
    />
  )
}
