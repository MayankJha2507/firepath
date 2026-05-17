import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { equityProjection, fireCorpusTarget } from "@/lib/fire-calculator";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    age, fire_target_age, years_working, inflation_rate,
    monthly_income, monthly_expense, total_savings, fire_monthly_expense,
    monthly_investments,
  } = await req.json();

  const ageN = parseInt(age) || 30;
  const retireN = parseInt(fire_target_age) || 45;
  const yearsN = parseInt(years_working) || 0;
  const incomeN = Number(monthly_income) || 0;
  const expenseN = Number(monthly_expense) || 0;
  const fireExpN = Number(fire_monthly_expense) || 0;
  const corpusN = Number(total_savings) || 0;
  const inflationRateN = parseFloat(inflation_rate) || 7;
  const monthlyInvestN = Number(monthly_investments) || 0;

  const dataCompleteness = {
    income: "exact",
    expenses: "exact",
    savings: "estimated",
    indian_stocks: "missing",
    us_stocks: "missing",
    mutual_funds: "missing",
    gold: "missing",
    epf: "estimated",
    nps: "missing",
    ppf: "missing",
    sips: "missing",
  };

  const { error: pErr } = await supabase.from("profiles").update({
    age: ageN,
    fire_target_age: retireN,
    monthly_income: incomeN,
    monthly_expense: expenseN,
    fire_monthly_expense: fireExpN,
    years_working: yearsN,
    inflation_rate: inflationRateN,
    data_completeness: dataCompleteness,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const liquidCorpus = corpusN;
  const lockedCorpus = 0;
  const monthlySurplus = Math.max(0, incomeN - expenseN);
  const inflRate = inflationRateN / 100;

  let projectedFireAge = retireN;
  for (let y = 1; y <= 70 - ageN; y++) {
    if (equityProjection(liquidCorpus, monthlySurplus, y) >= fireCorpusTarget(fireExpN, y, inflRate)) {
      projectedFireAge = ageN + y;
      break;
    }
  }

  const savingsRatePct = incomeN > 0 ? Math.min((monthlyInvestN / incomeN) * 100, 100) : 0;

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

  // If user provided monthly investments, create a single combined holding
  if (monthlyInvestN > 0) {
    await supabase.from("holdings").insert({
      user_id: user.id,
      snapshot_id: snap.id,
      category: "other",
      name: "Monthly investments (combined)",
      value_inr: 0,
      monthly_contribution: monthlyInvestN,
      notes: "user-provided",
    });
  }

  return NextResponse.json({ ok: true });
}
