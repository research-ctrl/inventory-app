import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
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
      <div className="flex h-screen overflow-hidden">
        {/* Fixed-width sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar role={role} userName={displayName} />
        </div>

        {/* Main content column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNav user={user} profile={profile as any} displayName={displayName} role={role} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Floating AI chatbot — persists across all pages */}
      <FloatingChatbot userName={displayName} />
    </OperatorGate>
  )
}
