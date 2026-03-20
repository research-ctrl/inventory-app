import Link from 'next/link'
import { ClipboardList, CheckSquare, ShoppingCart, Truck, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: 'Dashboard | SMLS' }

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  iconBg: string
}

function StatCard({ label, value, icon: Icon, href, color, iconBg }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
        View all →
      </p>
    </Link>
  )
}

// ─── Quick action button ──────────────────────────────────────────────────────

interface QuickActionProps {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

function QuickAction({ label, href, icon: Icon, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickActionProps[] = [
  {
    label: 'New Requirement',
    href: '/requirements/new',
    icon: Plus,
    description: 'Raise a material requirement request',
  },
  {
    label: 'New Purchase Order',
    href: '/procurement/purchase-orders/new',
    icon: ShoppingCart,
    description: 'Create a purchase order for approved items',
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: totalReqs } = await supabase
    .from('requirements')
    .select('*', { count: 'exact', head: true })

  const { count: pendingApprovals } = await supabase
    .from('requirements')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval')
    
  const { count: openPOs } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("closed","cancelled")')
    
  const { count: activeDeliveries } = await supabase
    .from('deliveries')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("received","qc_passed","completed")')

  const STATS: StatCardProps[] = [
    {
      label: 'Total Requirements',
      value: totalReqs || 0,
      icon: ClipboardList,
      href: '/requirements',
      color: 'text-blue-700',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals || 0,
      icon: CheckSquare,
      href: '/approvals',
      color: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Open POs',
      value: openPOs || 0,
      icon: ShoppingCart,
      href: '/procurement/purchase-orders',
      color: 'text-indigo-700',
      iconBg: 'bg-indigo-50',
    },
    {
      label: 'Active Deliveries',
      value: activeDeliveries || 0,
      icon: Truck,
      href: '/procurement/deliveries',
      color: 'text-teal-700',
      iconBg: 'bg-teal-50',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of the Shipyard Material Lifecycle System"
      />

      {/* Stat cards */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </div>
      </section>
    </div>
  )
}
