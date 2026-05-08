import { redirect } from "next/navigation";
import Link from "next/link";

// TODO: remove BYPASS_AUTH before production launch
if (process.env.BYPASS_AUTH === "true") redirect("/dashboard");

const features = [
  {
    icon: "📊",
    title: "FIRE calculator",
    desc: "Inflation-adjusted targets using real Indian return assumptions — not US-centric defaults.",
  },
  {
    icon: "🔒",
    title: "Locked vs liquid",
    desc: "EPF, NPS, and PPF lock-in modelled. See what's actually accessible at retirement.",
  },
  {
    icon: "🤖",
    title: "AI portfolio analysis",
    desc: "Health score, strengths, concerns, and concrete action items — powered by Gemini.",
  },
  {
    icon: "🏆",
    title: "Milestone tracker",
    desc: "₹1 Cr → ₹10 Cr projections that update automatically with every new snapshot.",
  },
  {
    icon: "🌏",
    title: "NRI dual portfolio",
    desc: "Coming soon. Track INR + USD investments side-by-side with tax context.",
  },
  {
    icon: "📈",
    title: "Progress history",
    desc: "Watch your FIRE date move closer over time. Charts across every snapshot.",
  },
];

const problems = [
  {
    tool: "ProjectionLab",
    issue: "Built for the US. Doesn't model EPF lock-in, NPS annuity rules, or Indian tax slabs.",
  },
  {
    tool: "Groww / Kuvera",
    issue: "Great for investing. Zero FIRE planning — no corpus target, no retirement age projection.",
  },
  {
    tool: "Spreadsheets",
    issue: "Manual, error-prone, and they don't send milestone alerts when you cross ₹1 Cr liquid.",
  },
];

const tiers = [
  {
    name: "Explorer",
    price: "Free",
    period: "forever",
    desc: "Get started with the essentials.",
    features: ["1 portfolio snapshot", "Basic FIRE dashboard", "Corpus target calculator"],
    cta: "Start free",
    href: "/auth",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/ month",
    usd: "or $9/mo",
    desc: "Everything you need to reach FIRE.",
    features: [
      "Unlimited snapshots + full history",
      "AI portfolio analysis (Gemini)",
      "Milestone alerts",
      "Year-by-year projection charts",
    ],
    cta: "Get Pro",
    href: "/auth",
    highlight: true,
  },
  {
    name: "NRI Pro",
    price: "$19",
    period: "/ month",
    desc: "For Indians abroad managing dual portfolios.",
    features: ["Everything in Pro", "INR + USD side-by-side", "Tax residency tools", "Priority support"],
    cta: "Coming soon",
    href: "#",
    highlight: false,
    soon: true,
  },
];

export default function Landing() {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-ink">
            FIRE<span className="text-brand-500">path</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="btn-ghost">Sign in</Link>
            <Link href="/auth" className="btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-500 text-xs font-semibold px-3 py-1.5 rounded-full border border-brand-100 mb-6">
          🇮🇳 India-first FIRE planning
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-ink leading-[1.1] tracking-tight mb-6">
          Plan your retirement.<br />
          <span className="text-brand-500">The Indian way.</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto mb-10">
          EPF, NPS, PPF, US stocks, Indian equities — modelled together in one FIRE planner
          built for Indian professionals and NRIs.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth" className="btn-primary text-base px-7 py-3">
            Start free — no credit card
          </Link>
          <Link href="#features" className="btn-secondary text-base px-7 py-3">
            See how it works
          </Link>
        </div>
        <p className="text-xs text-dim mt-4">Free tier available · Pro at ₹499/mo</p>
      </section>

      {/* Social proof strip */}
      <div className="bg-surface border-y border-slate-100 py-4">
        <p className="text-center text-sm text-muted">
          Built for <strong className="text-ink">salaried professionals</strong>,{" "}
          <strong className="text-ink">startup employees with ESOPs</strong>, and{" "}
          <strong className="text-ink">NRIs managing dual portfolios</strong>
        </p>
      </div>

      {/* Problem */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="section-title mb-3">The gap in the market</p>
          <h2 className="text-3xl font-bold text-ink">Existing tools weren't built for India</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {problems.map(p => (
            <div key={p.tool} className="card">
              <div className="font-semibold text-ink mb-2">{p.tool}</div>
              <p className="text-sm text-muted leading-relaxed">{p.issue}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-surface py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="section-title mb-3">Features</p>
            <h2 className="text-3xl font-bold text-ink">Everything for your FIRE journey</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="card">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold text-ink mb-1.5">{f.title}</div>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="section-title mb-3">Pricing</p>
          <h2 className="text-3xl font-bold text-ink">Simple, transparent pricing</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {tiers.map(t => (
            <div
              key={t.name}
              className={`card relative ${t.highlight ? "border-brand-500 ring-1 ring-brand-500/20 shadow-lg" : ""}`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <div className="font-semibold text-ink mb-1">{t.name}</div>
              <div className="flex items-end gap-1 mb-0.5">
                <span className="text-3xl font-bold text-ink">{t.price}</span>
                <span className="text-muted text-sm mb-1">{t.period}</span>
              </div>
              {t.usd && <div className="text-xs text-muted mb-3">{t.usd}</div>}
              <p className="text-sm text-muted mb-5">{t.desc}</p>
              <ul className="space-y-2 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <span className="text-emerald-500 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              {t.soon ? (
                <button disabled className="btn-secondary w-full opacity-60 cursor-not-allowed">{t.cta}</button>
              ) : (
                <Link href={t.href} className={`${t.highlight ? "btn-primary" : "btn-secondary"} w-full text-center`}>
                  {t.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-surface py-10">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-2">
          <div className="font-bold text-ink">FIRE<span className="text-brand-500">path</span></div>
          <p className="text-xs text-dim">
            FIREpath is a financial literacy tool. Not SEBI-registered investment advice.
          </p>
          <p className="text-xs text-dim">© 2026 FIREpath. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
