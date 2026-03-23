import { Shell } from '@/components/layout/shell'
import { OperatorGate } from '@/components/shared/operator-gate'
import { FloatingChatbot } from '@/components/chatbot/floating-chatbot'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetch authenticated user + profile on the server
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  const { data: profile } = user
    ? await sb
        .from('profiles')
        .select('id, full_name, role, phone_number')
        .eq('id', user.id)
        .single()
    : { data: null }

  const displayName: string =
    (profile as any)?.full_name ?? user?.email ?? ''
  const role = (profile as any)?.role ?? 'viewer'

  return (
    <OperatorGate>
      <Shell
        role={role}
        userName={displayName}
        user={user}
        profile={profile as any}
        displayName={displayName}
      >
        {children}
      </Shell>

      {/* Floating AI chatbot — persists across all pages */}
      <FloatingChatbot userName={displayName} />
    </OperatorGate>
  )
}
