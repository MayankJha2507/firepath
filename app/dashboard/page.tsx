import { createClient } from "@/lib/supabase/server";
import {
  formatINR, milestoneProjections, yearByYearProjection,
  fireCorpusTarget, inflationAdjustedExpense,
  equityProjection, epfProjection, ppfProjection, npsProjection,
  fireBridgeAnalysis,
} from "@/lib/fire-calculator";
import { redirect } from "next/navigation";
import Link from "next/link";
import MilestoneToast from "@/components/MilestoneToast";
import AllocationDonut from "@/components/charts/AllocationDonut";
import ProjectionChart from "@/components/charts/ProjectionChart";
import CorpusBarChart from "@/components/charts/CorpusBarChart";
import SideNav from "@/components/layout/SideNav";
import DataQualityBadge, { computeCompleteness } from "@/components/ui/DataQualityBadge";
import type { DataQuality } from "@/components/ui/DataQualityBadge";
import FireStatusBanner, { type BannerState } from "@/components/ui/FireStatusBanner";

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

  const isDevMock = isDev && !user;
  if (!profile) profile = DEV_PROFILE;
  if (!snap && isDevMock) { snap = DEV_SNAP; holdings = DEV_HOLDINGS; }

  const isPro = profile.tier === "pro" || bypassProGate;
  const dc: Record<string, string> = profile.data_completeness || {};
  const completenessRaw = Object.keys(dc).length > 0 ? dc : null;

  if (hasNoSnapshot && !isDevMock) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <SideNav />
        <main className="lg:ml-[220px] pt-14 lg:pt-0 min-h-screen flex items-center justify-center px-6">
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

  const inflAdj = inflationAdjustedExpense(profile.fire_monthly_expense || profile.monthly_expense || 60000, yearsToFire);
  const fireTarget = fireCorpusTarget(inflAdj);
  const projData = yearByYearProjection(
    snap.liquid_corpus, monthlyInvest, Math.min(yearsToFire + 10, 35),
    fireTarget, 0.12, profile.age || 30
  );

  const epfHolding = holdings.find((h: any) => h.category === "epf");
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

  // FIRE status banner
  const projAge = snap.projected_fire_age ?? (profile.age || 30) + yearsToFire;
  const targetAge = profile.fire_target_age || 45;
  const diffYears = targetAge - projAge; // positive = early, negative = behind
  let bannerState: BannerState;
  if (diffYears >= 0) bannerState = "on_track";
  else if (diffYears >= -2) bannerState = "close";
  else bannerState = "needs_work";

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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />

      <main className="lg:ml-[220px] pt-14 lg:pt-0">
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
            projectedFireAge={Math.round(projAge)}
            targetFireAge={targetAge}
            diffYears={diffYears}
            additionalSipNeeded={Math.round(additionalSipNeeded)}
          />

          {/* Estimated data banner */}
          {isEstimated && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Projections are estimated</strong> — based on your selected ranges.{" "}
                <Link href="/portfolio" className="underline hover:no-underline font-medium">
                  Add exact holdings →
                </Link>
              </p>
            </div>
          )}

          {/* Row 1 — Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total corpus"   value={formatINR(snap.total_corpus)}  sub="All holdings combined" accent="orange" quality={corpusQuality} />
            <MetricCard label="Liquid corpus"  value={formatINR(snap.liquid_corpus)} sub={`${((snap.liquid_corpus / snap.total_corpus) * 100 || 0).toFixed(0)}% of total`} accent="blue" quality={corpusQuality} />
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
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="section-title">Corpus projection</div>
                {completenessRaw && <DataQualityBadge quality={corpusQuality} linkTo="/portfolio" />}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span><span className="inline-block w-3 h-0.5 bg-orange-400 mr-1 align-middle" />Your trajectory</span>
                <span><span className="inline-block w-3 h-0.5 bg-blue-400 mr-1 align-middle border-dashed border-t-2" />FIRE target</span>
              </div>
            </div>
            <ProjectionChart data={projData} fireAge={snap.projected_fire_age} />
          </div>

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
              <SavingsGauge pct={snap.savings_rate || 0} />
            </div>
          </div>

          {/* Improve accuracy nudge cards */}
          {missingNudges.length > 0 && (
            <div className="card">
              <div className="section-title mb-4">Improve your accuracy</div>
              <div className="space-y-3">
                {missingNudges.map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-ink capitalize">
                          {item.label} not added
                        </div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                    <Link
                      href={item.href}
                      className="text-xs text-orange-500 font-medium hover:underline whitespace-nowrap ml-4"
                    >
                      Add →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allComplete && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="text-emerald-500">✓</span>
              <p className="text-sm text-emerald-800 font-medium">
                Portfolio complete — all projections are based on your exact data.
              </p>
            </div>
          )}

          {/* Row 5 — AI analysis preview */}
          <AIPreviewCard isPro={isPro} />

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

// ─── sub-components ───────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent, fireDiff, quality }: {
  label: string; value: string; sub?: string; accent: string;
  fireDiff?: number | null; quality?: DataQuality;
}) {
  const border: Record<string, string> = {
    orange: "border-t-orange-400", blue: "border-t-blue-400",
    violet: "border-t-violet-400", green: "border-t-emerald-400",
  };
  const fireDiffColor = fireDiff == null ? "" : fireDiff >= 0 ? "text-emerald-600" : "text-red-500";
  return (
    <div className={`card border-t-2 ${border[accent] || ""}`}>
      <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
      <div className="text-2xl font-bold text-ink tracking-tight">{value}</div>
      {quality && (
        <div className="mt-1.5">
          <DataQualityBadge quality={quality} linkTo="/portfolio" />
        </div>
      )}
      {sub && <div className={`text-xs mt-1 ${fireDiff != null ? fireDiffColor : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}

function MilestoneCard({ label, months, estimated }: { label: string; months: number; estimated?: boolean }) {
  const achieved = months === 0;
  const unreachable = !isFinite(months);
  return (
    <div className={`rounded-xl p-3 text-center border ${achieved ? "bg-emerald-50 border-emerald-200" : "bg-surface border-slate-100"}`}>
      <div className={`font-semibold text-sm ${achieved ? "text-emerald-700" : "text-ink"}`}>{label}</div>
      <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${achieved ? "text-emerald-600" : "text-slate-400"}`}>
        {achieved ? "✓ Achieved"
          : unreachable ? "Increase SIPs"
          : months < 12 ? `${months}mo`
          : `${(months / 12).toFixed(1)}yr`}
        {!achieved && !unreachable && estimated && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        )}
      </div>
    </div>
  );
}

function SavingsGauge({ pct }: { pct: number }) {
  const c = Math.min(100, Math.max(0, pct));
  const color = c >= 50 ? "text-emerald-600" : c >= 30 ? "text-amber-500" : "text-red-500";
  const label = c >= 50 ? "Excellent 🔥" : c >= 30 ? "Good — push higher" : "Needs work";
  return (
    <div>
      <div className={`text-4xl font-bold ${color}`}>{c.toFixed(0)}%</div>
      <div className="text-xs text-slate-400 mt-1">of income invested</div>
      <div className={`mt-2 text-xs font-medium ${color}`}>{label}</div>
    </div>
  );
}

function AIPreviewCard({ isPro }: { isPro: boolean }) {
  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="section-title">AI portfolio analysis</div>
        {isPro && (
          <Link href="/analysis" className="text-xs text-brand-500 font-medium hover:underline">
            View full analysis →
          </Link>
        )}
      </div>
      {isPro ? (
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
            🤖
          </div>
          <div>
            <div className="font-semibold text-ink">Your analysis is ready</div>
            <p className="text-sm text-slate-500 mt-0.5">
              Get your health score, action items, and FIRE feasibility verdict.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="blur-sm pointer-events-none select-none space-y-2 mb-4">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
            <div className="text-center px-4">
              <div className="font-semibold text-ink mb-1">Pro feature</div>
              <p className="text-sm text-slate-500 mb-3">AI health score, action items, and FIRE feasibility.</p>
              <button className="btn-primary text-sm px-5">Upgrade to Pro — ₹499/mo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
