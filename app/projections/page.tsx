import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/layout/SideNav";
import ProjectionsClient from "./ProjectionsClient";

export default async function ProjectionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  let profile: any = null;
  let holdings: any[] = [];

  if (user) {
    const [{ data: p }, { data: snap }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("portfolio_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    profile = p;
    if (!profile?.age && process.env.NODE_ENV !== "development") redirect("/onboarding");
    if (snap) {
      const { data: h } = await supabase.from("holdings").select("*").eq("snapshot_id", snap.id);
      holdings = h || [];
    } else if (process.env.NODE_ENV !== "development") {
      redirect("/portfolio");
    }
  }

  // Dev fallback
  if (!profile) {
    profile = {
      age: 30, fire_target_age: 45,
      fire_monthly_expense: 80000, monthly_expense: 100000,
    };
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <SideNav />
      <main className="lg:ml-[220px] pt-14">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Investment Projections
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Projections based on your actual holdings · Add more on the Portfolio page
            </p>
          </div>
          <ProjectionsClient profile={profile} holdings={holdings} />
          <p className="disclaimer mt-8">
            For educational purposes only. Not SEBI-registered investment advice.
          </p>
        </div>
      </main>
    </div>
  );
}
