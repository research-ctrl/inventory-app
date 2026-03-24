import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPurchaseOrderById } from '@/lib/db/queries/purchase-orders'
import { getAvailableTransitions } from '@/lib/workflow/transitions'
import PoDetail from '@/components/procurement/po-detail'
import type { UserRole } from '@/types/domain'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const po = await getPurchaseOrderById((await params).id)
    return { title: `${po.po_number} | Purchase Orders | SMLS` }
  } catch {
    return { title: 'Purchase Order | SMLS' }
  }
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const role = profile?.role ?? 'viewer'
  const currentUserId = user?.id ?? ''

  let po
  try {
    po = await getPurchaseOrderById(id)
  } catch {
    notFound()
  }

  // Fetch workflow history separately
  const { data: workflowHistory } = await supabase
    .from('workflow_history')
    .select(`
      id, event, from_status, to_status, comment, created_at,
      actor:profiles!workflow_history_actor_id_fkey(full_name)
    `)
    .eq('entity_type', 'purchase_order')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })

  const availableTransitions = getAvailableTransitions('purchase_order', po.status, role as UserRole)

  return (
    <PoDetail
      po={{
        ...po,
        vendors: po.vendor as any,
        requirements: po.requirement as any,
        workflow_history: (workflowHistory ?? []) as any,
      }}
      availableTransitions={availableTransitions as any}
      currentRole={role}
      currentUserId={currentUserId}
    />
  )
}
