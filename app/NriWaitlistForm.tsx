"use client";

import { useState } from "react";

export default function NriWaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email || !email.includes("@")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <p className="text-green-400 text-sm mt-3">✓ You're on the list</p>;
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-white/50 mb-2">Join the waitlist — launching soon</p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-orange-500 hover:opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "…" : "Notify me"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
