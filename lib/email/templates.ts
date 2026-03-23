import { APP_URL } from './client'

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <!-- Header -->
      <tr><td style="background:#1d4ed8;padding:20px 32px;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;">SMLS · Shipyard Material Lifecycle</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        ${body}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"/>
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          You received this email because you are part of the SMLS workflow.
          Log in at <a href="${APP_URL}" style="color:#1d4ed8;">${APP_URL}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(href: string, label: string, color = '#1d4ed8'): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:${color};color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>`
}

function kv(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
  </tr>`
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function tmplRequirementPendingApproval(opts: {
  approverName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  dueDate: string
  requirementId: string
  approvalToken?: string
  appUrl?: string
}): { subject: string; html: string } {
  const base_url = opts.appUrl ?? APP_URL
  const hasToken = Boolean(opts.approvalToken)
  const approveLink = hasToken ? `${base_url}/approve/${opts.approvalToken}?decision=approve` : `${base_url}/approvals`
  const rejectLink  = hasToken ? `${base_url}/approve/${opts.approvalToken}?decision=reject`  : `${base_url}/approvals`

  const actionButtons = hasToken
    ? `<div style="margin-top:24px;">
         <a href="${approveLink}" style="display:inline-block;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;margin-right:12px;">✓ Approve</a>
         <a href="${rejectLink}"  style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">✗ Reject</a>
       </div>
       <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">One click is all it takes — no login required. The requester will be notified of your decision.</p>`
    : `${btn(approveLink, 'Review & Approve →')}
       <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Please approve or reject with comments. The requester will be notified of your decision.</p>`

  return {
    subject: `[Action Required] Requirement ${opts.ref} pending your approval`,
    html: base(
      `Requirement ${opts.ref} Pending Approval`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">New Requirement Awaiting Your Approval</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.approverName}, a requirement has been submitted and needs your review.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Requested by', opts.requesterName)}
         ${kv('Urgency', opts.urgency.toUpperCase())}
         ${kv('Due by', opts.dueDate)}
       </table>
       ${actionButtons}`
    ),
  }
}

export function tmplRequirementApproved(opts: {
  requesterName: string
  ref: string
  title: string
  approverName: string
  comment?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Approved] Requirement ${opts.ref} — Ready for Procurement`,
    html: base(
      `Requirement ${opts.ref} Approved`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Requirement Approved ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.requesterName}, your requirement has been approved and can now proceed to procurement.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Approved by', opts.approverName)}
         ${opts.comment ? kv('Comment', opts.comment) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         The procurement team will now raise a Purchase Order. You'll be notified when it is placed.
       </p>
       ${btn(link, 'View Requirement →', '#16a34a')}`
    ),
  }
}

export function tmplRequirementRejected(opts: {
  requesterName: string
  ref: string
  title: string
  approverName: string
  reason?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Rejected] Requirement ${opts.ref} — Action Required`,
    html: base(
      `Requirement ${opts.ref} Rejected`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#dc2626;">Requirement Rejected</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.requesterName}, your requirement was not approved at this time.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Rejected by', opts.approverName)}
         ${opts.reason ? kv('Reason', opts.reason) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Please revise the requirement based on the feedback above and resubmit for approval.
       </p>
       ${btn(link, 'Revise & Resubmit →', '#dc2626')}`
    ),
  }
}

export function tmplPOPendingApproval(opts: {
  approverName: string
  ref: string
  vendorName: string
  totalAmount: string
  createdByName: string
  dueDate: string
  poId: string
  approvalToken?: string
  appUrl?: string
}): { subject: string; html: string } {
  const base_url = opts.appUrl ?? APP_URL
  const hasToken = Boolean(opts.approvalToken)
  const approveLink = hasToken ? `${base_url}/approve/${opts.approvalToken}?decision=approve` : `${base_url}/procurement/purchase-orders/${opts.poId}`
  const rejectLink  = hasToken ? `${base_url}/approve/${opts.approvalToken}?decision=reject`  : `${base_url}/procurement/purchase-orders/${opts.poId}`

  const actionButtons = hasToken
    ? `<div style="margin-top:24px;">
         <a href="${approveLink}" style="display:inline-block;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;margin-right:12px;">✓ Approve</a>
         <a href="${rejectLink}"  style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;">✗ Reject</a>
       </div>
       <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">One click is all it takes — no login required.</p>`
    : `${btn(approveLink, 'Review Purchase Order →')}`

  return {
    subject: `[Action Required] Purchase Order ${opts.ref} pending your approval`,
    html: base(
      `PO ${opts.ref} Pending Approval`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Purchase Order Awaiting Approval</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.approverName}, a purchase order requires your review and approval.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Reference', opts.ref)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Total Amount', opts.totalAmount)}
         ${kv('Raised by', opts.createdByName)}
         ${kv('Due by', opts.dueDate)}
       </table>
       ${actionButtons}`
    ),
  }
}

export function tmplPOApproved(opts: {
  procurementName: string
  ref: string
  vendorName: string
  totalAmount: string
  poId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  return {
    subject: `[Approved] Purchase Order ${opts.ref} — Ready to Place Order`,
    html: base(
      `PO ${opts.ref} Approved`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Purchase Order Approved ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.procurementName}, the purchase order has been approved and can now be placed with the vendor.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Reference', opts.ref)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Total Amount', opts.totalAmount)}
       </table>
       ${btn(link, 'View & Place Order →', '#16a34a')}`
    ),
  }
}

export function tmplRequirementCancelled(opts: {
  requesterName: string
  ref: string
  title: string
  cancelledByName: string
  reason?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Cancelled] Your requirement ${opts.ref} has been removed`,
    html: base(
      `Requirement ${opts.ref} Cancelled`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#6b7280;">Requirement Cancelled</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.requesterName}, your requirement has been cancelled.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Cancelled by', opts.cancelledByName)}
         ${opts.reason ? kv('Reason', opts.reason) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         If you believe this was done in error, please contact your administrator or raise a new requirement.
       </p>
       ${btn(link, 'View Cancelled Requirement →', '#6b7280')}`
    ),
  }
}

export function tmplUserInvite(opts: {
  inviteeName: string
  invitedByName: string
  role: string
  inviteUrl: string
  companyName: string
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${opts.companyName} on SMLS`,
    html: base(
      `Invitation to SMLS`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#1d4ed8;">You've been invited! 🎉</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.inviteeName}, <strong>${opts.invitedByName}</strong> has invited you to join ${opts.companyName} on the
         Shipyard Material Lifecycle System (SMLS).
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Your Role', opts.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
         ${kv('Platform', 'SMLS · Shipyard Material Lifecycle')}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Click the button below to set up your password and access the system.
       </p>
       ${btn(opts.inviteUrl, 'Accept Invitation & Set Password →')}`
    ),
  }
}

export function tmplRequirementApprovedToAccounts(opts: {
  ref: string
  title: string
  approverName: string
  requesterName: string
  urgency: string
  requirementId: string
  comment?: string
  poId?: string
  poNumber?: string
}): { subject: string; html: string } {
  const reqLink = `${APP_URL}/requirements/${opts.requirementId}`
  const poLink  = opts.poId ? `${APP_URL}/procurement/purchase-orders/${opts.poId}` : null
  const hasPO   = Boolean(opts.poId)
  return {
    subject: hasPO
      ? `[Draft PO Ready] ${opts.ref} approved — Draft PO ${opts.poNumber ?? ''} created for review`
      : `[Action Required] Approved Requirement ${opts.ref} — Please Raise a Purchase Order`,
    html: base(
      `PO for ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#1d4ed8;">
        ${hasPO ? 'Draft Purchase Order Created 📋' : 'Purchase Order Needed 📋'}
       </h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         ${hasPO
           ? `A requirement has been approved and a <strong>draft PO has been automatically created</strong>. Please review, update pricing/vendor if needed, and submit for final approval.`
           : `A requirement has been approved and is ready for procurement. Please raise a Purchase Order at your earliest convenience.`
         }
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Requirement Ref', opts.ref)}
         ${opts.poNumber ? kv('Draft PO', opts.poNumber) : ''}
         ${kv('Title', opts.title)}
         ${kv('Requested by', opts.requesterName)}
         ${kv('Approved by', opts.approverName)}
         ${kv('Urgency', opts.urgency.toUpperCase())}
         ${opts.comment ? kv('Approver Comment', opts.comment) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         ${hasPO
           ? 'The draft PO is pre-filled with the requirement items. Update the vendor and unit prices, then submit it for approval.'
           : 'Log in to create the PO and attach it to this requirement.'
         }
       </p>
       ${hasPO && poLink
         ? btn(poLink, 'Review & Edit Draft PO →', '#16a34a')
         : btn(reqLink, 'View Requirement & Create PO →')
       }`
    ),
  }
}

export function tmplPOVendorNotification(opts: {
  vendorName: string
  ref: string
  items: Array<{ description: string; quantity: number; unit: string; unit_price: number }>
  totalAmount: string
  currency: string
  expectedDelivery?: string
  deliveryAddress?: string
  notes?: string
  companyName: string
}): { subject: string; html: string } {
  const itemRows = opts.items.map((it, i) =>
    `<tr style="border-top:1px solid #f3f4f6;">
       <td style="padding:6px 0;font-size:13px;color:#374151;">${i + 1}</td>
       <td style="padding:6px 0;font-size:13px;color:#374151;">${it.description}</td>
       <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;">${it.quantity} ${it.unit}</td>
       <td style="padding:6px 0;font-size:13px;color:#374151;text-align:right;">${opts.currency} ${it.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
     </tr>`
  ).join('')
  return {
    subject: `Purchase Order ${opts.ref} from ${opts.companyName}`,
    html: base(
      `PO ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Purchase Order — ${opts.ref}</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Dear ${opts.vendorName}, please find below a Purchase Order from ${opts.companyName}.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Reference', opts.ref)}
         ${opts.expectedDelivery ? kv('Expected Delivery', opts.expectedDelivery) : ''}
         ${opts.deliveryAddress ? kv('Delivery Address', opts.deliveryAddress) : ''}
       </table>
       <br/>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
         <thead>
           <tr style="background:#f3f4f6;">
             <th style="padding:8px 4px;font-size:12px;color:#6b7280;text-align:left;">#</th>
             <th style="padding:8px 4px;font-size:12px;color:#6b7280;text-align:left;">Description</th>
             <th style="padding:8px 4px;font-size:12px;color:#6b7280;text-align:right;">Qty</th>
             <th style="padding:8px 4px;font-size:12px;color:#6b7280;text-align:right;">Unit Price</th>
           </tr>
         </thead>
         <tbody>${itemRows}</tbody>
         <tfoot>
           <tr>
             <td colspan="3" style="padding:8px 0;font-size:13px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #e5e7eb;">Total</td>
             <td style="padding:8px 0;font-size:13px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #e5e7eb;">${opts.totalAmount}</td>
           </tr>
         </tfoot>
       </table>
       ${opts.notes ? `<p style="margin:20px 0 0;font-size:13px;color:#374151;"><strong>Notes:</strong> ${opts.notes}</p>` : ''}
       <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
         Please confirm receipt of this order and advise the expected delivery date.
       </p>`
    ),
  }
}

export function tmplRequirementCreatedProcurement(opts: {
  managerName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  preferredVendor?: string
  reason?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[New Requirement] ${opts.ref} from ${opts.requesterName} — ${opts.urgency.toUpperCase()}`,
    html: base(
      `New Requirement ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">New Requirement Submitted</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.managerName}, a new requirement has been submitted and is awaiting review.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Requested by', opts.requesterName)}
         ${kv('Urgency', opts.urgency.toUpperCase())}
         ${opts.preferredVendor ? kv('Preferred Vendor', opts.preferredVendor) : kv('Preferred Vendor', 'Any')}
         ${opts.reason ? kv('Reason', opts.reason) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         The requester will submit this for approval. Once approved, the procurement team should raise a PO.
       </p>
       ${btn(link, 'View Requirement →')}`
    ),
  }
}

export function tmplPOApprovedToAccounts(opts: {
  ref: string
  vendorName: string
  totalAmount: string
  currency: string
  approverName: string
  requesterName: string
  poId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  return {
    subject: `[PO Approved] ${opts.ref} — ${opts.currency} ${opts.totalAmount} — Please coordinate payment`,
    html: base(
      `PO ${opts.ref} Approved`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Purchase Order Approved ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">A purchase order has been approved and requires payment coordination.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Reference', opts.ref)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Total Amount', `${opts.currency} ${opts.totalAmount}`)}
         ${kv('Approved by', opts.approverName)}
         ${kv('Original Requester', opts.requesterName)}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Please log in to arrange payment for this purchase order.
       </p>
       ${btn(link, 'View Purchase Order →', '#16a34a')}`
    ),
  }
}

export function tmplItemStockedNotification(opts: {
  requesterName: string
  ref: string
  pinDescription: string
  location?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Stocked] Your requested item is now available — ${opts.ref}`,
    html: base(
      `Item Stocked — ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Your Requested Item Is Now In Stock ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.requesterName}, an item from your requirement has been received and is now available in inventory.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Requirement', opts.ref)}
         ${kv('Item', opts.pinDescription)}
         ${opts.location ? kv('Location', opts.location) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         You can now request issuance of this item for your vessel or department.
       </p>
       ${btn(link, 'View Requirement →', '#16a34a')}`
    ),
  }
}

export function tmplPaymentApprovalRequest(opts: {
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
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  const amountStr = `${opts.currency} ${opts.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  return {
    subject: `[Action Required] Payment approval needed — ${opts.poRef}`,
    html: base(
      `Payment Approval — ${opts.poRef}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#1d4ed8;">Payment Approval Required</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.approverName}, a payment has been submitted and requires your approval before processing.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Reference', opts.poRef)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Amount', amountStr)}
         ${opts.installmentNo ? kv('Installment', `#${opts.installmentNo}`) : ''}
         ${opts.dueDate ? kv('Due Date', opts.dueDate) : ''}
         ${kv('Requested by', opts.requestedByName)}
       </table>
       ${btn(link, 'Review & Approve Payment →')}`
    ),
  }
}

export function tmplInboundRequirement(opts: {
  adminName: string
  fromEmail: string
  subject: string
  requirementRef: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Inbound] New requirement created from email: ${opts.subject}`,
    html: base(
      'Inbound Requirement Created',
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">New Requirement Created from Email</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Hi ${opts.adminName}, an email was received and automatically converted to a requirement draft.</p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('From', opts.fromEmail)}
         ${kv('Email Subject', opts.subject)}
         ${kv('Req Reference', opts.requirementRef)}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Please review the draft, fill in any missing details, then submit for approval.
       </p>
       ${btn(link, 'Review Draft Requirement →')}`
    ),
  }
}
