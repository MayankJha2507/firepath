"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/fire-calculator";

interface DataPoint {
  year: number;
  age: number;
  corpus: number;
  target: number;
  isFireYear: boolean;
}

interface Props {
  data: DataPoint[];
  fireAge?: number;
}


const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      color: "var(--text-primary)",
      padding: "10px 12px",
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>Age {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 500 }}>{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ProjectionChart({ data, fireAge }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--orange)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--orange)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          tickLine={false} axisLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          tickLine={false} axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        {fireAge && (
          <ReferenceLine
            x={fireAge}
            stroke="var(--success)"
            strokeDasharray="4 3"
            label={{ value: "FIRE 🎯", position: "top", fontSize: 11, fill: "var(--success)" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="target"
          name="FIRE target"
          stroke="#3B82F6"
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="url(#targetGrad)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="corpus"
          name="Your trajectory"
          stroke="var(--orange)"
          strokeWidth={2.5}
          fill="url(#corpusGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "var(--orange)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
