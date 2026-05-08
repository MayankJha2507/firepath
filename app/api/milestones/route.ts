import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const THRESHOLDS: Array<{ type: string; value: number }> = [
  { type: "1cr", value: 1e7 },
  { type: "2cr", value: 2e7 },
  { type: "5cr", value: 5e7 },
  { type: "10cr", value: 1e8 },
];

export async function POST(_req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: snaps } = await supabase
    .from("portfolio_snapshots")
    .select("id, liquid_corpus, savings_rate, projected_fire_age, snapshot_date")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });
  if (!snaps || snaps.length === 0) return NextResponse.json({ achieved: [] });

  const latest = snaps[snaps.length - 1];
  const previous = snaps.length > 1 ? snaps[snaps.length - 2] : null;

  const { data: existing } = await supabase
    .from("milestones").select("milestone_type").eq("user_id", user.id);
  const have = new Set((existing || []).map(m => m.milestone_type));

  const newOnes: Array<{ milestone_type: string; corpus_value: number; message: string }> = [];

  for (const t of THRESHOLDS) {
    if (latest.liquid_corpus >= t.value && !have.has(t.type)) {
      newOnes.push({
        milestone_type: t.type,
        corpus_value: latest.liquid_corpus,
        message: `You crossed ₹${t.type.replace("cr", " Cr")} liquid!`,
      });
    }
  }

  if (latest.savings_rate >= 50 && !have.has("savings_rate_50")) {
    newOnes.push({
      milestone_type: "savings_rate_50",
      corpus_value: latest.liquid_corpus,
      message: "Savings rate crossed 50%.",
    });
  }

  if (previous && latest.projected_fire_age != null && previous.projected_fire_age != null) {
    const movedYears = previous.projected_fire_age - latest.projected_fire_age;
    if (movedYears >= 0.5 && !have.has("fire_date_moved")) {
      newOnes.push({
        milestone_type: "fire_date_moved",
        corpus_value: latest.liquid_corpus,
        message: `Your FIRE date moved closer by ${movedYears.toFixed(1)} years.`,
      });
    }
  }

  if (newOnes.length) {
    await supabase.from("milestones").insert(
      newOnes.map(m => ({ user_id: user.id, ...m }))
    );
  }

  return NextResponse.json({ achieved: newOnes });
}
