"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Analysis {
  health_score: number;
  headline: string;
  strengths: string[];
  concerns: string[];
  allocation_commentary: string;
  fire_feasibility: {
    verdict: "on_track" | "close" | "needs_work";
    commentary: string;
    gap_amount: number | null;
    key_lever: string;
  };
  stock_quality: {
    quality_names: string[];
    noise_names: string[];
    over_diversified: boolean;
    commentary: string;
  };
  action_items: Array<{ priority: "high" | "medium" | "low"; action: string; impact: string }>;
  locked_corpus_note: string;
  disclaimer: string;
}

interface Props {
  latestSnapshot: { id: string; snapshot_date: string } | null;
}

const VERDICT_CONFIG = {
  on_track:   { label: "On track 🎯",   cls: "badge-green" },
  close:      { label: "Close 📊",      cls: "badge-amber" },
  needs_work: { label: "Needs work ⚠️", cls: "badge-red"   },
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   cls: "badge-red",   icon: "🔴" },
  medium: { label: "Medium", cls: "badge-amber",  icon: "🟡" },
  low:    { label: "Low",    cls: "badge-green",  icon: "🟢" },
};

function scoreColor(s: number) {
  if (s >= 71) return { ring: "ring-emerald-400", text: "text-emerald-400", bg: "rgba(74,222,128,0.10)" };
  if (s >= 41) return { ring: "ring-amber-400",   text: "text-amber-400",   bg: "rgba(251,191,36,0.10)" };
  return           { ring: "ring-red-400",         text: "text-red-400",     bg: "rgba(239,68,68,0.10)"  };
}

export default function AnalysisClient({ latestSnapshot }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  async function fetchAnalysis(): Promise<Analysis | null> {
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) return null;
      if (json.quota_exceeded) setQuotaExceeded(true);
      return json.analysis ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!analysis && latestSnapshot) {
      // Immediate first fetch
      fetchAnalysis().then(result => { if (result) setAnalysis(result); });

      let timeout: ReturnType<typeof setTimeout>;

      const interval = setInterval(async () => {
        try {
          const result = await fetchAnalysis();
          if (result) {
            setAnalysis(result);
            clearInterval(interval);
            clearTimeout(timeout);
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);

      timeout = setTimeout(() => {
        clearInterval(interval);
        setError(
          "Analysis is taking longer than expected. " +
          "Edit and save your portfolio to retry."
        );
      }, 60000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [analysis, latestSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // State 1 — no portfolio yet
  if (!latestSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Add your portfolio first
        </p>
        <Link
          href="/portfolio"
          className="text-sm font-medium"
          style={{ color: "var(--orange)" }}
        >
          Set up portfolio →
        </Link>
      </div>
    );
  }

  // State 2 — analysis generating (show spinner + poll)
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--orange)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Analysing your portfolio...
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Usually takes 5–10 seconds
        </p>
        {error && (
          <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
        )}
      </div>
    );
  }

  // State 3 — analysis ready
  const sc = scoreColor(analysis.health_score);
  const vc = VERDICT_CONFIG[analysis.fire_feasibility.verdict];
  const snapshotDate = new Date(latestSnapshot.snapshot_date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="space-y-4">
      {quotaExceeded && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <span className="text-amber-400 flex-shrink-0">⚠️</span>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            <strong>Groq API quota exceeded</strong>{" "}
            <span style={{ color: "var(--text-secondary)" }}>— showing a sample analysis. Check your GROQ_API_KEY in environment variables.</span>
          </p>
        </div>
      )}

      {/* Score + headline */}
      <div className="card flex items-start gap-6">
        <div
          className={`w-20 h-20 rounded-full ring-4 ${sc.ring} flex flex-col items-center justify-center flex-shrink-0`}
          style={{ background: sc.bg }}
        >
          <span className={`text-2xl font-bold ${sc.text}`}>{analysis.health_score}</span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>/100</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg leading-snug" style={{ color: "var(--text-primary)" }}>{analysis.headline}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={vc.cls}>{vc.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Reflects your {snapshotDate} portfolio
            </span>
            <Link
              href="/portfolio"
              className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: "var(--orange)" }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit portfolio to refresh
            </Link>
          </div>
        </div>
      </div>

      {/* Strengths + Concerns */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="section-title mb-3">Strengths</div>
          <ul className="space-y-2.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="section-title mb-3">Concerns</div>
          <ul className="space-y-2.5">
            {analysis.concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Allocation commentary */}
      <div className="card">
        <div className="section-title mb-2">Allocation commentary</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.allocation_commentary}</p>
      </div>

      {/* FIRE feasibility */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="section-title">FIRE feasibility</div>
          <span className={vc.cls}>{vc.label}</span>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{analysis.fire_feasibility.commentary}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {analysis.fire_feasibility.gap_amount != null && analysis.fire_feasibility.gap_amount > 0 && (
            <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
              <div className="text-xs font-medium text-red-400 mb-1">Gap to close</div>
              <div className="text-lg font-bold text-red-400">
                ₹{(analysis.fire_feasibility.gap_amount / 1e7).toFixed(2)} Cr
              </div>
            </div>
          )}
          <div className="rounded-xl p-3" style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)" }}>
            <div className="text-xs font-medium text-indigo-400 mb-1">Key lever</div>
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{analysis.fire_feasibility.key_lever}</div>
          </div>
        </div>
      </div>

      {/* Stock quality */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="section-title">Stock quality</div>
          {analysis.stock_quality.over_diversified && <span className="badge-amber">Over-diversified</span>}
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{analysis.stock_quality.commentary}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {analysis.stock_quality.quality_names.length > 0 && (
            <div>
              <div className="text-xs font-medium text-emerald-400 mb-2">Strong moat</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.stock_quality.quality_names.map(n => (
                  <span key={n} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.20)", color: "#86efac" }}>{n}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.stock_quality.noise_names.length > 0 && (
            <div>
              <div className="text-xs font-medium text-amber-400 mb-2">Low conviction</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.stock_quality.noise_names.map(n => (
                  <span key={n} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.20)", color: "#fde68a" }}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action items */}
      <div className="card">
        <div className="section-title mb-3">Action items</div>
        <div className="space-y-2.5">
          {analysis.action_items.map((a, i) => {
            const pc = PRIORITY_CONFIG[a.priority];
            const isSurplus = a.action.toLowerCase().includes("surplus") ||
              a.action.toLowerCase().includes("idle cash");
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  background: isSurplus ? "rgba(251,191,36,0.06)" : "var(--bg-secondary)",
                  border: isSurplus ? "1px solid rgba(251,191,36,0.25)" : "1px solid var(--border)",
                }}
              >
                <span className="text-base mt-0.5 flex-shrink-0">{pc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{a.action}</span>
                    <span className={pc.cls}>{pc.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{a.impact}</p>
                  {isSurplus && (
                    <Link
                      href="/portfolio"
                      className="inline-flex items-center gap-1 text-xs mt-2 hover:opacity-80"
                      style={{ color: "var(--orange)" }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add new SIP to invest your surplus
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Locked corpus note */}
      <div className="card" style={{ background: "rgba(124,95,245,0.08)", border: "1px solid rgba(124,95,245,0.20)" }}>
        <div className="section-title mb-2" style={{ color: "#a78bfa" }}>Locked corpus — when it unlocks</div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.locked_corpus_note}</p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>⚖️ Disclaimer</div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.disclaimer}</p>
      </div>
    </div>
  );
}
