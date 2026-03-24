import { APP_URL } from './client'

// ── Layout helpers ────────────────────────────────────────────────────────────

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
      <tr><td style="background:#1d4ed8;padding:20px 32px;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;">SMLS · Shipyard Material Lifecycle</p>
      </td></tr>
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
    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
  </tr>`
}

function urgencyBadge(urgency: string): string {
  const colors: Record<string, string> = {
    critical: 'background:#fef2f2;color:#dc2626;border:1px solid #fecaca;',
    urgent:   'background:#fff7ed;color:#ea580c;border:1px solid #fed7aa;',
    routine:  'background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;',
  }
  const style = colors[urgency.toLowerCase()] ?? colors.routine
  return `<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700;${style}">${urgency.toUpperCase()}</span>`
}

// ── Requirement: notify PM of new request ─────────────────────────────────────

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
  const link = `${APP_URL}/procurement/review`
  return {
    subject: `[New Requirement] ${opts.ref} from ${opts.requesterName} — ${opts.urgency.toUpperCase()}`,
    html: base(
      `New Requirement ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">New Requirement Submitted</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.managerName}, a new requirement is waiting for your review.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Title', opts.title)}
         ${kv('Requested by', opts.requesterName)}
         ${kv('Urgency', urgencyBadge(opts.urgency))}
         ${opts.preferredVendor ? kv('Preferred Vendor', opts.preferredVendor) : ''}
         ${opts.reason ? kv('Reason / Purpose', opts.reason) : ''}
       </table>
       ${btn(link, 'Review in Procurement →')}`
    ),
  }
}

// ── Requirement cancelled ─────────────────────────────────────────────────────

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
    subject: `[Cancelled] Requirement ${opts.ref} has been cancelled`,
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
       ${btn(link, 'View Requirement →', '#6b7280')}`
    ),
  }
}

// ── Purchase: urgent/critical → immediate approver notification ───────────────

export function tmplPurchaseRequestToApprover(opts: {
  approverName: string
  ref: string
  title: string
  requesterName: string
  urgency: string
  items: Array<{ description: string; quantity: number; unit: string; estimated_unit_price?: number | null }>
  vendorName?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/review`
  const itemRows = opts.items.map((it, i) =>
    `<tr style="border-top:1px solid #f3f4f6;">
       <td style="padding:6px 4px;font-size:13px;color:#374151;">${i + 1}</td>
       <td style="padding:6px 4px;font-size:13px;color:#374151;">${it.description}</td>
       <td style="padding:6px 4px;font-size:13px;color:#374151;text-align:right;">${it.quantity} ${it.unit}</td>
       <td style="padding:6px 4px;font-size:13px;color:#374151;text-align:right;">${it.estimated_unit_price ? `${it.estimated_unit_price.toFixed(2)}` : 'TBD'}</td>
     </tr>`
  ).join('')

  return {
    subject: `[${opts.urgency.toUpperCase()} Purchase] ${opts.ref} — Procurement team will raise a PO shortly`,
    html: base(
      `Urgent Purchase Request ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#dc2626;">
         ${urgencyBadge(opts.urgency)} Purchase Request Submitted
       </h2>
       <p style="margin:12px 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.approverName}, an ${opts.urgency} purchase request has been submitted.
         The procurement team is reviewing it and will raise a Purchase Order shortly for your approval.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.ref)}
         ${kv('Requested by', opts.requesterName)}
         ${kv('Urgency', urgencyBadge(opts.urgency))}
         ${opts.vendorName ? kv('Preferred Vendor', opts.vendorName) : ''}
       </table>
       <br/>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
         <thead>
           <tr style="background:#f3f4f6;">
             <th style="padding:8px 4px;font-size:11px;color:#6b7280;text-align:left;">#</th>
             <th style="padding:8px 4px;font-size:11px;color:#6b7280;text-align:left;">Item</th>
             <th style="padding:8px 4px;font-size:11px;color:#6b7280;text-align:right;">Qty</th>
             <th style="padding:8px 4px;font-size:11px;color:#6b7280;text-align:right;">Est. Price</th>
           </tr>
         </thead>
         <tbody>${itemRows}</tbody>
       </table>
       <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
         You will receive a formal PO for approval once procurement reviews this request.
       </p>
       ${btn(link, 'View in Procurement →', '#dc2626')}`
    ),
  }
}

// ── Purchase: PM sends PO to approver ─────────────────────────────────────────

export function tmplPOForApproval(opts: {
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
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  return {
    subject: `[Approval Required] PO ${opts.poNumber} — ${opts.currency} ${opts.totalAmount} — ${opts.vendorName}`,
    html: base(
      `PO ${opts.poNumber} Pending Approval`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Purchase Order Requires Your Approval</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.approverName}, the procurement team has raised a Purchase Order that needs your approval.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Number', `<strong>${opts.poNumber}</strong>`)}
         ${kv('Requirement', opts.ref)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Total', `<strong>${opts.currency} ${opts.totalAmount}</strong>`)}
         ${kv('Items', `${opts.itemCount} line item${opts.itemCount !== 1 ? 's' : ''}`)}
         ${kv('Urgency', urgencyBadge(opts.urgency))}
         ${kv('Original Requester', opts.requesterName)}
         ${kv('Raised by', opts.createdByName)}
         ${opts.comment ? kv('Note', opts.comment) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Please review the PO and approve it to authorise the procurement team to place the order.
       </p>
       ${btn(link, 'Review & Approve PO →', '#1d4ed8')}`
    ),
  }
}

// ── Purchase: approver approved → notify PM ───────────────────────────────────

export function tmplPOApprovedToPM(opts: {
  poId: string
  poNumber: string
  vendorName: string
  totalAmount: string
  approverName: string
  requirementRef?: string
  comment?: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  return {
    subject: `[PO Approved] ${opts.poNumber} — ${opts.vendorName} — Please place the order`,
    html: base(
      `PO ${opts.poNumber} Approved`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Purchase Order Approved ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Your Purchase Order has been approved. You can now place the order with the vendor.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Number', `<strong>${opts.poNumber}</strong>`)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Total', `<strong>${opts.totalAmount}</strong>`)}
         ${kv('Approved by', opts.approverName)}
         ${opts.requirementRef ? kv('Requirement', opts.requirementRef) : ''}
         ${opts.comment ? kv('Comment', opts.comment) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Please place the order with the vendor and mark the PO as <strong>Ordered</strong> in the system.
         The accounts team has been notified to expect an invoice.
       </p>
       ${btn(link, 'Open PO & Place Order →', '#16a34a')}`
    ),
  }
}

// ── Purchase: approver approved → notify accounts ─────────────────────────────

export function tmplPOApprovedToAccounts(opts: {
  poId: string
  poNumber: string
  vendorName: string
  totalAmount: string
  currency: string
  approverName: string
  requirementRef?: string
  requirementTitle?: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/procurement/purchase-orders/${opts.poId}`
  return {
    subject: `[Approved PO] ${opts.poNumber} — ${opts.currency} ${opts.totalAmount} — Expect invoice from ${opts.vendorName}`,
    html: base(
      `PO ${opts.poNumber} Approved`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Purchase Order Approved — Action Required</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         A Purchase Order has been approved. Please expect an invoice from the vendor and coordinate payment once received.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('PO Number', `<strong>${opts.poNumber}</strong>`)}
         ${kv('Vendor', opts.vendorName)}
         ${kv('Expected Amount', `<strong>${opts.currency} ${opts.totalAmount}</strong>`)}
         ${kv('Approved by', opts.approverName)}
         ${opts.requirementRef ? kv('Requirement', opts.requirementRef) : ''}
         ${opts.requirementTitle ? kv('Description', opts.requirementTitle) : ''}
       </table>
       <p style="margin:20px 0 0;font-size:14px;color:#374151;">
         Once you receive the invoice from <strong>${opts.vendorName}</strong>, please create a purchase invoice
         in the system and notify the procurement manager to confirm the order.
       </p>
       ${btn(link, 'View Purchase Order →', '#16a34a')}`
    ),
  }
}

// ── Inventory stocked notification ────────────────────────────────────────────

export function tmplItemStockedNotification(opts: {
  requesterName: string
  ref: string
  pinDescription: string
  location?: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[In Stock] Your requested item is now available — ${opts.ref}`,
    html: base(
      `Item Stocked — ${opts.ref}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#16a34a;">Your Item Is Now In Stock ✓</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.requesterName}, an item from your requirement has been received and is available.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Requirement', opts.ref)}
         ${kv('Item', opts.pinDescription)}
         ${opts.location ? kv('Location', opts.location) : ''}
       </table>
       ${btn(link, 'View Requirement →', '#16a34a')}`
    ),
  }
}

// ── Inbound email notification ─────────────────────────────────────────────────

export function tmplInboundRequirement(opts: {
  adminName: string
  fromEmail: string
  subject: string
  requirementRef: string
  requirementId: string
}): { subject: string; html: string } {
  const link = `${APP_URL}/requirements/${opts.requirementId}`
  return {
    subject: `[Inbound] New requirement from email: ${opts.subject}`,
    html: base(
      `Inbound Requirement ${opts.requirementRef}`,
      `<h2 style="margin:0 0 8px;font-size:18px;color:#1d4ed8;">Inbound Requirement Created</h2>
       <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
         Hi ${opts.adminName}, a new requirement was automatically created from an inbound email.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Reference', opts.requirementRef)}
         ${kv('From', opts.fromEmail)}
         ${kv('Subject', opts.subject)}
       </table>
       ${btn(link, 'Review Requirement →')}`
    ),
  }
}

// ── User invite ────────────────────────────────────────────────────────────────

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
         Hi ${opts.inviteeName}, <strong>${opts.invitedByName}</strong> has invited you to join ${opts.companyName} on SMLS.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #f3f4f6;">
         ${kv('Your Role', opts.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}
         ${kv('Platform', 'SMLS · Shipyard Material Lifecycle')}
       </table>
       ${btn(opts.inviteUrl, 'Accept Invitation →')}`
    ),
  }
}
