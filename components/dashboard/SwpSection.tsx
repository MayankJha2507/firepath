"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatINR } from "@/lib/fire-calculator";
import type { SWPResult } from "@/lib/swp-calculator";

interface Props {
  swp: SWPResult;
  fireMonthlyExpenseToday: number;
  inflationRate: number;
}

export default function SwpSection({ swp, fireMonthlyExpenseToday, inflationRate }: Props) {
  const { isSustainable, lastsUntilAge, monthlyWithdrawalAtRetirement, corpusAtRetirement, rows, retirementAge, yearsLasted } = swp;

  const isWarning = !isSustainable && typeof lastsUntilAge === "number" && lastsUntilAge >= 80;
  const isDanger = !isSustainable && !isWarning;

  const verdictBg = isSustainable
    ? "rgba(74,222,128,0.10)" : isWarning
    ? "rgba(251,191,36,0.10)"
    : "rgba(239,68,68,0.10)";
  const verdictBorder = isSustainable
    ? "rgba(74,222,128,0.30)" : isWarning
    ? "rgba(251,191,36,0.30)"
    : "rgba(239,68,68,0.30)";
  const verdictColor = isSustainable
    ? "var(--success)" : isWarning
    ? "var(--warning)"
    : "var(--danger)";

  const chartColor = isSustainable ? "#4ADE80" : "#F97316";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Retirement withdrawal plan (SWP)
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          After you retire at {retirementAge}, can your corpus sustain inflation-adjusted withdrawals through age 90?
        </div>
      </div>

      {/* Verdict banner */}
      <div
        className="mx-6 mb-4 p-4 rounded-xl"
        style={{ background: verdictBg, border: `1px solid ${verdictBorder}` }}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl flex-shrink-0">
            {isSustainable ? "✓" : isWarning ? "⚠️" : "🚨"}
          </div>
          <div className="flex-1">
            {isSustainable ? (
              <>
                <div className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                  Sustainable — corpus lasts beyond age 90
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Your projected corpus of {formatINR(corpusAtRetirement)} at age {retirementAge} comfortably
                  supports {formatINR(monthlyWithdrawalAtRetirement)}/month (inflation-adjusted) for life.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold" style={{ color: verdictColor }}>
                  Corpus exhausts at age {lastsUntilAge} — {yearsLasted} years after retirement
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Your FIRE target is undersized for sustainable withdrawals. You need either a larger corpus,
                  lower retirement expense, or a later retirement age.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Three stats */}
      <div className="mx-6 grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
            Corpus at age {retirementAge}
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatINR(corpusAtRetirement)}
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
            First-year monthly withdrawal
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {formatINR(monthlyWithdrawalAtRetirement)}/mo
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            today&apos;s {formatINR(fireMonthlyExpenseToday)} inflated
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
            Post-retirement growth
          </div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>8% / year</div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>conservative 60/40 mix</div>
        </div>
      </div>

      {/* Depletion chart */}
      <div className="mx-6 h-44 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="swpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.30} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="corpusEnd"
              stroke={chartColor}
              fill="url(#swpGrad)"
              strokeWidth={2}
              dot={false}
            />
            <XAxis
              dataKey="age"
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickFormatter={v => formatINR(v)}
              width={64}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
              formatter={(v: number) => [formatINR(v), "Corpus"]}
              labelFormatter={(label) => `Age ${label}`}
            />
            <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="3 3" />
            <ReferenceLine
              x={90}
              stroke="var(--text-secondary)"
              strokeDasharray="4 4"
              label={{ value: "Age 90", fill: "var(--text-secondary)", fontSize: 10, position: "insideTopRight" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="px-6 py-2.5 flex justify-between items-center text-xs"
          style={{ background: "var(--bg-secondary)" }}
        >
          <span className="font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Year by year withdrawal
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            Withdrawals grow {(inflationRate * 100).toFixed(1)}%/yr · Corpus grows 8%/yr
          </span>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
          <table className="w-full text-xs">
            <thead
              className="sticky top-0 z-10"
              style={{ background: "var(--bg-secondary)" }}
            >
              <tr>
                {["Age", "Yr", "Corpus start", "Annual withdrawal", "Monthly", "Growth (8%)", "Corpus end"].map(col => (
                  <th
                    key={col}
                    className="text-left px-4 py-2.5 font-medium whitespace-nowrap"
                    style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    background: row.isExhausted
                      ? "rgba(239,68,68,0.06)"
                      : row.age === 90
                      ? "rgba(74,222,128,0.06)"
                      : i % 2 === 0
                      ? "var(--bg-card)"
                      : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td className="px-4 py-2 font-medium" style={{ color: "var(--text-primary)" }}>
                    {row.age}
                    {row.age === retirementAge && (
                      <span className="ml-1 text-[10px]" style={{ color: "var(--orange)" }}>← retire</span>
                    )}
                    {row.age === 90 && !row.isExhausted && (
                      <span className="ml-1 text-[10px]" style={{ color: "var(--success)" }}>✓</span>
                    )}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>+{row.year}</td>
                  <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>{formatINR(row.corpusStart)}</td>
                  <td className="px-4 py-2" style={{ color: "var(--danger)" }}>−{formatINR(row.annualWithdrawal)}</td>
                  <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>{formatINR(row.monthlyWithdrawal)}/mo</td>
                  <td className="px-4 py-2" style={{ color: "var(--success)" }}>+{formatINR(row.growth)}</td>
                  <td
                    className="px-4 py-2 font-semibold"
                    style={{ color: row.isExhausted ? "var(--danger)" : "var(--text-primary)" }}
                  >
                    {row.isExhausted ? "₹0 ⚠️" : formatINR(row.corpusEnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        Conservative 60/40 portfolio assumed post-retirement (8% nominal return). Real returns may vary — keep a 6–12 month cash buffer.
      </div>

      {/* Unsustainable callout */}
      {!isSustainable && typeof lastsUntilAge === "number" && (
        <div
          className="mx-6 mb-6 p-4 rounded-xl"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.20)" }}
        >
          <div className="text-xs font-medium mb-2" style={{ color: "var(--warning)" }}>What this means</div>
          <div className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>
            Your projected corpus of {formatINR(corpusAtRetirement)} is insufficient for sustainable withdrawals.
          </div>
          <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
            <div>• Build a larger corpus before retiring (work {Math.ceil((90 - lastsUntilAge) / 2)} more years)</div>
            <div>• Reduce post-retirement expenses to {formatINR(monthlyWithdrawalAtRetirement * 0.75)}/month</div>
            <div>• Delay retirement to age {retirementAge + 5} to grow corpus further</div>
          </div>
        </div>
      )}
    </div>
  );
}
