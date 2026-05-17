"use client";

import Link from "next/link";
import NriWaitlistForm from "./NriWaitlistForm";

const pillars = [
  {
    icon: "🎯",
    title: "Know your real FIRE date",
    desc: "Most calculators ignore EPF lock-ins and NPS rules. FIREpath models when each rupee unlocks — so your retirement plan accounts for what you can actually access at 42 vs 60.",
  },
  {
    icon: "📊",
    title: "See what's actually moving you forward",
    desc: "Your cash surplus, your portfolio quality, your savings rate — broken down into the specific levers that change your retirement date by years, not days.",
  },
  {
    icon: "📈",
    title: "Watch your progress, month by month",
    desc: "Every snapshot you take is saved. See your corpus grow, your FIRE date move closer, and milestones celebrated as they happen.",
  },
];

const features = [
  {
    icon: "📊",
    title: "FIRE calculator",
    desc: "Inflation-adjusted targets using real Indian return assumptions across EPF, NPS, PPF, equities, gold, and FDs.",
  },
  {
    icon: "🔒",
    title: "Locked vs liquid",
    desc: "EPF, NPS, and PPF lock-in modelled accurately. See exactly what you can access at retirement vs what unlocks later.",
  },
  {
    icon: "🤖",
    title: "AI portfolio analysis",
    desc: "Health score, strengths, concerns, and concrete action items — tailored to your actual holdings.",
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

const tiers = [
  {
    name: "Explorer",
    price: "Free",
    period: "forever",
    desc: "Get started with the essentials.",
    features: ["1 portfolio snapshot", "Basic FIRE dashboard", "Corpus target calculator"],
    cta: "Start free →",
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
      "AI portfolio analysis",
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

const MOCK_CARDS = [
  { label: "Total corpus",   value: "₹81.1L",  sub: "All holdings" },
  { label: "Liquid corpus",  value: "₹49.8L",  sub: "61% of total" },
  { label: "FIRE target",    value: "₹6.1 Cr", sub: "At age 41" },
  { label: "Projected FIRE", value: "Age 41",  sub: "9 months ahead", highlight: true },
];

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA", color: "#1A1A2E" }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(255,255,255,0.90)", borderBottom: "1px solid #E2E2EE" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl" style={{ color: "#1A1A2E" }}>
            FIRE<span className="text-orange-500">path</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm px-3 py-2 transition-colors hover:opacity-70" style={{ color: "#6B6B8A" }}>
              Sign in
            </Link>
            <Link href="/auth" className="bg-orange-500 hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-orange-200 mb-6" style={{ background: "#FFF7ED" }}>
          🇮🇳 Built for Indian investors
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6" style={{ color: "#1A1A2E" }}>
          Plan your financial independence —<br />
          <span className="text-orange-500">built for India.</span>
        </h1>

        <p className="text-lg mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: "#6B6B8A" }}>
          Track your FIRE journey across EPF, NPS, PPF, stocks, mutual funds, gold, and US holdings.
          See exactly when you&apos;ll retire, how much you need, and what&apos;s slowing you down.
          Updated every month.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth" className="bg-orange-500 hover:opacity-90 text-white font-medium text-base px-7 py-3 rounded-xl transition-all">
            Start free →
          </Link>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="text-base px-7 py-3 rounded-xl transition-all hover:opacity-70"
            style={{ border: "1px solid #E2E2EE", color: "#1A1A2E", background: "white" }}
          >
            See how it works ↓
          </button>
        </div>
        <p className="text-xs mt-4" style={{ color: "#9B9BB8" }}>
          Takes 90 seconds · No credit card · Your data stays private
        </p>

        {/* ── Hero dashboard mockup ─────────────────────────────────── */}
        <div className="relative mx-auto max-w-4xl mt-14 px-4">
          <div
            className="rounded-xl overflow-hidden shadow-xl"
            style={{ border: "1px solid #E2E2EE", transform: "perspective(1000px) rotateX(2deg)" }}
          >
            {/* Browser chrome */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#F4F4F8" }}>
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="ml-4 flex-1 rounded px-3 py-1 text-xs" style={{ background: "#E2E2EE", color: "#9B9BB8" }}>
                app.firepath.in/dashboard
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6" style={{ background: "#F8F8FC" }}>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {MOCK_CARDS.map(card => (
                  <div key={card.label} className="rounded-lg p-3" style={{ background: "white", border: "1px solid #E2E2EE" }}>
                    <div className="text-xs mb-1" style={{ color: "#6B6B8A" }}>{card.label}</div>
                    <div className={`text-lg font-semibold ${card.highlight ? "text-green-600" : ""}`} style={card.highlight ? {} : { color: "#1A1A2E" }}>
                      {card.value}
                    </div>
                    <div className="text-xs" style={{ color: "#9B9BB8" }}>{card.sub}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-4" style={{ background: "white", border: "1px solid #E2E2EE" }}>
                <div className="text-xs mb-3" style={{ color: "#9B9BB8" }}>CORPUS PROJECTION</div>
                <div className="flex items-end gap-1 h-20">
                  {[15, 20, 28, 35, 45, 58, 72, 88, 100, 88].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="rounded-sm"
                        style={{
                          height: `${h}%`,
                          background: i < 7
                            ? "linear-gradient(to top, #F97316, #FDBA74)"
                            : "rgba(249,115,22,0.15)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs mt-2" style={{ color: "#9B9BB8" }}>
                  <span>Age 32</span>
                  <span>🔥 FIRE at 41</span>
                  <span>Age 55</span>
                </div>
              </div>
            </div>
          </div>
          {/* Subtle glow */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-10 bg-orange-400 rounded-full" />
        </div>
      </section>

      {/* ── Social proof bar ───────────────────────────────────────── */}
      <div className="py-6 my-12" style={{ borderTop: "1px solid #E2E2EE", borderBottom: "1px solid #E2E2EE" }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm" style={{ color: "#9B9BB8" }}>
            <span>🇮🇳 Built for Indian professionals</span>
            <span className="hidden sm:block">·</span>
            <span>NRIs with dual portfolios</span>
            <span className="hidden sm:block">·</span>
            <span>Startup employees with ESOPs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-500">★★★★★</span>
            <span className="italic" style={{ color: "#6B6B8A" }}>&ldquo;Finally a FIRE tool that understands EPF lock-in&rdquo;</span>
          </div>
        </div>
      </div>

      {/* ── Value pillars ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9B9BB8" }}>Why FIREpath</p>
          <h2 className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>Your complete FIRE picture</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map(p => (
            <div key={p.title} className="rounded-xl p-6" style={{ background: "white", border: "1px solid #E2E2EE" }}>
              <div className="text-3xl mb-4">{p.icon}</div>
              <div className="font-semibold mb-2 text-lg" style={{ color: "#1A1A2E" }}>{p.title}</div>
              <p className="text-sm leading-relaxed" style={{ color: "#6B6B8A" }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-20" style={{ background: "#F4F4F8", borderTop: "1px solid #E2E2EE", borderBottom: "1px solid #E2E2EE" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9B9BB8" }}>Features</p>
            <h2 className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>Everything for your FIRE journey</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="rounded-xl p-5" style={{ background: "white", border: "1px solid #E2E2EE" }}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-1.5" style={{ color: "#1A1A2E" }}>{f.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: "#6B6B8A" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9B9BB8" }}>Pricing</p>
          <h2 className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>Simple, transparent pricing</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {tiers.map(t => (
            <div
              key={t.name}
              className="rounded-xl p-6 relative"
              style={{
                border: t.highlight ? "1px solid rgba(249,115,22,0.4)" : "1px solid #E2E2EE",
                background: t.highlight ? "#FFF7ED" : "white",
                boxShadow: t.highlight ? "0 0 32px rgba(249,115,22,0.08)" : "none",
              }}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <div className="font-semibold mb-1" style={{ color: "#1A1A2E" }}>{t.name}</div>
              <div className="flex items-end gap-1 mb-0.5">
                <span className="text-3xl font-bold" style={{ color: "#1A1A2E" }}>{t.price}</span>
                <span className="text-sm mb-1" style={{ color: "#9B9BB8" }}>{t.period}</span>
              </div>
              {t.usd && <div className="text-xs mb-3" style={{ color: "#9B9BB8" }}>{t.usd}</div>}
              <p className="text-sm mb-5" style={{ color: "#6B6B8A" }}>{t.desc}</p>
              <ul className="space-y-2 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#1A1A2E" }}>
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              {t.soon ? (
                <NriWaitlistForm />
              ) : (
                <Link
                  href={t.href}
                  className={`block w-full text-center text-sm font-medium px-4 py-2.5 rounded-xl transition-all ${
                    t.highlight ? "bg-orange-500 hover:opacity-90 text-white" : "hover:opacity-70"
                  }`}
                  style={t.highlight ? {} : { border: "1px solid #E2E2EE", color: "#1A1A2E" }}
                >
                  {t.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="py-12 mt-4" style={{ borderTop: "1px solid #E2E2EE" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div>
              <div className="text-lg font-semibold mb-2" style={{ color: "#1A1A2E" }}>
                FIRE<span className="text-orange-500">path</span>
              </div>
              <div className="text-sm max-w-xs" style={{ color: "#6B6B8A" }}>
                FIREpath was built for Indians serious about financial independence.
                We model every rupee with the rules that actually apply to it.
              </div>
            </div>
            <div className="flex gap-12 text-sm" style={{ color: "#6B6B8A" }}>
              <div className="flex flex-col gap-2">
                <span className="font-medium mb-1" style={{ color: "#1A1A2E" }}>Product</span>
                <a href="/auth" className="hover:opacity-70 transition-opacity">Get started</a>
                <a href="#features" className="hover:opacity-70 transition-opacity" onClick={e => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>Features</a>
                <a href="#pricing" className="hover:opacity-70 transition-opacity" onClick={e => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>Pricing</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-medium mb-1" style={{ color: "#1A1A2E" }}>Legal</span>
                <Link href="/privacy" className="hover:opacity-70 transition-opacity">Privacy policy</Link>
                <Link href="/terms" className="hover:opacity-70 transition-opacity">Terms of use</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs" style={{ borderTop: "1px solid #E2E2EE", color: "#9B9BB8" }}>
            <span>© 2026 FIREpath. All rights reserved.</span>
            <span>FIREpath is a financial education tool. Not SEBI-registered investment advice. Consult a SEBI-registered advisor before making financial decisions.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
