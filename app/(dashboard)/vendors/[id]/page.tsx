import { notFound } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
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
  const { role } = await getServerSession()

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
      role={role}
    />
  )
}
