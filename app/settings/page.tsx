import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/layout/SideNav";
import DeleteAccountModal from "@/components/ui/DeleteAccountModal";

export default async function Settings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Settings</h1>

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
                <div className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                  {profile?.tier || "free"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {profile?.tier === "pro" ? "All features unlocked." : "Upgrade for AI analysis and full history."}
                </div>
              </div>
              {profile?.tier !== "pro" && (
                <button className="btn-primary text-sm">Upgrade to Pro</button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-title mb-4">Session</div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-secondary text-sm" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                Sign out
              </button>
            </form>
          </div>

          <DeleteAccountModal />

          <p className="disclaimer pb-4">For educational purposes only. Not SEBI-registered investment advice.</p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
