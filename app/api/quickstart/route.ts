import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  equityProjection, inflationAdjustedExpense, fireCorpusTarget,
} from "@/lib/fire-calculator";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    age, fire_target_age, years_working,
    income_range, expense_range, savings_range, fire_expense_range,
    monthly_income, monthly_expense, savings_midpoint, fire_monthly_expense,
  } = await req.json();

  const ageN = parseInt(age) || 30;
  const retireN = parseInt(fire_target_age) || 45;
  const yearsN = parseInt(years_working) || 0;
  const incomeN = Number(monthly_income) || 0;
  const expenseN = Number(monthly_expense) || 0;
  const fireExpN = Number(fire_monthly_expense) || 0;
  const corpusN = Number(savings_midpoint) || 0;

  const dataCompleteness = {
    income: "estimated", expenses: "estimated", savings: "estimated",
    indian_stocks: "missing", us_stocks: "missing", mutual_funds: "missing",
    gold: "missing", epf: "estimated", nps: "missing", ppf: "missing", sips: "missing",
  };

  // Core fields — always exist in schema
  const coreUpdate = {
    age: ageN,
    fire_target_age: retireN,
    monthly_income: incomeN,
    monthly_expense: expenseN,
    fire_monthly_expense: fireExpN,
    updated_at: new Date().toISOString(),
  };

  // Try full update (includes new columns from 0002 migration)
  const { error: pErr } = await supabase.from("profiles").update({
    ...coreUpdate,
    years_working: yearsN,
    income_range,
    expense_range,
    savings_range,
    fire_expense_range,
    data_completeness: dataCompleteness,
  }).eq("id", user.id);

  if (pErr) {
    // New columns may not exist yet — fall back to core fields only
    const { error: pErr2 } = await supabase.from("profiles").update(coreUpdate).eq("id", user.id);
    if (pErr2) return NextResponse.json({ error: pErr2.message }, { status: 500 });
  }

  // Estimated snapshot: 60/40 liquid/locked split, typical Indian allocation
  const liquidCorpus = corpusN * 0.6;
  const lockedCorpus = corpusN * 0.4;
  const yearsToFire = Math.max(1, retireN - ageN);
  const monthlySurplus = Math.max(0, incomeN - expenseN);

  let projectedFireAge = retireN;
  for (let y = 1; y <= 70 - ageN; y++) {
    const inflAdj = inflationAdjustedExpense(fireExpN, y);
    if (equityProjection(liquidCorpus, monthlySurplus, y) >= fireCorpusTarget(inflAdj)) {
      projectedFireAge = ageN + y;
      break;
    }
  }

  const savingsRatePct = incomeN > 0
    ? Math.round(Math.min(100, Math.max(0, (monthlySurplus / incomeN) * 100)))
    : 0;

  const { data: snap, error: snapErr } = await supabase
    .from("portfolio_snapshots")
    .insert({
      user_id: user.id,
      total_corpus: corpusN,
      liquid_corpus: liquidCorpus,
      locked_corpus: lockedCorpus,
      equity_pct: 50, debt_pct: 35, gold_pct: 10, cash_pct: 5,
      savings_rate: savingsRatePct,
      projected_fire_age: projectedFireAge,
    })
    .select()
    .single();

  if (snapErr) return NextResponse.json({ error: snapErr.message }, { status: 500 });

  // Estimate EPF from years working
  if (yearsN > 0 && incomeN > 0) {
    const estimatedEpf = incomeN * 0.24 * 12 * yearsN * 1.4;
    await supabase.from("holdings").insert({
      user_id: user.id,
      snapshot_id: snap.id,
      category: "epf",
      name: "EPF (estimated)",
      value_inr: estimatedEpf,
      monthly_contribution: incomeN * 0.24,
      notes: "estimated",
    });
  }

  return NextResponse.json({ ok: true });
}
