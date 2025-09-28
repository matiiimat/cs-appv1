import sgMail from '@sendgrid/mail'

const apiKey = process.env.SENDGRID_API_KEY || ''
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'login@aidly.me'

if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export async function sendMagicLinkEmail(to: string, url: string) {
  if (!apiKey) throw new Error('SENDGRID_API_KEY is required to send emails')
  const msg = {
    to,
    from: fromEmail,
    subject: 'Sign in to Aidly',
    text: `Sign in to Aidly by clicking this link: ${url}`,
    html: `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#111">
        <h2>Sign in to Aidly</h2>
        <p>Click the button below to sign in. This link expires shortly.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#3872b9;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Sign in</a>
        </p>
        <p>If the button doesn't work, copy and paste this URL:</p>
        <p><a href="${url}">${url}</a></p>
      </div>
    `,
  }
  await sgMail.send(msg)
}

