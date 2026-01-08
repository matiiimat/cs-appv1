export default function CookiesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Cookie Policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          This Cookie Policy explains how Aidly uses cookies and similar technologies. We keep cookies minimal and
          limited to what is necessary to operate the platform.
        </p>

        <div>
          <h2 className="text-lg font-semibold">What We Use</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Essential cookies</span> for authentication/session and security.
            </li>
            <li>
              <span className="font-medium">Preferences</span> such as theme may be stored in localStorage (not cookies) to avoid
              hydration issues. These do not track you across sites.
            </li>
            <li>
              <span className="font-medium">No marketing/analytics cookies</span> are set by default at launch. If we add analytics
              later, this policy will be updated and you may be asked for consent.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Managing Cookies</h2>
          <p className="mt-2">
            You can control cookies through your browser settings and clear them at any time. Disabling essential cookies may
            impact functionality, including the ability to sign in.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">
            Questions? Email <a className="underline" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>.
          </p>
        </div>
      </section>
    </main>
  )
}

