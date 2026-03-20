import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { OperatorGate } from '@/components/shared/operator-gate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorGate>
      <div className="flex h-screen overflow-hidden">
        {/* Fixed-width sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </OperatorGate>
  )
}
