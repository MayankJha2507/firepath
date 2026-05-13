"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { formatINR, ThreeScenario } from "@/lib/fire-calculator";

interface Props {
  title: string;
  subtitle: string;
  conservative: number;
  base: number;
  optimistic: number;
  currentValue: number;
  contributions: number;
  yearByYear: ThreeScenario[];
}

function crFmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v / 1000)}K`;
}

export default function ThreeScenarioCard({
  title, subtitle, conservative, base, optimistic,
  currentValue, contributions, yearByYear,
}: Props) {
  const scenarios = [
    { label: "Conservative", value: conservative, rate: "10%", color: "var(--text-secondary)" },
    { label: "Base case",    value: base,          rate: "12%", color: "var(--orange)" },
    { label: "Optimistic",   value: optimistic,    rate: "15%", color: "var(--success)" },
  ];

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Title */}
      <div className="mb-5">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
      </div>

      {/* Three scenario columns */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {scenarios.map(s => (
          <div
            key={s.label}
            className="rounded-xl p-4 text-center"
            style={{ background: "var(--bg-secondary)" }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
            <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{s.rate} CAGR</div>
            <div className="text-base font-semibold" style={{ color: s.color }}>
              {formatINR(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Invested vs today */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Current value</div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatINR(currentValue)}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-secondary)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Future contributions</div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatINR(contributions)}</div>
        </div>
      </div>

      {/* Three-line chart */}
      {yearByYear.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={yearByYear} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="age" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={crFmt}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={false} axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                color: "var(--text-primary)",
              }}
              formatter={(v: number, name: string) => [crFmt(v), name]}
              labelFormatter={l => `Age ${l}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={v => <span style={{ color: "var(--text-secondary)" }}>{v}</span>}
            />
            <Line dataKey="conservative" name="Conservative" stroke="var(--text-secondary)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            <Line dataKey="base"         name="Base (12%)"    stroke="var(--orange)"         dot={false} strokeWidth={2} />
            <Line dataKey="optimistic"   name="Optimistic"    stroke="var(--success)"        strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
