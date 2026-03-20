import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { getVendorsForComparison } from '@/lib/db/queries/vendors'
import { scoreVendors } from '@/components/vendors/vendor-scoring'
import VendorComparison from '@/components/vendors/vendor-comparison'
import { GitCompare } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Compare Vendors | SMLS' }

export default async function VendorComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }> 
}) {
  const ids = (await searchParams).ids
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean) ?? []

  const vendors = ids.length >= 2 ? await getVendorsForComparison(ids) : []
  const scored = scoreVendors(vendors)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Comparison"
        description="Compare vendors by performance score to inform procurement decisions"
      >
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Back to Vendors
        </Link>
      </PageHeader>

      {ids.length < 2 ? (
        <EmptyState
          title="Select vendors to compare"
          description="Go to the Vendors list and select 2 to 4 vendors using the compare checkboxes, then return here."
          icon={<GitCompare className="h-7 w-7" />}
          action={
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Vendors List
            </Link>
          }
        />
      ) : (
        <VendorComparison vendors={scored} />
      )}
    </div>
  )
}
