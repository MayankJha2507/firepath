"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatINR } from "@/lib/fire-calculator";

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

type FormState = {
  age: number;
  fireTargetAge: number;
  yearsWorking: number;
  inflationRate: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalSavings: number;
  fireMonthlyExpense: number;
  monthlyInvestments: number;
};

function NumberField({
  label, hint, placeholder, value, onChange, prefix = "₹", footer,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
      <label className="block">
        <div className="text-base font-medium text-white mb-1">{label}</div>
        <div className="text-xs text-white/40 mb-3">{hint}</div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm pointer-events-none">
            {prefix}
          </span>
          <input
            type="number"
            min={0}
            placeholder={placeholder}
            value={value || ""}
            onChange={e => {
              const n = parseInt(e.target.value) || 0;
              onChange(n < 0 ? 0 : n);
            }}
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        {footer}
      </label>
    </div>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    age: 32,
    fireTargetAge: 42,
    yearsWorking: 8,
    inflationRate: 7,
    monthlyIncome: 0,
    monthlyExpense: 0,
    totalSavings: 0,
    fireMonthlyExpense: 0,
    monthlyInvestments: 0,
  });
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  const isFormValid =
    form.age > 0 &&
    form.fireTargetAge > form.age &&
    form.yearsWorking >= 0 &&
    form.inflationRate > 0 &&
    form.monthlyIncome > 0 &&
    form.monthlyExpense > 0 &&
    form.totalSavings >= 0 &&
    form.fireMonthlyExpense > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    setError(null);
    setCalculating(true);

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
      const res = await fetch("/api/quickstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age,
          fire_target_age: form.fireTargetAge,
          years_working: form.yearsWorking,
          inflation_rate: form.inflationRate,
          monthly_income: form.monthlyIncome,
          monthly_expense: form.monthlyExpense,
          total_savings: form.totalSavings,
          fire_monthly_expense: form.fireMonthlyExpense,
          monthly_investments: form.monthlyInvestments,
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
      <div className="sticky top-0 z-10 border-b border-white/8 backdrop-blur-md" style={{ background: "rgba(8,14,28,0.85)" }}>
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="font-bold text-white">
            FIRE<span className="text-orange-500">path</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">What&apos;s your FIRE date?</h1>
          <p className="text-white/50 mt-2 text-sm">
            Takes 90 seconds. Your data stays private.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Basic details */}
          <div className="rounded-2xl p-5 border border-white/10 bg-[#111827]">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">How old are you?</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" required min={18} max={80}
                    value={form.age || ""} placeholder="32"
                    onChange={e => setForm(f => ({ ...f, age: Math.max(0, parseInt(e.target.value) || 0) }))}
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
                    value={form.fireTargetAge || ""} placeholder="42"
                    onChange={e => setForm(f => ({ ...f, fireTargetAge: Math.max(0, parseInt(e.target.value) || 0) }))}
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
                    value={form.yearsWorking || ""} placeholder="8"
                    onChange={e => setForm(f => ({ ...f, yearsWorking: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center font-bold text-lg text-white placeholder-white/20 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-white/40 text-sm whitespace-nowrap">years</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inflation rate */}
          <div className="rounded-2xl p-5 border border-white/10 bg-[#111827]">
            <div className="font-semibold text-white mb-0.5">Expected inflation rate (%)</div>
            <div className="text-xs text-white/40 mb-4">India&apos;s average inflation is ~6–7%. We&apos;ve prefilled 7% to be conservative.</div>
            <div className="relative max-w-[180px]">
              <input
                type="number"
                value={form.inflationRate}
                onChange={e => setForm(prev => ({ ...prev, inflationRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                step={0.5}
                min={1}
                max={20}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">%</span>
            </div>
          </div>

          <NumberField
            label="Your monthly take-home income"
            hint="after tax · in hand amount"
            placeholder="190000"
            value={form.monthlyIncome}
            onChange={n => setForm(p => ({ ...p, monthlyIncome: n }))}
          />

          <NumberField
            label="Your monthly expenses"
            hint="rent, food, bills, family support — everything"
            placeholder="80000"
            value={form.monthlyExpense}
            onChange={n => setForm(p => ({ ...p, monthlyExpense: n }))}
            footer={(() => {
              const surplus = form.monthlyIncome - form.monthlyExpense;
              const rate = form.monthlyIncome > 0 ? (surplus / form.monthlyIncome) * 100 : 0;
              if (form.monthlyIncome <= 0 || form.monthlyExpense <= 0) return null;
              const positive = surplus > 0;
              const color = positive ? "text-emerald-400" : "text-red-400";
              const bg = positive ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
              return (
                <div className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 border ${bg}`}>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-white/40">Monthly savings</div>
                    <div className={`text-lg font-semibold ${color}`}>
                      {positive ? formatINR(surplus) : `-${formatINR(Math.abs(surplus))}`}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${color}`}>
                    {positive ? `${rate.toFixed(1)}% savings rate` : "You're spending more than you earn"}
                  </div>
                </div>
              );
            })()}
          />

          <NumberField
            label="Your current total savings corpus"
            hint="the lump sum you've already saved — PF + stocks + mutual funds + FDs + gold + cash. Not a monthly figure."
            placeholder="8100000"
            value={form.totalSavings}
            onChange={n => setForm(p => ({ ...p, totalSavings: n }))}
          />

          <NumberField
            label="What monthly amount do you want in retirement?"
            hint="today's value — we'll adjust for inflation automatically"
            placeholder="100000"
            value={form.fireMonthlyExpense}
            onChange={n => setForm(p => ({ ...p, fireMonthlyExpense: n }))}
          />

          {/* Optional — monthly investments */}
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6">
            <label className="block">
              <div className="flex items-center justify-between mb-1">
                <div className="text-base font-medium text-white">How much do you invest monthly?</div>
                <span className="text-xs text-white/40">optional</span>
              </div>
              <div className="text-xs text-white/40 mb-3">
                Sum of all SIPs, PF contributions, stock purchases · skip if unsure
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm pointer-events-none">₹</span>
                <input
                  type="number"
                  min={0}
                  placeholder="40000"
                  value={form.monthlyInvestments || ""}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0;
                    setForm(p => ({ ...p, monthlyInvestments: n < 0 ? 0 : n }));
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-white/20 focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full mt-2 py-4 rounded-2xl bg-orange-500 text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Calculate my FIRE date →
          </button>

          {!isFormValid && (
            <p className="text-xs text-white/50 text-center mt-1">
              Fill in all fields to continue
            </p>
          )}

          <p className="text-center text-xs text-white/30 pb-4">
            🔒 We never ask for PAN, Aadhaar, or broker login. Your data is encrypted and private.
          </p>
        </form>
      </div>
    </div>
  );
}
