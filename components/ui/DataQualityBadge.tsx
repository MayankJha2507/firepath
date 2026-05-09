export type DataQuality = "exact" | "estimated" | "missing";

const CONFIG: Record<DataQuality, { dot: string; text: string; label: string }> = {
  exact:     { dot: "bg-emerald-400", text: "text-emerald-600", label: "Exact" },
  estimated: { dot: "bg-amber-400",   text: "text-amber-600",   label: "Est." },
  missing:   { dot: "bg-slate-300",   text: "text-slate-400",   label: "Add" },
};

export default function DataQualityBadge({
  quality,
  linkTo,
}: {
  quality: DataQuality;
  linkTo?: string;
}) {
  const c = CONFIG[quality];
  const inner = (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
  if (linkTo) {
    return (
      <a href={linkTo} className="hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}

export function computeCompleteness(dc: Record<string, string>): number {
  const keys = Object.keys(dc);
  if (keys.length === 0) return 0;
  return Math.round((keys.filter(k => dc[k] === "exact").length / keys.length) * 100);
}

export function countMissing(dc: Record<string, string>): number {
  return Object.values(dc).filter(v => v === "estimated" || v === "missing").length;
}
