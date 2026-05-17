import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SideNav from "@/components/layout/SideNav";
import AnalysisClient from "./AnalysisClient";
import ErrorBoundary from "@/components/ErrorBoundary";

const bypassProGate = process.env.BYPASS_PRO_GATE === "true";
const SYNTHETIC_NOTES = ["estimated", "user-provided"];

export default async function Analysis() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  let tier = "pro"; // dev default
  if (user) {
    const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
    tier = p?.tier || "free";
  }

  const isUnlocked = tier === "pro" || bypassProGate;

  // Check if user has real (non-synthetic) holdings
  let hasRealHoldings = false;
  let latestSnapshot: { id: string; snapshot_date: string } | null = null;
  if (user) {
    const { data: snap } = await supabase
      .from("portfolio_snapshots")
      .select("id, snapshot_date")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestSnapshot = snap;
    if (snap) {
      const { data: holdings } = await supabase
        .from("holdings")
        .select("notes")
        .eq("snapshot_id", snap.id);
      hasRealHoldings = (holdings || []).some(h => !SYNTHETIC_NOTES.includes(h.notes || ""));
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>AI Analysis</h1>

          <ErrorBoundary>
            {!hasRealHoldings ? (
              <div className="card text-center py-14">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Add your portfolio first</h2>
                <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                  AI analysis needs your actual holdings — EPF, stocks, mutual funds, and more — to give you meaningful insights.
                </p>
                <Link href="/portfolio" className="btn-primary px-8">Add portfolio details →</Link>
              </div>
            ) : !isUnlocked ? (
              <div className="card text-center py-14">
                <div className="text-4xl mb-4">🤖</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>AI analysis is a Pro feature</h2>
                <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Get your portfolio health score, strengths, concerns, and concrete action items — powered by Groq AI.
                </p>
                <button className="btn-primary px-8">Upgrade to Pro — ₹499/mo</button>
              </div>
            ) : (
              <AnalysisClient latestSnapshot={latestSnapshot} />
            )}
          </ErrorBoundary>
          <p className="disclaimer mt-8">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}
