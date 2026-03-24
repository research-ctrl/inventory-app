/**
 * Email sending helpers — all fire-and-forget (non-throwing).
 * Uses SendGrid.
 */
import { sgMail, EMAIL_FROM } from './client'
import {
  tmplRequirementCreatedProcurement,
  tmplRequirementCancelled,
  tmplPurchaseRequestToApprover,
  tmplPOForApproval,
  tmplPOApprovedToPM,
  tmplPOApprovedToAccounts,
  tmplItemStockedNotification,
  tmplInboundRequirement,
} from './templates'

async function safeSend(to: string, subject: string, html: string) {
  console.log(`[safeSend] Starting email send: to=${to}, subject="${subject}"`)
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email SKIP — no key] To: ${to} | Subject: ${subject}`)
    return
  }
  console.log(`[safeSend] EMAIL_FROM: ${EMAIL_FROM}`)
  try {
    console.log(`[safeSend] Calling sgMail.send()...`)
    await sgMail.send({ from: EMAIL_FROM, to, subject, html })
    console.log(`[Email sent via SendGrid] To: ${to} | Subject: ${subject}`)
  } catch (e: any) {
    console.error('[safeSend] EMAIL SEND FAILED!', { to, subject, errorMessage: e.message })
  }
}

// ── Requirement: notify PM of new request ────────────────────────────────────

export async function sendRequirementCreatedProcurement(opts: {
  managerEmail: string
  managerName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  preferredVendor?: string
  reason?: string
  requirementId: string
}) {
  const { managerEmail, ...rest } = opts
  const { subject, html } = tmplRequirementCreatedProcurement(rest)
  await safeSend(managerEmail, subject, html)
}

// ── Requirement cancelled ─────────────────────────────────────────────────────

export async function sendRequirementCancelled(opts: {
  requesterEmail: string
  requesterName: string
  ref: string
  title: string
  cancelledByName: string
  reason?: string
  requirementId: string
}) {
  const { requesterEmail, ...rest } = opts
  const { subject, html } = tmplRequirementCancelled(rest)
  await safeSend(requesterEmail, subject, html)
}

// ── Purchase: urgent/critical → direct email to approver at submission ────────

/**
 * When urgency is urgent or critical, email the approver immediately
 * on submission (before PM review) so they know it's coming.
 */
export async function sendPurchaseRequestToApprover(opts: {
  approverEmail: string
  approverName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  items: Array<{ description: string; quantity: number; unit: string; estimated_unit_price?: number | null }>
  vendorName?: string
  requirementId: string
}) {
  const { approverEmail, ...rest } = opts
  const { subject, html } = tmplPurchaseRequestToApprover(rest)
  await safeSend(approverEmail, subject, html)
}

// ── Purchase: PM sends PO to approver ────────────────────────────────────────

export async function sendPOForApproval(opts: {
  approverEmail: string
  approverName: string
  poId: string
  poNumber: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  vendorName: string
  totalAmount: string
  currency: string
  itemCount: number
  createdByName: string
  requirementId: string
  comment?: string
}) {
  const { approverEmail, ...rest } = opts
  const { subject, html } = tmplPOForApproval(rest)
  await safeSend(approverEmail, subject, html)
}

// ── Purchase: approver approved PO → notify PM ───────────────────────────────

export async function sendPOApprovedToPM(opts: {
  pmEmail: string
  poId: string
  poNumber: string
  vendorName: string
  totalAmount: string
  approverName: string
  requirementRef?: string
  comment?: string
}) {
  const { pmEmail, ...rest } = opts
  const { subject, html } = tmplPOApprovedToPM(rest)
  await safeSend(pmEmail, subject, html)
}

// ── Purchase: approver approved PO → notify accounts ─────────────────────────

export async function sendPOApprovedToAccounts(opts: {
  accountsEmails: string[]
  poId: string
  /** PO number (display ref). Accepts either poNumber or ref for backward compat. */
  poNumber?: string
  /** @deprecated use poNumber */
  ref?: string
  vendorName: string
  totalAmount: string
  currency: string
  approverName: string
  /** @deprecated unused in new template */
  requesterName?: string
  requirementRef?: string
  requirementTitle?: string
}) {
  const { accountsEmails, ref, poNumber, ...rest } = opts
  if (!accountsEmails.length) return
  const { subject, html } = tmplPOApprovedToAccounts({ ...rest, poNumber: poNumber ?? ref ?? opts.poId })
  for (const email of accountsEmails) {
    await safeSend(email.trim(), subject, html)
  }
}

// ── Inventory stocked notification ───────────────────────────────────────────

export async function sendItemStockedNotification(opts: {
  requesterEmail: string
  requesterName: string
  ref: string
  pinDescription: string
  location?: string
  requirementId: string
}) {
  const { requesterEmail, ...rest } = opts
  const { subject, html } = tmplItemStockedNotification(rest)
  await safeSend(requesterEmail, subject, html)
}

// ── Inbound email webhook notification ───────────────────────────────────────

export async function sendInboundRequirementNotice(opts: {
  adminEmail: string
  adminName: string
  fromEmail: string
  subject: string
  requirementRef: string
  requirementId: string
}) {
  const { subject, html } = tmplInboundRequirement(opts)
  await safeSend(opts.adminEmail, subject, html)
}

// ── Deprecated stubs (old approval flow) — kept for backward compat ──────────
// These no longer send emails but preserve the call sites in legacy actions.

/** @deprecated No-op. The new purchase flow emails approvers via sendPOForApproval. */
export async function sendRequirementPendingApproval(_opts: Record<string, unknown>) {}

/** @deprecated No-op. */
export async function sendRequirementApproved(_opts: Record<string, unknown>) {}

/** @deprecated No-op. */
export async function sendRequirementRejected(_opts: Record<string, unknown>) {}

/** @deprecated No-op. */
export async function sendRequirementApprovedToAccounts(_opts: Record<string, unknown>) {}

/** @deprecated Use sendPOForApproval instead. */
export async function sendPOPendingApproval(_opts: Record<string, unknown>) {}

/** @deprecated Use sendPOApprovedToPM instead. */
export async function sendPOApproved(_opts: Record<string, unknown>) {}

/** @deprecated No-op. */
export async function sendPOToVendor(_opts: Record<string, unknown>) {}

/** @deprecated No-op. */
export async function sendPaymentApprovalRequest(_opts: Record<string, unknown>) {}
