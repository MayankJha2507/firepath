"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

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

function crFmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v / 1000)}K`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 mb-1.5">Age {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{crFmt(p.value)}</span>
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
            <stop offset="5%"  stopColor="#F97316" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false} axisLine={false}
        />
        <YAxis
          tickFormatter={crFmt}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false} axisLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(v) => <span className="text-slate-600">{v}</span>}
        />
        {fireAge && (
          <ReferenceLine
            x={fireAge}
            stroke="#10B981"
            strokeDasharray="4 3"
            label={{ value: "FIRE 🎯", position: "top", fontSize: 11, fill: "#10B981" }}
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
          stroke="#F97316"
          strokeWidth={2.5}
          fill="url(#corpusGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#F97316" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
