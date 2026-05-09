"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatINR, epfProjection, npsProjection, ppfProjection } from "@/lib/fire-calculator";
import SubNav from "@/components/layout/SubNav";
import { parseHoldings } from "@/lib/portfolio-parser";
import { parsePortfolioFile, extractHoldingsFromFile } from "@/lib/csv-parser";
import type { ParsedHolding } from "@/lib/portfolio-parser";
import type { ParsedFile } from "@/lib/csv-parser";
import type { Holding, HoldingCategory } from "@/lib/types";

// ─── types ──────────────────────────────────────────────────────────────

interface DBHolding {
  id: string;
  category: HoldingCategory;
  name: string;
  value_inr: number;
  monthly_contribution: number;
  notes?: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  fire_target_age: number | null;
  monthly_income: number | null;
  monthly_expense: number | null;
  parent_support: number | null;
  tax_bracket: number;
  tax_regime: string;
  fire_monthly_expense: number | null;
  risk_score: number | null;
  data_completeness: Record<string, string> | null;
}

interface StockRow { name: string; value: string }
interface MFRow    { name: string; value: string; fundType: string }
interface SIPRow   { name: string; monthly: string; sipType: string }

interface EditState {
  profile: {
    full_name: string; age: string; fire_target_age: string;
    monthly_income: string; monthly_expense: string;
    parent_support: string; tax_bracket: string;
    tax_regime: string; fire_monthly_expense: string; risk_score: string;
  };
  indianStocks: StockRow[];
  usStocks: StockRow[];
  mutualFunds: MFRow[];
  physicalGold: string; goldEtf: string; fd: string;
  epf: { value: string; your: string; employer: string };
  nps: { value: string; monthly: string; alloc: string };
  ppf: { value: string; monthly: string; years: string };
  lic: { value: string; annualPremium: string; licType: string };
  sips: SIPRow[];
  usMonthly: string;
  indianMonthly: string;
}

type InputMode = "manual" | "paste" | "csv";

// ─── constants ──────────────────────────────────────────────────────────

const n = (s: string) => parseFloat(s) || 0;

const MF_TYPE_LABELS: Record<string, string> = {
  index: "Index fund", active: "Active fund", elss: "ELSS", debt: "Debt fund",
};
const NPS_ALLOC_LABELS: Record<string, string> = {
  LC25: "LC25 — Conservative", LC50: "LC50 — Moderate",
  LC75: "LC75 — Aggressive", AC: "Active choice",
};
const LIC_TYPE_LABELS: Record<string, string> = {
  term: "Term", endowment: "Endowment", ulip: "ULIP", money_back: "Money back",
};
const SIP_TYPE_LABELS: Record<string, string> = {
  index: "Index SIP", active: "Active SIP", elss: "ELSS SIP", debt: "Debt SIP",
};

const PORTFOLIO_TABS = [
  { id: "profile",     label: "Profile" },
  { id: "investments", label: "Investments" },
  { id: "monthly",     label: "Monthly & Goals" },
];

// ─── helpers ────────────────────────────────────────────────────────────

function parseNotes(notes: string | undefined, key: string): string {
  if (!notes) return "";
  return notes.match(new RegExp(`${key}=([^;]+)`))?.[1] ?? "";
}

function buildInitialEditState(profile: Profile, holdings: DBHolding[]): EditState {
  const indianStocks = holdings.filter(h => h.category === "indian_stock" && h.notes !== "indian_monthly_inv");
  const usStocks     = holdings.filter(h => h.category === "us_stock"     && h.notes !== "us_monthly_inv");
  const mutualFunds  = holdings.filter(h => h.category === "mf" && !h.notes?.startsWith("sip") && h.value_inr > 0);
  const sips         = holdings.filter(h => h.category === "mf" && h.notes?.startsWith("sip"));
  const physical     = holdings.find(h => h.category === "gold" && h.name.toLowerCase().includes("physical"));
  const goldEtf      = holdings.find(h => h.category === "gold" && !h.name.toLowerCase().includes("physical"));
  const fdH          = holdings.find(h => h.category === "fd");
  const epfH         = holdings.find(h => h.category === "epf");
  const npsH         = holdings.find(h => h.category === "nps");
  const ppfH         = holdings.find(h => h.category === "ppf");
  const licH         = holdings.find(h => h.category === "lic");
  const usMonthlyH   = holdings.find(h => h.notes === "us_monthly_inv");
  const indianMonthlyH = holdings.find(h => h.notes === "indian_monthly_inv");

  return {
    profile: {
      full_name: profile.full_name || "",
      age: String(profile.age || ""),
      fire_target_age: String(profile.fire_target_age || ""),
      monthly_income: String(profile.monthly_income || ""),
      monthly_expense: String(profile.monthly_expense || ""),
      parent_support: String(profile.parent_support || "0"),
      tax_bracket: String(profile.tax_bracket || "30"),
      tax_regime: profile.tax_regime || "new",
      fire_monthly_expense: String(profile.fire_monthly_expense || ""),
      risk_score: String(profile.risk_score || "5"),
    },
    indianStocks: indianStocks.map(h => ({ name: h.name, value: String(h.value_inr) })),
    usStocks:     usStocks.map(h => ({ name: h.name, value: String(h.value_inr) })),
    mutualFunds:  mutualFunds.map(h => ({ name: h.name, value: String(h.value_inr), fundType: h.notes || "index" })),
    physicalGold: String(physical?.value_inr || "0"),
    goldEtf:      String(goldEtf?.value_inr || "0"),
    fd:           String(fdH?.value_inr || "0"),
    epf: {
      value:    String(epfH?.value_inr || "0"),
      your:     parseNotes(epfH?.notes, "your") || String(Math.round((epfH?.monthly_contribution || 0) / 2)),
      employer: parseNotes(epfH?.notes, "employer") || String(Math.round((epfH?.monthly_contribution || 0) / 2)),
    },
    nps: {
      value:   String(npsH?.value_inr || "0"),
      monthly: String(npsH?.monthly_contribution || "0"),
      alloc:   parseNotes(npsH?.notes, "alloc") || "LC50",
    },
    ppf: {
      value:   String(ppfH?.value_inr || "0"),
      monthly: String(ppfH?.monthly_contribution || "0"),
      years:   parseNotes(ppfH?.notes, "years_to_maturity") || "15",
    },
    lic: {
      value:         String(licH?.value_inr || "0"),
      annualPremium: String(Math.round((licH?.monthly_contribution || 0) * 12)),
      licType:       parseNotes(licH?.notes, "type") || "term",
    },
    sips: sips.map(h => ({
      name:    h.name.replace(/^SIP: /, ""),
      monthly: String(h.monthly_contribution || "0"),
      sipType: parseNotes(h.notes, "type") || "index",
    })),
    usMonthly:     String(usMonthlyH?.monthly_contribution || "0"),
    indianMonthly: String(indianMonthlyH?.monthly_contribution || "0"),
  };
}

function computeDataCompleteness(state: EditState): Record<string, string> {
  return {
    income:        n(state.profile.monthly_income) > 0 ? "exact" : "estimated",
    expenses:      n(state.profile.monthly_expense) > 0 ? "exact" : "estimated",
    savings:       state.indianStocks.some(s => s.name && n(s.value) > 0) ||
                   state.usStocks.some(s => s.name && n(s.value) > 0) ||
                   state.mutualFunds.some(s => s.name && n(s.value) > 0)
                   ? "exact" : "estimated",
    indian_stocks: state.indianStocks.some(s => s.name && n(s.value) > 0) ? "exact" : "missing",
    us_stocks:     state.usStocks.some(s => s.name && n(s.value) > 0) ? "exact" : "missing",
    mutual_funds:  state.mutualFunds.some(s => s.name && n(s.value) > 0) ? "exact" : "missing",
    gold:          n(state.physicalGold) > 0 || n(state.goldEtf) > 0 ? "exact" : "missing",
    epf:           n(state.epf.value) > 0 ? "exact" : "estimated",
    nps:           n(state.nps.value) > 0 ? "exact" : "missing",
    ppf:           n(state.ppf.value) > 0 ? "exact" : "missing",
    sips:          state.sips.some(s => s.name && n(s.monthly) > 0) ? "exact" : "missing",
  };
}

// ─── small UI atoms ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
      {children}
    </h3>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="font-semibold text-slate-800 text-sm">{value || "—"}</div>
    </div>
  );
}

function LockedCard({ title, present, rows }: {
  title: string;
  present: boolean;
  rows: { label: string; value: string; accent?: boolean }[];
}) {
  return (
    <div className={`rounded-xl border p-4 ${present ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}>
      <div className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
        {title}
        {!present && <span className="text-xs font-normal text-slate-400">Not added</span>}
      </div>
      {present && (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between text-xs">
              <span className="text-slate-500">{row.label}</span>
              <span className={row.accent ? "font-semibold text-orange-600" : "text-slate-700"}>{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function EditInput({ value, onChange, type = "text", placeholder = "" }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input"
    />
  );
}

function EditSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-slate-500 mb-3 mt-5 first:mt-0">{children}</div>
  );
}

function RowEditor({ left, middle, right, onDelete }: {
  left: React.ReactNode; middle?: React.ReactNode;
  right: React.ReactNode; onDelete: () => void;
}) {
  return (
    <div className={`grid gap-2 mb-2 items-start ${middle ? "grid-cols-[1fr_160px_140px_32px]" : "grid-cols-[1fr_160px_32px]"}`}>
      <div>{left}</div>
      {middle && <div>{middle}</div>}
      <div>{right}</div>
      <button
        onClick={onDelete}
        className="mt-1 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── input mode tab bar ────────────────────────────────────────────────────

function InputModeTabs({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  const tabs: { id: InputMode; icon: string; label: string }[] = [
    { id: "manual", icon: "✏️", label: "Manual" },
    { id: "paste",  icon: "📋", label: "Paste" },
    { id: "csv",    icon: "📁", label: "Upload CSV" },
  ];
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            mode === t.id
              ? "bg-orange-50 border-orange-200 text-orange-600"
              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── paste entry ──────────────────────────────────────────────────────────

function PasteEntry({
  label,
  onConfirm,
  onCancel,
  isSip,
}: {
  label: string;
  onConfirm: (rows: { name: string; value: string }[]) => void;
  onCancel: () => void;
  isSip?: boolean;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedHolding[] | null>(null);
  const [editing, setEditing] = useState<{ name: string; value: string }[]>([]);

  function doParse() {
    const results = parseHoldings(text);
    setParsed(results);
    setEditing(results.map(r => ({ name: r.name, value: String(Math.round(r.value)) })));
  }

  if (parsed) {
    return (
      <div>
        <div className="text-xs font-medium text-slate-600 mb-3">
          {parsed.length} {label.toLowerCase()} detected — review before saving
        </div>
        <div className="space-y-2 mb-4">
          {editing.map((row, i) => (
            <div key={i} className="grid grid-cols-[24px_1fr_140px_28px] gap-2 items-center">
              <span className={`text-xs ${parsed[i]?.confidence === "high" ? "text-emerald-500" : "text-amber-500"}`}>
                {parsed[i]?.confidence === "high" ? "✓" : "⚠"}
              </span>
              <input
                className="input text-sm"
                value={row.name}
                onChange={e => setEditing(ed => ed.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
              />
              <input
                type="number" className="input text-sm"
                value={row.value}
                onChange={e => setEditing(ed => ed.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
              />
              <button
                type="button"
                onClick={() => { setEditing(ed => ed.filter((_, j) => j !== i)); setParsed(p => p?.filter((_, j) => j !== i) ?? null); }}
                className="p-1 text-slate-300 hover:text-red-400 rounded"
              >×</button>
            </div>
          ))}
        </div>
        {parsed.some(p => p.confidence === "low") && (
          <p className="text-xs text-amber-600 mb-3">⚠ Low confidence rows — please verify values</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setParsed(null); setText(""); }} className="btn-secondary text-sm">
            ← Edit paste
          </button>
          <button
            type="button"
            onClick={() => onConfirm(editing.filter(r => r.name && parseFloat(r.value) > 0))}
            className="btn-primary text-sm"
          >
            Save these {label.toLowerCase()} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">
        Paste from Excel, Google Sheets, or WhatsApp — one per line.
        {isSip ? " Format: Fund name then monthly amount." : " Format: Name then current value."}
        {" "}Commas, tabs, or spaces all work. Supports ₹85k, 1.5L, 1Cr shorthand.
      </p>
      <textarea
        className="input w-full font-mono text-sm"
        rows={6}
        placeholder={isSip
          ? "Nifty 50 Index SIP 15000\nParag Parikh Flexi Cap, 10000"
          : "HDFC Bank 85000\nBajaj Finance, 92000\nCDSL\t78000"}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="button" onClick={doParse} disabled={!text.trim()} className="btn-primary text-sm disabled:opacity-50">
          Parse →
        </button>
      </div>
    </div>
  );
}

// ─── CSV entry ────────────────────────────────────────────────────────────

function CsvEntry({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (rows: { name: string; value: string }[]) => void;
  onCancel: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [nameCol, setNameCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [preview, setPreview] = useState<{ name: string; value: string }[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setErr(null);
    try {
      const result = await parsePortfolioFile(file);
      setParsed(result);
      setNameCol(result.suggestedNameCol || result.headers[0] || "");
      setValueCol(result.suggestedValueCol || result.headers[1] || "");
    } catch (e: any) {
      setErr("Failed to read file. Make sure it's a valid .csv or .xlsx.");
    } finally {
      setLoading(false);
    }
  }

  function buildPreview() {
    if (!parsed || !nameCol || !valueCol) return;
    const rows = extractHoldingsFromFile(parsed, nameCol, valueCol)
      .slice(0, 3)
      .map(r => ({ name: r.name, value: String(Math.round(r.value)) }));
    setPreview(rows);
  }

  function confirmImport() {
    if (!parsed || !nameCol || !valueCol) return;
    const rows = extractHoldingsFromFile(parsed, nameCol, valueCol)
      .map(r => ({ name: r.name, value: String(Math.round(r.value)) }));
    onConfirm(rows);
  }

  const BROKER_LABEL: Record<string, string> = {
    zerodha: "Zerodha", groww: "Groww", kuvera: "Kuvera", indmoney: "INDmoney", generic: "Generic",
  };

  if (preview && parsed) {
    const total = extractHoldingsFromFile(parsed, nameCol, valueCol).length;
    return (
      <div>
        <div className="text-xs font-medium text-slate-600 mb-3">
          {BROKER_LABEL[parsed.detectedFormat]} format — {total} holdings found
        </div>
        <div className="space-y-1.5 mb-4">
          {preview.map((r, i) => (
            <div key={i} className="flex justify-between text-sm px-3 py-2 bg-slate-50 rounded-lg">
              <span className="text-ink font-medium">{r.name}</span>
              <span className="text-slate-500">{formatINR(parseFloat(r.value) || 0)}</span>
            </div>
          ))}
          {total > 3 && (
            <div className="text-xs text-slate-400 px-3">… and {total - 3} more</div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(null)} className="btn-secondary text-sm">
            ← Change columns
          </button>
          <button type="button" onClick={confirmImport} className="btn-primary text-sm">
            Import all {total} {label.toLowerCase()} →
          </button>
        </div>
      </div>
    );
  }

  if (parsed) {
    return (
      <div>
        {parsed.detectedFormat !== "generic" ? (
          <div className="text-xs text-emerald-600 font-medium mb-3">
            ✓ {BROKER_LABEL[parsed.detectedFormat]} format detected — {parsed.rows.length} rows found
          </div>
        ) : (
          <div className="text-xs text-amber-600 font-medium mb-3">
            Unknown format — select which columns to use
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Name column</label>
            <select className="input" value={nameCol} onChange={e => setNameCol(e.target.value)}>
              {parsed.headers.map(h => <option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Value column</label>
            <select className="input" value={valueCol} onChange={e => setValueCol(e.target.value)}>
              {parsed.headers.map(h => <option key={h}>{h}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setParsed(null); setPreview(null); }} className="btn-secondary text-sm">
            ← Upload different file
          </button>
          <button type="button" onClick={buildPreview} className="btn-primary text-sm">
            Preview import →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        Upload your broker export or your own spreadsheet.
        Supported: Zerodha, Groww, Kuvera, INDmoney, or any CSV/Excel.
      </p>
      <label
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
          dragging ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-300"
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <input
          type="file" className="hidden" accept=".csv,.xlsx,.xls"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {loading ? (
          <span className="text-sm text-slate-500">Reading file…</span>
        ) : (
          <>
            <span className="text-2xl mb-2">📁</span>
            <span className="text-sm font-medium text-slate-600">Drop file here or click to upload</span>
            <span className="text-xs text-slate-400 mt-1">.csv and .xlsx · max 5MB</span>
          </>
        )}
      </label>
      {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      <button type="button" onClick={onCancel} className="btn-secondary text-sm mt-3">Cancel</button>
    </div>
  );
}

// ─── section with 3-tab input ─────────────────────────────────────────────

function StockSection({
  title, rows, onRowsChange, placeholder, isSip,
}: {
  title: string;
  rows: { name: string; value: string }[];
  onRowsChange: (rows: { name: string; value: string }[]) => void;
  placeholder: string;
  isSip?: boolean;
}) {
  const [mode, setMode] = useState<InputMode>("manual");

  function handleConfirm(newRows: { name: string; value: string }[]) {
    onRowsChange([...rows.filter(r => r.name && parseFloat(r.value) > 0), ...newRows]);
    setMode("manual");
  }

  return (
    <div className="mb-5">
      <SubSectionTitle>{title}</SubSectionTitle>
      <InputModeTabs mode={mode} onChange={setMode} />
      {mode === "manual" && (
        <>
          {rows.map((row, i) => (
            <RowEditor key={i}
              left={
                <EditInput value={row.name}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, name: v } : r))}
                  placeholder={placeholder} />
              }
              right={
                <EditInput value={row.value}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, value: v } : r))}
                  type="number" placeholder={isSip ? "Amount/mo (₹)" : "Value (₹)"} />
              }
              onDelete={() => onRowsChange(rows.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            className="text-xs text-orange-500 hover:text-orange-600 font-medium"
            onClick={() => onRowsChange([...rows, { name: "", value: "" }])}
          >
            + Add row
          </button>
        </>
      )}
      {mode === "paste" && (
        <PasteEntry
          label={title}
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
          isSip={isSip}
        />
      )}
      {mode === "csv" && (
        <CsvEntry
          label={title}
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
        />
      )}
    </div>
  );
}

// SIP section has different row shape (monthly instead of value)
function SipSection({
  rows, onRowsChange,
}: {
  rows: SIPRow[];
  onRowsChange: (rows: SIPRow[]) => void;
}) {
  const [mode, setMode] = useState<InputMode>("manual");

  function handleConfirm(newRows: { name: string; value: string }[]) {
    const sipRows: SIPRow[] = newRows.map(r => ({ name: r.name, monthly: r.value, sipType: "index" }));
    onRowsChange([...rows.filter(r => r.name && n(r.monthly) > 0), ...sipRows]);
    setMode("manual");
  }

  return (
    <div>
      <SubSectionTitle>SIPs</SubSectionTitle>
      <InputModeTabs mode={mode} onChange={setMode} />
      {mode === "manual" && (
        <>
          {rows.map((row, i) => (
            <RowEditor key={i}
              left={
                <EditInput value={row.name}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, name: v } : r))}
                  placeholder="Fund / SIP name" />
              }
              middle={
                <EditSelect value={row.sipType}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, sipType: v } : r))}
                  options={[
                    { value: "index", label: "Index" }, { value: "active", label: "Active" },
                    { value: "elss", label: "ELSS" }, { value: "debt", label: "Debt" },
                  ]} />
              }
              right={
                <EditInput value={row.monthly}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, monthly: v } : r))}
                  type="number" placeholder="Amount / month" />
              }
              onDelete={() => onRowsChange(rows.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            className="text-xs text-orange-500 hover:text-orange-600 font-medium mt-1"
            onClick={() => onRowsChange([...rows, { name: "", monthly: "", sipType: "index" }])}
          >
            + Add SIP
          </button>
        </>
      )}
      {mode === "paste" && (
        <PasteEntry
          label="SIPs"
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
          isSip
        />
      )}
      {mode === "csv" && (
        <CsvEntry
          label="SIPs"
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
        />
      )}
    </div>
  );
}

// MF section has type dropdown
function MFSection({
  rows, onRowsChange,
}: {
  rows: MFRow[];
  onRowsChange: (rows: MFRow[]) => void;
}) {
  const [mode, setMode] = useState<InputMode>("manual");

  function handleConfirm(newRows: { name: string; value: string }[]) {
    const mfRows: MFRow[] = newRows.map(r => ({ name: r.name, value: r.value, fundType: "index" }));
    onRowsChange([...rows.filter(r => r.name && n(r.value) > 0), ...mfRows]);
    setMode("manual");
  }

  return (
    <div className="mb-5">
      <SubSectionTitle>Mutual funds</SubSectionTitle>
      <InputModeTabs mode={mode} onChange={setMode} />
      {mode === "manual" && (
        <>
          {rows.map((row, i) => (
            <RowEditor key={i}
              left={
                <EditInput value={row.name}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, name: v } : r))}
                  placeholder="Fund name" />
              }
              middle={
                <EditSelect value={row.fundType}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, fundType: v } : r))}
                  options={[
                    { value: "index", label: "Index" }, { value: "active", label: "Active" },
                    { value: "elss", label: "ELSS" }, { value: "debt", label: "Debt" },
                  ]} />
              }
              right={
                <EditInput value={row.value}
                  onChange={v => onRowsChange(rows.map((r, j) => j === i ? { ...r, value: v } : r))}
                  type="number" placeholder="Value (₹)" />
              }
              onDelete={() => onRowsChange(rows.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            className="text-xs text-orange-500 hover:text-orange-600 font-medium"
            onClick={() => onRowsChange([...rows, { name: "", value: "", fundType: "index" }])}
          >
            + Add fund
          </button>
        </>
      )}
      {mode === "paste" && (
        <PasteEntry
          label="Mutual funds"
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
        />
      )}
      {mode === "csv" && (
        <CsvEntry
          label="Mutual funds"
          onConfirm={handleConfirm}
          onCancel={() => setMode("manual")}
        />
      )}
    </div>
  );
}

// ─── privacy banner ───────────────────────────────────────────────────────

function PrivacyBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem("privacy_banner_dismissed") === "1");
  }, []);

  function dismiss() {
    localStorage.setItem("privacy_banner_dismissed", "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
      <span className="text-slate-400 mt-0.5">🔒</span>
      <div className="flex-1 text-xs text-slate-600 leading-relaxed">
        <strong className="text-slate-700">Your data is private and encrypted.</strong>{" "}
        We never store PAN, Aadhaar, or broker credentials.
        You can delete everything from{" "}
        <Link href="/settings" className="underline hover:no-underline">Settings → Delete account</Link>.
      </div>
      <button
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-600 text-lg leading-none ml-2 flex-shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────

export default function PortfolioClient({
  profile,
  snapshotDate,
  holdings,
}: {
  profile: Profile | null;
  snapshotDate: string | null;
  holdings: DBHolding[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState>(() =>
    profile
      ? buildInitialEditState(profile, holdings)
      : buildInitialEditState({
          id: "", full_name: null, age: null, fire_target_age: null,
          monthly_income: null, monthly_expense: null, parent_support: null,
          tax_bracket: 30, tax_regime: "new", fire_monthly_expense: null,
          risk_score: null, data_completeness: null,
        }, [])
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  function cancelEdit() {
    if (profile) setEditState(buildInitialEditState(profile, holdings));
    setIsEditing(false);
    setError(null);
  }

  async function savePortfolio() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // TODO: remove BYPASS_AUTH before production launch
      if (!user && process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
        await new Promise(r => setTimeout(r, 600));
        showToast("Dev mode: changes not persisted — sign in to save for real.");
        setIsEditing(false);
        setSaving(false);
        return;
      }
      if (!user) throw new Error("Not authenticated — please sign in to save changes.");

      const newCompleteness = computeDataCompleteness(editState);

      await supabase.from("profiles").update({
        full_name: editState.profile.full_name,
        age: parseInt(editState.profile.age) || null,
        fire_target_age: parseInt(editState.profile.fire_target_age) || null,
        monthly_income: n(editState.profile.monthly_income) || null,
        monthly_expense: n(editState.profile.monthly_expense) || null,
        parent_support: n(editState.profile.parent_support),
        tax_bracket: parseInt(editState.profile.tax_bracket) || 30,
        tax_regime: editState.profile.tax_regime,
        fire_monthly_expense: n(editState.profile.fire_monthly_expense) || null,
        risk_score: parseInt(editState.profile.risk_score) || null,
        data_completeness: newCompleteness,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      const newHoldings: Holding[] = [];

      editState.indianStocks.filter(s => s.name && n(s.value) > 0)
        .forEach(s => newHoldings.push({ category: "indian_stock", name: s.name, value_inr: n(s.value) }));
      editState.usStocks.filter(s => s.name && n(s.value) > 0)
        .forEach(s => newHoldings.push({ category: "us_stock", name: s.name, value_inr: n(s.value) }));
      editState.mutualFunds.filter(s => s.name && n(s.value) > 0)
        .forEach(s => newHoldings.push({ category: "mf", name: s.name, value_inr: n(s.value), notes: s.fundType }));

      if (n(editState.physicalGold) > 0) newHoldings.push({ category: "gold", name: "Physical gold",  value_inr: n(editState.physicalGold) });
      if (n(editState.goldEtf) > 0)      newHoldings.push({ category: "gold", name: "Gold ETF/SGB",   value_inr: n(editState.goldEtf) });
      if (n(editState.fd) > 0)           newHoldings.push({ category: "fd",   name: "FD/Emergency",   value_inr: n(editState.fd) });

      if (n(editState.epf.value) > 0)
        newHoldings.push({ category: "epf", name: "EPF", value_inr: n(editState.epf.value),
          monthly_contribution: n(editState.epf.your) + n(editState.epf.employer),
          notes: `your=${editState.epf.your};employer=${editState.epf.employer}` });
      if (n(editState.nps.value) > 0 || n(editState.nps.monthly) > 0)
        newHoldings.push({ category: "nps", name: "NPS", value_inr: n(editState.nps.value),
          monthly_contribution: n(editState.nps.monthly), notes: `alloc=${editState.nps.alloc}` });
      if (n(editState.ppf.value) > 0 || n(editState.ppf.monthly) > 0)
        newHoldings.push({ category: "ppf", name: "PPF", value_inr: n(editState.ppf.value),
          monthly_contribution: n(editState.ppf.monthly), notes: `years_to_maturity=${editState.ppf.years}` });
      if (n(editState.lic.value) > 0)
        newHoldings.push({ category: "lic", name: "LIC", value_inr: n(editState.lic.value),
          monthly_contribution: n(editState.lic.annualPremium) / 12, notes: `type=${editState.lic.licType}` });

      editState.sips.filter(s => s.name && n(s.monthly) > 0)
        .forEach(s => newHoldings.push({ category: "mf", name: `SIP: ${s.name}`,
          value_inr: 0, monthly_contribution: n(s.monthly), notes: `sip;type=${s.sipType}` }));

      if (n(editState.usMonthly) > 0)
        newHoldings.push({ category: "us_stock", name: "US Monthly Investment",
          value_inr: 0, monthly_contribution: n(editState.usMonthly), notes: "us_monthly_inv" });
      if (n(editState.indianMonthly) > 0)
        newHoldings.push({ category: "indian_stock", name: "Indian Monthly Investment",
          value_inr: 0, monthly_contribution: n(editState.indianMonthly), notes: "indian_monthly_inv" });

      const snapRes = await fetch("/api/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: newHoldings }),
      });
      if (!snapRes.ok) {
        const e = await snapRes.json();
        throw new Error(e.error || "Snapshot failed");
      }

      showToast("Portfolio updated. New snapshot saved.");
      setIsEditing(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-ink mb-2">No portfolio data yet</h2>
        <p className="text-sm text-slate-500 mb-6">Complete onboarding to see your portfolio.</p>
        <Link href="/onboarding" className="btn-primary px-8">Set up portfolio →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Privacy banner */}
      <PrivacyBanner />

      {/* Breadcrumb + page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/dashboard" className="hover:text-slate-600 transition-colors">Dashboard</Link>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-600 font-medium">Portfolio</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">My Portfolio</h1>
          {snapshotDate && (
            <p className="text-sm text-slate-400 mt-0.5">
              Last updated:{" "}
              {new Date(snapshotDate).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
        </div>

        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-secondary">
            Edit Portfolio
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="btn-secondary" disabled={saving}>Cancel</button>
            <button onClick={savePortfolio} className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save & update snapshot"}
            </button>
          </div>
        )}
      </div>

      {/* Sub-nav */}
      <SubNav tabs={PORTFOLIO_TABS} active={activeTab} onChange={setActiveTab} />

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Tab content */}
      <div className="mt-6">
        {isEditing
          ? <EditView state={editState} setState={setEditState} activeTab={activeTab} />
          : <ViewMode profile={profile} holdings={holdings} activeTab={activeTab} />
        }
      </div>

      <p className="disclaimer pt-6 pb-2">
        For educational purposes only. Not SEBI-registered investment advice.
      </p>
    </div>
  );
}

// ─── VIEW MODE ────────────────────────────────────────────────────────────

function ViewMode({ profile, holdings, activeTab }: {
  profile: Profile; holdings: DBHolding[]; activeTab: string;
}) {
  const age = profile.age || 30;
  const yearsToFire = Math.max(1, (profile.fire_target_age || 45) - age);

  const indianStocks  = holdings.filter(h => h.category === "indian_stock" && h.notes !== "indian_monthly_inv");
  const usStocks      = holdings.filter(h => h.category === "us_stock"     && h.notes !== "us_monthly_inv");
  const mfs           = holdings.filter(h => h.category === "mf"           && !h.notes?.startsWith("sip") && h.value_inr > 0);
  const sips          = holdings.filter(h => h.category === "mf"           && h.notes?.startsWith("sip"));
  const goldPhysical  = holdings.find(h => h.category === "gold" && h.name.toLowerCase().includes("physical"));
  const goldEtf       = holdings.find(h => h.category === "gold" && !h.name.toLowerCase().includes("physical"));
  const fd            = holdings.find(h => h.category === "fd");
  const epfH          = holdings.find(h => h.category === "epf");
  const npsH          = holdings.find(h => h.category === "nps");
  const ppfH          = holdings.find(h => h.category === "ppf");
  const licH          = holdings.find(h => h.category === "lic");
  const usMonthlyH    = holdings.find(h => h.notes === "us_monthly_inv");
  const indianMonthlyH = holdings.find(h => h.notes === "indian_monthly_inv");

  const liquidItems = [...indianStocks, ...usStocks, ...mfs,
    ...(goldPhysical ? [goldPhysical] : []),
    ...(goldEtf ? [goldEtf] : []),
    ...(fd ? [fd] : []),
  ];
  const totalLiquid = liquidItems.reduce((s, h) => s + h.value_inr, 0);

  const epfYour     = parseFloat(parseNotes(epfH?.notes, "your")) || 0;
  const epfEmployer = parseFloat(parseNotes(epfH?.notes, "employer")) || 0;
  const npsAlloc    = parseNotes(npsH?.notes, "alloc") || "LC50";
  const ppfYears    = parseInt(parseNotes(ppfH?.notes, "years_to_maturity") || "15");
  const licType     = parseNotes(licH?.notes, "type") || "term";

  const epfProjected = epfH ? epfProjection(epfH.value_inr, epfYour, epfEmployer, yearsToFire) : 0;
  const npsResult    = npsH ? npsProjection(npsH.value_inr, npsH.monthly_contribution || 0, yearsToFire) : null;
  const ppfProjected = ppfH ? ppfProjection(ppfH.value_inr, ppfH.monthly_contribution || 0, Math.min(ppfYears, yearsToFire)) : 0;

  const totalSipMonthly = sips.reduce((s, h) => s + (h.monthly_contribution || 0), 0);
  const usMo = usMonthlyH?.monthly_contribution || 0;
  const indianMo = indianMonthlyH?.monthly_contribution || 0;
  const totalMonthly = totalSipMonthly + usMo + indianMo;

  if (activeTab === "profile") {
    return (
      <div className="card space-y-4">
        <SectionTitle>Profile summary</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Age"                    value={`${profile.age ?? "—"} years`} />
          <StatCard label="Target retirement age"  value={`${profile.fire_target_age ?? "—"} years`} />
          <StatCard label="Monthly income"         value={profile.monthly_income  ? formatINR(profile.monthly_income)  : "—"} />
          <StatCard label="Monthly expense"        value={profile.monthly_expense ? formatINR(profile.monthly_expense) : "—"} />
          <StatCard label="Parent support/mo"      value={profile.parent_support  ? formatINR(profile.parent_support)  : "—"} />
          <StatCard label="Tax regime"             value={profile.tax_regime === "new" ? "New regime" : "Old regime"} />
          <StatCard label="Risk score"             value={profile.risk_score ? `${profile.risk_score} / 10` : "—"} />
          <StatCard label="Post-retirement expense" value={profile.fire_monthly_expense ? `${formatINR(profile.fire_monthly_expense)}/mo` : "—"} />
        </div>
      </div>
    );
  }

  if (activeTab === "investments") {
    return (
      <div className="space-y-4">
        <div className="card">
          <SectionTitle>Liquid investments</SectionTitle>

          {indianStocks.length > 0 && (
            <>
              <SubSectionTitle>Indian stocks</SubSectionTitle>
              <HoldingTable headers={["Name", "Current value", "% of liquid"]} rows={
                indianStocks.map(h => [
                  h.name, formatINR(h.value_inr),
                  totalLiquid > 0 ? `${((h.value_inr / totalLiquid) * 100).toFixed(1)}%` : "—",
                ])
              } />
            </>
          )}

          {usStocks.length > 0 && (
            <>
              <SubSectionTitle>US stocks</SubSectionTitle>
              <HoldingTable headers={["Name", "Current value (INR)", "% of liquid"]} rows={
                usStocks.map(h => [
                  h.name, formatINR(h.value_inr),
                  totalLiquid > 0 ? `${((h.value_inr / totalLiquid) * 100).toFixed(1)}%` : "—",
                ])
              } />
            </>
          )}

          {mfs.length > 0 && (
            <>
              <SubSectionTitle>Mutual funds</SubSectionTitle>
              <HoldingTable headers={["Name", "Type", "Current value"]} rows={
                mfs.map(h => [h.name, MF_TYPE_LABELS[h.notes || ""] || h.notes || "—", formatINR(h.value_inr)])
              } />
            </>
          )}

          <SubSectionTitle>Gold &amp; cash</SubSectionTitle>
          <div className="divide-y divide-slate-50">
            <InfoRow label="Physical gold"       value={goldPhysical ? formatINR(goldPhysical.value_inr) : "—"} />
            <InfoRow label="Gold ETF / SGB"      value={goldEtf      ? formatINR(goldEtf.value_inr)      : "—"} />
            <InfoRow label="FD / Emergency fund" value={fd           ? formatINR(fd.value_inr)           : "—"} />
          </div>

          {totalLiquid === 0 && (
            <p className="text-sm text-slate-400 mt-2">No liquid investments added yet.</p>
          )}
        </div>

        <div className="card">
          <SectionTitle>Locked investments</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            <LockedCard title="EPF" present={!!epfH} rows={[
              { label: "Current value",                                     value: epfH ? formatINR(epfH.value_inr) : "—" },
              { label: "Your contribution / mo",                            value: epfYour > 0 ? formatINR(epfYour) : "—" },
              { label: "Employer contribution / mo",                        value: epfEmployer > 0 ? formatINR(epfEmployer) : "—" },
              { label: `Projected at age ${profile.fire_target_age || 45}`, value: epfProjected > 0 ? formatINR(epfProjected) : "—", accent: true },
            ]} />
            <LockedCard title="NPS" present={!!npsH} rows={[
              { label: "Current value",                                     value: npsH ? formatINR(npsH.value_inr) : "—" },
              { label: "Monthly contribution",                              value: npsH ? formatINR(npsH.monthly_contribution || 0) : "—" },
              { label: "Allocation type",                                   value: NPS_ALLOC_LABELS[npsAlloc] || npsAlloc },
              { label: `Projected at age ${profile.fire_target_age || 45}`, value: npsResult ? formatINR(npsResult.atRetirement) : "—", accent: true },
            ]} />
            <LockedCard title="PPF" present={!!ppfH} rows={[
              { label: "Current value",        value: ppfH ? formatINR(ppfH.value_inr) : "—" },
              { label: "Monthly contribution", value: ppfH ? formatINR(ppfH.monthly_contribution || 0) : "—" },
              { label: "Years to maturity",    value: ppfH ? `${ppfYears} years` : "—" },
              { label: "Projected at maturity", value: ppfProjected > 0 ? formatINR(ppfProjected) : "—", accent: true },
            ]} />
            <LockedCard title="LIC / Insurance" present={!!licH} rows={[
              { label: "Current value",  value: licH ? formatINR(licH.value_inr) : "—" },
              { label: "Annual premium", value: licH ? formatINR((licH.monthly_contribution || 0) * 12) : "—" },
              { label: "Policy type",   value: LIC_TYPE_LABELS[licType] || licType },
            ]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionTitle>Monthly investments</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 pr-4 font-medium">Investment</th>
                <th className="text-left py-2 pr-4 font-medium">Type</th>
                <th className="text-right py-2 font-medium">Amount / month</th>
              </tr>
            </thead>
            <tbody>
              {sips.map((h, i) => (
                <tr key={h.id || i} className="border-b border-slate-50">
                  <td className="py-2.5 pr-4 font-medium text-ink">{h.name.replace(/^SIP: /, "")}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{SIP_TYPE_LABELS[parseNotes(h.notes, "type")] || "SIP"}</td>
                  <td className="py-2.5 text-right text-ink">{formatINR(h.monthly_contribution || 0)}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-600" colSpan={2}>US stock monthly investment</td>
                <td className="py-2.5 text-right text-ink">{usMo > 0 ? formatINR(usMo) : "—"}</td>
              </tr>
              <tr className="border-b border-slate-50">
                <td className="py-2.5 pr-4 text-slate-600" colSpan={2}>Indian stock monthly investment</td>
                <td className="py-2.5 text-right text-ink">{indianMo > 0 ? formatINR(indianMo) : "—"}</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-bold text-ink" colSpan={2}>Total monthly</td>
                <td className="py-2.5 text-right font-bold text-orange-600">{formatINR(totalMonthly)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Goals</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Post-retirement expense" value={profile.fire_monthly_expense ? `${formatINR(profile.fire_monthly_expense)}/mo` : "—"} />
          <StatCard label="Risk appetite"           value={profile.risk_score ? `${profile.risk_score} / 10` : "—"} />
        </div>
      </div>
    </div>
  );
}

function HoldingTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm min-w-[380px]">
        <thead>
          <tr className="text-xs text-slate-400 border-b border-slate-100">
            {headers.map((h, i) => (
              <th key={i} className={`py-2 font-medium ${i === 0 ? "text-left pr-4" : i === headers.length - 1 ? "text-right" : "text-left pr-4"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-50 last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-2.5 ${ci === 0 ? "pr-4 font-medium text-ink" : ci === row.length - 1 ? "text-right text-slate-700" : "pr-4 text-slate-500"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── EDIT MODE ────────────────────────────────────────────────────────────

function EditView({ state, setState, activeTab }: {
  state: EditState;
  setState: React.Dispatch<React.SetStateAction<EditState>>;
  activeTab: string;
}) {
  function setProfile(patch: Partial<EditState["profile"]>) {
    setState(s => ({ ...s, profile: { ...s.profile, ...patch } }));
  }

  if (activeTab === "profile") {
    return (
      <div className="card">
        <SectionTitle>Profile summary</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name"><EditInput value={state.profile.full_name} onChange={v => setProfile({ full_name: v })} placeholder="Your name" /></Field>
          <Field label="Age"><EditInput value={state.profile.age} onChange={v => setProfile({ age: v })} type="number" placeholder="30" /></Field>
          <Field label="Target retirement age"><EditInput value={state.profile.fire_target_age} onChange={v => setProfile({ fire_target_age: v })} type="number" placeholder="45" /></Field>
          <Field label="Monthly income (₹)"><EditInput value={state.profile.monthly_income} onChange={v => setProfile({ monthly_income: v })} type="number" placeholder="200000" /></Field>
          <Field label="Monthly expense (₹)"><EditInput value={state.profile.monthly_expense} onChange={v => setProfile({ monthly_expense: v })} type="number" placeholder="100000" /></Field>
          <Field label="Parent support / mo (₹)"><EditInput value={state.profile.parent_support} onChange={v => setProfile({ parent_support: v })} type="number" placeholder="0" /></Field>
          <Field label="Tax bracket (%)">
            <EditSelect value={state.profile.tax_bracket} onChange={v => setProfile({ tax_bracket: v })}
              options={[{ value: "5", label: "5%" }, { value: "10", label: "10%" }, { value: "15", label: "15%" }, { value: "20", label: "20%" }, { value: "30", label: "30%" }]} />
          </Field>
          <Field label="Tax regime">
            <EditSelect value={state.profile.tax_regime} onChange={v => setProfile({ tax_regime: v })}
              options={[{ value: "new", label: "New regime" }, { value: "old", label: "Old regime" }]} />
          </Field>
        </div>
      </div>
    );
  }

  if (activeTab === "investments") {
    return (
      <div className="space-y-4">
        <div className="card">
          <SectionTitle>Liquid investments</SectionTitle>

          <StockSection
            title="Indian stocks"
            rows={state.indianStocks}
            onRowsChange={rows => setState(s => ({ ...s, indianStocks: rows }))}
            placeholder="Stock name"
          />

          <StockSection
            title="US stocks"
            rows={state.usStocks}
            onRowsChange={rows => setState(s => ({ ...s, usStocks: rows }))}
            placeholder="Stock / ETF name"
          />

          <MFSection
            rows={state.mutualFunds}
            onRowsChange={rows => setState(s => ({ ...s, mutualFunds: rows }))}
          />

          <div>
            <SubSectionTitle>Gold &amp; cash</SubSectionTitle>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Physical gold (₹)"><EditInput value={state.physicalGold} onChange={v => setState(s => ({ ...s, physicalGold: v }))} type="number" placeholder="0" /></Field>
              <Field label="Gold ETF / SGB (₹)"><EditInput value={state.goldEtf} onChange={v => setState(s => ({ ...s, goldEtf: v }))} type="number" placeholder="0" /></Field>
              <Field label="FD / Emergency fund (₹)"><EditInput value={state.fd} onChange={v => setState(s => ({ ...s, fd: v }))} type="number" placeholder="0" /></Field>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionTitle>Locked investments</SectionTitle>

          <div className="mb-5">
            <SubSectionTitle>EPF</SubSectionTitle>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Current value (₹)"><EditInput value={state.epf.value} onChange={v => setState(s => ({ ...s, epf: { ...s.epf, value: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Your contribution / mo (₹)"><EditInput value={state.epf.your} onChange={v => setState(s => ({ ...s, epf: { ...s.epf, your: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Employer contribution / mo (₹)"><EditInput value={state.epf.employer} onChange={v => setState(s => ({ ...s, epf: { ...s.epf, employer: v } }))} type="number" placeholder="0" /></Field>
            </div>
          </div>

          <div className="mb-5">
            <SubSectionTitle>NPS</SubSectionTitle>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Current value (₹)"><EditInput value={state.nps.value} onChange={v => setState(s => ({ ...s, nps: { ...s.nps, value: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Monthly contribution (₹)"><EditInput value={state.nps.monthly} onChange={v => setState(s => ({ ...s, nps: { ...s.nps, monthly: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Allocation type">
                <EditSelect value={state.nps.alloc} onChange={v => setState(s => ({ ...s, nps: { ...s.nps, alloc: v } }))}
                  options={[{ value: "LC25", label: "LC25 — Conservative" }, { value: "LC50", label: "LC50 — Moderate" }, { value: "LC75", label: "LC75 — Aggressive" }, { value: "AC", label: "Active choice" }]} />
              </Field>
            </div>
          </div>

          <div className="mb-5">
            <SubSectionTitle>PPF</SubSectionTitle>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Current value (₹)"><EditInput value={state.ppf.value} onChange={v => setState(s => ({ ...s, ppf: { ...s.ppf, value: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Monthly contribution (₹)"><EditInput value={state.ppf.monthly} onChange={v => setState(s => ({ ...s, ppf: { ...s.ppf, monthly: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Years to maturity"><EditInput value={state.ppf.years} onChange={v => setState(s => ({ ...s, ppf: { ...s.ppf, years: v } }))} type="number" placeholder="15" /></Field>
            </div>
          </div>

          <div>
            <SubSectionTitle>LIC / Insurance</SubSectionTitle>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Current value (₹)"><EditInput value={state.lic.value} onChange={v => setState(s => ({ ...s, lic: { ...s.lic, value: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Annual premium (₹)"><EditInput value={state.lic.annualPremium} onChange={v => setState(s => ({ ...s, lic: { ...s.lic, annualPremium: v } }))} type="number" placeholder="0" /></Field>
              <Field label="Policy type">
                <EditSelect value={state.lic.licType} onChange={v => setState(s => ({ ...s, lic: { ...s.lic, licType: v } }))}
                  options={[{ value: "term", label: "Term" }, { value: "endowment", label: "Endowment" }, { value: "ulip", label: "ULIP" }, { value: "money_back", label: "Money back" }]} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionTitle>Monthly investments</SectionTitle>

        <SipSection
          rows={state.sips}
          onRowsChange={rows => setState(s => ({ ...s, sips: rows }))}
        />

        <SubSectionTitle>Direct stock investments (monthly)</SubSectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="US stock monthly investment (₹)">
            <EditInput value={state.usMonthly} onChange={v => setState(s => ({ ...s, usMonthly: v }))} type="number" placeholder="0" />
          </Field>
          <Field label="Indian stock monthly investment (₹)">
            <EditInput value={state.indianMonthly} onChange={v => setState(s => ({ ...s, indianMonthly: v }))} type="number" placeholder="0" />
          </Field>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Goals</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Post-retirement monthly expense (₹)">
            <EditInput value={state.profile.fire_monthly_expense} onChange={v => setState(s => ({ ...s, profile: { ...s.profile, fire_monthly_expense: v } }))} type="number" placeholder="80000" />
          </Field>
          <Field label="Risk appetite (1–10)">
            <EditInput value={state.profile.risk_score} onChange={v => setState(s => ({ ...s, profile: { ...s.profile, risk_score: v } }))} type="number" placeholder="5" />
          </Field>
        </div>
      </div>
    </div>
  );
}
