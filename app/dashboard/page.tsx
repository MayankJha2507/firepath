import { createClient } from "@/lib/supabase/server";
import {
  formatINR, milestoneProjections,
  fireCorpusTarget,
  equityProjection, epfProjection, ppfProjection, npsProjection,
  fireBridgeAnalysis,
  calculateFireVariants, yearsToFireFromSavingsRate, generateYearByYearTable,
  calculateSavingsRate, projectedFireAge as projectedFireAgeFn,
  projectCorpusAt,
} from "@/lib/fire-calculator";
import { redirect } from "next/navigation";
import Link from "next/link";
import MilestoneToast from "@/components/MilestoneToast";
import AllocationDonut from "@/components/charts/AllocationDonut";
import ProjectionCard from "@/components/charts/ProjectionCard";
import CorpusBarChart from "@/components/charts/CorpusBarChart";
import SideNav from "@/components/layout/SideNav";
import DataQualityBadge, { computeCompleteness } from "@/components/ui/DataQualityBadge";
import type { DataQuality } from "@/components/ui/DataQualityBadge";
import FireStatusBanner, { type BannerState } from "@/components/ui/FireStatusBanner";
import { CorpusBreakdownPopover } from "@/components/ui/CorpusBreakdownPopover";
import DashboardHeroSections from "@/components/dashboard/DashboardHeroSections";
import SwpSection from "@/components/dashboard/SwpSection";
import { calculateSWP } from "@/lib/swp-calculator";

const DEV_PROFILE = {
  id: "dev", full_name: "Dev User", age: 30, fire_target_age: 45,
  monthly_income: 200000, monthly_expense: 100000, tier: "pro",
  tax_bracket: 30, tax_regime: "new", risk_score: 7,
  fire_monthly_expense: 80000, parent_support: 10000,
  data_completeness: null as any,
};
const DEV_SNAP = {
  id: "dev-snap", total_corpus: 8500000, liquid_corpus: 6000000,
  locked_corpus: 2500000, equity_pct: 65, debt_pct: 20,
  gold_pct: 10, cash_pct: 5, savings_rate: 42, projected_fire_age: 43,
};
const DEV_HOLDINGS = [
  { category: "mf", monthly_contribution: 50000 },
  { category: "indian_stock", monthly_contribution: 20000 },
];

const bypassProGate = process.env.BYPASS_PRO_GATE === "true";

const NUDGE_ITEMS = [
  { key: "indian_stocks", label: "Indian stocks",  desc: "Your equity allocation is estimated.", href: "/portfolio" },
  { key: "us_stocks",     label: "US stocks",       desc: "Missing your international exposure.", href: "/portfolio" },
  { key: "mutual_funds",  label: "Mutual funds",    desc: "Your fund allocation is missing.", href: "/portfolio" },
  { key: "gold",          label: "Gold",            desc: "Gold allocation not tracked.", href: "/portfolio" },
  { key: "nps",           label: "NPS",             desc: "Can't project locked corpus accurately.", href: "/portfolio" },
  { key: "ppf",           label: "PPF",             desc: "PPF corpus not tracked.", href: "/portfolio" },
  { key: "sips",          label: "SIPs",            desc: "Monthly SIP amount not tracked.", href: "/portfolio" },
];

export default async function Dashboard() {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isDev) redirect("/auth");

  let profile: any = null;
  let snap: any = null;
  let holdings: any[] = [];
  let hasNoSnapshot = false;

  if (user) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("portfolio_snapshots").select("*")
        .eq("user_id", user.id).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    ]);
    profile = p;
    snap = s;
    if (!profile?.age && !isDev) redirect("/onboarding");
    if (snap) {
      const { data: h } = await supabase.from("holdings").select("*").eq("snapshot_id", snap.id);
      holdings = h || [];
    } else {
      hasNoSnapshot = true;
    }
  }

  let latestAnalysis: { generated_at: string } | null = null;
  if (snap && (profile?.tier === "pro" || bypassProGate)) {
    const { data: analysis } = await supabase
      .from("ai_analyses")
      .select("generated_at")
      .eq("user_id", user?.id ?? "")
      .eq("snapshot_id", snap.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestAnalysis = analysis;
  }

  const isDevMock = isDev && !user;
  if (!profile) profile = DEV_PROFILE;
  if (!snap && isDevMock) { snap = DEV_SNAP; holdings = DEV_HOLDINGS; }

  const isPro = profile.tier === "pro" || bypassProGate;

  // Holdings summed by category for corpus popover breakdowns
  const holdingsByCategory = holdings.reduce((acc: Record<string, number>, h: any) => {
    acc[h.category] = (acc[h.category] ?? 0) + (h.value_inr || 0);
    return acc;
  }, {} as Record<string, number>);

  const dc: Record<string, string> = profile.data_completeness || {};
  const completenessRaw = Object.keys(dc).length > 0 ? dc : null;

  if (hasNoSnapshot && !isDevMock) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <SideNav />
        <main className="lg:ml-[220px] pt-14 min-h-screen flex items-center justify-center px-6">
          <div className="card max-w-md w-full text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Portfolio not set up yet</h2>
            <p className="text-sm text-slate-500 mb-6">
              Add your investments to see your FIRE projections, asset allocation, and milestone tracker.
            </p>
            <Link href="/onboarding" className="btn-primary px-8">
              Set up portfolio →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const yearsToFire = Math.max(1, (profile.fire_target_age || 45) - (profile.age || 30));
  const monthlyInvest = holdings.reduce((s: number, h: any) => s + (h.monthly_contribution || 0), 0);

  // Only count holdings the user explicitly added (not quickstart placeholders)
  const SYNTHETIC_NOTES = ["estimated", "user-provided"];
  const realHoldingsCount = holdings.filter((h: any) => !SYNTHETIC_NOTES.includes(h.notes)).length;
  const hasRealHoldings = realHoldingsCount > 0;
  const userAddedCategories = new Set(
    holdings.filter((h: any) => !SYNTHETIC_NOTES.includes(h.notes)).map((h: any) => h.category as string)
  );
  const EXPECTED_CATEGORIES = ["indian_stock", "us_stock", "mf", "gold", "epf", "nps", "ppf"];
  const missingCategories = EXPECTED_CATEGORIES.filter(c => !userAddedCategories.has(c));

  const inflationRate = (profile.inflation_rate ?? 7) / 100;
  const fireMonthlyExpense = profile.fire_monthly_expense || profile.monthly_expense || 60000;
  const fireTarget = fireCorpusTarget(fireMonthlyExpense, yearsToFire, inflationRate);

  const epfHolding = holdings.find((h: any) => h.category === "epf" && h.notes !== "estimated");
  const ppfHolding = holdings.find((h: any) => h.category === "ppf");
  const npsHolding = holdings.find((h: any) => h.category === "nps");
  const lockedAtRetirement =
    epfProjection(epfHolding?.value_inr || 0, epfHolding?.monthly_contribution || 0, 0, yearsToFire) +
    ppfProjection(ppfHolding?.value_inr || 0, ppfHolding?.monthly_contribution || 0, Math.min(yearsToFire, 15)) +
    npsProjection(npsHolding?.value_inr || 0, npsHolding?.monthly_contribution || 0, yearsToFire).atRetirement;
  const liquidAtRetirement = equityProjection(snap.liquid_corpus, monthlyInvest, yearsToFire);

  const mData = milestoneProjections(snap.liquid_corpus, monthlyInvest);
  const fireDateDiff = snap.projected_fire_age && profile.fire_target_age
    ? (profile.fire_target_age - snap.projected_fire_age) * 12
    : null;

  // FIRE status banner — wired after projFireAge is derived from table (below)
  const targetAge = profile.fire_target_age || 45;

  const bridge = fireBridgeAnalysis(liquidAtRetirement, fireTarget);
  let additionalSipNeeded = 0;
  if (bridge.gap > 0 && yearsToFire > 0) {
    const r = 0.12 / 12;
    const n = yearsToFire * 12;
    additionalSipNeeded = bridge.gap * r / (Math.pow(1 + r, n) - 1);
  }

  // Data quality per card
  const corpusQuality: DataQuality = dc.savings === "exact" ? "exact" : dc.savings ? "estimated" : "missing";
  const expenseQuality: DataQuality = dc.expenses === "exact" ? "exact" : dc.expenses ? "estimated" : "missing";
  const isEstimated = completenessRaw && Object.values(dc).some(v => v !== "exact");

  // Nudge items: only show sections that are missing
  const missingNudges = NUDGE_ITEMS.filter(item => dc[item.key] === "missing");
  const allComplete = completenessRaw && Object.values(dc).every(v => v === "exact");

  // ─── new hero section calculations ───────────────────────────────────────
  const monthlyIncome = profile.monthly_income || 0;
  const annualIncome = monthlyIncome * 12;
  const annualExpenses = (profile.monthly_expense || 0) * 12;
  const savingsRatePct = calculateSavingsRate(monthlyIncome, monthlyInvest);

  const yearByYearTableData = generateYearByYearTable(
    profile.age || 30,
    snap.total_corpus || 0,
    monthlyIncome,
    profile.monthly_expense || 0,
    monthlyInvest,
    fireTarget,
    fireMonthlyExpense,
    0.12,
    inflationRate,
  );

  // Single source of truth — all touchpoints use this age
  const fireRow = yearByYearTableData.find(r => r.isFireYear);
  const projFireAge = fireRow?.age ?? (profile.age || 30) + 50;

  const diffYears = targetAge - projFireAge;
  let bannerState: BannerState;
  if (diffYears >= 0) bannerState = "on_track";
  else if (diffYears >= -2) bannerState = "close";
  else bannerState = "needs_work";

  // Surplus — how much income is unallocated after expenses + investments
  const monthlySurplus = Math.max(monthlyIncome - (profile.monthly_expense || 0) - monthlyInvest, 0);
  const accelFireAge = monthlySurplus > 0
    ? projectedFireAgeFn(profile.age || 30, snap.total_corpus || 0, monthlyInvest + monthlySurplus, fireTarget, 0.12)
    : projFireAge;
  const yearsSavedBySurplus = Math.max(projFireAge - accelFireAge, 0);

  const fireVariants = calculateFireVariants(
    fireMonthlyExpense,
    profile.age || 30,
    profile.fire_target_age || 45,
    snap.total_corpus || 0,
    monthlyInvest,
    inflationRate,
  );

  const savingsRateChartData = Array.from({ length: 18 }, (_, i) => {
    const rate = (i + 1) * 5;
    return {
      rate,
      years: yearsToFireFromSavingsRate(rate, snap.liquid_corpus || 0, monthlyIncome, fireTarget, 0.12),
    };
  }).filter(d => d.years <= 50);

  // Project corpus at the actual FIRE age (not today's corpus)
  const yearsToFireAge = Math.max(0, projFireAge - (profile.age || 30));
  const corpusAtFireAge = projectCorpusAt(snap.total_corpus || 0, monthlyInvest, yearsToFireAge, 0.12);

  const swpResult = calculateSWP(
    corpusAtFireAge,
    fireMonthlyExpense,
    projFireAge,
    profile.age || 30,
    inflationRate,
    0.08,
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />

      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          {/* Greeting */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Hey {profile.full_name?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          </div>

          {/* FIRE status banner */}
          <FireStatusBanner
            state={bannerState}
            projectedFireAge={projFireAge}
            targetFireAge={targetAge}
            diffYears={diffYears}
            additionalSipNeeded={Math.round(additionalSipNeeded)}
            monthlySurplus={monthlySurplus}
            acceleratedFireAge={accelFireAge}
            yearsSavedIfSurplusInvested={yearsSavedBySurplus}
          />

          {/* Always-visible sections: savings rate, FIRE variants, savings rate chart, year-by-year */}
          <DashboardHeroSections
            savingsRate={savingsRatePct}
            currentLiquidCorpus={snap.liquid_corpus || 0}
            monthlyIncome={monthlyIncome}
            monthlyExpense={profile.monthly_expense || 0}
            monthlyInvest={monthlyInvest}
            fireTarget={fireTarget}
            fireTargetAge={profile.fire_target_age || 45}
            currentAge={profile.age || 30}
            projectedFireAge={projFireAge}
            fireVariants={fireVariants}
            savingsRateChartData={savingsRateChartData}
            yearByYearTableData={yearByYearTableData}
            inflationRate={inflationRate}
          />

          {/* Capture prompt — shown when user has no real holdings */}
          {!hasRealHoldings && (
            <div className="bg-gradient-to-br from-[var(--orange)]/5 to-[var(--accent)]/5 border border-[var(--orange)]/20 rounded-2xl p-8 mb-4 text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Unlock your real numbers
              </h3>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Your FIRE date, corpus projection, withdrawal plan, and AI analysis
                are all waiting. Add your actual holdings to see the real picture
                instead of estimates.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto mb-6 text-xs">
                {[
                  { icon: "💰", label: "Real corpus & FIRE target" },
                  { icon: "📈", label: "Year-by-year projection" },
                  { icon: "🎯", label: "Exact milestones" },
                  { icon: "💸", label: "Withdrawal plan (SWP)" },
                  { icon: "🥧", label: "Asset allocation" },
                  { icon: "🤖", label: "AI portfolio analysis" },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg p-2.5 flex items-center gap-2 justify-center sm:justify-start"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    <span>{item.icon}</span>
                    <span className="text-left">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Link
                  href="/projections"
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-medium text-white text-center transition-opacity hover:opacity-90"
                  style={{ background: "var(--orange)" }}
                >
                  Add via Projections →
                </Link>
                <Link
                  href="/portfolio"
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-medium text-center transition-colors hover:opacity-80"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  Full Portfolio editor
                </Link>
              </div>
              <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>
                Takes 2 minutes · Paste from your broker statement
              </p>
            </div>
          )}

          {/* Holdings-gated sections */}
          {hasRealHoldings && <>

          {/* Partial completion nudge */}
          {missingCategories.length > 0 && (
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Your numbers are based on {realHoldingsCount} added {realHoldingsCount === 1 ? "asset" : "assets"}.
                Add {missingCategories.length} more for complete accuracy.
              </div>
              <Link href="/projections" className="text-xs whitespace-nowrap ml-3 hover:opacity-80" style={{ color: "var(--orange)" }}>
                Add more →
              </Link>
            </div>
          )}

          {/* Row 1 — Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CorpusBreakdownPopover
              variant="total"
              total={snap.total_corpus}
              items={[
                { label: "Liquid", value: snap.liquid_corpus, pct: snap.total_corpus ? (snap.liquid_corpus / snap.total_corpus) * 100 : 0 },
                { label: "Locked (EPF + NPS + PPF)", value: snap.locked_corpus, pct: snap.total_corpus ? (snap.locked_corpus / snap.total_corpus) * 100 : 0 },
              ].filter(item => item.value > 0)}
            >
              <MetricCard label="Total corpus" value={formatINR(snap.total_corpus)} sub="All holdings combined" accent="orange" quality={corpusQuality} />
            </CorpusBreakdownPopover>
            <CorpusBreakdownPopover
              variant="liquid"
              total={snap.liquid_corpus}
              items={[
                { label: "Indian stocks", value: holdingsByCategory["indian_stock"] ?? 0, pct: snap.liquid_corpus ? ((holdingsByCategory["indian_stock"] ?? 0) / snap.liquid_corpus) * 100 : 0 },
                { label: "US stocks",     value: holdingsByCategory["us_stock"] ?? 0,     pct: snap.liquid_corpus ? ((holdingsByCategory["us_stock"] ?? 0) / snap.liquid_corpus) * 100 : 0 },
                { label: "Mutual funds",  value: holdingsByCategory["mf"] ?? 0,           pct: snap.liquid_corpus ? ((holdingsByCategory["mf"] ?? 0) / snap.liquid_corpus) * 100 : 0 },
                { label: "Gold",          value: holdingsByCategory["gold"] ?? 0,         pct: snap.liquid_corpus ? ((holdingsByCategory["gold"] ?? 0) / snap.liquid_corpus) * 100 : 0 },
                { label: "FD / Emergency",value: holdingsByCategory["fd"] ?? 0,           pct: snap.liquid_corpus ? ((holdingsByCategory["fd"] ?? 0) / snap.liquid_corpus) * 100 : 0 },
              ].filter(item => item.value > 0)}
            >
              <MetricCard label="Liquid corpus" value={formatINR(snap.liquid_corpus)} sub={`${((snap.liquid_corpus / snap.total_corpus) * 100 || 0).toFixed(0)}% of total`} accent="blue" quality={corpusQuality} />
            </CorpusBreakdownPopover>
            <MetricCard label="FIRE target"    value={formatINR(fireTarget)}          sub={`At age ${profile.fire_target_age || 45}`} accent="violet" quality={expenseQuality} />
            <MetricCard label="Projected FIRE" value={`Age ${snap.projected_fire_age?.toFixed(0) ?? "—"}`} sub={fireDateDiff !== null ? fireDateStatus(fireDateDiff) : ""} accent="green" fireDiff={fireDateDiff} quality={corpusQuality} />
          </div>

          {/* Row 2 — Allocation + Corpus bar */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="section-title">Asset allocation</div>
                {completenessRaw && <DataQualityBadge quality={dc.indian_stocks === "exact" && dc.mutual_funds === "exact" ? "exact" : "estimated"} />}
              </div>
              <AllocationDonut
                equity={snap.equity_pct || 0} debt={snap.debt_pct || 0}
                gold={snap.gold_pct || 0}   cash={snap.cash_pct || 0}
              />
              {isEstimated && (
                <p className="text-xs text-slate-400 mt-3">
                  Showing estimated allocation.{" "}
                  <Link href="/portfolio" className="text-orange-500 hover:underline">Add holdings →</Link>
                </p>
              )}
            </div>
            <div className="card">
              <div className="section-title mb-4">Liquid vs locked — today vs retirement</div>
              <CorpusBarChart
                liquidNow={snap.liquid_corpus} lockedNow={snap.locked_corpus}
                liquidAtRetirement={liquidAtRetirement} lockedAtRetirement={lockedAtRetirement}
              />
            </div>
          </div>

          {/* Row 3 — Year-by-year projection */}
          <ProjectionCard
            liquidCorpus={snap.liquid_corpus}
            monthlySIP={monthlyInvest}
            yearsWindow={Math.min(yearsToFire + 10, 35)}
            fireTarget={fireTarget}
            startAge={profile.age || 30}
            projectedFireAge={projFireAge}
            corpusQuality={corpusQuality}
            showQuality={!!completenessRaw}
          />

          {/* Row 4 — Milestones + savings gauge */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="section-title">Corpus milestones</div>
                {completenessRaw && <DataQualityBadge quality={corpusQuality} />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "₹1 Cr",  months: mData.oneCr },
                  { label: "₹2 Cr",  months: mData.twoCr },
                  { label: "₹5 Cr",  months: mData.fiveCr },
                  { label: "₹10 Cr", months: mData.tenCr },
                ].map(m => (
                  <MilestoneCard key={m.label} label={m.label} months={m.months} estimated={!!isEstimated} />
                ))}
              </div>
            </div>
            <div className="card flex flex-col items-center justify-center text-center">
              <div className="section-title mb-3">Savings rate</div>
              <SavingsGauge pct={savingsRatePct} />
            </div>
          </div>

          {/* SWP — withdrawal phase: retirement age → corpus exhaustion */}
          <SwpSection
            swp={swpResult}
            fireMonthlyExpenseToday={fireMonthlyExpense}
            inflationRate={inflationRate}
          />

          {/* Improve accuracy nudge cards */}
          {missingNudges.length > 0 && (
            <div className="card">
              <div className="section-title mb-4">Improve your accuracy</div>
              <div className="space-y-3">
                {missingNudges.map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--text-secondary)", opacity: 0.4 }} />
                      <div>
                        <div className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                          {item.label} not added
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.desc}</div>
                      </div>
                    </div>
                    <Link href={item.href} className="text-xs font-medium hover:underline whitespace-nowrap ml-4" style={{ color: "var(--orange)" }}>
                      Add →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allComplete && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <span style={{ color: "var(--success)" }}>✓</span>
              <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
                Portfolio complete — all projections are based on your exact data.
              </p>
            </div>
          )}

          </>} {/* end hasRealHoldings */}

          {/* Row 5 — AI analysis preview */}
          <AIPreviewCard isPro={isPro} latestAnalysis={latestAnalysis} />

          <p className="disclaimer pb-4">
            For educational purposes only. Not SEBI-registered investment advice.
          </p>
        </div>
      </main>
      <MilestoneToast />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function fireDateStatus(diffMonths: number): string {
  if (Math.abs(diffMonths) < 3) return "On track";
  if (diffMonths > 0) return `${Math.round(diffMonths)}mo ahead of plan`;
  return `${Math.round(Math.abs(diffMonths))}mo behind plan`;
}

function milestoneCalendarYear(monthsFromNow: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + Math.round(monthsFromNow), 1);
  return target.getFullYear();
}

// ─── sub-components ───────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent, fireDiff, quality }: {
  label: string; value: string; sub?: string; accent: string;
  fireDiff?: number | null; quality?: DataQuality;
}) {
  const borderColor: Record<string, string> = {
    orange: "#fb923c", blue: "#60a5fa",
    violet: "#a78bfa", green: "#34d399",
  };
  const subColor = fireDiff == null
    ? "var(--text-secondary)"
    : fireDiff >= 0 ? "var(--success)" : "var(--danger)";
  return (
    <div className="card border-t-2" style={{ borderTopColor: borderColor[accent] || "#fb923c" }}>
      <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</div>
      {quality && (
        <div className="mt-1.5">
          <DataQualityBadge quality={quality} linkTo="/portfolio" />
        </div>
      )}
      {sub && <div className="text-xs mt-1" style={{ color: subColor }}>{sub}</div>}
    </div>
  );
}

function MilestoneCard({ label, months, estimated }: { label: string; months: number; estimated?: boolean }) {
  const achieved = months === 0;
  const unreachable = !isFinite(months);
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        border: "1px solid var(--border)",
        background: achieved ? "rgba(74,222,128,0.08)" : "var(--bg-secondary)",
      }}
    >
      <div className="text-lg font-semibold" style={{ color: achieved ? "var(--success)" : "var(--text-primary)" }}>
        {label}
      </div>
      <div className="text-sm mt-1 flex items-center justify-center gap-1" style={{ color: achieved ? "var(--success)" : "var(--text-secondary)" }}>
        {achieved ? "✓ Achieved"
          : unreachable ? "Increase SIPs"
          : months < 12 ? `${months}mo`
          : `${(months / 12).toFixed(1)}yr`}
        {!achieved && !unreachable && estimated && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        )}
      </div>
      {!achieved && !unreachable && (
        <div className="text-xs font-medium mt-0.5" style={{ color: "var(--orange)" }}>
          by {milestoneCalendarYear(months)}
        </div>
      )}
      {achieved && (
        <div className="text-xs font-medium mt-0.5" style={{ color: "var(--success)" }}>
          ✓ Already crossed
        </div>
      )}
    </div>
  );
}

function SavingsGauge({ pct }: { pct: number }) {
  const c = Math.min(100, Math.max(0, pct));
  const colorVal = c >= 50 ? "var(--success)" : c >= 30 ? "var(--warning)" : "var(--danger)";
  const label = c >= 50 ? "Excellent 🔥" : c >= 30 ? "Good — push higher" : "Needs work";
  return (
    <div>
      <div className="text-4xl font-bold" style={{ color: colorVal }}>{c.toFixed(0)}%</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>of income invested</div>
      <div className="mt-2 text-xs font-medium" style={{ color: colorVal }}>{label}</div>
    </div>
  );
}

function AIPreviewCard({
  isPro,
  latestAnalysis,
}: {
  isPro: boolean;
  latestAnalysis: { generated_at: string } | null;
}) {
  const updatedDate = latestAnalysis
    ? new Date(latestAnalysis.generated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    : null;

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="section-title">AI portfolio analysis</div>
        {isPro && (
          <Link href="/analysis" className="text-xs font-medium hover:underline" style={{ color: "var(--orange)" }}>
            View full analysis →
          </Link>
        )}
      </div>
      {isPro ? (
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            🤖
          </div>
          <div>
            <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {latestAnalysis ? "Your analysis is ready" : "Analysing your portfolio..."}
            </div>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Get your health score, action items, and FIRE feasibility verdict.
            </p>
            <div className="mt-2">
              {updatedDate ? (
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Updated {updatedDate}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--warning)" }}>
                  <div
                    className="w-3 h-3 rounded-full border animate-spin"
                    style={{ borderColor: "var(--warning)", borderTopColor: "transparent" }}
                  />
                  Updating analysis...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="blur-sm pointer-events-none select-none space-y-2 mb-4">
            <div className="h-4 rounded w-3/4" style={{ background: "var(--border)" }} />
            <div className="h-4 rounded w-1/2" style={{ background: "var(--border)" }} />
            <div className="h-4 rounded w-2/3" style={{ background: "var(--border)" }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-2xl" style={{ background: "rgba(var(--bg-card-rgb, 255,255,255), 0.85)" }}>
            <div className="text-center px-4">
              <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Pro feature</div>
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>AI health score, action items, and FIRE feasibility.</p>
              <button className="btn-primary text-sm px-5">Upgrade to Pro — ₹499/mo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
