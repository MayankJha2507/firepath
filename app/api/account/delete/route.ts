import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;

  // Delete child tables first to respect FK constraints
  await supabase.from("milestones").delete().eq("user_id", userId);

  const { data: snaps } = await supabase
    .from("portfolio_snapshots")
    .select("id")
    .eq("user_id", userId);

  if (snaps && snaps.length > 0) {
    const snapIds = snaps.map(s => s.id);
    await supabase.from("ai_analyses").delete().in("snapshot_id", snapIds);
    await supabase.from("holdings").delete().in("snapshot_id", snapIds);
  }

  await supabase.from("portfolio_snapshots").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);

  // Use service role key to delete the auth user
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete account. Contact support." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
