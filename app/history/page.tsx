import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatINR } from "@/lib/fire-calculator";
import HistoryLineChart from "@/components/charts/HistoryLineChart";
import FireAgeChart from "@/components/charts/FireAgeChart";
import SavingsRateChart from "@/components/charts/SavingsRateChart";
import SideNav from "@/components/layout/SideNav";

const DEV_SNAPS = [
  { id: "1", snapshot_date: "2024-09-01", total_corpus: 4200000, liquid_corpus: 2800000, locked_corpus: 1400000, savings_rate: 35, projected_fire_age: 46 },
  { id: "2", snapshot_date: "2024-12-01", total_corpus: 5500000, liquid_corpus: 3800000, locked_corpus: 1700000, savings_rate: 38, projected_fire_age: 45 },
  { id: "3", snapshot_date: "2025-03-01", total_corpus: 6800000, liquid_corpus: 4800000, locked_corpus: 2000000, savings_rate: 40, projected_fire_age: 44 },
  { id: "4", snapshot_date: "2025-06-01", total_corpus: 8500000, liquid_corpus: 6000000, locked_corpus: 2500000, savings_rate: 42, projected_fire_age: 43 },
];
const DEV_MILESTONES = [
  { id: "1", milestone_type: "1cr", achieved_at: "2025-01-15T00:00:00Z", corpus_value: 10500000, message: "You crossed ₹1 Cr liquid!" },
];

export default async function History() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  let tier = "pro";
  let snaps: any[] = [];
  let milestones: any[] = [];

  if (user) {
    const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
    tier = p?.tier || "free";
    const { data: s } = await supabase
      .from("portfolio_snapshots").select("*")
      .eq("user_id", user.id).order("snapshot_date", { ascending: true });
    const { data: m } = await supabase
      .from("milestones").select("*")
      .eq("user_id", user.id).order("achieved_at", { ascending: true });
    snaps = s || [];
    milestones = m || [];
  } else {
    snaps = DEV_SNAPS;
    milestones = DEV_MILESTONES;
  }

  const isPro = tier === "pro";

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  const corpusData = snaps.map(s => ({ date: fmtDate(s.snapshot_date), total: s.total_corpus, liquid: s.liquid_corpus }));
  const fireAgeData = snaps.filter(s => s.projected_fire_age).map(s => ({ date: fmtDate(s.snapshot_date), fire_age: s.projected_fire_age }));
  const savingsData = snaps.filter(s => s.savings_rate).map(s => ({ date: fmtDate(s.snapshot_date), rate: s.savings_rate }));

  const MILESTONE_LABELS: Record<string, string> = {
    "1cr": "Crossed ₹1 Cr liquid 🎉",
    "2cr": "Crossed ₹2 Cr liquid 🎉",
    "5cr": "Crossed ₹5 Cr liquid 🔥",
    "10cr": "Crossed ₹10 Cr liquid 🚀",
    "savings_rate_50": "Savings rate hit 50% 💪",
    "fire_date_moved": "FIRE date moved closer 📅",
  };

  return (
    <div className="min-h-screen bg-surface">
      <SideNav />
      <main className="lg:ml-[240px] pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          <h1 className="text-2xl font-bold text-ink">Progress history</h1>

          {/* Upsell for free tier */}
          {!isPro && (
            <div className="card text-center py-10 bg-gradient-to-b from-white to-surface">
              <div className="text-3xl mb-3">📈</div>
              <h2 className="text-xl font-semibold text-ink mb-2">Track your progress over time</h2>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Corpus history, FIRE age trajectory, savings trend, and milestone timeline are Pro features.
              </p>
              <button className="btn-primary px-8">Upgrade to Pro — ₹499/mo</button>
            </div>
          )}

          <div className={!isPro ? "blur-sm pointer-events-none select-none space-y-5" : "space-y-5"}>
            {/* Corpus over time */}
            <div className="card">
              <div className="section-title mb-4">Corpus over time</div>
              {corpusData.length >= 2
                ? <HistoryLineChart data={corpusData} />
                : <EmptyChart msg="Add more snapshots to see your progress trend." />}
            </div>

            {/* FIRE age trajectory */}
            <div className="card">
              <div className="section-title mb-4">Projected FIRE age — is it moving closer?</div>
              {fireAgeData.length >= 2
                ? <FireAgeChart data={fireAgeData} />
                : <EmptyChart msg="More snapshots needed to show FIRE age trajectory." />}
            </div>

            {/* Savings rate trend */}
            <div className="card">
              <div className="section-title mb-4">Savings rate trend</div>
              {savingsData.length >= 2
                ? <SavingsRateChart data={savingsData} />
                : <EmptyChart msg="More snapshots needed to show savings rate trend." />}
            </div>

            {/* Milestone timeline */}
            {milestones.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">Milestones achieved</div>
                <div className="relative pl-5">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-100" />
                  <div className="space-y-4">
                    {milestones.map(m => (
                      <div key={m.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white mt-1.5" />
                        <div>
                          <div className="font-medium text-sm text-ink">
                            {MILESTONE_LABELS[m.milestone_type] || m.milestone_type}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(m.achieved_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            {m.corpus_value ? ` · ${formatINR(m.corpus_value)}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Snapshot table */}
            <div className="card overflow-x-auto">
              <div className="section-title mb-4">All snapshots</div>
              {snaps.length === 0 ? (
                <p className="text-sm text-slate-400">No snapshots yet.</p>
              ) : (
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left py-2 pr-4 font-medium">Date</th>
                      <th className="text-right py-2 pr-4 font-medium">Total</th>
                      <th className="text-right py-2 pr-4 font-medium">Liquid</th>
                      <th className="text-right py-2 pr-4 font-medium">Locked</th>
                      <th className="text-right py-2 pr-4 font-medium">FIRE age</th>
                      <th className="text-right py-2 font-medium">Savings %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...snaps].reverse().map(s => (
                      <tr key={s.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 pr-4 text-slate-500">
                          {new Date(s.snapshot_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold text-ink">{formatINR(s.total_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-600">{formatINR(s.liquid_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-600">{formatINR(s.locked_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-600">{s.projected_fire_age?.toFixed(0) ?? "—"}</td>
                        <td className="py-2.5 text-right text-slate-600">{s.savings_rate?.toFixed(1) ?? "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="disclaimer pb-4">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="h-36 flex items-center justify-center text-sm text-slate-400 bg-surface rounded-xl border border-slate-100">
      {msg}
    </div>
  );
}
