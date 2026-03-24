import { createClient } from '@/lib/supabase/server'
import RecoveryList from '@/components/recovery/recovery-list'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: "Recovery | SMLS" };

export default async function RecoveryPage() {
  const sb = await createClient()

  const { data: recoveries } = await sb
    .from('recoveries')
    .select(`
      *,
      issue:material_issues (
        issue_number,
        purpose,
        vessel:vessels ( name ),
        issued_to_profile:profiles!material_issues_issued_to_fkey ( full_name )
      ),
      pin:inventory_pins (
        pin_number,
        description,
        unit
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Material Recovery & Returns" 
        description="Assess the condition of returned materials and decide their final disposition."
      />

      <RecoveryList recoveries={(recoveries ?? []) as any} />
    </div>
  );
}
