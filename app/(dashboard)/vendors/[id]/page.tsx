import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVendorById } from '@/lib/db/queries/vendors'
import { getPurchaseOrders } from '@/lib/db/queries/purchase-orders'
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
  const { id } = await params

  // Guard against non-UUID values (e.g. /vendors/new hits this route before the /new page)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  const [{ data: profile }, purchaseOrders, { data: vendorItems }] = await Promise.all([
    sb.from('profiles').select('role').eq('id', user?.id ?? '').single(),
    getPurchaseOrders({ vendor_id: id }),
    (sb as any).from('vendor_items').select('*').eq('vendor_id', id).order('description'),
  ])

  let vendor
  try {
    vendor = await getVendorById(id)
  } catch {
    notFound()
  }

  return (
    <VendorDetail
      vendor={vendor}
      purchaseOrders={purchaseOrders}
      vendorItems={vendorItems ?? []}
      role={profile?.role ?? 'viewer'}
    />
  )
}
