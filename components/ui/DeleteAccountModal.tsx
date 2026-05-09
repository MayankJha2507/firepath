"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountModal() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (input !== "DELETE") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete account.");
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <>
      {/* Danger zone card */}
      <div
        className="rounded-xl p-5"
        style={{ border: "1px solid var(--danger)", background: "var(--bg-card)" }}
      >
        <div className="section-title mb-3" style={{ color: "var(--danger)" }}>Danger zone</div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Delete account</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Permanently delete your account and all data. This cannot be undone.
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="text-sm font-medium px-4 py-2 rounded-lg flex-shrink-0 transition-all"
            style={{
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--danger)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
            }}
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="relative rounded-2xl p-6 w-full max-w-md shadow-xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Are you sure?
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              This will permanently delete:
            </p>
            <ul className="text-sm space-y-1 mb-5" style={{ color: "var(--text-secondary)" }}>
              {[
                "Your profile and all settings",
                "All portfolio snapshots and history",
                "All AI analyses",
                "All milestones",
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span style={{ color: "var(--danger)" }}>•</span> {item}
                </li>
              ))}
            </ul>
            <div className="mb-4">
              <label className="label">Type "DELETE" to confirm</label>
              <input
                className="input"
                placeholder="DELETE"
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setInput(""); setError(null); }}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={input !== "DELETE" || loading}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all text-white"
                style={{
                  background: input === "DELETE" && !loading ? "var(--danger)" : "var(--border)",
                  cursor: input === "DELETE" && !loading ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
