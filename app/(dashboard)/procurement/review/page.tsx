import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ProcurementReviewClient from '@/components/procurement/procurement-review-client'

export const metadata = { title: 'Procurement Review' }

const ITEM_SELECT = `
  id,
  line_number,
  description,
  part_number,
  quantity,
  unit,
  estimated_unit_price,
  currency,
  notes,
  inventory_pin_id,
  item_request_type,
  inventory_pin:inventory_pins!requirement_items_inventory_pin_id_fkey (
    id,
    pin_number,
    description,
    part_number,
    unit,
    location:store_locations ( id, code, name, warehouse )
  )
`

export default async function ProcurementReviewPage() {
  const { profile, role } = await getServerSession()

  if (!['procurement_manager', 'procurement_officer', 'admin', 'super_admin', 'approver'].includes(role)) {
    redirect('/dashboard')
  }

  const sb = await createClient()

  // Fetch submitted requirements (PM needs to decide)
  const { data: submittedReqs } = await sb
    .from('requirements')
    .select(`
      id, ref_number, title, description, status, urgency,
      required_date, created_at, request_type,
      requested_on_behalf_of, preferred_vendor_free_text,
      requested_by_profile:profiles!requirements_requested_by_fkey ( id, full_name, email ),
      vessel:vessels ( id, name ),
      preferred_vendor:vendors!requirements_preferred_vendor_id_fkey ( id, name ),
      requirement_items ( ${ITEM_SELECT} )
    `)
    .eq('status', 'submitted')
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })

  // Fetch pending_approval requirements assigned to current user (for approvers)
  // PM/admin see all pending_approval; approver only sees theirs
  const pendingQuery = sb
    .from('requirements')
    .select(`
      id, ref_number, title, description, status, urgency,
      required_date, created_at, request_type,
      requested_on_behalf_of, preferred_vendor_free_text,
      assigned_approver_id,
      requested_by_profile:profiles!requirements_requested_by_fkey ( id, full_name, email ),
      assigned_approver:profiles!requirements_assigned_approver_id_fkey ( id, full_name, email ),
      vessel:vessels ( id, name ),
      preferred_vendor:vendors!requirements_preferred_vendor_id_fkey ( id, name ),
      requirement_items ( ${ITEM_SELECT} )
    `)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true })

  // Approvers only see requirements assigned to them
  const isApproverOnly = role === 'approver'
  if (isApproverOnly) {
    pendingQuery.eq('assigned_approver_id', profile.id)
  }

  const { data: pendingReqs } = await pendingQuery

  // Load approvers list (for "Send for Approval" selector)
  const { data: approvers } = await sb
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['approver', 'admin', 'super_admin', 'procurement_manager'])
    .neq('id', profile.id)
    .order('full_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Review</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review submitted requirements — release from stock, raise a PO, or decline.
        </p>
      </div>

      <ProcurementReviewClient
        submittedRequirements={(submittedReqs ?? []) as any}
        pendingApprovalRequirements={(pendingReqs ?? []) as any}
        approvers={(approvers ?? []) as any}
        userRole={role}
        currentUserId={profile.id}
      />
    </div>
  )
}
