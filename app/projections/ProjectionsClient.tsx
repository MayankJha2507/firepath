"use client";

import { useState, useMemo } from "react";
import {
  formatINR,
  epfBreakdown, npsBreakdown, ppfBreakdown,
  equityBreakdown, goldBreakdown,
} from "@/lib/fire-calculator";
import { Assumptions, DEFAULT_ASSUMPTIONS } from "@/lib/assumptions";
import AssetProjectionCard from "@/components/projections/AssetProjectionCard";
import ThreeScenarioCard from "@/components/projections/ThreeScenarioCard";

interface Props {
  profile: {
    age: number;
    fire_target_age: number;
    fire_monthly_expense: number | null;
    monthly_expense: number | null;
  };
  holdings: Array<{
    category: string;
    name: string;
    value_inr: number;
    monthly_contribution?: number;
    notes?: string;
  }>;
}

const FIELDS: Array<{ label: string; key: keyof Assumptions }> = [
  { label: "Equity CAGR",  key: "equityCagr" },
  { label: "EPF rate",     key: "epfRate" },
  { label: "NPS CAGR",     key: "npsCagr" },
  { label: "PPF rate",     key: "ppfRate" },
  { label: "Inflation",    key: "inflation" },
  { label: "Gold CAGR",    key: "goldCagr" },
];

function sum(arr: any[], field: string) {
  return arr.reduce((s, h) => s + (h[field] || 0), 0);
}

export default function ProjectionsClient({ profile, holdings }: Props) {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const currentAge   = profile.age ?? 30;
  const retireAge    = profile.fire_target_age ?? 45;
  const yearsToFire  = Math.max(1, retireAge - currentAge);

  // Group holdings by category
  const epfHoldings  = holdings.filter(h => h.category === "epf");
  const npsHoldings  = holdings.filter(h => h.category === "nps");
  const ppfHoldings  = holdings.filter(h => h.category === "ppf");
  const mfHoldings   = holdings.filter(h => h.category === "mf");
  const indHoldings  = holdings.filter(h => h.category === "indian_stock");
  const usHoldings   = holdings.filter(h => h.category === "us_stock");
  const goldHoldings = holdings.filter(h => h.category === "gold");

  const epfValue  = sum(epfHoldings,  "value_inr");
  const npsValue  = sum(npsHoldings,  "value_inr");
  const ppfValue  = sum(ppfHoldings,  "value_inr");
  const mfValue   = sum(mfHoldings,   "value_inr");
  const indValue  = sum(indHoldings,  "value_inr");
  const usValue   = sum(usHoldings,   "value_inr");
  const goldValue = sum(goldHoldings, "value_inr");

  const epfMonthly  = sum(epfHoldings,  "monthly_contribution");
  const npsMonthly  = sum(npsHoldings,  "monthly_contribution");
  const ppfMonthly  = sum(ppfHoldings,  "monthly_contribution");
  const mfMonthly   = sum(mfHoldings,   "monthly_contribution");
  const indMonthly  = sum(indHoldings,  "monthly_contribution");
  const usMonthly   = sum(usHoldings,   "monthly_contribution");

  // PPF years to maturity — try notes, else use time to retirement (max 15)
  const ppfNote = ppfHoldings[0]?.notes ?? "";
  const ppfYearsToMaturity = parseInt(ppfNote.match(/(\d+)\s*(?:years?|yr)/i)?.[1] ?? "") || Math.min(15, yearsToFire);

  // Calculations — recompute when assumptions change
  const epfData = useMemo(
    () => epfBreakdown(epfValue, epfMonthly, 0, currentAge, retireAge, assumptions.epfRate / 100),
    [epfValue, epfMonthly, currentAge, retireAge, assumptions.epfRate]
  );

  const npsData = useMemo(
    () => npsBreakdown(npsValue, npsMonthly, currentAge, retireAge, assumptions.npsCagr / 100),
    [npsValue, npsMonthly, currentAge, retireAge, assumptions.npsCagr]
  );

  const ppfData = useMemo(
    () => ppfBreakdown(ppfValue, ppfMonthly, currentAge, ppfYearsToMaturity, assumptions.ppfRate / 100),
    [ppfValue, ppfMonthly, currentAge, ppfYearsToMaturity, assumptions.ppfRate]
  );

  const mfData   = useMemo(() => equityBreakdown(mfValue,   mfMonthly,  currentAge, retireAge), [mfValue,   mfMonthly,  currentAge, retireAge]);
  const indData  = useMemo(() => equityBreakdown(indValue,  indMonthly, currentAge, retireAge), [indValue,  indMonthly, currentAge, retireAge]);
  const usData   = useMemo(() => equityBreakdown(usValue,   usMonthly,  currentAge, retireAge), [usValue,   usMonthly,  currentAge, retireAge]);

  const goldData = useMemo(
    () => goldBreakdown(goldValue, currentAge, retireAge, assumptions.goldCagr / 100),
    [goldValue, currentAge, retireAge, assumptions.goldCagr]
  );

  // Summary table rows
  const summaryRows = [
    epfValue > 0  && { label: "EPF",          note: "(accessible at retirement)", today: epfValue,  atRetirement: epfData.totalAtRetirement, multiple: epfData.growthMultiple,    locked: false },
    npsValue > 0  && { label: "NPS",          note: "(locked until age 60)",       today: npsValue,  atRetirement: npsData.atRetirement,      multiple: npsValue > 0 ? npsData.atRetirement / npsValue : 0, locked: true },
    ppfValue > 0  && { label: "PPF",          note: `(matures ${ppfData.maturityYear})`, today: ppfValue, atRetirement: ppfData.atMaturity, multiple: ppfData.growthMultiple,    locked: false },
    mfValue > 0   && { label: "Mutual funds", note: "(12% base)",                  today: mfValue,   atRetirement: mfData.base,               multiple: mfData.growthMultipleBase, locked: false },
    indValue > 0  && { label: "Indian stocks",note: "(12% base)",                  today: indValue,  atRetirement: indData.base,              multiple: indData.growthMultipleBase, locked: false },
    usValue > 0   && { label: "US stocks",    note: "(12% base)",                  today: usValue,   atRetirement: usData.base,               multiple: usData.growthMultipleBase,  locked: false },
    goldValue > 0 && { label: "Gold",         note: `(${assumptions.goldCagr}% CAGR)`, today: goldValue, atRetirement: goldData.atRetirement, multiple: goldData.growthMultiple,   locked: false },
  ].filter(Boolean) as Array<{ label: string; note: string; today: number; atRetirement: number; multiple: number; locked: boolean }>;

  const totalToday         = summaryRows.reduce((s, r) => s + r.today, 0);
  const totalAtRetirement  = summaryRows.reduce((s, r) => s + r.atRetirement, 0);
  const accessibleAtRetirement = summaryRows.filter(r => !r.locked).reduce((s, r) => s + r.atRetirement, 0);
  const lockedTillLater    = summaryRows.filter(r => r.locked).reduce((s, r) => s + r.atRetirement, 0);

  const isDefault = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  return (
    <div className="space-y-6">
      {/* Assumptions panel */}
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
              <button
                onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
                className="text-xs hover:opacity-80"
                style={{ color: "var(--orange)" }}
              >
                Reset
              </button>
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
                      onBlur={e => (e.target.style.borderColor = "var(--border)")}
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

      {/* EPF card */}
      {epfValue > 0 && (
        <AssetProjectionCard
          title="EPF — Employee Provident Fund"
          subtitle={`Accessible at retirement age ${retireAge}`}
          valueAtRetirement={epfData.totalAtRetirement}
          currentValue={epfData.currentBalance}
          growthMultiple={epfData.growthMultiple}
          investedTotal={epfData.yourFutureContributions}
          returnsEarned={epfData.interestEarned}
          breakdownItems={[
            { label: "Current balance",     value: epfData.currentBalance,            color: "var(--text-primary)" },
            { label: "Your contributions",  value: epfData.yourFutureContributions,   color: "var(--text-primary)" },
            { label: "Interest earned",     value: epfData.interestEarned,            color: "var(--success)" },
          ]}
          chartData={epfData.yearByYear}
          chartColor="var(--accent)"
        />
      )}

      {/* NPS card */}
      {npsValue > 0 && (
        <AssetProjectionCard
          title="NPS — National Pension System"
          subtitle={`Locked until age 60 — ${Math.max(0, 60 - retireAge)} years after retirement`}
          valueAtRetirement={npsData.atRetirement}
          currentValue={npsValue}
          growthMultiple={npsValue > 0 ? npsData.atRetirement / npsValue : 0}
          investedTotal={npsData.futureContributions}
          returnsEarned={npsData.returnsEarned}
          breakdownItems={[
            { label: "At retirement",      value: npsData.atRetirement,       color: "var(--text-primary)" },
            { label: "Contributions",      value: npsData.futureContributions, color: "var(--text-primary)" },
            { label: "Returns earned",     value: npsData.returnsEarned,       color: "var(--success)" },
          ]}
          chartData={npsData.yearByYear}
          chartColor="#8B5CF6"
        >
          {/* NPS Phase 2 — compounding after retirement to age 60 */}
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
              You don&apos;t need to fund NPS after retirement — {formatINR(npsData.atRetirement)} keeps compounding
              untouched until age 60.
            </p>
          </div>
        </AssetProjectionCard>
      )}

      {/* PPF card */}
      {ppfValue > 0 && (
        <AssetProjectionCard
          title="PPF — Public Provident Fund"
          subtitle={`Matures in ${ppfYearsToMaturity} years — ${ppfData.maturityYear}`}
          valueAtRetirement={ppfData.atMaturity}
          currentValue={ppfValue}
          growthMultiple={ppfData.growthMultiple}
          investedTotal={ppfData.yourContributions}
          returnsEarned={ppfData.interestEarned}
          breakdownItems={[
            { label: "Current balance",  value: ppfValue,                 color: "var(--text-primary)" },
            { label: "Contributions",    value: ppfData.yourContributions, color: "var(--text-primary)" },
            { label: "Interest earned",  value: ppfData.interestEarned,   color: "var(--success)" },
          ]}
          chartData={ppfData.yearByYear}
          chartColor="var(--success)"
        />
      )}

      {/* Mutual funds — three scenarios */}
      {mfValue > 0 && (
        <ThreeScenarioCard
          title="Mutual Funds"
          subtitle="SIP + lump sum across all funds"
          conservative={mfData.conservative}
          base={mfData.base}
          optimistic={mfData.optimistic}
          currentValue={mfValue}
          contributions={mfData.contributions}
          yearByYear={mfData.yearByYear}
        />
      )}

      {/* Indian stocks — three scenarios */}
      {indValue > 0 && (
        <ThreeScenarioCard
          title="Indian Stocks"
          subtitle="Direct equity portfolio"
          conservative={indData.conservative}
          base={indData.base}
          optimistic={indData.optimistic}
          currentValue={indValue}
          contributions={indData.contributions}
          yearByYear={indData.yearByYear}
        />
      )}

      {/* US stocks — three scenarios */}
      {usValue > 0 && (
        <ThreeScenarioCard
          title="US Stocks"
          subtitle="International equity exposure"
          conservative={usData.conservative}
          base={usData.base}
          optimistic={usData.optimistic}
          currentValue={usValue}
          contributions={usData.contributions}
          yearByYear={usData.yearByYear}
        />
      )}

      {/* Gold card */}
      {goldValue > 0 && (
        <AssetProjectionCard
          title="Gold"
          subtitle={`Physical gold — ${assumptions.goldCagr}% CAGR assumption`}
          valueAtRetirement={goldData.atRetirement}
          currentValue={goldValue}
          growthMultiple={goldData.growthMultiple}
          investedTotal={0}
          returnsEarned={goldData.returnsEarned}
          breakdownItems={[
            { label: "Current value", value: goldValue,              color: "var(--text-primary)" },
            { label: "Returns",       value: goldData.returnsEarned, color: "var(--success)" },
          ]}
          chartData={goldData.yearByYear}
          chartColor="#F59E0B"
        />
      )}

      {/* Empty state */}
      {summaryRows.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No holdings found. Add your investments in Portfolio to see projections.
          </p>
        </div>
      )}

      {/* Summary table */}
      {summaryRows.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="text-base font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
            Total projected wealth at retirement
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                  {["Asset", "Today", "At retirement", "Growth"].map((h, i) => (
                    <th
                      key={h}
                      className={`text-xs font-medium uppercase tracking-wider px-4 py-3 ${i === 0 ? "text-left" : "text-right"}`}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr key={row.label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {row.label}
                      {row.note && (
                        <span className="text-xs ml-1.5" style={{ color: "var(--text-secondary)" }}>{row.note}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                      {formatINR(row.today)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatINR(row.atRetirement)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--success)" }}>
                      {row.multiple.toFixed(1)}x
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>Total</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {formatINR(totalToday)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatINR(totalAtRetirement)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--success)" }}>
                    {totalToday > 0 ? (totalAtRetirement / totalToday).toFixed(1) : "—"}x
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 pt-3 pb-1">
                    <div className="flex flex-wrap gap-6 text-xs">
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>
                          Accessible at retirement (age {retireAge}):
                        </span>
                        <span className="font-semibold ml-1.5" style={{ color: "var(--success)" }}>
                          {formatINR(accessibleAtRetirement)}
                        </span>
                      </div>
                      {lockedTillLater > 0 && (
                        <div>
                          <span style={{ color: "var(--text-secondary)" }}>Locked till later:</span>
                          <span className="font-semibold ml-1.5" style={{ color: "var(--text-primary)" }}>
                            {formatINR(lockedTillLater)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>
            All projections use base case rates. Equity at {assumptions.equityCagr}%,
            EPF at {assumptions.epfRate}%, NPS at {assumptions.npsCagr}%,
            PPF at {assumptions.ppfRate}%, Gold at {assumptions.goldCagr}%.
            Adjust rates using the Assumptions panel above.
          </p>
        </div>
      )}
    </div>
  );
}
