# Email & Auto-PO Debugging Guide

## What Was Added

Comprehensive logging has been added to trace the approval flow and identify where emails and POs are getting lost.

### Logging Locations

#### 1. **actions/approvals.ts** — `decideApproval()` function
- **Start:** `[decideApproval] Started: approvalId=..., decision=..., selectedAccountsEmails=...`
- **User/Role Check:** `[decideApproval] User: {email}, role={role}, profile.id=...`
- **Approval Load:** `[decideApproval] Approval loaded: entity_type=..., entity_id=...`
- **Requirement Approval Flow:** Multiple logs for email sending, in-app notifications, auto-PO creation
- **Auto-PO Creation:** `[decideApproval] Auto-creating PO from requirement...` → Success or Error
- **Accounts Email Fetch:** `[decideApproval] All configured accounts emails: [...]`
- **Email Selection:** Shows which emails are selected and why
- **Email Send:** `[decideApproval] Sending requirement approval to X accounts`
- **Completion:** `[decideApproval] Completed successfully` or `FAILED with error: ...`

#### 2. **lib/email/send.ts** — Email sending functions
- **safeSend() - Entry:** `[safeSend] Starting email send: to=..., subject="..."`
- **safeSend() - API Key Check:** `[safeSend] SENDGRID_API_KEY is configured` OR `SENDGRID_API_KEY not set in environment`
- **safeSend() - Send Call:** `[safeSend] Calling sgMail.send()...`
- **safeSend() - Success:** `[Email sent via SendGrid] To: ... | Subject: ...`
- **safeSend() - Error:** `[safeSend] EMAIL SEND FAILED!` with full error details
- **sendRequirementApprovedToAccounts():** Each recipient logged individually
- **sendPOApprovedToAccounts():** Each recipient logged individually

---

## How to Test & Read Logs

### Step 1: Build the App
```bash
npm run build
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open Browser Console
- Open DevTools (F12)
- Go to **Console** tab
- **NOTE:** Some logs only appear in the **server terminal**, not browser console
- Keep both the browser console and terminal visible for full debugging

### Step 4: Trigger an Approval
1. Go to **Approvals** page
2. Find a pending requirement approval
3. Click **Approve**
4. Select which accountants to notify (if any are configured)
5. Click **Confirm Approve**

### Step 5: Watch for Logs

**In Browser Console, you'll see:**
- Network requests if something fails

**In Server Terminal, you'll see:**
```
[decideApproval] Started: approvalId=..., decision=approve, selectedAccountsEmails=[...]
[decideApproval] User: user@example.com, role=approver, profile.id=...
[decideApproval] Approval loaded: entity_type=requirement, entity_id=...
[decideApproval] Requirement approval flow starting...
[decideApproval] Sending approval email to requester: requester@example.com
[decideApproval] Auto-creating PO from requirement abc123...
[decideApproval] Auto-PO created successfully: id=xyz789, po_number=PO-001
[decideApproval] Fetching accounts emails...
[decideApproval] All configured accounts emails: ["finance@company.com","accounts@company.com"]
[sendRequirementApprovedToAccounts] Starting: emails=["finance@company.com","accounts@company.com"], ref=REQ-001, poId=xyz789
[sendRequirementApprovedToAccounts] Generating email template...
[sendRequirementApprovedToAccounts] Template generated, subject="..."
[sendRequirementApprovedToAccounts] Sending to 2 recipients...
[sendRequirementApprovedToAccounts] Sending to finance@company.com...
[safeSend] Starting email send: to=finance@company.com, subject="..."
[safeSend] SENDGRID_API_KEY is configured
[safeSend] EMAIL_FROM: noreply@company.com
[safeSend] Calling sgMail.send()...
[Email sent via SendGrid] To: finance@company.com | Subject: ...
[decideApproval] Completed successfully
```

---

## Troubleshooting Decision Tree

### ❌ Logs say "SENDGRID_API_KEY not set in environment"
**Problem:** Environment variable not loaded
**Fix:**
1. Check `.env.local` has `SENDGRID_API_KEY=...`
2. Restart dev server: `npm run dev`
3. Verify with: `console.log(process.env.SENDGRID_API_KEY)` in browser console

### ❌ Logs show "All configured accounts emails: []"
**Problem:** No accounts emails configured in database or .env
**Fix:**
1. Go to **Settings** and add email addresses in "Accounts Emails"
2. OR check `ACCOUNTS_EMAILS=...` in `.env.local`
3. Refresh browser and try again

### ❌ Logs say "EMAIL SEND FAILED!" with error code
**Problem:** SendGrid API rejected the request
**Check the error details:**
- `"code":"InvalidEmails"` → Email address format is wrong
- `"code":"Unauthorized"` → API key is invalid
- `"code":"Forbidden"` → API key doesn't have email send permission
- Other → Check SendGrid API limits, domain verification, etc.

### ❌ Logs show "Auto-PO creation failed: ..."
**Problem:** Database error when creating PO
**Fix:**
1. Check the error message in logs
2. Verify `purchase_orders` table exists with all required columns
3. Check RLS policies on `purchase_orders` allow `approver` role
4. Verify `preferred_vendor_id` is nullable (was added in migration 017)

### ❌ PO was created (logs confirm it) but doesn't appear in UI
**Problem:** RLS policy blocking visibility OR page not revalidated
**Fix:**
1. Verify RLS on `purchase_orders` allows procurement team to read/write
2. Hard-refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Check SQL:
   ```sql
   SELECT COUNT(*) FROM purchase_orders WHERE status='draft';
   ```
   If PO exists in DB but not in UI, it's an RLS issue

---

## What Each Component Does

### Frontend (approval-action-dialog.tsx)
1. **Loads emails** from `getAccountsEmailsList()` when approve dialog opens
2. **Allows approver** to select/deselect which accountants to notify
3. **Passes selectedEmails** to `decideApproval()` server action
4. **For rejections** passes `undefined` (no email selection)

### Backend (actions/approvals.ts)
1. **Checks permissions** (user must have `approval.approve` permission)
2. **Loads approval record** from database
3. **For requirements:**
   - Transitions requirement to `approved` or `rejected`
   - Sends email to original requester
   - Creates in-app notification
   - **Auto-creates draft PO** from requirement items
   - Fetches all configured accounts emails
   - Uses approver's selection if provided, otherwise sends to all
   - Sends PO notification email to selected accounts
4. **For purchase orders:**
   - Transitions PO to `approved`
   - Sends email to procurement officer who created it
   - Sends email to selected accounts team

### Email Layer (lib/email/send.ts)
1. **safeSend():** Core function that calls SendGrid API
2. **sendRequirementApprovedToAccounts():** Loops through emails and sends to each
3. **sendPOApprovedToAccounts():** Loops through emails and sends to each

---

## Quick Checklist

Before testing, verify:
- [ ] `.env.local` has `SENDGRID_API_KEY=...`
- [ ] `.env.local` has `SENDGRID_FROM_EMAIL=...`
- [ ] Settings page shows accounts emails configured
- [ ] Dev server restarted after `.env.local` changes
- [ ] Using an approval that has `entity_type='requirement'`
- [ ] Migration 017 has run (adds `preferred_vendor_id` nullable column)
- [ ] Approver role has permission to approve (check roles table)

---

## Log Output Examples

### ✅ Successful Flow
```
[decideApproval] Started: approvalId=..., decision=approve, selectedAccountsEmails=["finance@co.com"]
[decideApproval] Fetching accounts emails...
[decideApproval] All configured accounts emails: ["finance@co.com","accounts@co.com"]
[decideApproval] Emails to notify: ["finance@co.com"]
[decideApproval] Auto-creating PO from requirement...
[decideApproval] Auto-PO created successfully: id=po-123, po_number=PO-001
[sendRequirementApprovedToAccounts] Starting: emails=["finance@co.com"],...
[safeSend] Starting email send: to=finance@co.com, subject="..."
[safeSend] SENDGRID_API_KEY is configured
[safeSend] Calling sgMail.send()...
[Email sent via SendGrid] To: finance@co.com | Subject: ...
[decideApproval] Completed successfully
```

### ❌ Failed: No Emails Sent
```
[decideApproval] Started: ...
[decideApproval] Fetching accounts emails...
[decideApproval] All configured accounts emails: []  ← PROBLEM: Empty array
[decideApproval] Emails to notify: []
[sendRequirementApprovedToAccounts] No emails provided, skipping
```

### ❌ Failed: API Key Missing
```
[decideApproval] Started: ...
[safeSend] Starting email send: to=finance@co.com, subject="..."
[safeSend] SENDGRID_API_KEY not set in environment  ← PROBLEM
[Email SKIP — no key] To: finance@co.com | Subject: ...
```

### ❌ Failed: SendGrid Error
```
[safeSend] Starting email send: to=finance@co.com, subject="..."
[safeSend] SENDGRID_API_KEY is configured
[safeSend] Calling sgMail.send()...
[safeSend] EMAIL SEND FAILED! {
  to: 'finance@co.com',
  subject: '...',
  errorMessage: 'Invalid email address',
  errorCode: 'InvalidEmails'
}
```

---

## Next Steps After Testing

1. **Run an approval** and capture the full log output
2. **Share the logs** with the team
3. **Identify the first failure point** using the logs
4. **Fix accordingly:**
   - If `[safeSend] EMAIL SEND FAILED!` → Check SendGrid API key/permissions
   - If `All configured accounts emails: []` → Configure emails in Settings
   - If auto-PO creation fails → Check migration 017 ran, check RLS policies
   - If PO created but not visible → Check RLS on `purchase_orders` table

