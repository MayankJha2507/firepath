import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatINR } from "@/lib/fire-calculator";
import HistoryLineChart from "@/components/charts/HistoryLineChart";
import FireAgeChart from "@/components/charts/FireAgeChart";
import SavingsRateChart from "@/components/charts/SavingsRateChart";
import SideNav from "@/components/layout/SideNav";

const SYNTHETIC_NOTES = ["estimated", "user-provided"];

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
  let hasRealHoldings = false;

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

    // Check latest snapshot for real holdings
    const latestSnap = snaps[snaps.length - 1];
    if (latestSnap) {
      const { data: holdings } = await supabase
        .from("holdings").select("notes").eq("snapshot_id", latestSnap.id);
      hasRealHoldings = (holdings || []).some(h => !SYNTHETIC_NOTES.includes(h.notes || ""));
    }
  } else {
    snaps = DEV_SNAPS;
    milestones = DEV_MILESTONES;
    hasRealHoldings = true;
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
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Progress history</h1>

          {!hasRealHoldings ? (
            <div className="card text-center py-14">
              <div className="text-4xl mb-4">📈</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Nothing to track yet</h2>
              <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                Add your actual holdings — EPF, stocks, mutual funds, and more — and your progress history will appear here as you take monthly snapshots.
              </p>
              <Link href="/portfolio" className="btn-primary px-8">Add portfolio details →</Link>
            </div>
          ) : (<>

          {!isPro && (
            <div className="card text-center py-10">
              <div className="text-3xl mb-3">📈</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Track your progress over time</h2>
              <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                Corpus history, FIRE age trajectory, savings trend, and milestone timeline are Pro features.
              </p>
              <button className="btn-primary px-8">Upgrade to Pro — ₹499/mo</button>
            </div>
          )}

          <div className={!isPro ? "blur-sm pointer-events-none select-none space-y-5" : "space-y-5"}>
            <div className="card">
              <div className="section-title mb-4">Corpus over time</div>
              {corpusData.length >= 2
                ? <HistoryLineChart data={corpusData} />
                : <EmptyChart msg="Add more snapshots to see your progress trend." />}
            </div>

            <div className="card">
              <div className="section-title mb-4">Projected FIRE age — is it moving closer?</div>
              {fireAgeData.length >= 2
                ? <FireAgeChart data={fireAgeData} />
                : <EmptyChart msg="More snapshots needed to show FIRE age trajectory." />}
            </div>

            <div className="card">
              <div className="section-title mb-4">Savings rate trend</div>
              {savingsData.length >= 2
                ? <SavingsRateChart data={savingsData} />
                : <EmptyChart msg="More snapshots needed to show savings rate trend." />}
            </div>

            {milestones.length > 0 && (
              <div className="card">
                <div className="section-title mb-4">Milestones achieved</div>
                <div className="relative pl-5">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "var(--border)" }} />
                  <div className="space-y-4">
                    {milestones.map(m => (
                      <div key={m.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-5 w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1.5" style={{ boxShadow: "0 0 0 2px var(--bg-card)" }} />
                        <div>
                          <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                            {MILESTONE_LABELS[m.milestone_type] || m.milestone_type}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
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

            <div className="card overflow-x-auto">
              <div className="section-title mb-4">All snapshots</div>
              {snaps.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No snapshots yet.</p>
              ) : (
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-xs border-b" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
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
                      <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2.5 pr-4" style={{ color: "var(--text-secondary)" }}>
                          {new Date(s.snapshot_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{formatINR(s.total_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right" style={{ color: "var(--text-secondary)" }}>{formatINR(s.liquid_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right" style={{ color: "var(--text-secondary)" }}>{formatINR(s.locked_corpus)}</td>
                        <td className="py-2.5 pr-4 text-right" style={{ color: "var(--text-secondary)" }}>{s.projected_fire_age?.toFixed(0) ?? "—"}</td>
                        <td className="py-2.5 text-right" style={{ color: "var(--text-secondary)" }}>{s.savings_rate?.toFixed(1) ?? "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          </>)}

          <p className="disclaimer pb-4">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="h-36 flex items-center justify-center text-sm rounded-xl" style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      {msg}
    </div>
  );
}
