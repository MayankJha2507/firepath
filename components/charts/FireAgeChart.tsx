"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ date: string; fire_age: number }>;
}

export default function FireAgeChart({ data }: Props) {
  const min = Math.min(...data.map(d => d.fire_age)) - 2;
  const max = Math.max(...data.map(d => d.fire_age)) + 2;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          formatter={(v: number) => [`Age ${v.toFixed(1)}`, "Projected FIRE age"]}
          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
        />
        <Line
          type="monotone" dataKey="fire_age" name="Projected FIRE age"
          stroke="#10B981" strokeWidth={2.5}
          dot={{ r: 4, fill: "#10B981" }} activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
