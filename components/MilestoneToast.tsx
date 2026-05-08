"use client";

import { useEffect, useState } from "react";

interface Milestone { milestone_type: string; message: string; corpus_value: number }

const EMOJIS: Record<string, string> = {
  "1cr": "🎉", "2cr": "🎉", "5cr": "🔥", "10cr": "🚀",
  savings_rate_50: "💪", fire_date_moved: "📅",
};

export default function MilestoneToast() {
  const [toasts, setToasts] = useState<Milestone[]>([]);

  useEffect(() => {
    fetch("/api/milestones", { method: "POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.achieved?.length) setToasts(d.achieved); })
      .catch(() => {});
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm">
      {toasts.map((t, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-4"
          style={{ animationDuration: "300ms", animationDelay: `${i * 80}ms` }}
        >
          <span className="text-2xl flex-shrink-0">{EMOJIS[t.milestone_type] || "🏆"}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm text-ink">Milestone unlocked!</div>
            <div className="text-sm text-slate-600 mt-0.5">{t.message}</div>
          </div>
          <button
            onClick={() => setToasts(ts => ts.filter((_, idx) => idx !== i))}
            className="text-slate-300 hover:text-slate-500 text-lg leading-none flex-shrink-0"
          >×</button>
        </div>
      ))}
    </div>
  );
}
