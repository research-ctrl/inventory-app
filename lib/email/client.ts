import sgMail from '@sendgrid/mail'

if (!process.env.SENDGRID_API_KEY) {
  console.warn('[Email] SENDGRID_API_KEY is not set — emails will be skipped.')
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

/** The "from" address shown on all outgoing emails.
 *  Set EMAIL_FROM in your env (must be a verified SendGrid sender identity).
 *  Example: SMLS <noreply@yourdomain.com> */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? 'SMLS <noreply@example.com>'

/** Base URL for deep-links inside emails. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export { sgMail }
