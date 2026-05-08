"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  equity: number;
  debt: number;
  gold: number;
  cash: number;
}

const SLICES = [
  { key: "equity", label: "Equity",   color: "#3B82F6" },
  { key: "debt",   label: "Debt",     color: "#8B5CF6" },
  { key: "gold",   label: "Gold",     color: "#F59E0B" },
  { key: "cash",   label: "Cash / FD",color: "#10B981" },
];

export default function AllocationDonut({ equity, debt, gold, cash }: Props) {
  const data = [
    { name: "Equity",    value: +equity.toFixed(1), color: "#3B82F6" },
    { name: "Debt",      value: +debt.toFixed(1),   color: "#8B5CF6" },
    { name: "Gold",      value: +gold.toFixed(1),   color: "#F59E0B" },
    { name: "Cash / FD", value: +cash.toFixed(1),   color: "#10B981" },
  ].filter(d => d.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="w-44 h-44 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={48} outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v}%`, ""]}
              contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2.5">
        {SLICES.map(s => {
          const val = { equity, debt, gold, cash }[s.key as keyof Props] ?? 0;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-slate-500 flex-1">{s.label}</span>
              <span className="text-xs font-semibold text-slate-800">{val.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
