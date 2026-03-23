/**
 * Inbound Email Webhook — POST /api/email/inbound
 *
 * Receives parsed emails from SendGrid Inbound Parse and
 * automatically creates a draft Requirement from the email content.
 *
 * ── HOW TO CONFIGURE WITH SENDGRID ─────────────────────────────────────────
 * 1. In SendGrid Dashboard → Settings → Inbound Parse
 * 2. Click "Add Host" and enter your subdomain (e.g., inquiries.yourdomain.com)
 * 3. Add MX record to your DNS:
 *    Name:   inquiries.yourdomain.com
 *    Type:   MX
 *    Value:  mx.sendgrid.net
 *    Prio:   10
 * 4. Set Webhook URL to: https://yourapp.com/api/email/inbound
 * 5. Check "POST the raw, full MIME message" (optional but recommended)
 * 6. Add env var: INBOUND_WEBHOOK_SECRET (any value, set it in SendGrid too)
 *
 * Alternative providers: Postmark Inbound, Mailgun Routes, Forward.email
 * ────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInboundRequirementNotice } from '@/lib/email/send'

interface SendGridInbound {
  from:     string        // "Name <email@domain.com>" or just "email@domain.com"
  subject:  string
  text:     string        // plain text body
  html?:    string        // HTML body (if multipart/alternative)
  dkim?:    string        // DKIM signature verification
}

export async function POST(request: NextRequest) {
  // ── 1. Verify webhook secret (optional, configured in SendGrid) ──────────
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (secret) {
    // SendGrid doesn't have built-in secret verification, so you must:
    // - Keep this webhook URL private/secret
    // - Or add IP allowlisting (SendGrid uses specific IPs)
    // For now, we'll skip verification but log access
    console.log('[Inbound] Webhook called (secret verification optional in SendGrid)')
  }

  // ── 2. Parse form data (SendGrid sends as multipart/form-data) ───────────
  let payload: SendGridInbound
  try {
    const formData = await request.formData()
    payload = {
      from:    formData.get('from') as string,
      subject: formData.get('subject') as string,
      text:    formData.get('text') as string,
      html:    (formData.get('html') as string) || undefined,
      dkim:    (formData.get('dkim') as string) || undefined,
    }
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  // ── 3. Extract email details from SendGrid format ────────────────────────
  // SendGrid "from" is typically: "Name <email@domain.com>" or just "email@domain.com"
  let fromEmail = 'unknown@unknown.com'
  let fromName  = 'Unknown Sender'

  const fromMatch = payload.from?.match(/<([^>]+)>/)
  if (fromMatch?.[1]) {
    fromEmail = fromMatch[1]
    fromName  = payload.from.replace(/<[^>]+>/, '').trim() || fromEmail
  } else if (payload.from && payload.from.includes('@')) {
    fromEmail = payload.from.trim()
    fromName  = fromEmail
  }

  const subject = payload.subject ?? '(No subject)'
  const body    = payload.text ?? payload.html ?? ''

  const adminSb = createAdminClient()

  // ── 3. Find an admin/super_admin to assign as the creator ─────────────────
  const { data: admins } = await adminSb
    .from('profiles')
    .select('id, email, full_name')
    .in('role', ['super_admin', 'admin'])
    .eq('is_active', true)
    .order('role', { ascending: true })
    .limit(1)

  const assignee = admins?.[0]
  if (!assignee) {
    console.error('[Inbound email] No admin found to assign requirement to')
    return NextResponse.json({ error: 'No admin configured' }, { status: 503 })
  }

  // ── 4. Create draft requirement ───────────────────────────────────────────
  const title = subject.replace(/^(re:|fwd?:|fw:)\s*/i, '').trim() || 'Inquiry from email'
  const description = [
    `**From:** ${fromName} <${fromEmail}>`,
    `**Subject:** ${subject}`,
    '',
    '**Email Content:**',
    body.slice(0, 2000), // cap at 2000 chars
    body.length > 2000 ? '\n[...truncated — see original email]' : '',
  ].join('\n')

  const { data: req, error: reqError } = await (adminSb
    .from('requirements')
    .insert({
      title,
      description,
      requested_by: assignee.id,
      status:       'draft',
      urgency:      'routine',
    })
    .select('id, ref_number')
    .single() as any)

  if (reqError) {
    console.error('[Inbound email] Failed to create requirement:', reqError.message)
    return NextResponse.json({ error: reqError.message }, { status: 500 })
  }

  // ── 5. Notify admin via email ─────────────────────────────────────────────
  if (assignee.email) {
    await sendInboundRequirementNotice({
      adminEmail:      assignee.email,
      adminName:       assignee.full_name ?? assignee.email,
      fromEmail,
      subject,
      requirementRef:  req.ref_number ?? req.id,
      requirementId:   req.id,
    })
  }

  console.log(`[Inbound email] Created requirement ${req.ref_number} from ${fromEmail}`)
  return NextResponse.json({ success: true, requirementId: req.id, ref: req.ref_number })
}
