"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatINR,
  epfBreakdown, npsBreakdown, ppfBreakdown,
  equityBreakdown, goldBreakdown,
} from "@/lib/fire-calculator";
import { Assumptions, DEFAULT_ASSUMPTIONS } from "@/lib/assumptions";
import AssetProjectionCard from "@/components/projections/AssetProjectionCard";
import ThreeScenarioCard from "@/components/projections/ThreeScenarioCard";

interface Holding {
  category: string;
  name: string;
  value_inr: number;
  monthly_contribution?: number;
  notes?: string;
}

interface Props {
  profile: {
    age: number;
    fire_target_age: number;
    fire_monthly_expense: number | null;
    monthly_expense: number | null;
  };
  holdings: Holding[];
}

// Per-category form state
interface CategoryForm {
  name: string;
  currentValue: string;
  monthlySip: string;
  employerMonthly: string; // EPF only
  yearsToMaturity: string; // PPF only
  allocationType: string;  // NPS only
}

const EMPTY_FORM: CategoryForm = {
  name: "",
  currentValue: "",
  monthlySip: "",
  employerMonthly: "",
  yearsToMaturity: "15",
  allocationType: "LC50",
};

const FIELDS: Array<{ label: string; key: keyof Assumptions }> = [
  { label: "Equity CAGR",  key: "equityCagr" },
  { label: "EPF rate",     key: "epfRate" },
  { label: "NPS CAGR",     key: "npsCagr" },
  { label: "PPF rate",     key: "ppfRate" },
  { label: "Inflation",    key: "inflation" },
  { label: "Gold CAGR",    key: "goldCagr" },
];

const ASSET_LABELS: Record<string, string> = {
  epf: "EPF",
  nps: "NPS",
  ppf: "PPF",
  mf: "Mutual Funds",
  indian_stock: "Indian Stocks",
  us_stock: "US Stocks",
  gold: "Gold",
  fd: "FD / Emergency",
};

const ASSET_ICONS: Record<string, string> = {
  epf: "🏛️", nps: "🏛️", ppf: "📘", mf: "📊",
  indian_stock: "📈", us_stock: "🌐", gold: "🪙", fd: "🏦",
};

const ALL_ASSET_CATEGORIES = ["epf", "nps", "ppf", "mf", "indian_stock", "us_stock", "gold", "fd"];
const SYNTHETIC_NOTES = ["estimated", "user-provided"];

function sum(arr: Holding[], field: keyof Holding) {
  return arr.reduce((s, h) => s + ((h[field] as number) || 0), 0);
}

function buildHolding(cat: string, form: CategoryForm): Holding | null {
  const value = parseFloat(form.currentValue.replace(/,/g, "")) || 0;
  const monthly = parseFloat(form.monthlySip.replace(/,/g, "")) || 0;
  if (value === 0 && monthly === 0) return null;

  if (cat === "epf") {
    const employer = parseFloat(form.employerMonthly.replace(/,/g, "")) || 0;
    return { category: "epf", name: "EPF", value_inr: value, monthly_contribution: monthly, notes: `your=${monthly};employer=${employer}` };
  }
  if (cat === "ppf") {
    const yrs = parseInt(form.yearsToMaturity) || 15;
    return { category: "ppf", name: "PPF", value_inr: value, monthly_contribution: monthly, notes: `${yrs} years` };
  }
  if (cat === "nps") {
    return { category: "nps", name: "NPS", value_inr: value, monthly_contribution: monthly, notes: form.allocationType };
  }
  if (cat === "gold") {
    return { category: "gold", name: "Gold", value_inr: value, monthly_contribution: 0 };
  }
  if (cat === "fd") {
    return { category: "fd", name: "FD / Emergency", value_inr: value, monthly_contribution: 0 };
  }
  const name = form.name.trim() || ASSET_LABELS[cat];
  return { category: cat, name, value_inr: value, monthly_contribution: monthly };
}

function formFromHoldings(cat: string, hs: Holding[]): CategoryForm {
  if (hs.length === 0) return { ...EMPTY_FORM };
  const totalValue = sum(hs, "value_inr");
  const totalMonthly = sum(hs, "monthly_contribution");
  const first = hs[0];
  const form: CategoryForm = {
    name: hs.length === 1 ? first.name : ASSET_LABELS[cat],
    currentValue: totalValue > 0 ? String(Math.round(totalValue)) : "",
    monthlySip: totalMonthly > 0 ? String(Math.round(totalMonthly)) : "",
    employerMonthly: "",
    yearsToMaturity: "15",
    allocationType: "LC50",
  };
  if (cat === "epf" && first.notes) {
    const m = first.notes.match(/employer=(\d+)/);
    if (m) form.employerMonthly = m[1];
  }
  if (cat === "ppf" && first.notes) {
    const m = first.notes.match(/(\d+)/);
    if (m) form.yearsToMaturity = m[1];
  }
  if (cat === "nps" && first.notes) {
    form.allocationType = first.notes;
  }
  return form;
}

// Thin input wrapper
function FieldInput({ label, value, onChange, placeholder, prefix, suffix, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; prefix?: string; suffix?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        {prefix && <span className="pl-3 text-sm" style={{ color: "var(--text-secondary)" }}>{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
          style={{ color: "var(--text-primary)" }}
          onFocus={e => (e.currentTarget.parentElement!.style.borderColor = "var(--orange)")}
          onBlur={e =>  (e.currentTarget.parentElement!.style.borderColor = "var(--border)")}
        />
        {suffix && <span className="pr-3 text-xs" style={{ color: "var(--text-secondary)" }}>{suffix}</span>}
      </div>
      {hint && <div className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>{hint}</div>}
    </div>
  );
}

function CategoryFormPanel({ cat, form, onChange, onSave, onCancel, saving }: {
  cat: string; form: CategoryForm;
  onChange: (f: CategoryForm) => void;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  const set = (k: keyof CategoryForm) => (v: string) => onChange({ ...form, [k]: v });

  const showName = ["mf", "indian_stock", "us_stock"].includes(cat);
  const showMonthly = !["gold", "fd"].includes(cat);
  const showEmployer = cat === "epf";
  const showYearsToMaturity = cat === "ppf";
  const showAllocType = cat === "nps";

  return (
    <div
      className="mt-3 rounded-xl p-4 space-y-3"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
    >
      {showName && (
        <FieldInput label="Name (optional)" value={form.name} onChange={set("name")} placeholder={ASSET_LABELS[cat]} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <FieldInput
          label="Current value"
          value={form.currentValue}
          onChange={set("currentValue")}
          prefix="₹"
          hint="Today's market value"
        />
        {showMonthly && (
          <FieldInput
            label={cat === "epf" ? "Your monthly contribution" : "Monthly investment"}
            value={form.monthlySip}
            onChange={set("monthlySip")}
            prefix="₹"
            suffix="/mo"
          />
        )}
      </div>

      {showEmployer && (
        <FieldInput
          label="Employer monthly contribution"
          value={form.employerMonthly}
          onChange={set("employerMonthly")}
          prefix="₹"
          suffix="/mo"
          hint="Usually equals your contribution (12% of basic)"
        />
      )}

      {showYearsToMaturity && (
        <FieldInput
          label="Years to maturity"
          value={form.yearsToMaturity}
          onChange={set("yearsToMaturity")}
          suffix="years"
          hint="PPF matures after 15 years, extendable by 5"
        />
      )}

      {showAllocType && (
        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Allocation type</label>
          <select
            value={form.allocationType}
            onChange={e => set("allocationType")(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <option value="LC25">LC25 (25% equity, conservative)</option>
            <option value="LC50">LC50 (50% equity, moderate)</option>
            <option value="LC75">LC75 (75% equity, aggressive)</option>
            <option value="Active">Active choice</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--orange)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          Cancel
        </button>
        {["mf", "indian_stock", "us_stock", "epf", "nps", "ppf"].includes(cat) && (
          <span className="text-[10px] ml-auto" style={{ color: "var(--text-secondary)" }}>
            For per-fund tracking →{" "}
            <Link href="/portfolio" className="underline" style={{ color: "var(--orange)" }}>Portfolio editor</Link>
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectionsClient({ profile, holdings: initialHoldings }: Props) {
  const router = useRouter();
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentAge  = profile.age ?? 30;
  const retireAge   = profile.fire_target_age ?? 45;
  const yearsToFire = Math.max(1, retireAge - currentAge);

  const userAddedHoldings = initialHoldings.filter(h => !SYNTHETIC_NOTES.includes(h.notes ?? ""));
  const userAddedCategories = new Set(userAddedHoldings.map(h => h.category));
  const missingCategories = ALL_ASSET_CATEGORIES.filter(c => !userAddedCategories.has(c));
  const hasAnyAdded = userAddedHoldings.length > 0;

  const epfHoldings  = userAddedHoldings.filter(h => h.category === "epf");
  const npsHoldings  = userAddedHoldings.filter(h => h.category === "nps");
  const ppfHoldings  = userAddedHoldings.filter(h => h.category === "ppf");
  const mfHoldings   = userAddedHoldings.filter(h => h.category === "mf");
  const indHoldings  = userAddedHoldings.filter(h => h.category === "indian_stock");
  const usHoldings   = userAddedHoldings.filter(h => h.category === "us_stock");
  const goldHoldings = userAddedHoldings.filter(h => h.category === "gold");
  const fdHoldings   = userAddedHoldings.filter(h => h.category === "fd");

  const epfValue  = sum(epfHoldings,  "value_inr");
  const npsValue  = sum(npsHoldings,  "value_inr");
  const ppfValue  = sum(ppfHoldings,  "value_inr");
  const mfValue   = sum(mfHoldings,   "value_inr");
  const indValue  = sum(indHoldings,  "value_inr");
  const usValue   = sum(usHoldings,   "value_inr");
  const goldValue = sum(goldHoldings, "value_inr");
  const fdValue   = sum(fdHoldings,   "value_inr");

  const epfMonthly = sum(epfHoldings, "monthly_contribution");
  const npsMonthly = sum(npsHoldings, "monthly_contribution");
  const ppfMonthly = sum(ppfHoldings, "monthly_contribution");
  const mfMonthly  = sum(mfHoldings,  "monthly_contribution");
  const indMonthly = sum(indHoldings, "monthly_contribution");
  const usMonthly  = sum(usHoldings,  "monthly_contribution");

  const ppfNote = ppfHoldings[0]?.notes ?? "";
  const ppfYearsToMaturity = parseInt(ppfNote.match(/(\d+)/)?.[1] ?? "") || Math.min(15, yearsToFire);

  const epfData  = useMemo(() => epfBreakdown(epfValue, epfMonthly, 0, currentAge, retireAge, assumptions.epfRate / 100), [epfValue, epfMonthly, currentAge, retireAge, assumptions.epfRate]);
  const npsData  = useMemo(() => npsBreakdown(npsValue, npsMonthly, currentAge, retireAge, assumptions.npsCagr / 100), [npsValue, npsMonthly, currentAge, retireAge, assumptions.npsCagr]);
  const ppfData  = useMemo(() => ppfBreakdown(ppfValue, ppfMonthly, currentAge, ppfYearsToMaturity, assumptions.ppfRate / 100), [ppfValue, ppfMonthly, currentAge, ppfYearsToMaturity, assumptions.ppfRate]);
  const mfData   = useMemo(() => equityBreakdown(mfValue,  mfMonthly,  currentAge, retireAge), [mfValue,  mfMonthly,  currentAge, retireAge]);
  const indData  = useMemo(() => equityBreakdown(indValue, indMonthly, currentAge, retireAge), [indValue, indMonthly, currentAge, retireAge]);
  const usData   = useMemo(() => equityBreakdown(usValue,  usMonthly,  currentAge, retireAge), [usValue,  usMonthly,  currentAge, retireAge]);
  const goldData = useMemo(() => goldBreakdown(goldValue, currentAge, retireAge, assumptions.goldCagr / 100), [goldValue, currentAge, retireAge, assumptions.goldCagr]);

  const summaryRows = [
    epfValue > 0  && { label: "EPF",           note: "(accessible at retirement)",        today: epfValue,  atRetirement: epfData.totalAtRetirement,               multiple: epfData.growthMultiple,       locked: false },
    npsValue > 0  && { label: "NPS",           note: "(locked until age 60)",             today: npsValue,  atRetirement: npsData.atRetirement,                    multiple: npsValue > 0 ? npsData.atRetirement / npsValue : 0, locked: true },
    ppfValue > 0  && { label: "PPF",           note: `(matures ${ppfData.maturityYear})`, today: ppfValue,  atRetirement: ppfData.atMaturity,                      multiple: ppfData.growthMultiple,       locked: false },
    mfValue > 0   && { label: "Mutual funds",  note: "(12% base)",                        today: mfValue,   atRetirement: mfData.base,                             multiple: mfData.growthMultipleBase,    locked: false },
    indValue > 0  && { label: "Indian stocks", note: "(12% base)",                        today: indValue,  atRetirement: indData.base,                            multiple: indData.growthMultipleBase,   locked: false },
    usValue > 0   && { label: "US stocks",     note: "(12% base)",                        today: usValue,   atRetirement: usData.base,                             multiple: usData.growthMultipleBase,    locked: false },
    goldValue > 0 && { label: "Gold",          note: `(${assumptions.goldCagr}% CAGR)`,  today: goldValue, atRetirement: goldData.atRetirement,                   multiple: goldData.growthMultiple,      locked: false },
    fdValue > 0   && { label: "FD / Emergency",note: "(liquid, 6.5%)",                   today: fdValue,   atRetirement: fdValue * Math.pow(1.065, yearsToFire),  multiple: Math.pow(1.065, yearsToFire), locked: false },
  ].filter(Boolean) as Array<{ label: string; note: string; today: number; atRetirement: number; multiple: number; locked: boolean }>;

  const totalToday             = summaryRows.reduce((s, r) => s + r.today, 0);
  const totalAtRetirement      = summaryRows.reduce((s, r) => s + r.atRetirement, 0);
  const accessibleAtRetirement = summaryRows.filter(r => !r.locked).reduce((s, r) => s + r.atRetirement, 0);
  const lockedTillLater        = summaryRows.filter(r =>  r.locked).reduce((s, r) => s + r.atRetirement, 0);
  const isDefault = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  const openEdit = useCallback((cat: string, hs: Holding[]) => {
    setForm(formFromHoldings(cat, hs));
    setEditingCat(cat);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingCat) return;
    setSaving(true);
    setSaveError(null);
    try {
      const newH = buildHolding(editingCat, form);
      const otherHoldings = userAddedHoldings.filter(h => h.category !== editingCat);
      const allHoldings = newH ? [...otherHoldings, newH] : otherHoldings;
      const res = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: allHoldings }),
      });
      if (!res.ok) {
        const j = await res.json();
        setSaveError(j.error || "Save failed");
        return;
      }
      setEditingCat(null);
      router.refresh();
    } catch {
      setSaveError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }, [editingCat, form, userAddedHoldings, router]);

  const handleCancel = useCallback(() => {
    setEditingCat(null);
    setSaveError(null);
  }, []);

  // Render inline form + optional projection card for a category
  function CategorySection({ cat, hs }: { cat: string; hs: Holding[] }) {
    const isEditing = editingCat === cat;
    const hasData = hs.length > 0;
    return (
      <div>
        {isEditing && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{ASSET_ICONS[cat]}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{ASSET_LABELS[cat]}</span>
            </div>
            <CategoryFormPanel
              cat={cat} form={form} onChange={setForm}
              onSave={handleSave} onCancel={handleCancel} saving={saving}
            />
            {saveError && <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>{saveError}</p>}
          </div>
        )}
        {!isEditing && hasData && (
          <div className="flex items-center justify-end mb-1">
            <button
              onClick={() => openEdit(cat, hs)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              style={{ color: "var(--text-secondary)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit {ASSET_LABELS[cat]}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Assumptions panel */}
      {hasAnyAdded && (
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Assumptions</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Equity {assumptions.equityCagr}% · EPF {assumptions.epfRate}% · NPS {assumptions.npsCagr}%
                · PPF {assumptions.ppfRate}% · Gold {assumptions.goldCagr}%
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isDefault && (
                <button onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)} className="text-xs hover:opacity-80" style={{ color: "var(--orange)" }}>Reset</button>
              )}
              <button
                onClick={() => setShowAssumptions(p => !p)}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: showAssumptions ? "var(--orange)" : "var(--text-secondary)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showAssumptions ? "Hide" : "Edit"}
              </button>
            </div>
          </div>
          {showAssumptions && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                {FIELDS.map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>{label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={assumptions[key]}
                        onChange={e => setAssumptions(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        step="0.5" min="1" max="30"
                        className="w-16 px-2 py-1.5 rounded-lg text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        onFocus={e => (e.target.style.borderColor = "var(--orange)")}
                        onBlur={e =>  (e.target.style.borderColor = "var(--border)")}
                      />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>All cards recalculate in real time.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasAnyAdded && editingCat === null && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Add your first investment</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Pick any investment type below to see how it grows to retirement — contributions, returns earned, and the year-by-year curve.
          </p>
        </div>
      )}

      {/* EPF */}
      {(epfValue > 0 || editingCat === "epf") && (
        <>
          <CategorySection cat="epf" hs={epfHoldings} />
          {epfValue > 0 && editingCat !== "epf" && (
            <AssetProjectionCard
              title="EPF — Employee Provident Fund"
              subtitle={`Accessible at retirement age ${retireAge}`}
              valueAtRetirement={epfData.totalAtRetirement}
              currentValue={epfData.currentBalance}
              growthMultiple={epfData.growthMultiple}
              investedTotal={epfData.yourFutureContributions}
              returnsEarned={epfData.interestEarned}
              breakdownItems={[
                { label: "Current balance",    value: epfData.currentBalance,          color: "var(--text-primary)" },
                { label: "Your contributions", value: epfData.yourFutureContributions, color: "var(--text-primary)" },
                { label: "Interest earned",    value: epfData.interestEarned,          color: "var(--success)" },
              ]}
              chartData={epfData.yearByYear}
              chartColor="var(--accent)"
            />
          )}
        </>
      )}

      {/* NPS */}
      {(npsValue > 0 || editingCat === "nps") && (
        <>
          <CategorySection cat="nps" hs={npsHoldings} />
          {npsValue > 0 && editingCat !== "nps" && (
            <AssetProjectionCard
              title="NPS — National Pension System"
              subtitle={`Locked until age 60 — ${Math.max(0, 60 - retireAge)} years after retirement`}
              valueAtRetirement={npsData.atRetirement}
              currentValue={npsValue}
              growthMultiple={npsValue > 0 ? npsData.atRetirement / npsValue : 0}
              investedTotal={npsData.futureContributions}
              returnsEarned={npsData.returnsEarned}
              breakdownItems={[
                { label: "At retirement", value: npsData.atRetirement,        color: "var(--text-primary)" },
                { label: "Contributions", value: npsData.futureContributions, color: "var(--text-primary)" },
                { label: "Returns earned",value: npsData.returnsEarned,       color: "var(--success)" },
              ]}
              chartData={npsData.yearByYear}
              chartColor="#8B5CF6"
            >
              <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  Continues compounding after retirement → age 60
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Corpus at 60</div>
                    <div className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{formatINR(npsData.at60)}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Lump sum (60%)</div>
                    <div className="text-sm font-semibold mt-1" style={{ color: "var(--success)" }}>{formatINR(npsData.lumpsum60)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>tax-free</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Monthly annuity</div>
                    <div className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                      ₹{Math.round(npsData.monthlyAnnuity).toLocaleString("en-IN")}/mo
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>for life</div>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  You don&apos;t need to fund NPS after retirement — {formatINR(npsData.atRetirement)} keeps compounding untouched until age 60.
                </p>
              </div>
            </AssetProjectionCard>
          )}
        </>
      )}

      {/* PPF */}
      {(ppfValue > 0 || editingCat === "ppf") && (
        <>
          <CategorySection cat="ppf" hs={ppfHoldings} />
          {ppfValue > 0 && editingCat !== "ppf" && (
            <AssetProjectionCard
              title="PPF — Public Provident Fund"
              subtitle={`Matures in ${ppfYearsToMaturity} years — ${ppfData.maturityYear}`}
              valueAtRetirement={ppfData.atMaturity}
              currentValue={ppfValue}
              growthMultiple={ppfData.growthMultiple}
              investedTotal={ppfData.yourContributions}
              returnsEarned={ppfData.interestEarned}
              breakdownItems={[
                { label: "Current balance", value: ppfValue,                  color: "var(--text-primary)" },
                { label: "Contributions",   value: ppfData.yourContributions, color: "var(--text-primary)" },
                { label: "Interest earned", value: ppfData.interestEarned,    color: "var(--success)" },
              ]}
              chartData={ppfData.yearByYear}
              chartColor="var(--success)"
            />
          )}
        </>
      )}

      {/* Mutual Funds */}
      {(mfValue > 0 || editingCat === "mf") && (
        <>
          <CategorySection cat="mf" hs={mfHoldings} />
          {mfValue > 0 && editingCat !== "mf" && (
            <ThreeScenarioCard
              title="Mutual Funds" subtitle="SIP + lump sum across all funds"
              conservative={mfData.conservative} base={mfData.base} optimistic={mfData.optimistic}
              currentValue={mfValue} contributions={mfData.contributions} yearByYear={mfData.yearByYear}
            />
          )}
        </>
      )}

      {/* Indian Stocks */}
      {(indValue > 0 || editingCat === "indian_stock") && (
        <>
          <CategorySection cat="indian_stock" hs={indHoldings} />
          {indValue > 0 && editingCat !== "indian_stock" && (
            <ThreeScenarioCard
              title="Indian Stocks" subtitle="Direct equity portfolio"
              conservative={indData.conservative} base={indData.base} optimistic={indData.optimistic}
              currentValue={indValue} contributions={indData.contributions} yearByYear={indData.yearByYear}
            />
          )}
        </>
      )}

      {/* US Stocks */}
      {(usValue > 0 || editingCat === "us_stock") && (
        <>
          <CategorySection cat="us_stock" hs={usHoldings} />
          {usValue > 0 && editingCat !== "us_stock" && (
            <ThreeScenarioCard
              title="US Stocks" subtitle="International equity exposure"
              conservative={usData.conservative} base={usData.base} optimistic={usData.optimistic}
              currentValue={usValue} contributions={usData.contributions} yearByYear={usData.yearByYear}
            />
          )}
        </>
      )}

      {/* Gold */}
      {(goldValue > 0 || editingCat === "gold") && (
        <>
          <CategorySection cat="gold" hs={goldHoldings} />
          {goldValue > 0 && editingCat !== "gold" && (
            <AssetProjectionCard
              title="Gold" subtitle={`Physical gold — ${assumptions.goldCagr}% CAGR assumption`}
              valueAtRetirement={goldData.atRetirement} currentValue={goldValue}
              growthMultiple={goldData.growthMultiple} investedTotal={0} returnsEarned={goldData.returnsEarned}
              breakdownItems={[
                { label: "Current value", value: goldValue,              color: "var(--text-primary)" },
                { label: "Returns",       value: goldData.returnsEarned, color: "var(--success)" },
              ]}
              chartData={goldData.yearByYear} chartColor="#F59E0B"
            />
          )}
        </>
      )}

      {/* FD — no projection card, just the form */}
      {editingCat === "fd" && (
        <CategorySection cat="fd" hs={fdHoldings} />
      )}

      {/* Summary table */}
      {summaryRows.length > 0 && editingCat === null && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="text-base font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
            Total projected wealth at retirement
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Asset", "Today", "At retirement", "Growth"].map((h, i) => (
                    <th key={h} className={`text-xs font-medium uppercase tracking-wider px-4 py-3 ${i === 0 ? "text-left" : "text-right"}`} style={{ color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(row => (
                  <tr key={row.label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {row.label}
                      {row.note && <span className="text-xs ml-1.5" style={{ color: "var(--text-secondary)" }}>{row.note}</span>}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{formatINR(row.today)}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>{formatINR(row.atRetirement)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--success)" }}>{row.multiple.toFixed(1)}x</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>Total</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-secondary)" }}>{formatINR(totalToday)}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{formatINR(totalAtRetirement)}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--success)" }}>
                    {totalToday > 0 ? (totalAtRetirement / totalToday).toFixed(1) : "—"}x
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 pt-3 pb-1">
                    <div className="flex flex-wrap gap-6 text-xs">
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Accessible at retirement (age {retireAge}):</span>
                        <span className="font-semibold ml-1.5" style={{ color: "var(--success)" }}>{formatINR(accessibleAtRetirement)}</span>
                      </div>
                      {lockedTillLater > 0 && (
                        <div>
                          <span style={{ color: "var(--text-secondary)" }}>Locked till later:</span>
                          <span className="font-semibold ml-1.5" style={{ color: "var(--text-primary)" }}>{formatINR(lockedTillLater)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>
            All projections use base case rates. Equity at {assumptions.equityCagr}%, EPF at {assumptions.epfRate}%,
            NPS at {assumptions.npsCagr}%, PPF at {assumptions.ppfRate}%, Gold at {assumptions.goldCagr}%.
            Adjust using the Assumptions panel above.
          </p>
        </div>
      )}

      {/* Add investments panel — missing categories */}
      {editingCat === null && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
            {missingCategories.length > 0 ? "Add investments" : "All categories tracked"}
          </div>
          {missingCategories.length > 0 ? (
            <>
              <div className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                Click any type to enter values and see how it grows
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {missingCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => openEdit(cat, [])}
                    className="rounded-lg p-3 text-xs flex items-center justify-between transition-colors hover:opacity-80 text-left"
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{ASSET_ICONS[cat]}</span>
                      <span>{ASSET_LABELS[cat]}</span>
                    </span>
                    <span style={{ color: "var(--orange)" }}>+ Add</span>
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
                For detailed per-holding tracking (multiple funds, stocks),{" "}
                <Link href="/portfolio" className="underline hover:opacity-80" style={{ color: "var(--orange)" }}>use the Portfolio editor →</Link>
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
              <span>✓</span>
              <span>All investment categories are tracked. Edit any above to update values.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
