import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPurchaseOrderById } from '@/lib/db/queries/purchase-orders'
import PoEditForm from '@/components/procurement/po-edit-form'
import { PageHeader } from '@/components/shared/page-header'
import Link from 'next/link'
import type { CreatePurchaseOrderInput } from '@/lib/validations/po'

export default async function PurchaseOrderEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) notFound()

  let po: Awaited<ReturnType<typeof getPurchaseOrderById>>
  try {
    po = await getPurchaseOrderById(id)
  } catch {
    notFound()
  }

  // Only draft or rejected POs can be edited
  if (!['draft', 'rejected'].includes(po.status)) {
    notFound()
  }

  // Fetch vendors list
  const sb = await createClient()
  const { data: vendors } = await sb
    .from('vendors')
    .select('id, code, name, category, currency, payment_terms_days')
    .eq('is_active', true)
    .order('name')

  // Map current PO data to form initial values
  const initialData: CreatePurchaseOrderInput = {
    requirement_id: (po as any).requirement_id ?? null,
    vendor_id: (po as any).vendor_id ?? '',
    payment_terms: po.payment_terms ?? '',
    delivery_address: po.delivery_address ?? '',
    incoterms: po.incoterms ?? 'FOB',
    currency: po.currency ?? 'USD',
    expected_delivery: po.expected_delivery ?? null,
    notes: po.notes ?? '',
    items: ((po as any).po_items ?? []).map((item: any) => ({
      id: item.id,
      requirement_item_id: item.requirement_item_id ?? null,
      line_number: item.line_number,
      description: item.description,
      part_number: item.part_number ?? '',
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      currency: item.currency ?? po.currency ?? 'USD',
      tax_rate: item.tax_rate ?? 0,
      discount_rate: item.discount_rate ?? 0,
      notes: item.notes ?? '',
    })),
  }

  // Ensure at least one item row
  if (initialData.items.length === 0) {
    initialData.items = [{
      line_number: 1,
      description: '',
      part_number: '',
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      currency: po.currency ?? 'USD',
      tax_rate: 0,
      discount_rate: 0,
    }]
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${po.po_number}`}
        description={`Status: ${po.status} — make changes then submit for approval`}
      >
        <Link
          href={`/procurement/purchase-orders/${id}`}
          className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Back to PO
        </Link>
      </PageHeader>

      {po.status === 'rejected' && (po as any).rejection_reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-semibold">Rejection reason:</span> {(po as any).rejection_reason}
          <p className="text-xs text-red-600 mt-1">Please address the reason above, update the PO, then re-submit for approval.</p>
        </div>
      )}

      <PoEditForm
        poId={id}
        vendors={(vendors ?? []) as any}
        initialData={initialData}
      />
    </div>
  )
}
