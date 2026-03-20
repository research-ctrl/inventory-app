import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { requireSession } from '@/lib/auth/session'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession().catch(() => null)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed-width sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar role={session?.role} />
      </div>

      {/* Main content column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav user={session?.user} role={session?.role} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
