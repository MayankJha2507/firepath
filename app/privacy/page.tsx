import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="bg-[#080E1C] min-h-screen text-white">
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-white/8" style={{ background: "rgba(8,14,28,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="font-bold text-xl text-white">
            FIRE<span className="text-orange-500">path</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What we collect</h2>
            <p>
              FIREpath collects your email address for account creation, and the financial
              data you voluntarily enter — investment amounts, asset categories, target
              retirement age, and monthly savings. We do not collect PAN numbers, Aadhaar,
              bank account details, or any government-issued identifiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How we use your data</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To calculate and display your FIRE projections and corpus targets.</li>
              <li>To generate AI portfolio analysis via the Google Gemini API. Your portfolio data is sent to Gemini for this purpose and is subject to Google's data processing terms.</li>
              <li>To send milestone notifications and product updates (you can unsubscribe at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data storage</h2>
            <p>
              Your data is stored in Supabase (PostgreSQL) hosted on AWS infrastructure.
              All connections are encrypted in transit (TLS). We do not sell, rent, or
              share your personal data with third parties for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your rights</h2>
            <p>
              You can delete your account and all associated data at any time from
              Settings → Delete Account. This permanently removes your profile, all
              portfolio snapshots, AI analyses, and holdings from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              For privacy questions, email us at{" "}
              <span className="text-orange-400">support@firepath.in</span>. We respond
              within 2 business days.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/8 text-xs text-white/30">
          FIREpath is a financial literacy tool. Not SEBI-registered investment advice.
        </div>
      </div>
    </div>
  );
}
