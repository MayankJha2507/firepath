"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  INCOME_RANGES, EXPENSE_RANGES, SAVINGS_RANGES, FIRE_EXPENSE_RANGES,
} from "@/lib/range-mappings";

type RangeItem = { label: string; value: string; midpoint: number };

function RangeSelector({
  label, hint, ranges, selected, onSelect,
}: {
  label: string; hint: string;
  ranges: RangeItem[]; selected: string | null; onSelect: (v: string) => void;
}) {
  return (
    <div className="rounded-xl p-5 border border-white/10 bg-[#111827]">
      <div className="font-semibold text-white mb-0.5">{label}</div>
      <div className="text-xs text-white/40 mb-4">{hint}</div>
      <div className="flex flex-wrap gap-2">
        {ranges.map(r => (
          <button
            key={r.value}
            type="button"
            onClick={() => onSelect(r.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              selected === r.value
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white/5 text-white/70 border-white/10 hover:border-orange-500/50 hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CalculatingScreen() {
  return (
    <div className="min-h-screen bg-[#080E1C] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Crunching the numbers…</h2>
        <p className="text-sm text-white/50">Calculating your FIRE date, corpus target, and projection.</p>
        <div className="mt-6 flex flex-col gap-2 text-xs text-white/30">
          <span>✓ Applying inflation to your retirement expenses</span>
          <span>✓ Projecting EPF corpus based on years working</span>
          <span>✓ Estimating years to FIRE target</span>
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState({ age: "", fire_target_age: "", years_working: "" });
  const [income, setIncome] = useState<string | null>(null);
  const [expense, setExpense] = useState<string | null>(null);
  const [savings, setSavings] = useState<string | null>(null);
  const [fireExpense, setFireExpense] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!income || !expense || !savings || !fireExpense) {
      setError("Please select a range for all four sections.");
      return;
    }
    setError(null);
    setCalculating(true);

    // Check real auth state — bypass only if truly no session
    const { createClient: supabaseClient } = await import("@/lib/supabase/client");
    const sb = supabaseClient();
    const { data: { user } } = await sb.auth.getUser();

    if (!user && bypassAuth) {
      await new Promise(r => setTimeout(r, 2000));
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (!user) {
      setError("You need to be signed in. Please go to /auth and sign in first.");
      setCalculating(false);
      return;
    }

    try {
      const incomeItem    = INCOME_RANGES.find(r => r.value === income)!;
      const expenseItem   = EXPENSE_RANGES.find(r => r.value === expense)!;
      const savingsItem   = SAVINGS_RANGES.find(r => r.value === savings)!;
      const fireExpItem   = FIRE_EXPENSE_RANGES.find(r => r.value === fireExpense)!;

      const res = await fetch("/api/quickstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age,
          fire_target_age: form.fire_target_age,
          years_working: form.years_working,
          income_range: income,
          expense_range: expense,
          savings_range: savings,
          fire_expense_range: fireExpense,
          monthly_income: incomeItem.midpoint,
          monthly_expense: expenseItem.midpoint,
          savings_midpoint: savingsItem.midpoint,
          fire_monthly_expense: fireExpItem.midpoint,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Something went wrong");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again.");
      setCalculating(false);
    }
  }

  if (calculating) return <CalculatingScreen />;

  return (
    <div className="min-h-screen bg-[#080E1C]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/8 backdrop-blur-md" style={{ background: "rgba(8,14,28,0.85)" }}>
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="font-bold text-white">
            FIRE<span className="text-orange-500">path</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">What's your FIRE date?</h1>
          <p className="text-white/50 mt-2 text-sm">
            Answer 5 quick questions — no exact figures needed.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Basic details */}
          <div className="rounded-xl p-5 border border-white/10 bg-[#111827]">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">How old are you?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" required min={18} max={80}
                    value={form.age} placeholder="34"
                    onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-lg text-white placeholder-white/20 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-white/40 text-sm whitespace-nowrap">years</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">When do you want to retire?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" required min={25} max={80}
                    value={form.fire_target_age} placeholder="45"
                    onChange={e => setForm(f => ({ ...f, fire_target_age: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-lg text-white placeholder-white/20 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-white/40 text-sm whitespace-nowrap">years old</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Years working so far?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" required min={0} max={60}
                    value={form.years_working} placeholder="10"
                    onChange={e => setForm(f => ({ ...f, years_working: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-lg text-white placeholder-white/20 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-white/40 text-sm whitespace-nowrap">years</span>
                </div>
              </div>
            </div>
          </div>

          <RangeSelector
            label="Your monthly take-home income"
            hint="tap the closest range"
            ranges={INCOME_RANGES}
            selected={income}
            onSelect={setIncome}
          />

          <RangeSelector
            label="Your monthly expenses"
            hint="rent, food, bills, family support — everything"
            ranges={EXPENSE_RANGES}
            selected={expense}
            onSelect={setExpense}
          />

          <RangeSelector
            label="Approximate total savings"
            hint="rough total across PF, stocks, FDs, gold — everything"
            ranges={SAVINGS_RANGES}
            selected={savings}
            onSelect={setSavings}
          />

          <RangeSelector
            label="What monthly amount do you want in retirement?"
            hint="today's value — don't adjust for inflation, we'll do that"
            ranges={FIRE_EXPENSE_RANGES}
            selected={fireExpense}
            onSelect={setFireExpense}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="w-full bg-orange-500 hover:opacity-90 text-white font-semibold py-4 rounded-xl text-base transition-all">
            Calculate my FIRE date →
          </button>

          <p className="text-center text-xs text-white/30 pb-4">
            🔒 We never ask for PAN, Aadhaar, or broker login. Your data is encrypted and private.
          </p>
        </form>
      </div>
    </div>
  );
}
