"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Holding, HoldingCategory } from "@/lib/types";

type Row = { name: string; value: string; extra?: string };
const blankRow = (): Row => ({ name: "", value: "" });

const STEPS = [
  "Your profile",
  "Liquid investments",
  "Locked investments",
  "Monthly SIPs",
  "Goals & risk",
];

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    full_name: "", age: "", fire_target_age: "",
    monthly_income: "", monthly_expense: "", parent_support: "0",
    tax_bracket: "30", tax_regime: "new" as "new" | "old",
  });
  const [indianStocks, setIndianStocks] = useState<Row[]>([blankRow()]);
  const [usStocks, setUsStocks] = useState<Row[]>([blankRow()]);
  const [mfs, setMfs] = useState<Row[]>([{ name: "", value: "", extra: "index" }]);
  const [physicalGold, setPhysicalGold] = useState("0");
  const [goldEtf, setGoldEtf] = useState("0");
  const [fd, setFd] = useState("0");
  const [epf, setEpf] = useState({ value: "", your: "", employer: "" });
  const [nps, setNps] = useState({ value: "0", monthly: "0", alloc: "LC50" });
  const [ppf, setPpf] = useState({ value: "0", monthly: "0", years: "15" });
  const [lic, setLic] = useState({ value: "0", premium: "0", type: "term" });
  const [sips, setSips] = useState<Row[]>([{ name: "", value: "", extra: "index" }]);
  const [usMonthly, setUsMonthly] = useState("0");
  const [indianMonthly, setIndianMonthly] = useState("0");
  const [fireExpense, setFireExpense] = useState("");
  const [risk, setRisk] = useState("5");
  const [hasProperty, setHasProperty] = useState(false);
  const [propertyCity, setPropertyCity] = useState("");
  const [propertyValue, setPropertyValue] = useState("");
  const [dependents, setDependents] = useState("none");

  function updateRow(rows: Row[], setRows: (r: Row[]) => void, i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function rowsToHoldings(rows: Row[], category: HoldingCategory): Holding[] {
    return rows
      .filter(r => r.name && parseFloat(r.value) > 0)
      .map(r => ({ category, name: r.name, value_inr: parseFloat(r.value), notes: r.extra }));
  }

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const num = (s: string) => parseFloat(s) || 0;

      const { error: pErr } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        age: parseInt(profile.age),
        fire_target_age: parseInt(profile.fire_target_age),
        monthly_income: num(profile.monthly_income),
        monthly_expense: num(profile.monthly_expense),
        parent_support: num(profile.parent_support),
        tax_bracket: parseInt(profile.tax_bracket),
        tax_regime: profile.tax_regime,
        fire_monthly_expense: num(fireExpense),
        risk_score: parseInt(risk),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (pErr) throw pErr;

      const holdings: Holding[] = [
        ...rowsToHoldings(indianStocks, "indian_stock"),
        ...rowsToHoldings(usStocks, "us_stock"),
        ...rowsToHoldings(mfs, "mf"),
      ];
      if (num(physicalGold) > 0) holdings.push({ category: "gold", name: "Physical gold", value_inr: num(physicalGold) });
      if (num(goldEtf) > 0) holdings.push({ category: "gold", name: "Gold ETF/SGB", value_inr: num(goldEtf) });
      if (num(fd) > 0) holdings.push({ category: "fd", name: "FD/Emergency", value_inr: num(fd) });
      if (num(epf.value) > 0) holdings.push({ category: "epf", name: "EPF", value_inr: num(epf.value), monthly_contribution: num(epf.your) + num(epf.employer), notes: `your=${epf.your};employer=${epf.employer}` });
      if (num(nps.value) > 0) holdings.push({ category: "nps", name: "NPS", value_inr: num(nps.value), monthly_contribution: num(nps.monthly), notes: `alloc=${nps.alloc}` });
      if (num(ppf.value) > 0) holdings.push({ category: "ppf", name: "PPF", value_inr: num(ppf.value), monthly_contribution: num(ppf.monthly), notes: `years_to_maturity=${ppf.years}` });
      if (num(lic.value) > 0) holdings.push({ category: "lic", name: "LIC", value_inr: num(lic.value), monthly_contribution: num(lic.premium) / 12, notes: `type=${lic.type}` });
      sips.filter(s => s.name && num(s.value) > 0).forEach(s => holdings.push({ category: "mf", name: `SIP: ${s.name}`, value_inr: 0, monthly_contribution: num(s.value), notes: `sip;type=${s.extra || "index"}` }));

      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings, monthly_us_investment: num(usMonthly), monthly_indian_investment: num(indianMonthly), property: hasProperty ? { city: propertyCity, value: num(propertyValue) } : null, dependents }),
      });
      if (!res.ok) throw new Error(`Snapshot failed: ${await res.text()}`);

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-ink">FIRE<span className="text-brand-500">path</span></span>
            <span className="text-sm text-muted">{step} / {STEPS.length}</span>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all ${
                  i + 1 < step ? "bg-emerald-500 text-white" :
                  i + 1 === step ? "bg-brand-500 text-white" :
                  "bg-slate-100 text-dim"
                }`}>
                  {i + 1 < step ? "✓" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i + 1 < step ? "bg-emerald-400" : "bg-slate-100"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">{STEPS[step - 1]}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
          {step === 1 && <Step1 v={profile} set={setProfile} />}
          {step === 2 && <Step2 indianStocks={indianStocks} setIndianStocks={setIndianStocks} usStocks={usStocks} setUsStocks={setUsStocks} mfs={mfs} setMfs={setMfs} physicalGold={physicalGold} setPhysicalGold={setPhysicalGold} goldEtf={goldEtf} setGoldEtf={setGoldEtf} fd={fd} setFd={setFd} updateRow={updateRow} />}
          {step === 3 && <Step3 epf={epf} setEpf={setEpf} nps={nps} setNps={setNps} ppf={ppf} setPpf={setPpf} lic={lic} setLic={setLic} />}
          {step === 4 && <Step4 sips={sips} setSips={setSips} usMonthly={usMonthly} setUsMonthly={setUsMonthly} indianMonthly={indianMonthly} setIndianMonthly={setIndianMonthly} updateRow={updateRow} />}
          {step === 5 && <Step5 fireExpense={fireExpense} setFireExpense={setFireExpense} risk={risk} setRisk={setRisk} hasProperty={hasProperty} setHasProperty={setHasProperty} propertyCity={propertyCity} setPropertyCity={setPropertyCity} propertyValue={propertyValue} setPropertyValue={setPropertyValue} dependents={dependents} setDependents={setDependents} />}

          {err && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {err}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="btn-secondary disabled:opacity-30"
            >
              ← Back
            </button>
            {step < STEPS.length ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary">
                Continue →
              </button>
            ) : (
              <button onClick={submit} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Saving…" : "Finish setup →"}
              </button>
            )}
          </div>
        </div>

        <p className="disclaimer mt-6">
          We never store PAN, Aadhaar, or bank credentials. For educational purposes only.
        </p>
      </div>
    </div>
  );
}

// ─── Step sub-components ────────────────────────────────────────────────────

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-dim mt-1">{hint}</p>}
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Step1({ v, set }: any) {
  const f = (k: string) => (e: any) => set({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <SectionHead title="Your profile" sub="Basic details to calibrate your FIRE target." />
      <F label="Full name"><input className="input" value={v.full_name} onChange={f("full_name")} placeholder="Priya Sharma" /></F>
      <div className="grid grid-cols-2 gap-4">
        <F label="Current age"><input type="number" className="input" value={v.age} onChange={f("age")} placeholder="28" /></F>
        <F label="Target retirement age"><input type="number" className="input" value={v.fire_target_age} onChange={f("fire_target_age")} placeholder="45" /></F>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Monthly take-home (₹)" hint="After tax"><input type="number" className="input" value={v.monthly_income} onChange={f("monthly_income")} placeholder="150000" /></F>
        <F label="Monthly expenses (₹)"><input type="number" className="input" value={v.monthly_expense} onChange={f("monthly_expense")} placeholder="80000" /></F>
      </div>
      <F label="Of which, parent support (₹/mo)" hint="Amount you send to parents monthly">
        <input type="number" className="input" value={v.parent_support} onChange={f("parent_support")} placeholder="0" />
      </F>
      <div className="grid grid-cols-2 gap-4">
        <F label="Income tax bracket">
          <select className="input" value={v.tax_bracket} onChange={f("tax_bracket")}>
            <option value="10">10%</option><option value="20">20%</option><option value="30">30%</option>
          </select>
        </F>
        <F label="Tax regime">
          <select className="input" value={v.tax_regime} onChange={f("tax_regime")}>
            <option value="new">New regime</option><option value="old">Old regime</option>
          </select>
        </F>
      </div>
    </div>
  );
}

function Step2(p: any) {
  return (
    <div className="space-y-6">
      <SectionHead title="Liquid investments" sub="What you can sell or withdraw without major penalties." />
      <RowList title="Indian stocks" rows={p.indianStocks} setRows={p.setIndianStocks} updateRow={p.updateRow} placeholder="e.g. Reliance, HDFC Bank" />
      <RowList title="US stocks (₹ equivalent)" rows={p.usStocks} setRows={p.setUsStocks} updateRow={p.updateRow} placeholder="e.g. Apple, VOO" />
      <RowList title="Mutual funds" rows={p.mfs} setRows={p.setMfs} updateRow={p.updateRow} placeholder="e.g. Parag Parikh Flexi Cap" extraOptions={["large cap","small cap","index","flexi","debt"]} />
      <div className="grid grid-cols-3 gap-3">
        <F label="Physical gold (₹)"><input type="number" className="input" value={p.physicalGold} onChange={e => p.setPhysicalGold(e.target.value)} placeholder="0" /></F>
        <F label="Gold ETF / SGB (₹)"><input type="number" className="input" value={p.goldEtf} onChange={e => p.setGoldEtf(e.target.value)} placeholder="0" /></F>
        <F label="FD / Emergency (₹)"><input type="number" className="input" value={p.fd} onChange={e => p.setFd(e.target.value)} placeholder="0" /></F>
      </div>
    </div>
  );
}

function Step3({ epf, setEpf, nps, setNps, ppf, setPpf, lic, setLic }: any) {
  return (
    <div className="space-y-6">
      <SectionHead title="Locked investments" sub="Government and insurance-backed instruments with restrictions." />
      <LockedBlock title="EPF — Employee Provident Fund">
        <div className="grid grid-cols-3 gap-3">
          <F label="Current value (₹)"><input type="number" className="input" value={epf.value} onChange={e => setEpf({ ...epf, value: e.target.value })} placeholder="0" /></F>
          <F label="Your contrib/mo (₹)"><input type="number" className="input" value={epf.your} onChange={e => setEpf({ ...epf, your: e.target.value })} placeholder="0" /></F>
          <F label="Employer/mo (₹)"><input type="number" className="input" value={epf.employer} onChange={e => setEpf({ ...epf, employer: e.target.value })} placeholder="0" /></F>
        </div>
      </LockedBlock>
      <LockedBlock title="NPS — National Pension Scheme">
        <div className="grid grid-cols-3 gap-3">
          <F label="Current value (₹)"><input type="number" className="input" value={nps.value} onChange={e => setNps({ ...nps, value: e.target.value })} placeholder="0" /></F>
          <F label="Monthly contrib (₹)"><input type="number" className="input" value={nps.monthly} onChange={e => setNps({ ...nps, monthly: e.target.value })} placeholder="0" /></F>
          <F label="Allocation">
            <select className="input" value={nps.alloc} onChange={e => setNps({ ...nps, alloc: e.target.value })}>
              <option>LC75</option><option>LC50</option><option>LC25</option>
            </select>
          </F>
        </div>
      </LockedBlock>
      <LockedBlock title="PPF — Public Provident Fund">
        <div className="grid grid-cols-3 gap-3">
          <F label="Current value (₹)"><input type="number" className="input" value={ppf.value} onChange={e => setPpf({ ...ppf, value: e.target.value })} placeholder="0" /></F>
          <F label="Monthly contrib (₹)"><input type="number" className="input" value={ppf.monthly} onChange={e => setPpf({ ...ppf, monthly: e.target.value })} placeholder="0" /></F>
          <F label="Years to maturity"><input type="number" className="input" value={ppf.years} onChange={e => setPpf({ ...ppf, years: e.target.value })} placeholder="15" /></F>
        </div>
      </LockedBlock>
      <LockedBlock title="LIC / Insurance">
        <div className="grid grid-cols-3 gap-3">
          <F label="Current value (₹)"><input type="number" className="input" value={lic.value} onChange={e => setLic({ ...lic, value: e.target.value })} placeholder="0" /></F>
          <F label="Annual premium (₹)"><input type="number" className="input" value={lic.premium} onChange={e => setLic({ ...lic, premium: e.target.value })} placeholder="0" /></F>
          <F label="Policy type">
            <select className="input" value={lic.type} onChange={e => setLic({ ...lic, type: e.target.value })}>
              <option value="term">Term</option><option value="endowment">Endowment</option>
              <option value="money-back">Money-back</option><option value="ulip">ULIP</option>
            </select>
          </F>
        </div>
      </LockedBlock>
    </div>
  );
}

function Step4(p: any) {
  return (
    <div className="space-y-6">
      <SectionHead title="Monthly SIPs & investments" sub="What you invest every month going forward." />
      <RowList title="Mutual fund SIPs" rows={p.sips} setRows={p.setSips} updateRow={p.updateRow} placeholder="e.g. Nifty 50 Index Fund" valueLabel="Amount/mo (₹)" extraOptions={["large cap","small cap","index","flexi","debt"]} />
      <div className="grid grid-cols-2 gap-4">
        <F label="Monthly US stock investment (₹)"><input type="number" className="input" value={p.usMonthly} onChange={e => p.setUsMonthly(e.target.value)} placeholder="0" /></F>
        <F label="Monthly Indian stock investment (₹)"><input type="number" className="input" value={p.indianMonthly} onChange={e => p.setIndianMonthly(e.target.value)} placeholder="0" /></F>
      </div>
    </div>
  );
}

function Step5(p: any) {
  const riskLabels: Record<string, string> = {
    "1": "Very conservative", "2": "Conservative", "3": "Cautious",
    "4": "Moderate-low", "5": "Moderate", "6": "Moderate-high",
    "7": "Growth", "8": "Aggressive", "9": "Very aggressive", "10": "Maximum risk",
  };
  return (
    <div className="space-y-5">
      <SectionHead title="Goals & risk" sub="The final pieces to calculate your FIRE trajectory." />
      <F label="Monthly expense post-retirement (today's ₹)" hint="What you'd need per month in today's money, excluding EMIs">
        <input type="number" className="input" value={p.fireExpense} onChange={e => p.setFireExpense(e.target.value)} placeholder="e.g. 60000" />
      </F>
      <F label={`Risk appetite — ${p.risk}/10 · ${riskLabels[p.risk] || ""}`}>
        <input type="range" min={1} max={10} value={p.risk} onChange={e => p.setRisk(e.target.value)} className="w-full mt-2" />
        <div className="flex justify-between text-xs text-dim mt-1"><span>Conservative</span><span>Aggressive</span></div>
      </F>
      <F label="Do you own property?">
        <select className="input" value={p.hasProperty ? "yes" : "no"} onChange={e => p.setHasProperty(e.target.value === "yes")}>
          <option value="no">No</option><option value="yes">Yes</option>
        </select>
      </F>
      {p.hasProperty && (
        <div className="grid grid-cols-2 gap-4">
          <F label="City"><input className="input" value={p.propertyCity} onChange={e => p.setPropertyCity(e.target.value)} placeholder="Bengaluru" /></F>
          <F label="Approx value (₹)"><input type="number" className="input" value={p.propertyValue} onChange={e => p.setPropertyValue(e.target.value)} placeholder="8000000" /></F>
        </div>
      )}
      <F label="Post-retirement dependents">
        <select className="input" value={p.dependents} onChange={e => p.setDependents(e.target.value)}>
          <option value="none">None</option><option value="parents">Parents</option>
          <option value="children">Children</option><option value="both">Parents & children</option>
        </select>
      </F>
    </div>
  );
}

function LockedBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-surface p-4">
      <div className="text-sm font-semibold text-ink mb-3">{title}</div>
      {children}
    </div>
  );
}

function RowList({
  title, rows, setRows, updateRow, valueLabel = "Value (₹)", placeholder = "Name", extraOptions,
}: {
  title: string; rows: Row[]; setRows: (r: Row[]) => void; updateRow: any;
  valueLabel?: string; placeholder?: string; extraOptions?: string[];
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink mb-2">{title}</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input className="input flex-1 min-w-0" placeholder={placeholder} value={r.name} onChange={e => updateRow(rows, setRows, i, { name: e.target.value })} />
            <input type="number" className="input w-32 flex-shrink-0" placeholder={valueLabel} value={r.value} onChange={e => updateRow(rows, setRows, i, { value: e.target.value })} />
            {extraOptions && (
              <select className="input w-28 flex-shrink-0" value={r.extra} onChange={e => updateRow(rows, setRows, i, { extra: e.target.value })}>
                {extraOptions.map(o => <option key={o}>{o}</option>)}
              </select>
            )}
            <button className="btn-secondary px-3 flex-shrink-0 text-muted hover:text-red-500" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}
      </div>
      <button className="mt-2 text-brand-500 text-sm font-medium hover:underline" onClick={() => setRows([...rows, { name: "", value: "", extra: extraOptions?.[0] }])}>
        + Add row
      </button>
    </div>
  );
}
