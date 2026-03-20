import Link from 'next/link'
import { Plus, GitCompare, AlertCircle } from 'lucide-react'
import { getVendors } from '@/lib/db/queries/vendors'
import { getServerSession } from '@/lib/auth/session'
import { DataTable } from '@/components/shared/data-table'
import { PageHeader } from '@/components/shared/page-header'
import { vendorColumns } from '@/components/vendors/vendors-columns'

export const metadata = { title: 'Vendors | SMLS' }

const MANAGER_ROLES = ['admin', 'super_admin', 'procurement_manager']

export default async function VendorsPage() {
  const { role } = await getServerSession()
  const isManager = MANAGER_ROLES.includes(role)

  const vendors = await getVendors()

  const pendingCount = vendors.filter((v) => !v.is_approved && !v.blacklisted).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description={`${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} registered`}
      >
        <Link
          href="/vendors/compare"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <GitCompare className="h-4 w-4" />
          Compare Vendors
        </Link>
        {isManager && (
          <Link
            href="/vendors/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vendor
          </Link>
        )}
      </PageHeader>

      {/* Pending approval banner — only shown to managers */}
      {isManager && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{pendingCount}</span> vendor
            {pendingCount !== 1 ? 's' : ''} pending approval.
          </p>
        </div>
      )}

      <DataTable
        data={vendors}
        columns={vendorColumns as any}
        searchPlaceholder="Search vendors by name or code…"
        searchColumn="name"
      />
    </div>
  )
}
