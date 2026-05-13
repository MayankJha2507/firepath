"use client";

import { useState, useMemo } from "react";
import { yearByYearProjection } from "@/lib/fire-calculator";
import { Assumptions, DEFAULT_ASSUMPTIONS } from "@/lib/assumptions";
import type { DataQuality } from "@/components/ui/DataQualityBadge";
import DataQualityBadge from "@/components/ui/DataQualityBadge";
import ProjectionChart from "./ProjectionChart";

interface Props {
  liquidCorpus: number;
  monthlySIP: number;
  yearsWindow: number;
  fireTarget: number;
  startAge: number;
  projectedFireAge: number | null;
  corpusQuality?: DataQuality;
  showQuality?: boolean;
}

const FIELDS: Array<{ label: string; key: keyof Assumptions }> = [
  { label: "Equity CAGR",  key: "equityCagr" },
  { label: "EPF rate",     key: "epfRate" },
  { label: "NPS CAGR",     key: "npsCagr" },
  { label: "PPF rate",     key: "ppfRate" },
  { label: "Inflation",    key: "inflation" },
  { label: "Gold CAGR",    key: "goldCagr" },
];

export default function ProjectionCard({
  liquidCorpus, monthlySIP, yearsWindow, fireTarget,
  startAge, projectedFireAge, corpusQuality, showQuality,
}: Props) {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const projData = useMemo(() =>
    yearByYearProjection(
      liquidCorpus, monthlySIP, yearsWindow, fireTarget,
      assumptions.equityCagr / 100, startAge
    ),
    [liquidCorpus, monthlySIP, yearsWindow, fireTarget, assumptions.equityCagr, startAge]
  );

  const isDefault = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="section-title">Corpus projection</div>
          {showQuality && corpusQuality && (
            <DataQualityBadge quality={corpusQuality} linkTo="/portfolio" />
          )}
        </div>
        <button
          onClick={() => setShowAssumptions(p => !p)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: showAssumptions ? "var(--orange)" : "var(--text-secondary)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Assumptions
        </button>
      </div>

      {/* Assumptions panel */}
      {showAssumptions && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
            {FIELDS.map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  {label}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={assumptions[key]}
                    onChange={e => setAssumptions(prev => ({
                      ...prev,
                      [key]: parseFloat(e.target.value) || 0,
                    }))}
                    step="0.5"
                    min="1"
                    max="30"
                    className="w-16 px-2 py-1.5 rounded-lg text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--orange)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Recalculates your projection in real time
            </span>
            <button
              onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
              className="text-xs hover:opacity-80"
              style={{ color: "var(--orange)" }}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <ProjectionChart data={projData} fireAge={projectedFireAge ?? undefined} />

      {/* Permanent summary bar */}
      <div className="mt-3 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
        Equity {assumptions.equityCagr}% · Inflation {assumptions.inflation}% · EPF {assumptions.epfRate}% · NPS {assumptions.npsCagr}%
        {!isDefault && (
          <button
            onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}
            className="ml-2 hover:opacity-80"
            style={{ color: "var(--orange)" }}
          >
            (reset)
          </button>
        )}
      </div>
    </div>
  );
}
