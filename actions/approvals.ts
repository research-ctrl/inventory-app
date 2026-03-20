'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'
import { can } from '@/lib/permissions/checks'
import { dbDecideApproval } from '@/lib/db/mutations/approvals'
import { dbTransitionRequirement } from '@/lib/db/mutations/requirements'
import { dbTransitionPurchaseOrder } from '@/lib/db/mutations/purchase-orders'

export async function decideApproval(approvalId: string, decision: 'approve' | 'reject', comment?: string) {
  try {
    const { profile, role } = await getServerSession()
    if (!can(role, 'approval', 'approve')) return { success: false, error: 'Insufficient permissions' }

    const sb = await createClient()
    const { data: approval } = await sb.from('approvals').select('*').eq('id', approvalId).single()
    if (!approval) return { success: false, error: 'Approval not found' }

    await dbDecideApproval(approvalId, decision, comment)

    const toStatus = decision === 'approve' ? 'approved' : 'rejected'
    if (approval.entity_type === 'requirement') {
      await dbTransitionRequirement(approval.entity_id, toStatus, profile.id, comment)
    } else if (approval.entity_type === 'purchase_order') {
      await dbTransitionPurchaseOrder(approval.entity_id, toStatus, profile.id, comment)
    }

    revalidatePath('/approvals')
    revalidatePath(`/approvals/${approvalId}`)
    revalidatePath(`/${approval.entity_type}s`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
