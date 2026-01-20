export default function CookiesPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Cookie Policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated: January 20, 2026</p>

      <section className="mt-8 space-y-8 text-sm leading-relaxed">
        <p>
          This Cookie Policy explains how Aidly (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar tracking technologies
          when you visit our website. By using our website, you consent to the use of cookies as described in this policy.
        </p>

        <div>
          <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
          <p>
            Cookies are small text files that are placed on your device when you visit a website. They help websites
            recognize your device and remember information about your visit, such as your preferences and login status.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Cookies We Use</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">Essential Cookies (Always Active)</h3>
              <p className="mb-3">These cookies are necessary for the website to function and cannot be disabled.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-white/[0.1]">
                  <thead className="bg-slate-50 dark:bg-white/[0.03]">
                    <tr>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Cookie Name</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Purpose</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Duration</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">better_auth.session_token</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Keeps you signed in</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">8 hours</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Aidly (First-party)</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-white/[0.02]">
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">aidly-theme</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Remembers dark/light mode</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Permanent</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Aidly (First-party)</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">aidly-cookie-consent</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Stores your cookie preferences</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">1 year</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Aidly (First-party)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">Analytics Cookies (Requires Consent)</h3>
              <p className="mb-3">Help us understand how visitors use our website to improve user experience.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-white/[0.1]">
                  <thead className="bg-slate-50 dark:bg-white/[0.03]">
                    <tr>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Cookie Name</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Purpose</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Duration</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">__vercel_live_metrics</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Anonymous performance monitoring</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Session</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">Vercel (Third-party)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400">Marketing Cookies (Requires Consent)</h3>
              <p className="mb-3">Used to measure advertising effectiveness and track conversions from our ads.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-white/[0.1]">
                  <thead className="bg-slate-50 dark:bg-white/[0.03]">
                    <tr>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Cookie Name</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Purpose</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Duration</th>
                      <th className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 text-left">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">li_fat_id</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn conversion tracking</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">30 days</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn (Third-party)</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-white/[0.02]">
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">UserMatchHistory</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn ad targeting</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">30 days</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn (Third-party)</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">AnalyticsSyncHistory</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn analytics synchronization</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">30 days</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn (Third-party)</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-white/[0.02]">
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2 font-mono text-xs">li_sugr</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn browser identifier</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">90 days</td>
                      <td className="border border-slate-200 dark:border-white/[0.1] px-4 py-2">LinkedIn (Third-party)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Managing Your Cookie Preferences</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Via Our Cookie Banner</h3>
              <p>
                You can accept or reject non-essential cookies when you first visit our website. You can change your
                preferences at any time by clearing your browser&apos;s local storage and refreshing the page to see the
                cookie banner again.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Via Your Browser Settings</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Note: Disabling essential cookies may impact your ability to use certain features of our website.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Third-Party Cookies</h2>
          <p className="mb-3">We use cookies from the following third-party services:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>LinkedIn:</strong> For conversion tracking and measuring advertising effectiveness.{" "}
              <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                LinkedIn Privacy Policy
              </a>
              {" | "}
              <a href="https://www.linkedin.com/help/linkedin/answer/62931" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                Opt-out of LinkedIn tracking
              </a>
            </li>
            <li>
              <strong>Vercel:</strong> For anonymous performance monitoring and analytics.{" "}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                Vercel Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Essential cookies:</strong> Session-based or up to 8 hours</li>
            <li><strong>Preference cookies:</strong> Until deleted by user (permanent)</li>
            <li><strong>Analytics cookies:</strong> Session-based</li>
            <li><strong>Marketing cookies:</strong> 30-90 days</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. The &quot;Last updated&quot; date at the top of this page
            reflects when this policy was last revised. Changes become effective when posted.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>
            If you have questions about our use of cookies, please contact us at{" "}
            <a className="underline text-blue-600 dark:text-blue-400" href="mailto:support@aidlyhq.com">
              support@aidlyhq.com
            </a>.
          </p>
        </div>
      </section>
    </main>
  )
}

