"use client";

import Link from "next/link";
import NriWaitlistForm from "./NriWaitlistForm";

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

const MOCK_CARDS = [
  { label: "Total corpus",   value: "₹81.1L",  sub: "All holdings" },
  { label: "Liquid corpus",  value: "₹49.8L",  sub: "61% of total" },
  { label: "FIRE target",    value: "₹6.1 Cr", sub: "At age 41" },
  { label: "Projected FIRE", value: "Age 41",  sub: "9 months ahead", highlight: true },
];

export default function Landing() {
  return (
    <div className="bg-[#080E1C] min-h-screen text-white">

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-white/8" style={{ background: "rgba(8,14,28,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-white">
            FIRE<span className="text-orange-500">path</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-white/60 hover:text-white px-3 py-2 transition-colors">Sign in</Link>
            <Link href="/auth" className="bg-orange-500 hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-orange-500/20 mb-6">
          🇮🇳 India-first FIRE planning
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
          Plan your retirement.<br />
          <span className="text-orange-500">The Indian way.</span>
        </h1>

        {/* Revised subtitle */}
        <p className="text-xl text-white/70 mb-2">
          Most FIRE tools were built for Americans.
        </p>
        <p className="text-xl text-white font-medium mb-4">
          This one was built for you.
        </p>
        <p className="text-sm text-white/40 max-w-lg mx-auto mb-10">
          EPF lock-in. NPS annuity rules. Indian tax slabs. US stocks. All modelled together.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth" className="bg-orange-500 hover:opacity-90 text-white font-medium text-base px-7 py-3 rounded-xl transition-all">
            Start free — no credit card
          </Link>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-base px-7 py-3 rounded-xl transition-all"
          >
            See how it works ↓
          </button>
        </div>
        <p className="text-xs text-white/30 mt-4">Free tier available · Pro at ₹499/mo</p>

        {/* ── Hero dashboard mockup ─────────────────────────────────── */}
        <div className="relative mx-auto max-w-4xl mt-14 px-4">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10" style={{ transform: "perspective(1000px) rotateX(2deg)" }}>
            {/* Browser chrome */}
            <div className="bg-[#1E2D4A] px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <div className="ml-4 flex-1 bg-white/5 rounded px-3 py-1 text-xs text-white/40">
                firepath-pi.vercel.app/dashboard
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="bg-[#0F1729] p-6">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {MOCK_CARDS.map(card => (
                  <div key={card.label} className="bg-[#1E2D4A] rounded-lg p-3 border border-white/5">
                    <div className="text-white/50 text-xs mb-1">{card.label}</div>
                    <div className={`text-lg font-semibold ${card.highlight ? "text-green-400" : "text-white"}`}>
                      {card.value}
                    </div>
                    <div className="text-white/40 text-xs">{card.sub}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#1E2D4A] rounded-lg p-4 border border-white/5">
                <div className="text-white/50 text-xs mb-3">CORPUS PROJECTION</div>
                <div className="flex items-end gap-1 h-20">
                  {[15, 20, 28, 35, 45, 58, 72, 88, 100, 88].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="rounded-sm opacity-80"
                        style={{
                          height: `${h}%`,
                          background: i < 7
                            ? "linear-gradient(to top, #F97316, #FDBA74)"
                            : "rgba(249,115,22,0.2)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-white/30 text-xs mt-2">
                  <span>Age 32</span>
                  <span>🔥 FIRE at 41</span>
                  <span>Age 55</span>
                </div>
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-orange-500 rounded-full" />
        </div>
      </section>

      {/* ── Social proof bar ───────────────────────────────────────── */}
      <div className="border-y border-white/8 py-6 my-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-white/50">
            <span>🇮🇳 Built for Indian professionals</span>
            <span className="hidden sm:block">·</span>
            <span>NRIs with dual portfolios</span>
            <span className="hidden sm:block">·</span>
            <span>Startup employees with ESOPs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-yellow-400">★★★★★</span>
            <span className="text-white/50 italic">"Finally a FIRE tool that understands EPF lock-in"</span>
          </div>
        </div>
      </div>

      {/* ── Problem ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">The gap in the market</p>
          <h2 className="text-3xl font-bold text-white">Existing tools weren't built for India</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {problems.map(p => (
            <div key={p.tool} className="rounded-xl p-5 border border-white/8 bg-white/3">
              <div className="font-semibold text-white mb-2">{p.tool}</div>
              <p className="text-sm text-white/50 leading-relaxed">{p.issue}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-y border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl font-bold text-white">Everything for your FIRE journey</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="rounded-xl p-5 border border-white/8 bg-white/3">
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-semibold text-white mb-1.5">{f.title}</div>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl font-bold text-white">Simple, transparent pricing</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {tiers.map(t => (
            <div
              key={t.name}
              className="rounded-xl p-6 border relative"
              style={{
                border: t.highlight ? "1px solid rgba(249,115,22,0.5)" : "1px solid rgba(255,255,255,0.08)",
                background: t.highlight ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.03)",
                boxShadow: t.highlight ? "0 0 40px rgba(249,115,22,0.08)" : "none",
              }}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}
              <div className="font-semibold text-white mb-1">{t.name}</div>
              <div className="flex items-end gap-1 mb-0.5">
                <span className="text-3xl font-bold text-white">{t.price}</span>
                <span className="text-white/40 text-sm mb-1">{t.period}</span>
              </div>
              {t.usd && <div className="text-xs text-white/30 mb-3">{t.usd}</div>}
              <p className="text-sm text-white/50 mb-5">{t.desc}</p>
              <ul className="space-y-2 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              {t.soon ? (
                <NriWaitlistForm />
              ) : (
                <Link
                  href={t.href}
                  className={`block w-full text-center text-sm font-medium px-4 py-2.5 rounded-xl transition-all ${
                    t.highlight
                      ? "bg-orange-500 hover:opacity-90 text-white"
                      : "border border-white/15 text-white/80 hover:text-white hover:border-white/30"
                  }`}
                >
                  {t.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-12 mt-4">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div>
              <div className="text-lg font-semibold text-white mb-2">
                FIRE<span className="text-orange-500">path</span>
              </div>
              <div className="text-sm text-white/40 max-w-xs">
                India-first FIRE planning. Built for the people who actually understand
                what EPF lock-in means.
              </div>
            </div>
            <div className="flex gap-12 text-sm text-white/50">
              <div className="flex flex-col gap-2">
                <span className="text-white/80 font-medium mb-1">Product</span>
                <a href="/auth" className="hover:text-white transition-colors">Get started</a>
                <a href="#features" className="hover:text-white transition-colors" onClick={e => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>Features</a>
                <a href="#pricing" className="hover:text-white transition-colors" onClick={e => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>Pricing</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-white/80 font-medium mb-1">Legal</span>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms of use</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/8 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/30">
            <span>© 2026 FIREpath. All rights reserved.</span>
            <span>FIREpath is a financial literacy tool. Not SEBI-registered investment advice.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
