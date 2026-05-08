import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/layout/SideNav";

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="min-h-screen bg-surface">
      <SideNav />
      <main className="lg:ml-[240px] pt-14 lg:pt-0">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          <h1 className="text-2xl font-bold text-ink mb-6">Settings</h1>

          <div className="card">
            <div className="section-title mb-4">Account</div>
            <div className="space-y-3 text-sm">
              <Row label="Email" value={user?.email || "—"} />
              <Row label="Name" value={profile?.full_name || "—"} />
              <Row label="Age" value={profile?.age ? `${profile.age} years` : "—"} />
              <Row label="Tax regime" value={profile?.tax_regime || "—"} />
              <Row label="Tax bracket" value={profile?.tax_bracket ? `${profile.tax_bracket}%` : "—"} />
            </div>
          </div>

          <div className="card">
            <div className="section-title mb-4">Plan</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-ink capitalize">{profile?.tier || "free"}</div>
                <div className="text-sm text-muted mt-0.5">
                  {profile?.tier === "pro" ? "All features unlocked." : "Upgrade for AI analysis and full history."}
                </div>
              </div>
              {profile?.tier !== "pro" && (
                <button className="btn-primary text-sm">Upgrade to Pro</button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-title mb-4">Danger zone</div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50">
                Sign out
              </button>
            </form>
          </div>

          <p className="disclaimer">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
