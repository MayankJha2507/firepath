import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assetAllocation, equityProjection, epfProjection, ppfProjection,
  inflationAdjustedExpense, fireCorpusTarget, savingsRate,
} from "@/lib/fire-calculator";
import type { Holding } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const holdings: Holding[] = body.holdings || [];

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile missing" }, { status: 400 });

  const totalCorpus = holdings.reduce((s, h) => s + (h.value_inr || 0), 0);
  const lockedCats = new Set(["epf", "nps", "ppf", "lic"]);
  const lockedCorpus = holdings.filter(h => lockedCats.has(h.category)).reduce((s, h) => s + (h.value_inr || 0), 0);
  const liquidCorpus = totalCorpus - lockedCorpus;

  const alloc = assetAllocation(holdings);

  const monthlySIP = holdings.reduce((s, h) => s + (h.monthly_contribution || 0), 0)
    + (body.monthly_us_investment || 0) + (body.monthly_indian_investment || 0);

  const sRate = savingsRate(monthlySIP, profile.monthly_income || 0);

  // Crude FIRE-age projection: years to reach corpus target via equity returns.
  const yearsToFire = profile.fire_target_age && profile.age
    ? Math.max(1, profile.fire_target_age - profile.age)
    : 20;
  const inflAdj = inflationAdjustedExpense(profile.fire_monthly_expense || profile.monthly_expense || 0, yearsToFire);
  const target = fireCorpusTarget(inflAdj);
  const projectedAt = equityProjection(liquidCorpus, monthlySIP, yearsToFire);

  // Find years where projection hits target (search up to age 70).
  let projectedFireAge = profile.fire_target_age || 60;
  if (profile.age) {
    for (let y = 1; y <= 70 - profile.age; y++) {
      if (equityProjection(liquidCorpus, monthlySIP, y) >= fireCorpusTarget(inflationAdjustedExpense(profile.fire_monthly_expense || profile.monthly_expense || 0, y))) {
        projectedFireAge = profile.age + y;
        break;
      }
    }
  }

  const { data: snap, error: snapErr } = await supabase
    .from("portfolio_snapshots")
    .insert({
      user_id: user.id,
      total_corpus: totalCorpus,
      liquid_corpus: liquidCorpus,
      locked_corpus: lockedCorpus,
      equity_pct: alloc.equityPct,
      debt_pct: alloc.debtPct,
      gold_pct: alloc.goldPct,
      cash_pct: alloc.cashPct,
      savings_rate: sRate,
      projected_fire_age: projectedFireAge,
    })
    .select()
    .single();
  if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 });

  if (holdings.length) {
    const { error: hErr } = await supabase.from("holdings").insert(
      holdings.map(h => ({
        user_id: user.id, snapshot_id: snap.id,
        category: h.category, name: h.name,
        value_inr: h.value_inr, monthly_contribution: h.monthly_contribution || 0,
        notes: h.notes,
      }))
    );
    if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });
  }

  // Fire-and-forget milestones check
  fetch(new URL("/api/milestones", req.url).toString(), {
    method: "POST",
    headers: { cookie: req.headers.get("cookie") || "" },
    body: JSON.stringify({ snapshot_id: snap.id }),
  }).catch(() => {});

  return NextResponse.json({ snapshot: snap, target, projectedAt });
}
