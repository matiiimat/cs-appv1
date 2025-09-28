export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          By using Aidly, you agree to these terms. You must comply with applicable laws, use the service responsibly, 
          and not attempt to disrupt or reverse engineer the platform.
        </p>
        <p>
          Subscriptions renew automatically unless canceled. Billing is handled by our payment provider and subject to their terms.
        </p>
        <p>
          We may update these terms from time to time. Continued use constitutes acceptance of the updated terms.
        </p>
      </section>
    </main>
  )
}

