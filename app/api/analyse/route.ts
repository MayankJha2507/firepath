import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiProvider } from "@/lib/ai-provider";
import { projectedFireAge, fireCorpusTarget } from "@/lib/fire-calculator";

const CURRENT_PROMPT_VERSION = 3;

const SYSTEM_PROMPT = `
You are a financial education assistant specialising in Indian personal finance and FIRE planning.
A user has shared their portfolio. Return ONLY valid JSON with exactly these keys, no markdown, no preamble, no backticks.

CRITICAL RULES YOU MUST FOLLOW:

1. The dashboard calculator has determined projectedFireAge and targetAge from the user data below.
   Your fire_feasibility.verdict MUST match exactly:
   - If projectedFireAge <= targetAge: verdict = "on_track"
   - If projectedFireAge <= targetAge + 2: verdict = "close"
   - If projectedFireAge > targetAge + 2: verdict = "needs_work"
   Never contradict the dashboard projected FIRE age. Never say "on track" if projected age exceeds target age.

2. For stock_quality, evaluate EVERY stock individually by name.
   Every stock in the input must appear in either quality_names or noise_names. Do not skip any.
   Noise stocks — no economic moat, commodity exposure, or structural headwinds:
     NMDC (commodity, no moat), Ujjivan SFB (small finance bank, high risk),
     SBI Card (structural UPI headwind), PCBL (commodity chemical),
     National Aluminium (cyclical commodity), Dabur (low growth FMCG),
     Asian Paints (margin pressure, growth slowdown)
   Quality stocks — strong moat, structural growth:
     HDFC Bank, Bajaj Finance, CDSL, IEX, AAVAS Financiers,
     Max Healthcare, Cipla, any Nifty/index fund, NVIDIA, Alphabet, Apple,
     Microsoft, Amazon, Meta, TSM
   When in doubt about a stock, put it in noise_names.

3. locked_corpus_note MUST reference exact rupee values and exact years from the user data.
   Never be generic. Use this format:
   "EPF of ₹[exact amount] is accessible after 2 months of unemployment at retirement age [X].
    NPS of ₹[exact amount] is locked until age 60 — [Y] years after your target retirement.
    It will grow untouched to approximately ₹[projected] by age 60 without any new contributions.
    PPF of ₹[exact amount] matures in [Z] years, aligning well with your retirement timeline."

4. health_score must reflect actual portfolio quality honestly. Apply these penalties:
   - Each commodity/no-moat stock in portfolio: -5 per stock
   - Gold above 10% of total portfolio: -5
   - LIC endowment or money-back policy present: -8
   - More than 10 individual stocks (over-diversified): -5
   - Projected FIRE age more than 2 years behind target: -10
   - Projected FIRE age more than 4 years behind target: additional -8
   Start from 100 and subtract. A portfolio 4 years behind FIRE target must not score above 72.

5. CASH SURPLUS HANDLING:
   If monthly cash surplus > ₹10,000:
   - This MUST appear as the TOP action_item with priority "high"
   - The action must be specific to their surplus amount and projected FIRE acceleration
   - Format: "Invest your ₹X/month cash surplus to FIRE Y years earlier"
   - The impact field must reference the projected wealth from surplus alone
   - Example impact: "Adds ₹X Cr to your corpus by age N, moving FIRE from age N to age M"
   - Also mention in concerns if surplus rate > 15% of income

   If monthly cash surplus <= ₹10,000:
   - Mention in strengths: "Fully allocating income — no idle cash"

6. CASH SURPLUS IN HEADLINE:
   If surplus > ₹20,000/month, the headline MUST mention it.
   Example: "₹40K/month sitting idle could accelerate your FIRE date by 3 years"

7. concerns must always include:
   - If gold exceeds 10% of portfolio: flag it explicitly with the actual percentage
   - If NPS lock-in gap is more than 10 years after retirement: flag the bridge period
   - If projected FIRE age exceeds target: flag the specific gap in years
   - If LIC endowment present: flag poor returns (~4-5% vs equity alternatives)

8. allocation_commentary must reference the actual calculated percentages from the user data.
   Never use approximate or made-up percentages. Use the exact equity_pct, debt_pct, gold_pct, cash_pct provided.

Return exactly this JSON structure, nothing else:
{
  "health_score": number between 0 and 100,
  "headline": "one honest sentence summarising their financial position",
  "strengths": ["string", "string", "string"],
  "concerns": ["string", "string", "string"],
  "allocation_commentary": "2-3 sentences using exact percentages from input",
  "fire_feasibility": {
    "verdict": "on_track" or "close" or "needs_work",
    "commentary": "2-3 sentences referencing exact projected age vs target age",
    "gap_amount": corpus gap in rupees as number or null if on track,
    "key_lever": "single most impactful action to improve FIRE date"
  },
  "stock_quality": {
    "quality_names": ["every quality stock by exact name as entered"],
    "noise_names": ["every noise stock by exact name as entered"],
    "over_diversified": true or false,
    "commentary": "2 sentences naming specific stocks from their portfolio"
  },
  "action_items": [
    { "priority": "high", "action": "specific action", "impact": "specific impact" },
    { "priority": "medium", "action": "specific action", "impact": "specific impact" },
    { "priority": "low", "action": "specific action", "impact": "specific impact" }
  ],
  "locked_corpus_note": "exact amounts and years for EPF, NPS, PPF as specified in rule 3",
  "disclaimer": "This analysis is for financial education only and is not SEBI-registered investment advice. Consult a SEBI RIA before making financial decisions."
}
`;

// TODO: remove BYPASS_AUTH before production launch
const MOCK_ANALYSIS = {
  health_score: 72,
  headline: "Dev mode — sign in with a real account to generate a live analysis from your actual portfolio.",
  strengths: [
    "Strong savings rate with consistent monthly investments",
    "Good mix of liquid and locked instruments",
    "EPF and PPF provide reliable debt-side ballast",
  ],
  concerns: [
    "No emergency fund visible — target 6 months of expenses",
    "Equity allocation may be under-optimised for a long FIRE horizon",
    "US stock exposure is limited — consider global diversification",
  ],
  allocation_commentary:
    "Your allocation is broadly balanced for a mid-career professional. At this stage, tilting further towards equity (65–70%) while keeping locked instruments as the debt floor is a common strategy for accelerating FIRE. Gold at 5–8% provides useful inflation hedge.",
  fire_feasibility: {
    verdict: "close" as const,
    commentary:
      "Based on the mock snapshot, you're within striking distance of your FIRE target. Maintaining your current SIP discipline and capturing a few salary increments should get you there ahead of plan.",
    gap_amount: 2500000,
    key_lever: "Increase monthly SIP by ₹10,000 — this alone moves FIRE date ~18 months earlier.",
  },
  stock_quality: {
    quality_names: ["HDFC Bank", "Infosys", "Asian Paints"],
    noise_names: [],
    over_diversified: false,
    commentary:
      "Core holdings show strong moat characteristics. Portfolio concentration is healthy — avoid adding more names without clear thesis.",
  },
  action_items: [
    { priority: "high" as const,   action: "Build a 6-month emergency fund in a liquid FD",           impact: "Removes forced-sell risk in a downturn" },
    { priority: "medium" as const, action: "Step up SIP by 10% each April with salary revision",      impact: "Compresses FIRE timeline by 2–3 years" },
    { priority: "low" as const,    action: "Add a US index ETF (Nasdaq 100 or S&P 500 feeder fund)",  impact: "Improves global diversification and reduces INR concentration risk" },
  ],
  locked_corpus_note:
    "EPF matures at retirement (typically 58). PPF can be withdrawn after 15 years or extended in 5-year blocks. NPS allows 60% lump-sum at 60; the remaining 40% must be annuitised. Plan around these unlock timelines when modelling your liquid bridge between early retirement and locked-corpus release.",
  disclaimer:
    "This is a mock analysis for development testing. Not real financial advice. For a real analysis, sign in with your Supabase account. This analysis is for financial education only and is not SEBI-registered investment advice.",
};

export async function POST(_req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // TODO: remove BYPASS_AUTH before production launch
  if (!user && process.env.BYPASS_AUTH === "true") {
    return NextResponse.json({ analysis: MOCK_ANALYSIS, cached: false });
  }

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileTier } = await supabase
    .from("profiles").select("tier").eq("id", user.id).single();
  // TODO: remove BYPASS_PRO_GATE before production launch
  const bypassProGate = process.env.BYPASS_PRO_GATE === "true";
  if (profileTier?.tier !== "pro" && !bypassProGate) {
    return NextResponse.json({ error: "Pro tier required" }, { status: 403 });
  }

  // Get user's latest snapshot
  const { data: latestSnapshot } = await supabase
    .from("portfolio_snapshots")
    .select("id, snapshot_date, projected_fire_age")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (!latestSnapshot) {
    if (process.env.BYPASS_AUTH === "true" || process.env.BYPASS_PRO_GATE === "true") {
      return NextResponse.json({ analysis: MOCK_ANALYSIS, cached: false });
    }
    return NextResponse.json({ error: "No portfolio snapshot found" }, { status: 404 });
  }

  // Extract projectedFireAge from snapshot for prompt injection
  const projectedFireAge = latestSnapshot.projected_fire_age;

  // Cache check — must match latest snapshot AND current prompt version
  const { data: cached } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("snapshot_id", latestSnapshot.id)
    .eq("prompt_version", CURRENT_PROMPT_VERSION)
    .single();

  if (cached) {
    return NextResponse.json({
      analysis: cached.analysis_json,
      cached: true,
      generatedAt: cached.generated_at,
    });
  }

  // Cache miss — fetch holdings and full profile
  const [{ data: holdings }, { data: fullProfile }, { data: snap }] = await Promise.all([
    supabase.from("holdings").select("*").eq("snapshot_id", latestSnapshot.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("portfolio_snapshots").select("*").eq("id", latestSnapshot.id).single(),
  ]);

  if (!fullProfile || !snap) {
    return NextResponse.json({ error: "Profile or snapshot data missing." }, { status: 400 });
  }

  const holdingsList = holdings || [];

  // Extract holdings by category
  const indianStocks = holdingsList.filter((h: any) => h.category === "indian_stock");
  const usStocks     = holdingsList.filter((h: any) => h.category === "us_stock");
  const mutualFunds  = holdingsList.filter((h: any) => h.category === "mf");
  const epf  = holdingsList.find((h: any) => h.category === "epf");
  const nps  = holdingsList.find((h: any) => h.category === "nps");
  const ppf  = holdingsList.find((h: any) => h.category === "ppf");
  const lic  = holdingsList.find((h: any) => h.category === "lic");
  const gold = holdingsList.find((h: any) => h.category === "gold");
  const fd   = holdingsList.find((h: any) => h.category === "fd");

  const totalCorpus  = snap.total_corpus;
  const liquidCorpus = snap.liquid_corpus;
  const lockedCorpus = snap.locked_corpus;
  const equityPct    = snap.equity_pct;
  const debtPct      = snap.debt_pct;
  const goldPct      = snap.gold_pct;
  const cashPct      = snap.cash_pct;
  const savingsRate  = snap.savings_rate;

  // PPF years to maturity — parse from notes if available
  const ppfYearsToMaturity =
    ppf?.notes?.match(/(\d+)\s*(?:years?|yr)/i)?.[1] ?? "N/A";

  // Cash flow / surplus analysis
  const totalMonthlyInvestments = holdingsList
    .filter((h: any) => h.notes !== "estimated")
    .reduce((s: number, h: any) => s + (h.monthly_contribution || 0), 0);

  const monthlySurplus = Math.max(
    (fullProfile.monthly_income || 0) - (fullProfile.monthly_expense || 0) - totalMonthlyInvestments,
    0,
  );
  const surplusRate = fullProfile.monthly_income > 0
    ? (monthlySurplus / fullProfile.monthly_income) * 100
    : 0;

  const yearsToRetirement = (fullProfile.fire_target_age || 45) - (fullProfile.age || 30);
  const inflationRate = (fullProfile.inflation_rate ?? 7) / 100;
  const currentLiquidCorpus = snap.total_corpus || 0;
  const fireTargetCorpus = fireCorpusTarget(
    fullProfile.fire_monthly_expense || fullProfile.monthly_expense || 0,
    yearsToRetirement,
    inflationRate,
  );

  let surplusProjected = 0;
  if (monthlySurplus > 0) {
    const annualSurplus = monthlySurplus * 12;
    let corpus = 0;
    for (let y = 0; y < yearsToRetirement; y++) {
      corpus = (corpus + annualSurplus) * 1.12;
    }
    surplusProjected = corpus;
  }

  const currentFireAge = projectedFireAge(
    fullProfile.age || 30, currentLiquidCorpus, totalMonthlyInvestments, fireTargetCorpus, 0.12,
  );
  const acceleratedFireAge = projectedFireAge(
    fullProfile.age || 30, currentLiquidCorpus, totalMonthlyInvestments + monthlySurplus, fireTargetCorpus, 0.12,
  );
  const yearsSaved = Math.max(currentFireAge - acceleratedFireAge, 0);

  const userDataString = `
USER PORTFOLIO DATA:
Age: ${fullProfile.age}
Target retirement age: ${fullProfile.fire_target_age}
Monthly income: ₹${fullProfile.monthly_income}
Monthly expense: ₹${fullProfile.monthly_expense}
Post-retirement monthly expense target: ₹${fullProfile.fire_monthly_expense}
Tax bracket: ${fullProfile.tax_bracket}%
Tax regime: ${fullProfile.tax_regime}
Risk score: ${fullProfile.risk_score}/10

CASH FLOW ANALYSIS:
Monthly income: ₹${fullProfile.monthly_income}
Monthly expenses: ₹${fullProfile.monthly_expense}
Monthly investments (tracked, excl. estimated): ₹${totalMonthlyInvestments}
Monthly cash surplus (unallocated): ₹${monthlySurplus}
Surplus rate: ${surplusRate.toFixed(1)}% of income sitting idle
If surplus invested at 12% CAGR: grows to ₹${Math.round(surplusProjected)} by age ${fullProfile.fire_target_age}
Investing surplus would accelerate FIRE by: ${yearsSaved} year(s) (from age ${currentFireAge} to age ${acceleratedFireAge})

CALCULATED BY DASHBOARD (treat these as ground truth):
Projected FIRE age: ${projectedFireAge}
Target FIRE age: ${fullProfile.fire_target_age}
Gap: ${projectedFireAge - fullProfile.fire_target_age} years ${projectedFireAge > fullProfile.fire_target_age ? "behind" : "ahead of"} target
Years NPS locked after retirement: ${60 - fullProfile.fire_target_age}
Total corpus: ₹${totalCorpus}
Liquid corpus: ₹${liquidCorpus}
Locked corpus: ₹${lockedCorpus}
Equity allocation: ${equityPct}%
Debt allocation: ${debtPct}%
Gold allocation: ${goldPct}%
Cash allocation: ${cashPct}%
Savings rate: ${savingsRate}%

HOLDINGS:
Indian stocks: ${indianStocks.map((s: any) => `${s.name} ₹${s.value_inr}`).join(", ") || "None"}
US stocks: ${usStocks.map((s: any) => `${s.name} ₹${s.value_inr}`).join(", ") || "None"}
Mutual funds: ${mutualFunds.map((f: any) => `${f.name} (${f.notes}) ₹${f.value_inr}`).join(", ") || "None"}
EPF: ₹${epf?.value_inr ?? 0} current, ₹${epf?.monthly_contribution ?? 0}/month your contribution, ₹0/month employer
NPS: ₹${nps?.value_inr ?? 0} current, ₹${nps?.monthly_contribution ?? 0}/month, ${nps?.notes ?? "LC75"}
PPF: ₹${ppf?.value_inr ?? 0} current, ₹${ppf?.monthly_contribution ?? 0}/month, ${ppfYearsToMaturity} years to maturity
LIC: ${lic ? `₹${lic.value_inr} current value, type: ${lic.notes}` : "None"}
Physical gold: ₹${gold?.value_inr ?? 0}
FD/Emergency fund: ₹${fd?.value_inr ?? 0}
`;

  let parsed: any;
  try {
    const raw = await aiProvider.generateAnalysis(userDataString, SYSTEM_PROMPT);
    const clean = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch (e: any) {
    const msg: string = e.message || "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate") || msg.includes("Too Many")) {
      const fallback = {
        ...MOCK_ANALYSIS,
        headline: "Groq API quota exceeded — showing a sample analysis. Check your GROQ_API_KEY in environment variables.",
        disclaimer: "Live AI analysis unavailable: Groq API quota exhausted or key missing. " + MOCK_ANALYSIS.disclaimer,
      };
      return NextResponse.json({ analysis: fallback, cached: false, quota_exceeded: true });
    }
    return NextResponse.json(
      { error: "AI analysis failed. Please try again in a few minutes." },
      { status: 500 }
    );
  }

  const generatedAt = new Date().toISOString();

  await supabase.from("ai_analyses").insert({
    user_id: user.id,
    snapshot_id: latestSnapshot.id,
    analysis_json: parsed,
    provider: "groq",
    prompt_version: CURRENT_PROMPT_VERSION,
    generated_at: generatedAt,
  });

  return NextResponse.json({
    analysis: parsed,
    cached: false,
    generatedAt,
  });
}
