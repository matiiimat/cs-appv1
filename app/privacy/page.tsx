export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          We respect your privacy. We collect only the data necessary to provide and improve Aidly. 
          We do not sell personal data.
        </p>
        <p>
          Data we process may include account information, usage analytics, and billing data processed by our payment provider.
        </p>
        <p>
          For questions or requests, contact us at <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.
        </p>
      </section>
    </main>
  )
}

