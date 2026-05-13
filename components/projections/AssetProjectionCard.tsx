"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import { formatINR, YearlyValue } from "@/lib/fire-calculator";

interface BreakdownItem {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  subtitle: string;
  valueAtRetirement: number;
  currentValue: number;
  growthMultiple: number;
  investedTotal: number;
  returnsEarned: number;
  breakdownItems: BreakdownItem[];
  chartData: YearlyValue[];
  chartColor?: string;
  children?: React.ReactNode;
}

function crFmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v / 1000)}K`;
}

export default function AssetProjectionCard({
  title, subtitle, valueAtRetirement, currentValue, growthMultiple,
  investedTotal, returnsEarned, breakdownItems, chartData,
  chartColor = "var(--orange)", children,
}: Props) {
  const total = investedTotal + currentValue + returnsEarned;
  const investedPct = total > 0 ? Math.round(((currentValue + investedTotal) / total) * 100) : 0;
  const returnsPct = 100 - investedPct;

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {formatINR(valueAtRetirement)}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {growthMultiple > 0 ? `${growthMultiple.toFixed(1)}x growth` : "at retirement"}
          </div>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-5 flex" style={{ background: "var(--bg-secondary)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${investedPct}%`, background: "var(--accent)" }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${returnsPct}%`, background: "var(--orange)" }}
        />
      </div>
      <div className="flex gap-4 mb-5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent)" }} />
          Invested
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--orange)" }} />
          Returns
        </span>
      </div>

      {/* Stat boxes */}
      <div className={`grid gap-3 mb-5`} style={{ gridTemplateColumns: `repeat(${breakdownItems.length}, 1fr)` }}>
        {breakdownItems.map(item => (
          <div
            key={item.label}
            className="rounded-xl p-3"
            style={{ background: "var(--bg-secondary)" }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{item.label}</div>
            <div className="text-sm font-semibold" style={{ color: item.color }}>
              {formatINR(item.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Area chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="age" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={crFmt} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                color: "var(--text-primary)",
              }}
              formatter={(v: number) => [crFmt(v), "Balance"]}
              labelFormatter={l => `Age ${l}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#grad-${title.replace(/\s/g, "")})`}
              dot={false}
              activeDot={{ r: 4, fill: chartColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Slot for NPS phase 2 or other extras */}
      {children}
    </div>
  );
}
