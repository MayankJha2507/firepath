"use client";

import { Fragment } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  formatINR,
  yearsToFireFromSavingsRate,
  type FireVariant,
  type YearByYearRow,
} from "@/lib/fire-calculator";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const FIRE_VARIANT_TOOLTIPS: Record<string, string> = {
  "Lean FIRE":
    "Retire on 50% of your current expenses. Frugal lifestyle — covers basics but limited luxuries. Smallest corpus needed.",
  "FIRE":
    "Standard Financial Independence. Retire on your current monthly expenses, inflation-adjusted to your target age. Based on the 4% withdrawal rule.",
  "FAT FIRE":
    "Retire with 2× your current expenses. Comfortable lifestyle with travel, leisure, and zero financial stress. Requires the largest corpus.",
};

interface Props {
  savingsRate: number;
  currentLiquidCorpus: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyInvest: number;
  fireTarget: number;
  fireTargetAge: number;
  currentAge: number;
  projectedFireAge: number;
  fireVariants: FireVariant[];
  savingsRateChartData: { rate: number; years: number }[];
  yearByYearTableData: YearByYearRow[];
  inflationRate: number;
}

export default function DashboardHeroSections({
  savingsRate,
  currentLiquidCorpus,
  monthlyIncome,
  monthlyExpense,
  monthlyInvest,
  fireTarget,
  fireTargetAge,
  currentAge,
  projectedFireAge,
  fireVariants,
  savingsRateChartData,
  yearByYearTableData,
  inflationRate,
}: Props) {
  const yearsToFire = yearsToFireFromSavingsRate(savingsRate, currentLiquidCorpus, monthlyIncome, fireTarget, 0.12);
  const calcYearsToFire = (rate: number) =>
    yearsToFireFromSavingsRate(rate, currentLiquidCorpus, monthlyIncome, fireTarget, 0.12);

  const fireAnnualWithdrawal = fireTarget * 0.04;
  const fireMonthlyWithdrawal = fireAnnualWithdrawal / 12;

  const rateColor = savingsRate >= 50
    ? "var(--success)"
    : savingsRate >= 30
    ? "var(--warning)"
    : "var(--danger)";

  return (
    <>
      {/* Section 2 — Savings rate hero */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Left — big number */}
          <div>
            <div
              className="text-xs font-medium uppercase tracking-wider mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Your savings rate
            </div>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-bold" style={{ color: rateColor }}>
                {savingsRate.toFixed(1)}%
              </div>
              <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                of income invested
              </div>
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {savingsRate >= 50
                ? "🔥 Exceptional — top 5% of earners"
                : savingsRate >= 30
                ? "⚡ Good — above average"
                : "📈 Room to grow — aim for 30%+"}
            </div>
          </div>

          {/* Right — lever insight */}
          <div
            className="rounded-xl p-4 min-w-[240px] w-full sm:w-auto"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <div className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              Impact of increasing your savings rate
            </div>
            {[5, 10, 15].map((increase, i) => {
              const newRate = Math.min(savingsRate + increase, 95);
              const newYears = calcYearsToFire(newRate);
              const yearsSaved = yearsToFire - newYears;
              return (
                <div
                  key={increase}
                  className="flex justify-between items-center py-1.5"
                  style={i < 2 ? { borderBottom: "1px solid var(--border)" } : undefined}
                >
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    +{increase}% savings rate
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
                    {yearsSaved > 0.1
                      ? `retire ${yearsSaved.toFixed(1)}yr earlier`
                      : "already at target"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
            <span>0%</span>
            <span>25% avg</span>
            <span>50% good</span>
            <span>75% great</span>
            <span>100%</span>
          </div>
          <div className="h-3 rounded-full relative overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(savingsRate, 100)}%`, background: rateColor }}
            />
            <div className="absolute top-0 bottom-0 w-px" style={{ left: "25%", background: "var(--border)" }} />
            <div className="absolute top-0 bottom-0 w-px" style={{ left: "50%", background: "var(--border)" }} />
            <div className="absolute top-0 bottom-0 w-px" style={{ left: "75%", background: "var(--border)" }} />
          </div>
        </div>
      </div>

      {/* Section 3 — FIRE variants */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Your FIRE targets
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            All anchored at age {fireTargetAge} — corpus needed varies by lifestyle
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fireVariants.map(variant => (
            <div
              key={variant.type}
              className="rounded-xl p-4 transition-all"
              style={{
                border: variant.isCurrentTarget ? "1px solid var(--orange)" : "1px solid var(--border)",
                background: variant.isCurrentTarget ? "rgba(251,146,60,0.05)" : "var(--bg-secondary)",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold" style={{ color: variant.color }}>
                  {variant.type}
                </span>
                <InfoTooltip content={FIRE_VARIANT_TOOLTIPS[variant.type] ?? ""} />
                {variant.isCurrentTarget && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full ml-auto"
                    style={{ background: "rgba(251,146,60,0.2)", color: "var(--orange)" }}
                  >
                    your target
                  </span>
                )}
              </div>

              {/* Corpus needed */}
              <div className="text-xl font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                {formatINR(variant.corpusNeeded)}
              </div>
              <div className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                needed at age {fireTargetAge}
              </div>

              {/* Inflation transparency */}
              <div
                className="rounded-lg p-2.5 mb-3 text-xs space-y-1"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
              >
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>Today&apos;s lifestyle</span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatINR(variant.monthlyAmountToday)}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>At age {fireTargetAge}</span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatINR(variant.monthlyAmountAtRetirement)}/mo
                  </span>
                </div>
              </div>

              {/* Achievable / Gap */}
              {variant.achievableByTargetAge ? (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--success)" }}>
                  <span>✓</span>
                  <span>Achievable by age {fireTargetAge}</span>
                </div>
              ) : (
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
                    <span>⚠</span>
                    <span>Gap: {formatINR(Math.abs(variant.surplusOrGap))}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)" }}>
                    Projected at {fireTargetAge}: {formatINR(variant.projectedCorpusAtTargetAge)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4 — Savings rate vs years chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Savings rate vs years to retirement
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            You are at {savingsRate.toFixed(0)}%
          </div>
        </div>
        <div className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          The most powerful lever in early retirement isn&apos;t returns — it&apos;s how much of your income you invest
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsRateChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="rate"
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                tickFormatter={v => `${v}%`}
                interval={4}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                tickFormatter={v => `${v}yr`}
                width={32}
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
                formatter={(value: number, _name: string, props: any) => [
                  `${(value as number).toFixed(1)} years to retirement`,
                  `${props.payload.rate}% savings rate`,
                ]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="years" radius={[3, 3, 0, 0]}>
                {savingsRateChartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      Math.abs(entry.rate - savingsRate) < 2.5
                        ? "var(--orange)"
                        : entry.rate < savingsRate
                        ? "var(--text-secondary)"
                        : "var(--bg-secondary)"
                    }
                  />
                ))}
              </Bar>
              <ReferenceLine
                x={Math.round(savingsRate / 5) * 5}
                stroke="var(--orange)"
                strokeDasharray="4 4"
                label={{ value: "You", fill: "var(--orange)", fontSize: 11, position: "top" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] mt-3" style={{ color: "var(--text-secondary)" }}>
          Higher savings rates compound faster than any market return. Assumes 5% real return (after inflation) and the 4% safe withdrawal rate.
        </p>
      </div>

      {/* Section 5 — Year-by-year table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="p-6 pb-4">
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Year by year breakdown
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            FIRE when 4% of your corpus covers your inflation-adjusted annual expenses
          </div>
        </div>

        {/* Reconciliation bar */}
        <div
          className="grid grid-cols-3 gap-3 mx-6 mb-4 rounded-xl p-3"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>FIRE target</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{formatINR(fireTarget)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>inflation-adjusted corpus needed</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Annual need at retirement</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{formatINR(fireTarget * 0.04)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>4% safe withdrawal from target</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Projected FIRE age</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--orange)" }}>Age {projectedFireAge}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>when corpus reaches FIRE target</div>
          </div>
        </div>

        <div className="overflow-auto max-h-[400px]" style={{ borderTop: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10" style={{ background: "var(--bg-secondary)" }}>
              <tr>
                {["Year", "Age", "Annual investment", "Portfolio ROI", "Safe withdrawal covers needs", "Net worth change", "Net worth"].map(col => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 font-medium whitespace-nowrap"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearByYearTableData.map((row, i) => (
                <Fragment key={i}>
                  <tr
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: row.isFireYear
                        ? "rgba(74,222,128,0.12)"
                        : row.roiCoversPct >= 100
                        ? "rgba(74,222,128,0.05)"
                        : i % 2 === 0
                        ? "var(--bg-card)"
                        : "var(--bg-secondary)",
                    }}
                  >
                    <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {row.year === 0 ? "Now" : row.year}
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>
                      {row.age}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {row.year === 0 ? "—" : formatINR(row.annualInvestment)}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-secondary)" }}>
                      {row.year === 0 ? "—" : formatINR(row.portfolioROI)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.year === 0 ? (
                        <span style={{ color: "var(--text-secondary)" }}>—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(row.roiCoversPct, 100)}%`,
                                background: row.roiCoversPct >= 100 ? "var(--success)" : "var(--orange)",
                              }}
                            />
                          </div>
                          <span
                            className="font-medium"
                            style={{ color: row.roiCoversPct >= 100 ? "var(--success)" : "var(--text-primary)" }}
                          >
                            {Math.min(row.roiCoversPct, 100).toFixed(0)}%
                            {row.roiCoversPct >= 100 && " 🔥"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: row.netWorthChange >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {row.year === 0
                        ? "—"
                        : row.netWorthChange >= 0
                        ? `+${formatINR(row.netWorthChange)}`
                        : formatINR(row.netWorthChange)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatINR(row.netWorth)}
                    </td>
                  </tr>
                  {row.isFireYear && (
                    <tr style={{ background: "rgba(74,222,128,0.18)" }}>
                      <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-center" style={{ color: "var(--success)" }}>
                        🔥 FIRE achieved — at age {row.age}, 4% of your {formatINR(row.netWorth)} corpus ({formatINR(row.netWorth * 0.04)}/yr) covers your retirement need of {formatINR(row.fireAnnualNeed)}/yr
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="px-4 py-3 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          FIRE achieved when 4% of your corpus covers your inflation-adjusted annual expenses. Corpus grows at 12% annually; only your actual monthly investment compounds.
        </div>
      </div>
    </>
  );
}
