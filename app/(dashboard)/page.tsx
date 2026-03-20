import Link from 'next/link'
import { ClipboardList, CheckSquare, ShoppingCart, Truck, Plus, Package, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { getDashboardMetrics } from '@/lib/db/queries/lifecycle'

export const metadata = { title: 'Dashboard | SMLS' }

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
    <Link href={href} className="group relative flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">View all →</p>
    </Link>
  )
}

const QUICK_ACTIONS = [
  { label: 'New Requirement', href: '/requirements/new', icon: Plus, description: 'Raise a material requirement request' },
  { label: 'QC Workbench', href: '/qc', icon: CheckSquare, description: 'Capture pass / partial pass / fail outcomes' },
  { label: 'Issue Materials', href: '/issues', icon: Package, description: 'Dispatch stock into shipbuilder operations' },
]

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  const stats: StatCardProps[] = [
    { label: 'Requirements', value: metrics.cards.requirements, icon: ClipboardList, href: '/requirements', color: 'text-blue-700', iconBg: 'bg-blue-50' },
    { label: 'Pending Approvals', value: metrics.cards.approvals, icon: CheckSquare, href: '/approvals', color: 'text-amber-600', iconBg: 'bg-amber-50' },
    { label: 'Open POs', value: metrics.cards.purchaseOrders, icon: ShoppingCart, href: '/procurement/purchase-orders', color: 'text-indigo-700', iconBg: 'bg-indigo-50' },
    { label: 'Active Deliveries', value: metrics.cards.deliveries, icon: Truck, href: '/receiving', color: 'text-teal-700', iconBg: 'bg-teal-50' },
    { label: 'Issued / Returning', value: metrics.cards.issues, icon: Package, href: '/issues', color: 'text-slate-700', iconBg: 'bg-slate-100' },
    { label: 'Recovery Queue', value: metrics.cards.recoveries, icon: RefreshCw, href: '/recovery', color: 'text-emerald-700', iconBg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Live operational overview of the Shipyard Material Lifecycle prototype." />

      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">QC attention queue</h2>
          <div className="mt-4 space-y-3">
            {metrics.qcQueue.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No deliveries are currently waiting for QC attention.</p>
            ) : (
              metrics.qcQueue.map((row: any) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{row.delivery_ref}</p>
                      <p className="text-sm text-slate-600">Current status: {row.status.replace(/_/g, ' ')}</p>
                    </div>
                    <Link href="/qc" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Open QC</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Low stock watchlist</h2>
          <div className="mt-4 space-y-3">
            {metrics.lowStock.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No low-stock items detected from the current ledger snapshot.</p>
            ) : (
              metrics.lowStock.map((row: any) => (
                <div key={row.pin_id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-mono text-sm font-semibold text-slate-900">{row.pin_number}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.description}</p>
                  <p className="mt-1 text-sm text-amber-700">{row.current_stock} on hand · min {row.min_stock_level}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{action.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
