/**
 * Email sending helpers — all fire-and-forget (non-throwing).
 * Uses SendGrid Mail API.
 */
import { sgMail, EMAIL_FROM } from './client'
import {
  tmplRequirementPendingApproval,
  tmplRequirementApproved,
  tmplRequirementRejected,
  tmplRequirementCancelled,
  tmplRequirementApprovedToAccounts,
  tmplRequirementCreatedProcurement,
  tmplPOPendingApproval,
  tmplPOApproved,
  tmplPOApprovedToAccounts,
  tmplPOVendorNotification,
  tmplItemStockedNotification,
  tmplPaymentApprovalRequest,
  tmplInboundRequirement,
} from './templates'

async function safeSend(to: string, subject: string, html: string) {
  console.log(`[safeSend] Starting email send: to=${to}, subject="${subject}"`);

  if (!process.env.SENDGRID_API_KEY) {
    console.error(`[safeSend] SENDGRID_API_KEY not set in environment`);
    console.log(`[Email SKIP — no key] To: ${to} | Subject: ${subject}`)
    return
  }

  console.log(`[safeSend] SENDGRID_API_KEY is configured`);
  console.log(`[safeSend] EMAIL_FROM: ${EMAIL_FROM}`);

  try {
    console.log(`[safeSend] Calling sgMail.send()...`);
    await sgMail.send({ from: EMAIL_FROM, to, subject, html })
    console.log(`[Email sent via SendGrid] To: ${to} | Subject: ${subject}`)
  } catch (e: any) {
    console.error('[safeSend] EMAIL SEND FAILED!', {
      to,
      subject,
      errorMessage: e.message,
      errorCode: e.code,
      fullError: e
    })
  }
}

// ── Requirement emails ────────────────────────────────────────────────────────

export async function sendRequirementPendingApproval(opts: {
  approverEmail: string
  approverName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  dueDate: string
  requirementId: string
  approvalToken?: string
  appUrl?: string
}) {
  const { subject, html } = tmplRequirementPendingApproval(opts)
  await safeSend(opts.approverEmail, subject, html)
}

export async function sendRequirementApproved(opts: {
  requesterEmail: string
  requesterName: string
  ref: string
  title: string
  approverName: string
  comment?: string
  requirementId: string
}) {
  const { subject, html } = tmplRequirementApproved(opts)
  await safeSend(opts.requesterEmail, subject, html)
}

export async function sendRequirementRejected(opts: {
  requesterEmail: string
  requesterName: string
  ref: string
  title: string
  approverName: string
  reason?: string
  requirementId: string
}) {
  const { subject, html } = tmplRequirementRejected(opts)
  await safeSend(opts.requesterEmail, subject, html)
}

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

export async function sendRequirementApprovedToAccounts(opts: {
  accountsEmails: string[]
  ref: string
  title: string
  approverName: string
  requesterName: string
  urgency: string
  requirementId: string
  comment?: string
  poId?: string
  poNumber?: string
}) {
  console.log(`[sendRequirementApprovedToAccounts] Starting: emails=${JSON.stringify(opts.accountsEmails)}, ref=${opts.ref}, poId=${opts.poId}`);

  const { accountsEmails, ...rest } = opts
  if (!accountsEmails.length) {
    console.log(`[sendRequirementApprovedToAccounts] No emails provided, skipping`);
    return
  }

  console.log(`[sendRequirementApprovedToAccounts] Generating email template...`);
  const { subject, html } = tmplRequirementApprovedToAccounts(rest)
  console.log(`[sendRequirementApprovedToAccounts] Template generated, subject="${subject}"`);

  console.log(`[sendRequirementApprovedToAccounts] Sending to ${accountsEmails.length} recipients...`);
  for (const email of accountsEmails) {
    console.log(`[sendRequirementApprovedToAccounts] Sending to ${email.trim()}...`);
    await safeSend(email.trim(), subject, html)
  }
  console.log(`[sendRequirementApprovedToAccounts] Completed`);
}

// ── Purchase Order emails ─────────────────────────────────────────────────────

export async function sendPOPendingApproval(opts: {
  approverEmail: string
  approverName: string
  ref: string
  vendorName: string
  totalAmount: string
  createdByName: string
  dueDate: string
  poId: string
  approvalToken?: string
  appUrl?: string
}) {
  const { subject, html } = tmplPOPendingApproval(opts)
  await safeSend(opts.approverEmail, subject, html)
}

export async function sendPOApproved(opts: {
  procurementEmail: string
  procurementName: string
  ref: string
  vendorName: string
  totalAmount: string
  poId: string
}) {
  const { subject, html } = tmplPOApproved(opts)
  await safeSend(opts.procurementEmail, subject, html)
}

export async function sendPOToVendor(opts: {
  vendorEmail: string
  vendorName: string
  ref: string
  items: Array<{ description: string; quantity: number; unit: string; unit_price: number }>
  totalAmount: string
  currency: string
  expectedDelivery?: string
  deliveryAddress?: string
  notes?: string
  companyName: string
}) {
  const { vendorEmail, ...rest } = opts
  const { subject, html } = tmplPOVendorNotification(rest)
  await safeSend(vendorEmail, subject, html)
}

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

export async function sendPOApprovedToAccounts(opts: {
  accountsEmails: string[]
  ref: string
  vendorName: string
  totalAmount: string
  currency: string
  approverName: string
  requesterName: string
  poId: string
}) {
  console.log(`[sendPOApprovedToAccounts] Starting: emails=${JSON.stringify(opts.accountsEmails)}, ref=${opts.ref}, poId=${opts.poId}`);

  const { accountsEmails, ...rest } = opts
  if (!accountsEmails.length) {
    console.log(`[sendPOApprovedToAccounts] No emails provided, skipping`);
    return
  }

  console.log(`[sendPOApprovedToAccounts] Generating email template...`);
  const { subject, html } = tmplPOApprovedToAccounts(rest)
  console.log(`[sendPOApprovedToAccounts] Template generated, subject="${subject}"`);

  console.log(`[sendPOApprovedToAccounts] Sending to ${accountsEmails.length} recipients...`);
  for (const email of accountsEmails) {
    console.log(`[sendPOApprovedToAccounts] Sending to ${email.trim()}...`);
    await safeSend(email.trim(), subject, html)
  }
  console.log(`[sendPOApprovedToAccounts] Completed`);
}

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

export async function sendPaymentApprovalRequest(opts: {
  approverEmail: string
  approverName: string
  poRef: string
  vendorName: string
  amount: number
  currency: string
  installmentNo?: number
  dueDate?: string
  requestedByName: string
  paymentId: string
  poId: string
}) {
  const { approverEmail, ...rest } = opts
  const { subject, html } = tmplPaymentApprovalRequest(rest)
  await safeSend(approverEmail, subject, html)
}

// ── Inbound ───────────────────────────────────────────────────────────────────

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
