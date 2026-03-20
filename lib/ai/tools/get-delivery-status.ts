import { createClient } from '@/lib/supabase/server'

export const getDeliveryStatusTool = {
  name: 'get_delivery_status',
  description: 'Get delivery tracking, receiving, and replacement-loop status.',
  parameters: {
    type: 'object',
    properties: {
      delivery_ref: { type: 'string', description: 'Delivery reference such as DLV-0001.' },
      po_number: { type: 'string', description: 'Optional purchase order number.' },
    },
  },
  async execute(args: { delivery_ref?: string; po_number?: string }) {
    const supabase = await createClient()
    let query = supabase
      .from('deliveries')
      .select(`
        id, delivery_ref, status, expected_date, actual_received_date, tracking_number, carrier,
        purchase_order:purchase_orders(po_number, vendor:vendors(name))
      `)
      .order('created_at', { ascending: false })
      .limit(12)

    if (args.delivery_ref?.trim()) query = query.eq('delivery_ref', args.delivery_ref.trim())

    const [{ data, error }, { data: auditLogs }] = await Promise.all([
      query,
      supabase
        .from('audit_log')
        .select('entity_id, action, new_data, created_at')
        .in('action', ['prototype_vendor_return', 'prototype_inventory_intake'])
        .order('created_at', { ascending: false }),
    ])

    if (error) throw new Error(error.message)

    return {
      delivery_ref: args.delivery_ref ?? null,
      deliveries: (data ?? [])
        .filter((delivery: any) => !args.po_number?.trim() || delivery.purchase_order?.po_number === args.po_number?.trim())
        .map((delivery: any) => ({
        ...delivery,
        replacement: (auditLogs ?? []).find((log: any) => log.entity_id === delivery.id && log.action === 'prototype_vendor_return')?.new_data ?? null,
      })),
    }
  },
}
