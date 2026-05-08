import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SideNav from "@/components/layout/SideNav";
import PortfolioClient from "./PortfolioClient";

export default async function Portfolio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV !== "development") redirect("/auth");

  let profile = null;
  let snap = null;
  let holdings: any[] = [];

  if (user) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("portfolio_snapshots")
        .select("id, snapshot_date")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    profile = p;
    snap = s;

    if (snap) {
      const { data: h } = await supabase
        .from("holdings")
        .select("*")
        .eq("snapshot_id", snap.id);
      holdings = h || [];
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <SideNav />
      <main className="lg:ml-[240px] pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <PortfolioClient
            profile={profile}
            snapshotDate={snap?.snapshot_date ?? null}
            holdings={holdings}
          />
        </div>
      </main>
    </div>
  );
}
