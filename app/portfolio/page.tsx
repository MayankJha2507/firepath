import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatINR } from "@/lib/fire-calculator";

const CATEGORY_LABELS: Record<string, string> = {
  indian_stock: "Indian stock", us_stock: "US stock", mf: "Mutual fund",
  epf: "EPF", nps: "NPS", ppf: "PPF", gold: "Gold", fd: "FD / Cash",
  lic: "LIC / Insurance", other: "Other",
};

export default async function Portfolio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  const userId = user?.id ?? "dev";
  const { data: snap } = user ? await supabase
    .from("portfolio_snapshots").select("id, total_corpus, liquid_corpus, locked_corpus")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1).maybeSingle() : { data: null };

  const { data: holdings } = snap
    ? await supabase.from("holdings").select("*").eq("snapshot_id", snap.id).order("value_inr", { ascending: false })
    : { data: [] };

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost text-muted">← Dashboard</Link>
          <h1 className="font-semibold text-ink">Portfolio</h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {snap && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card"><div className="text-xs text-muted mb-1">Total</div><div className="text-xl font-bold text-ink">{formatINR(snap.total_corpus)}</div></div>
            <div className="card"><div className="text-xs text-muted mb-1">Liquid</div><div className="text-xl font-bold text-ink">{formatINR(snap.liquid_corpus)}</div></div>
            <div className="card"><div className="text-xs text-muted mb-1">Locked</div><div className="text-xl font-bold text-ink">{formatINR(snap.locked_corpus)}</div></div>
          </div>
        )}

        <div className="card overflow-x-auto">
          {!holdings?.length ? (
            <div className="text-center py-8 text-muted">No holdings yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-slate-100">
                  <th className="text-left py-3 pr-4 font-medium">Category</th>
                  <th className="text-left py-3 pr-4 font-medium">Name</th>
                  <th className="text-right py-3 pr-4 font-medium">Value</th>
                  <th className="text-right py-3 font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="badge-blue">{CATEGORY_LABELS[h.category] || h.category}</span>
                    </td>
                    <td className="py-3 pr-4 text-ink font-medium">{h.name}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-ink">{formatINR(h.value_inr || 0)}</td>
                    <td className="py-3 text-right text-muted">{h.monthly_contribution ? formatINR(h.monthly_contribution) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="disclaimer mt-8">For educational purposes only. Not SEBI-registered investment advice.</p>
      </div>
    </div>
  );
}
