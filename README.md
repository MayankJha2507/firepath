# FIREpath 🇮🇳

**India-first FIRE (Financial Independence, Retire Early) planning SaaS**

Built for Indian professionals and NRIs who are tired of US-centric tools that don't understand EPF lock-in, NPS annuity rules, or Indian tax slabs.

---

## What it does

- **FIRE calculator** — Inflation-adjusted corpus target using real Indian return assumptions
- **Locked vs liquid analysis** — EPF, NPS, PPF modelled separately so you know what's actually accessible
- **Year-by-year projection** — Interactive chart showing your trajectory vs FIRE target
- **AI portfolio analysis** — Health score, strengths, concerns, and action items via Gemini (Pro)
- **Milestone tracker** — ₹1 Cr → ₹10 Cr countdowns that update with every snapshot
- **Progress history** — Corpus, FIRE age trajectory, and savings rate charts over time (Pro)
- **NRI dual portfolio** — Coming soon

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Database + Auth | Supabase (Postgres + RLS) |
| AI | Google Gemini (`gemini-2.0-flash`) — swappable to Claude via env var |
| Payments | Razorpay / Stripe (stubbed, v2) |
| Hosting | Vercel |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/MayankJha2507/firepath.git
cd firepath
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=          # leave blank unless switching to Claude
AI_PROVIDER=gemini          # set to 'claude' to swap AI provider
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the database migration

Open your [Supabase SQL editor](https://supabase.com/dashboard) and run:

```
supabase/migrations/0001_init.sql
```

This creates all tables (`profiles`, `portfolio_snapshots`, `holdings`, `ai_analyses`, `milestones`) with Row Level Security enabled.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Dev mode** — auth is bypassed in `NODE_ENV=development` so you can explore the app with mock data without a Supabase session.

---

## Project structure

```
app/
  page.tsx              # Landing page
  auth/                 # Sign in / sign up
  onboarding/           # 5-step profile + portfolio setup
  dashboard/            # Main dashboard (charts, milestones)
  portfolio/            # Holdings table
  analysis/             # AI analysis (Pro)
  history/              # Progress over time (Pro)
  settings/             # Account management
  api/
    snapshot/           # POST — saves portfolio snapshot
    analyse/            # POST — calls AI, caches result
    milestones/         # POST — checks and records milestones

components/
  charts/               # Recharts components (donut, area, bar, line)
  MilestoneToast.tsx    # Bottom-right toast for milestone achievements

lib/
  fire-calculator.ts    # Pure calculation functions (EPF, NPS, PPF, equity, FIRE target)
  ai-provider.ts        # AI abstraction layer (Gemini / Claude)
  supabase/             # Browser + server + middleware Supabase clients
  types.ts              # Shared TypeScript types

supabase/
  migrations/           # SQL schema with RLS policies
```

---

## Switching AI provider

The AI layer is fully abstracted. To switch from Gemini to Claude:

```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your-anthropic-key
```

All AI calls go through `aiProvider.generateAnalysis()` in [`lib/ai-provider.ts`](lib/ai-provider.ts) — no other code changes needed.

---

## Tier gating

| Feature | Free | Pro |
|---|---|---|
| Portfolio snapshots | 1 | Unlimited |
| Dashboard | Basic | Full |
| AI analysis | ✗ | ✓ |
| Progress history | ✗ | ✓ |
| Milestone alerts | ✗ | ✓ |

Set `tier = 'pro'` directly in Supabase for testing. Payment integration (Razorpay / Stripe) is wired in v2.

---

## Running tests

```bash
npm test
```

17 unit tests covering all calculator functions (`fire-calculator.test.ts`).

---

## Important

> FIREpath is a financial literacy tool. It is **not** SEBI-registered investment advice. Always consult a SEBI-registered investment advisor before making financial decisions.

We never store PAN, Aadhaar, broker credentials, or bank account numbers.
