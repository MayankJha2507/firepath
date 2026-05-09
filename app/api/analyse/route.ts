import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiProvider } from "@/lib/ai-provider";

const SYSTEM_PROMPT = `
You are a financial education assistant specialising in Indian personal finance and FIRE planning.
A user has shared their portfolio. Return ONLY valid JSON with exactly these keys, no markdown, no preamble:

{
  "health_score": number between 0 and 100,
  "headline": "one sentence summary of their financial position",
  "strengths": ["string", "string", "string"],
  "concerns": ["string", "string", "string"],
  "allocation_commentary": "2-3 sentences on their equity/debt/gold/cash split",
  "fire_feasibility": {
    "verdict": "on_track" or "close" or "needs_work",
    "commentary": "2-3 sentences",
    "gap_amount": number or null,
    "key_lever": "single most impactful thing they can change"
  },
  "stock_quality": {
    "quality_names": ["stock names that show strong moat"],
    "noise_names": ["stock names that are low conviction or duplicative"],
    "over_diversified": true or false,
    "commentary": "2 sentences"
  },
  "action_items": [
    { "priority": "high", "action": "string", "impact": "string" },
    { "priority": "medium", "action": "string", "impact": "string" },
    { "priority": "low", "action": "string", "impact": "string" }
  ],
  "locked_corpus_note": "explain their specific EPF/NPS/PPF situation and when it unlocks",
  "disclaimer": "This analysis is for financial education only and is not SEBI-registered investment advice. Consult a SEBI RIA before making financial decisions."
}

Base everything on general financial education principles. Never recommend buying or selling specific securities.
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

  const { data: profile } = await supabase
    .from("profiles").select("tier").eq("id", user.id).single();
  // TODO: remove BYPASS_PRO_GATE before production launch
  const bypassProGate = process.env.BYPASS_PRO_GATE === "true";
  if (profile?.tier !== "pro" && !bypassProGate) {
    return NextResponse.json({ error: "Pro tier required" }, { status: 403 });
  }

  const { data: snap } = await supabase
    .from("portfolio_snapshots").select("*")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(1).maybeSingle();
  if (!snap) {
    // In dev/bypass mode show mock so the page doesn't hard-fail
    if (process.env.BYPASS_AUTH === "true" || process.env.BYPASS_PRO_GATE === "true") {
      return NextResponse.json({ analysis: MOCK_ANALYSIS, cached: false });
    }
    return NextResponse.json({ error: "No snapshot found. Set up your portfolio first." }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("ai_analyses").select("*")
    .eq("user_id", user.id)
    .eq("snapshot_id", snap.id)
    .gt("generated_at", cutoff)
    .order("generated_at", { ascending: false })
    .limit(1).maybeSingle();
  if (cached) return NextResponse.json({ analysis: cached.analysis_json, cached: true });

  const { data: holdings } = await supabase
    .from("holdings").select("*").eq("snapshot_id", snap.id);
  const { data: fullProfile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  const summary = JSON.stringify({ profile: fullProfile, snapshot: snap, holdings });

  let parsed: any;
  try {
    const raw = await aiProvider.generateAnalysis(summary, SYSTEM_PROMPT);
    parsed = JSON.parse(raw);
  } catch (e: any) {
    return NextResponse.json({ error: `AI parse failed: ${e.message}` }, { status: 500 });
  }

  await supabase.from("ai_analyses").insert({
    user_id: user.id,
    snapshot_id: snap.id,
    analysis_json: parsed,
    provider: process.env.AI_PROVIDER || "gemini",
  });

  return NextResponse.json({ analysis: parsed, cached: false });
}
