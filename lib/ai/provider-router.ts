import { env } from '@/lib/env'
import { findStockTool } from '@/lib/ai/tools/find-stock'
import { getRequirementStatusTool } from '@/lib/ai/tools/get-requirement-status'
import { getPOStatusTool } from '@/lib/ai/tools/get-po-status'
import { getDeliveryStatusTool } from '@/lib/ai/tools/get-delivery-status'
import { getQCStatusTool } from '@/lib/ai/tools/get-qc-status'
import { getMaterialLocationTool } from '@/lib/ai/tools/get-material-location'
import { traceMaterialGenealogyTool } from '@/lib/ai/tools/trace-material-genealogy'
import { getRecoveryStatusTool } from '@/lib/ai/tools/get-recovery-status'
import { searchSOPTool } from '@/lib/ai/tools/search-sop'

export type AIProvider = 'gemini' | 'grok'
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

export interface AIRequest {
  messages: { role: ChatRole; content: string }[]
  systemPrompt: string
  providerOverride?: AIProvider
}

export interface ProviderAdapterResponse {
  provider: AIProvider
  content: string
  raw?: unknown
}

type ToolCall = {
  name: string
  args: Record<string, unknown>
  result: unknown
}

type ToolDefinition = {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: any) => Promise<unknown>
}

const TOOL_REGISTRY: ToolDefinition[] = [
  findStockTool,
  getRequirementStatusTool,
  getPOStatusTool,
  getDeliveryStatusTool,
  getQCStatusTool,
  getMaterialLocationTool,
  traceMaterialGenealogyTool,
  getRecoveryStatusTool,
  searchSOPTool,
]

function extractRef(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0] ?? null
}

function buildToolPlan(prompt: string) {
  const text = prompt.toLowerCase()
  const plan: Array<{ tool: ToolDefinition; args: Record<string, unknown> }> = []
  const pinNumber = extractRef(prompt, /PIN-\d{4,6}/i)
  const reqNumber = extractRef(prompt, /REQ-\d{4}/i)
  const poNumber = extractRef(prompt, /PO-\d{4}/i)
  const deliveryRef = extractRef(prompt, /DLV-\d{4}/i)
  const issueNumber = extractRef(prompt, /ISS-\d{4,6}/i)
  const recoveryRef = extractRef(prompt, /REC-\d{4,6}/i)

  if (/stock|available|inventory|on hand/.test(text)) {
    plan.push({ tool: findStockTool, args: { query: pinNumber ?? prompt } })
  }
  if (/requirement|req-/.test(text) && reqNumber) {
    plan.push({ tool: getRequirementStatusTool, args: { ref_number: reqNumber.toUpperCase() } })
  }
  if ((/purchase order|po-/.test(text) || poNumber) && poNumber) {
    plan.push({ tool: getPOStatusTool, args: { po_number: poNumber.toUpperCase() } })
  }
  if (/delivery|receiving|replacement loop|tracking/.test(text) && (deliveryRef || poNumber)) {
    plan.push({ tool: getDeliveryStatusTool, args: { delivery_ref: deliveryRef?.toUpperCase(), po_number: poNumber?.toUpperCase() } })
  }
  if (/qc|inspection|partial pass|fail|pass/.test(text) && deliveryRef) {
    plan.push({ tool: getQCStatusTool, args: { delivery_ref: deliveryRef.toUpperCase() } })
  }
  if ((/location|where is|bin|warehouse/.test(text) && pinNumber) || /material location/.test(text)) {
    plan.push({ tool: getMaterialLocationTool, args: { pin_number: pinNumber?.toUpperCase() } })
  }
  if ((/trace|genealogy|lineage|history/.test(text) && pinNumber) || /derived pin/.test(text)) {
    plan.push({ tool: traceMaterialGenealogyTool, args: { pin_number: pinNumber?.toUpperCase() } })
  }
  if (/recovery|leftover|not used|scrap|return/.test(text) && (issueNumber || recoveryRef)) {
    plan.push({
      tool: getRecoveryStatusTool,
      args: issueNumber ? { issue_number: issueNumber.toUpperCase() } : { recovery_ref: recoveryRef?.toUpperCase() },
    })
  }
  if (/sop|how do i|procedure|guide|help/.test(text) || plan.length === 0) {
    plan.push({ tool: searchSOPTool, args: { query: prompt } })
  }

  const deduped = new Map<string, { tool: ToolDefinition; args: Record<string, unknown> }>()
  for (const item of plan) deduped.set(`${item.tool.name}:${JSON.stringify(item.args)}`, item)
  return [...deduped.values()]
}

function summarizeToolResult(call: ToolCall) {
  const { name, result } = call
  switch (name) {
    case 'find_stock': {
      const rows = (result as any)?.results ?? []
      if (!rows.length) return 'I could not verify stock for that query in the inventory ledger.'
      return rows
        .map((row: any) => `${row.pin_number}: ${row.description} — ${row.current_stock} ${row.unit} at ${row.location_code ?? 'unassigned location'}`)
        .join('\n')
    }
    case 'get_requirement_status': {
      const requirement = (result as any)?.requirement
      if (!requirement) return 'I could not find that requirement.'
      return `${requirement.ref_number} is ${requirement.status}. Title: ${requirement.title}. Vessel: ${requirement.vessel?.name ?? 'unassigned'}.`
    }
    case 'get_po_status': {
      const po = (result as any)?.purchase_order
      if (!po) return 'I could not find that purchase order.'
      return `${po.po_number} is ${po.status}. Vendor: ${po.vendor?.name ?? 'unknown'}. Requirement: ${po.requirement?.ref_number ?? 'not linked'}.`
    }
    case 'get_delivery_status': {
      const deliveries = (result as any)?.deliveries ?? []
      if (!deliveries.length) return 'I could not verify a matching delivery.'
      return deliveries
        .map((delivery: any) => `${delivery.delivery_ref} is ${delivery.status}. Vendor: ${delivery.purchase_order?.vendor?.name ?? 'unknown'}. Replacement loop: ${delivery.replacement?.replacement_status ?? 'not open'}.`)
        .join('\n')
    }
    case 'get_qc_status': {
      const inspections = (result as any)?.inspections ?? []
      if (!inspections.length) return 'I could not verify QC records for that delivery.'
      return inspections.map((inspection: any) => `${inspection.inspection_ref}: ${inspection.status} (${inspection.result ?? 'no result yet'})`).join('\n')
    }
    case 'get_material_location': {
      const location = (result as any)?.location
      if (!location) return 'I could not verify a current material location.'
      return `${location.pin_number} is at ${location.location_code ?? 'unassigned'} ${location.location_name ?? ''}`.trim()
    }
    case 'trace_material_genealogy': {
      const trace = (result as any)?.genealogy
      if (!trace?.pin) return 'I could not trace that PIN.'
      const upstream = trace.upstream?.purchase_order?.requirement?.ref_number
      return `${trace.pin.pin_number} trace: upstream requirement ${upstream ?? 'not linked'}, ${trace.transactions.length} ledger entries, ${trace.issues.length} issue records, ${trace.recoveries.length} recovery records, ${trace.genealogy.length} genealogy nodes.`
    }
    case 'get_recovery_status': {
      const rows = (result as any)?.recovery ?? []
      if (!rows.length) return 'I could not verify a recovery record for that reference.'
      return rows.map((row: any) => `${row.recovery_ref}: ${row.status} (${row.outcome ?? 'outcome pending'}) qty ${row.quantity_returned}`).join('\n')
    }
    case 'search_sop': {
      const rows = (result as any)?.results ?? []
      if (!rows.length) return 'I could not find matching guidance in the prototype documentation.'
      return rows
        .map((row: any) => `${row.file}: ${row.matches.map((match: any) => `line ${match.lineNumber}: ${match.line}`).join(' | ')}`)
        .join('\n')
    }
    default:
      return 'No grounded result was available.'
  }
}

function buildGroundedAnswer(prompt: string, toolCalls: ToolCall[]) {
  if (!toolCalls.length) {
    return `I could not verify that request from the prototype data or guidance. Please try a specific reference such as REQ-0001, PO-0001, DLV-0001, ISS-000001, REC-000001, or PIN-000001.`
  }

  const sections = toolCalls.map((call) => `### ${call.name}\n${summarizeToolResult(call)}`)
  return [`I grounded this answer against the current prototype data for: "${prompt}".`, ...sections, 'If you want, I can drill into another reference or workflow step.'].join('\n\n')
}

async function summarizeWithProvider(request: AIRequest, groundedAnswer: string, toolCalls: ToolCall[]): Promise<ProviderAdapterResponse | null> {
  const provider = request.providerOverride ?? env.AI_DEFAULT_PROVIDER
  try {
    if (provider === 'gemini') {
      const { generateWithGemini } = await import('./providers/gemini')
      return await generateWithGemini({
        ...request,
        systemPrompt: `${request.systemPrompt}\n\nUse only the grounded facts below. If something is missing, say you could not verify it.\n\n${JSON.stringify(toolCalls, null, 2)}`,
        messages: [{ role: 'user', content: `Rewrite this grounded answer clearly for an operations user:\n\n${groundedAnswer}` }],
      })
    }

    const { generateWithGrok } = await import('./providers/grok')
    return await generateWithGrok({
      ...request,
      systemPrompt: `${request.systemPrompt}\n\nUse only the grounded facts below. If something is missing, say you could not verify it.\n\n${JSON.stringify(toolCalls, null, 2)}`,
      messages: [{ role: 'user', content: `Rewrite this grounded answer clearly for an operations user:\n\n${groundedAnswer}` }],
    })
  } catch {
    return null
  }
}

export async function routeToProvider(request: AIRequest) {
  const latestUserMessage = [...request.messages].reverse().find((message) => message.role === 'user')
  const prompt = latestUserMessage?.content?.trim() ?? ''
  const plan = buildToolPlan(prompt)
  const toolCalls: ToolCall[] = []

  for (const item of plan) {
    const result = await item.tool.execute(item.args)
    toolCalls.push({ name: item.tool.name, args: item.args, result })
  }

  const groundedAnswer = buildGroundedAnswer(prompt, toolCalls)
  const providerResponse = await summarizeWithProvider(request, groundedAnswer, toolCalls)

  return {
    provider: providerResponse?.provider ?? (request.providerOverride ?? env.AI_DEFAULT_PROVIDER),
    response: providerResponse?.content ?? groundedAnswer,
    toolCalls,
    groundedAnswer,
    usedProvider: Boolean(providerResponse),
  }
}

export function listOperationalTools() {
  return TOOL_REGISTRY.map(({ name, description, parameters }) => ({ name, description, parameters }))
}
