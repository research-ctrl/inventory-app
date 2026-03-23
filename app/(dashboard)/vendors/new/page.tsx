import Link from 'next/link'
import VendorForm from '@/components/vendors/vendor-form'
import { PageHeader } from '@/components/shared/page-header'

export const metadata = { title: 'New Vendor | SMLS' }

export default function NewVendorPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="New Vendor" description="Register a new vendor in the system">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to Vendors
        </Link>
      </PageHeader>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <VendorForm mode="create" />
      </div>
    </div>
  )
}
