import sgMail from '@sendgrid/mail'

const apiKey = process.env.SENDGRID_API_KEY || ''
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'login@aidly.me'

if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export async function sendMagicLinkEmail(to: string, url: string) {
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[sendgrid] Missing SENDGRID_API_KEY. Dev fallback: logging magic link')
      console.log(`[magic-link] To: ${to} URL: ${url}`)
      return
    }
    throw new Error('SENDGRID_API_KEY is required to send emails')
  }

  const logoUrl = 'https://aidly.me/logo.png'

  const subject = 'Sign in to Aidly'

  const text = [
    "Let's get you signed in",
    'Sign in with the secure link below',
    `Sign in to Aidly: ${url}`,
    "If you didn't request this email, you can safely ignore it.",
    "If you're experiencing issues, please contact Aidly Support: support@aidlyhq.com",
  ].join('\n\n')

  const html = `
  <body style="margin:0;padding:24px;background-color:#f5f5f7;">
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center;">
        <img src="${logoUrl}" alt="Aidly" width="128" height="128" style="display:block;margin:0 auto 16px auto;width:128px;height:128px;" />
        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:28px;color:#0f172a;font-weight:700;">Let's get you signed in</h1>
        <p style="margin:0 0 24px 0;color:#475569;font-size:14px;">Sign in with the secure link below</p>
        <a href="${url}" style="background:#3872b9;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600;">Sign in to Aidly</a>
        <p style="margin:24px 0 0 0;color:#64748b;font-size:12px;">If the button doesn't work, copy and paste this URL:</p>
        <p style="margin:8px 0 0 0;word-break:break-all;"><a href="${url}" style="color:#3872b9;text-decoration:underline;">${url}</a></p>
      </div>
      <p style="text-align:center;color:#64748b;font-size:12px;margin:16px 8px 0 8px;">
        If you didn't request this email, you can safely ignore it.<br/>
        If you're experiencing issues, please contact <a href="mailto:support@aidlyhq.com" style="color:#3872b9;text-decoration:underline;">Aidly Support</a>.
      </p>
    </div>
  </body>
  `

  const msg = {
    to,
    from: fromEmail,
    subject,
    text,
    html,
  }
  await sgMail.send(msg)
}

export async function sendAccountDeletionEmail(
  to: string,
  stats: { messagesDeleted: number; usersDeleted: number }
) {
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[sendgrid] Missing SENDGRID_API_KEY. Dev fallback: logging deletion email')
      console.log(`[deletion-email] To: ${to}, Stats: ${JSON.stringify(stats)}`)
      return
    }
    throw new Error('SENDGRID_API_KEY is required to send emails')
  }

  const logoUrl = 'https://aidly.me/logo.png'
  const subject = 'Your Aidly account has been deleted'

  const text = [
    'Account Deletion Confirmed',
    'Your Aidly account and all associated data have been permanently deleted.',
    `Deleted: ${stats.messagesDeleted} messages, ${stats.usersDeleted} users`,
    'This action cannot be undone.',
  ].join('\n\n')

  const html = `
  <body style="margin:0;padding:24px;background-color:#f5f5f7;">
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center;">
        <img src="${logoUrl}" alt="Aidly" width="128" height="128" style="display:block;margin:0 auto 16px auto;width:128px;height:128px;" />
        <h1 style="margin:0 0 8px 0;font-size:22px;line-height:28px;color:#0f172a;font-weight:700;">Account Deletion Confirmed</h1>
        <p style="margin:0 0 16px 0;color:#475569;font-size:14px;">Your Aidly account and all associated data have been permanently deleted.</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:0 0 16px 0;">
          <p style="margin:0;color:#64748b;font-size:13px;">
            <strong>${stats.messagesDeleted}</strong> messages deleted<br/>
            <strong>${stats.usersDeleted}</strong> users removed
          </p>
        </div>
        <p style="margin:0;color:#64748b;font-size:12px;">This action cannot be undone.</p>
      </div>
    </div>
  </body>
  `

  const msg = {
    to,
    from: fromEmail,
    subject,
    text,
    html,
  }
  await sgMail.send(msg)
}
