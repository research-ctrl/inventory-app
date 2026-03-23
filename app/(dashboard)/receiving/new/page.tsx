import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import DeliveryForm from '@/components/procurement/delivery-form'

export const metadata = { title: 'Record Delivery | SMLS' }

interface PageProps {
  searchParams: Promise<{ po_id?: string }>
}

export default async function NewDeliveryPage({ searchParams }: PageProps) {
  const { po_id } = await searchParams
  const sb = await createClient()

  let po: any = null
  let poItems: any[] = []

  if (po_id) {
    const { data: poData } = await sb
      .from('purchase_orders')
      .select(`
        id, po_number, currency, expected_delivery, delivery_address,
        vendor:vendors(id, name),
        po_items(id, line_number, description, part_number, quantity, unit)
      `)
      .eq('id', po_id)
      .in('status', ['ordered', 'partially_delivered'])
      .single()

    if (!poData) {
      return (
        <div className="max-w-2xl space-y-4">
          <PageHeader title="Record Delivery" description="Log incoming goods" />
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            The specified PO was not found or is not in an ordered state.{' '}
            <Link href="/receiving" className="underline hover:text-amber-900">
              Back to Receiving
            </Link>
          </div>
        </div>
      )
    }

    po = poData
    poItems = (poData.po_items ?? []).sort((a: any, b: any) => a.line_number - b.line_number)
  }

  // Get all active POs in ordered state (if no po_id provided)
  let activePOs: any[] = []
  if (!po_id) {
    const { data: orderedPOs } = await sb
      .from('purchase_orders')
      .select('id, po_number, vendor:vendors(name)')
      .in('status', ['ordered', 'partially_delivered'])
      .order('created_at', { ascending: false })
    activePOs = orderedPOs ?? []
  }

  // Get store locations
  const { data: locations } = await sb
    .from('store_locations')
    .select('id, code, name')
    .eq('is_active', true)
    .order('code')

  if (!po_id && activePOs.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader title="Record Delivery" description="Log incoming goods" />
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
          No purchase orders are currently in "Ordered" status.
          <br />
          <Link href="/procurement/purchase-orders" className="mt-2 inline-block text-blue-600 hover:underline">
            View Purchase Orders →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Record Delivery"
        description={po ? `Delivery for ${po.po_number} — ${(po.vendor as any)?.name ?? ''}` : 'Log incoming goods from a purchase order'}
      >
        <Link
          href={po ? `/procurement/purchase-orders/${po_id}` : '/receiving'}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </Link>
      </PageHeader>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {!po_id && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3 font-medium">Select the Purchase Order this delivery is for:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activePOs.map((p) => (
                <Link
                  key={p.id}
                  href={`/receiving/new?po_id=${p.id}`}
                  className="rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-mono text-sm font-medium text-gray-900">{p.po_number}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{(p.vendor as any)?.name ?? '—'}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {po && (
          <DeliveryForm
            poId={po.id}
            poNumber={po.po_number}
            vendorName={(po.vendor as any)?.name}
            poItems={poItems}
            storeLocations={locations ?? []}
          />
        )}
      </div>
    </div>
  )
}
