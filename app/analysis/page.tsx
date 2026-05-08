import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/layout/SideNav";
import AnalysisClient from "./AnalysisClient";

const bypassProGate = process.env.BYPASS_PRO_GATE === "true";

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

  return (
    <div className="min-h-screen bg-surface">
      <SideNav />
      <main className="lg:ml-[220px] pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-ink mb-6">AI Analysis</h1>

          {!isUnlocked ? (
            <div className="card text-center py-14">
              <div className="text-4xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold text-ink mb-2">AI analysis is a Pro feature</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                Get your portfolio health score, strengths, concerns, and concrete action items — powered by Gemini.
              </p>
              <button className="btn-primary px-8">Upgrade to Pro — ₹499/mo</button>
            </div>
          ) : (
            <AnalysisClient />
          )}
          <p className="disclaimer mt-8">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}
