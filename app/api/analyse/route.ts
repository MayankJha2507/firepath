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

export async function POST(_req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  if (!snap) return NextResponse.json({ error: "No snapshot" }, { status: 400 });

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
