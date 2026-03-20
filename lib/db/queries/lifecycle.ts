'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPrototypeReferenceData() {
  const supabase = await createClient()
  const [profiles, vessels, locations] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role').eq('is_active', true).order('full_name'),
    supabase.from('vessels').select('id, name').eq('is_active', true).order('name'),
    supabase.from('store_locations').select('id, code, name, warehouse, zone').eq('is_active', true).order('code'),
  ])

  return {
    profiles: profiles.data ?? [],
    vessels: vessels.data ?? [],
    locations: locations.data ?? [],
  }
}


export async function getDashboardMetrics() {
  const supabase = await createClient()
  const [requirements, approvals, purchaseOrders, deliveries, qcQueue, stock, issues, recoveries] = await Promise.all([
    supabase.from('requirements').select('id', { count: 'exact', head: true }),
    supabase.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).in('status', ['approved', 'ordered', 'partially_delivered']),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).in('status', ['pending_approval', 'received', 'qc_pending', 'qc_conditional', 'partially_delivered']),
    supabase.from('deliveries').select('id, delivery_ref, status').in('status', ['qc_pending', 'qc_conditional', 'qc_failed']).limit(5).order('created_at', { ascending: false }),
    supabase.from('v_stock_balance').select('pin_id, pin_number, description, current_stock, min_stock_level', { count: 'exact' }).limit(5).order('current_stock', { ascending: true }),
    supabase.from('material_issues').select('id', { count: 'exact', head: true }).in('status', ['approved', 'issued', 'partially_returned']),
    supabase.from('recoveries').select('id', { count: 'exact', head: true }).in('status', ['pending_assessment', 'assessed', 'on_hold']),
  ])

  return {
    cards: {
      requirements: requirements.count ?? 0,
      approvals: approvals.count ?? 0,
      purchaseOrders: purchaseOrders.count ?? 0,
      deliveries: deliveries.count ?? 0,
      issues: issues.count ?? 0,
      recoveries: recoveries.count ?? 0,
    },
    qcQueue: qcQueue.data ?? [],
    lowStock: stock.data ?? [],
  }
}

export async function getQcLifecycleQueue() {
  const supabase = await createClient()
  const [{ data: deliveries }, { data: inspections }, { data: auditLogs }] = await Promise.all([
    supabase
      .from('deliveries')
      .select(`
        id, delivery_ref, status, actual_received_date, expected_date, notes,
        purchase_order:purchase_orders(po_number, vendor:vendors(name)),
        delivery_items(id, line_number, description, part_number, quantity_expected, quantity_received, unit)
      `)
      .in('status', ['received', 'qc_pending', 'qc_passed', 'qc_conditional', 'qc_failed'])
      .order('created_at', { ascending: false }),
    supabase
      .from('v_qc_summary')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('audit_log')
      .select('id, entity_id, action, new_data, created_at')
      .in('action', ['prototype_qc_disposition', 'prototype_vendor_return', 'prototype_inventory_intake'])
      .order('created_at', { ascending: false }),
  ])

  const groupedLogs = new Map<string, any[]>()
  for (const log of auditLogs ?? []) {
    const current = groupedLogs.get(log.entity_id ?? '') ?? []
    current.push(log)
    groupedLogs.set(log.entity_id ?? '', current)
  }

  return (deliveries ?? []).map((delivery: any) => {
    const summary = (inspections ?? []).find((inspection: any) => inspection.delivery_ref === delivery.delivery_ref)
    const logs = groupedLogs.get(delivery.id) ?? []
    const disposition = logs.find((log) => log.action === 'prototype_qc_disposition')?.new_data ?? null
    const vendorReturn = logs.find((log) => log.action === 'prototype_vendor_return')?.new_data ?? null
    const intake = logs.find((log) => log.action === 'prototype_inventory_intake')?.new_data ?? null
    return {
      ...delivery,
      inspection: summary,
      disposition,
      vendorReturn,
      intake,
    }
  })
}

export async function getInventoryOverview() {
  const supabase = await createClient()
  const [{ data: stock }, { data: transactions }, { data: intakeLogs }] = await Promise.all([
    supabase.from('v_stock_balance').select('*').order('created_at', { ascending: false }),
    supabase
      .from('inventory_transactions')
      .select(`
        id, transaction_type, quantity, quantity_before, quantity_after, reference_type, reference_id, notes, created_at,
        pin:inventory_pins(pin_number, description),
        location:store_locations(code, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('audit_log')
      .select('id, entity_id, new_data, created_at')
      .eq('action', 'prototype_inventory_intake')
      .order('created_at', { ascending: false }),
  ])

  return {
    stock: stock ?? [],
    transactions: transactions ?? [],
    intakeLogs: intakeLogs ?? [],
  }
}

export async function getIssueOperationsData() {
  const supabase = await createClient()
  const [{ data: issues }, { data: stock }, referenceData, { data: usageLogs }] = await Promise.all([
    supabase
      .from('material_issues')
      .select(`
        id, issue_number, pin_id, quantity, quantity_returned, unit, status, purpose, created_at,
        pin:inventory_pins(pin_number, description),
        vessel:vessels(name),
        issued_to_profile:profiles!material_issues_issued_to_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('v_stock_balance').select('*').gt('quantity_available', 0).order('pin_number'),
    getPrototypeReferenceData(),
    supabase
      .from('audit_log')
      .select('id, entity_id, new_data, created_at')
      .eq('action', 'prototype_usage_outcome')
      .order('created_at', { ascending: false }),
  ])

  return {
    issues: issues ?? [],
    stock: stock ?? [],
    ...referenceData,
    usageLogs: usageLogs ?? [],
  }
}

export async function getRecoveryOperationsData() {
  const supabase = await createClient()
  const [{ data: recoveries }, { data: genealogy }, { data: assessments }, referenceData] = await Promise.all([
    supabase.from('v_recovery_summary').select('*').order('created_at', { ascending: false }),
    supabase.from('v_material_genealogy').select('*').order('lineage'),
    supabase
      .from('audit_log')
      .select('id, entity_id, action, new_data, created_at')
      .in('action', ['prototype_recovery_assessment', 'prototype_scrap_hold'])
      .order('created_at', { ascending: false }),
    getPrototypeReferenceData(),
  ])

  return {
    recoveries: recoveries ?? [],
    genealogy: genealogy ?? [],
    assessments: assessments ?? [],
    ...referenceData,
  }
}

export async function getTraceabilityForPin(pinId: string) {
  const supabase = await createClient()
  const [{ data: pin }, { data: transactions }, { data: issues }, { data: recoveries }, { data: genealogy }, { data: audit }, { data: history }] = await Promise.all([
    supabase
      .from('inventory_pins')
      .select(`
        *,
        location:store_locations(code, name)
      `)
      .eq('id', pinId)
      .single(),
    supabase
      .from('inventory_transactions')
      .select('id, transaction_type, quantity, quantity_before, quantity_after, reference_type, reference_id, notes, created_at, location:store_locations(code, name)')
      .eq('pin_id', pinId)
      .order('created_at'),
    supabase
      .from('material_issues')
      .select('id, issue_number, quantity, quantity_returned, unit, status, purpose, issued_at, expected_return_date, vessel:vessels(name)')
      .eq('pin_id', pinId)
      .order('created_at'),
    supabase
      .from('recoveries')
      .select('id, recovery_ref, quantity_returned, outcome, status, condition_grade, condition_notes, disposition_notes, derived_pin_id, recovered_at, issue:material_issues(issue_number)')
      .eq('pin_id', pinId)
      .order('created_at'),
    supabase.from('v_material_genealogy').select('*').or(`pin_id.eq.${pinId},parent_pin_id.eq.${pinId}`).order('depth'),
    supabase.from('audit_log').select('id, entity_id, action, new_data, created_at').order('created_at'),
    supabase.from('workflow_history').select('id, entity_type, entity_id, from_status, to_status, event, comment, metadata, created_at').order('created_at'),
  ])

  let upstream: any = null
  if (pin?.origin_reference) {
    const { data } = await supabase
      .from('deliveries')
      .select(`
        id, delivery_ref,
        purchase_order:purchase_orders(
          id, po_number,
          requirement:requirements(id, ref_number, title)
        )
      `)
      .eq('delivery_ref', pin.origin_reference)
      .maybeSingle()
    upstream = data
  }

  return {
    pin,
    upstream,
    transactions: transactions ?? [],
    issues: issues ?? [],
    recoveries: recoveries ?? [],
    genealogy: genealogy ?? [],
    audit: (audit ?? []).filter((row: any) => {
      const pinMatch = row.entity_id === pinId || row.new_data?.pin_id === pinId || row.new_data?.derived_pin_id === pinId
      const issueMatch = (issues ?? []).some((issue: any) => issue.id === row.entity_id)
      const recoveryMatch = (recoveries ?? []).some((recovery: any) => recovery.id === row.entity_id)
      return pinMatch || issueMatch || recoveryMatch
    }),
    history: (history ?? []).filter((entry: any) => {
      const entityId = entry.entity_id
      return [pinId, ...(issues ?? []).map((issue: any) => issue.id), ...(recoveries ?? []).map((recovery: any) => recovery.id)].includes(entityId)
    }),
  }
}
