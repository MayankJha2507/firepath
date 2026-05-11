"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  function getClient() { return createClient(); }
  const [mode, setMode] = useState<"signin" | "signup">("signup");

  // Handle magic-link / OAuth hash fragment (#access_token=...) on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;
    const supabase = getClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = getClient();
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { data, error } = await fn;
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (mode === "signup" && !data.session) { setDone(true); return; }
    router.push(mode === "signup" ? "/onboarding" : "/dashboard");
    router.refresh();
  }

  async function google() {
    const supabase = getClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-ink mb-2">Check your email</h2>
          <p className="text-sm text-muted">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <button onClick={() => { setDone(false); setMode("signin"); }} className="btn-secondary mt-6 w-full">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-bold text-2xl text-ink">
            FIRE<span className="text-brand-500">path</span>
          </Link>
          <p className="text-sm text-muted mt-1">
            {mode === "signin" ? "Welcome back" : "Start your FIRE journey"}
          </p>
        </div>

        {/* TODO: remove BYPASS_AUTH before production launch */}
        {process.env.NEXT_PUBLIC_BYPASS_AUTH === "true" && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-amber-700 font-medium mb-2">Dev mode — auth bypass active</p>
            <Link href="/dashboard" className="btn-primary w-full text-sm">
              Enter without logging in →
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {/* Mode tabs */}
          <div className="flex bg-surface rounded-xl p-1 mb-5">
            {(["signup", "signin"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErr(null); }}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${
                  mode === m ? "bg-white shadow-sm text-ink" : "text-muted"
                }`}
              >
                {m === "signup" ? "Sign up" : "Sign in"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={google}
            className="btn-secondary w-full mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-dim">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="input"
              />
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
                {err}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-xs text-dim text-center mt-6">
          By continuing you agree to our Terms of Service.
        </p>
        <p className="disclaimer mt-2">
          FIREpath is a financial literacy tool. Not SEBI-registered advice.
        </p>
      </div>
    </div>
  );
}
