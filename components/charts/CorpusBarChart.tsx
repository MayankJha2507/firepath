"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatINR } from "@/lib/fire-calculator";

interface Props {
  liquidNow: number;
  lockedNow: number;
  liquidAtRetirement: number;
  lockedAtRetirement: number;
}


export default function CorpusBarChart({ liquidNow, lockedNow, liquidAtRetirement, lockedAtRetirement }: Props) {
  const data = [
    { label: "Today",       liquid: Math.round(liquidNow),           locked: Math.round(lockedNow) },
    { label: "At retirement", liquid: Math.round(liquidAtRetirement), locked: Math.round(lockedAtRetirement) },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={formatINR} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={52} />
        <Tooltip
          formatter={(v: number, name: string) => [formatINR(v), name]}
          contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="liquid" name="Liquid" fill="#F97316" radius={[6, 6, 0, 0]} />
        <Bar dataKey="locked" name="Locked" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
