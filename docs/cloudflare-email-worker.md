Cloudflare Email Workers — Inbound Routing
=========================================

Goal
- Receive emails sent to `support+<orgId>@${INBOUND_DOMAIN}` and post them to your app at `/api/email/inbound/cloudflare`.

Prerequisites
- Domain on Cloudflare (e.g., `aidly.me`).
- Subdomain for inbound (e.g., `inbound.aidly.me`).
- App deployed with a public HTTPS URL.

Steps
1) Create MX record
- In Cloudflare DNS, add an MX for `inbound.aidly.me` pointing to Cloudflare’s Email Routing (select Email Routing enabled). Priority 10.

2) Enable Email Routing
- Cloudflare Dashboard → Email → Email Routing → Enable.
- Add a rule with:
  - Custom address: `support+*@inbound.aidly.me`
  - Action: Send to Worker
  - Worker: create a new Worker (next step) and select it here.

3) Create Worker
- Create a Worker named `inbound-email-router` with the following script:

```js
export default {
  async email(message, env, ctx) {
    try {
      // Extract basic headers
      const subject = message.headers.get('subject') || ''
      const from = message.headers.get('from') || ''
      const to = message.headers.get('to') || ''

      // Best-effort: read raw MIME as text (may be large)
      let rawText = ''
      try {
        const ab = await new Response(message.raw).arrayBuffer()
        // Convert to string best-effort; body parsing is MVP-only
        rawText = new TextDecoder('utf-8').decode(ab)
      } catch (e) {
        // Ignore
      }

      // Naive plain text extraction (prefer text/plain part)
      let text = ''
      const plainMarker = /Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(\r?\n--|$)/i
      const m = rawText.match(plainMarker)
      if (m && m[1]) {
        text = m[1].trim()
      } else {
        // Fallback: body after headers
        const splitIdx = rawText.indexOf('\n\n')
        if (splitIdx !== -1) text = rawText.slice(splitIdx + 2).trim()
      }

      const payload = {
        to,
        from: from.replace(/.*<([^>]+)>.*/, '$1'),
        fromName: (from.match(/"?([^"<]*)"?\s*</) || [])[1] || '',
        subject,
        text,
        headers: Object.fromEntries(message.headers),
      }

      const res = await fetch(env.INBOUND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Token': env.INBOUND_WORKER_TOKEN,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error('Inbound post failed:', res.status)
        message.setReject(`Inbound post failed: ${res.status}`)
      }
    } catch (err) {
      console.error('Worker error:', err)
      message.setReject('Worker error')
    }
  }
}
```

4) Add Worker variables (Settings → Variables & Secrets)
- `INBOUND_ENDPOINT`: `https://<your-app-domain>/api/email/inbound/cloudflare`
- `INBOUND_WORKER_TOKEN`: same value set in your app env.

5) Test
- Send an email to `support+<orgId>@inbound.aidly.me`.
- Verify it appears in your app Inbox/Triage.

Notes
- This is an MVP parser. For rich HTML and attachments, extend the Worker to parse MIME more robustly or forward raw MIME to a parser service.
- PII is handled server-side: we send minimal fields; the app encrypts PII before storing.

