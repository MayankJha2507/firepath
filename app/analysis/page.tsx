import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AnalysisClient from "./AnalysisClient";

export default async function Analysis() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  let tier = "pro"; // dev default
  if (user) {
    const { data: p } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
    tier = p?.tier || "free";
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost text-slate-400">← Dashboard</Link>
          <h1 className="font-semibold text-ink">AI Analysis</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {tier !== "pro" ? (
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
    </div>
  );
}
