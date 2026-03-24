import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import AddStockClient from './add-stock-client'

export const metadata = { title: 'Add Stock | Inventory | SMLS' }

const ALLOWED_ROLES = ['super_admin', 'admin', 'procurement_manager', 'procurement_officer', 'store_manager', 'store_keeper']

export default async function AddStockPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; vendor_id?: string; vendor_name?: string }>
}) {
  const { role } = await getServerSession()
  if (!ALLOWED_ROLES.includes(role)) redirect('/inventory')

  const { ref, vendor_id, vendor_name } = await searchParams
  const sb = await createClient()

  const [{ data: locations }, { data: vendors }, { data: categories }] = await Promise.all([
    sb.from('store_locations').select('id, code, name, warehouse').eq('is_active', true).order('code'),
    sb.from('vendors').select('id, name').eq('is_active', true).order('name'),
    // Get distinct categories from existing PINs
    sb.from('inventory_pins').select('category').not('category', 'is', null).order('category'),
  ])

  const distinctCategories = [...new Set((categories ?? []).map((r: any) => r.category).filter(Boolean))] as string[]

  return (
    <AddStockClient
      locations={locations ?? []}
      vendors={vendors ?? []}
      categories={distinctCategories}
      prefillVendorId={vendor_id}
      prefillVendorName={vendor_name}
      prefillReference={ref}
    />
  )
}
