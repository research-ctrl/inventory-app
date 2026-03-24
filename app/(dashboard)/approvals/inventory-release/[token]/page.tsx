// Email-token approvals are no longer used.
// Approvals are handled in-app on the Procurement Review page.
import { redirect } from 'next/navigation'

export default async function InventoryReleaseApprovalPage() {
  redirect('/procurement/review')
}
