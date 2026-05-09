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
  if (s >= 71) return { ring: "ring-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" };
  if (s >= 41) return { ring: "ring-amber-400",   text: "text-amber-600",   bg: "bg-amber-50"   };
  return           { ring: "ring-red-400",         text: "text-red-600",     bg: "bg-red-50"     };
}

export default function AnalysisClient() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [cached, setCached]   = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function fetchAnalysis(force = false) {
    setLoading(true); setError(null); setQuotaExceeded(false);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Analysis failed. Please try again.");
      }
      setAnalysis(json.analysis);
      setCached(json.cached ?? false);
      setQuotaExceeded(json.quota_exceeded ?? false);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAnalysis(); }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="card border-red-200 bg-red-50 text-center py-8">
      <div className="text-2xl mb-2">⚠️</div>
      <div className="font-semibold text-red-700 mb-1">Couldn't load analysis</div>
      <p className="text-sm text-red-600 mb-4">{error}</p>
      <button onClick={() => fetchAnalysis()} className="btn-primary text-sm">Try again</button>
    </div>
  );

  if (!analysis) return null;

  const sc = scoreColor(analysis.health_score);
  const vc = VERDICT_CONFIG[analysis.fire_feasibility.verdict];

  return (
    <div className="space-y-4">
      {quotaExceeded && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 flex-shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>Gemini quota exceeded</strong> — showing a sample analysis.
            Add a paid Gemini API key in your environment to enable live analysis.
          </p>
        </div>
      )}
      {/* Header — score + headline */}
      <div className="card flex items-center gap-6">
        <div className={`w-20 h-20 rounded-full ring-4 ${sc.ring} ${sc.bg} flex flex-col items-center justify-center flex-shrink-0`}>
          <span className={`text-2xl font-bold ${sc.text}`}>{analysis.health_score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-ink text-lg leading-snug">{analysis.headline}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={vc.cls}>{vc.label}</span>
            {cached && <span className="badge-blue">Cached · &lt;30d old</span>}
          </div>
        </div>
        <button
          onClick={() => fetchAnalysis(true)}
          className="btn-secondary text-xs flex-shrink-0"
          title="Generate fresh analysis"
        >
          ↺ Regenerate
        </button>
      </div>

      {/* Strengths + Concerns */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="section-title mb-3">Strengths</div>
          <ul className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="section-title mb-3">Concerns</div>
          <ul className="space-y-2">
            {analysis.concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Allocation commentary */}
      <div className="card">
        <div className="section-title mb-2">Allocation commentary</div>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.allocation_commentary}</p>
      </div>

      {/* FIRE feasibility */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="section-title">FIRE feasibility</div>
          <span className={vc.cls}>{vc.label}</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{analysis.fire_feasibility.commentary}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {analysis.fire_feasibility.gap_amount != null && analysis.fire_feasibility.gap_amount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <div className="text-xs text-red-500 font-medium">Gap to close</div>
              <div className="text-lg font-bold text-red-600">
                ₹{(analysis.fire_feasibility.gap_amount / 1e7).toFixed(2)} Cr
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="text-xs text-blue-500 font-medium">Key lever</div>
            <div className="text-sm font-semibold text-blue-700 mt-0.5">{analysis.fire_feasibility.key_lever}</div>
          </div>
        </div>
      </div>

      {/* Stock quality */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="section-title">Stock quality</div>
          {analysis.stock_quality.over_diversified && (
            <span className="badge-amber">Over-diversified</span>
          )}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{analysis.stock_quality.commentary}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {analysis.stock_quality.quality_names.length > 0 && (
            <div>
              <div className="text-xs font-medium text-emerald-600 mb-1.5">Strong moat</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.stock_quality.quality_names.map(n => (
                  <span key={n} className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.stock_quality.noise_names.length > 0 && (
            <div>
              <div className="text-xs font-medium text-amber-600 mb-1.5">Low conviction</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.stock_quality.noise_names.map(n => (
                  <span key={n} className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action items */}
      <div className="card">
        <div className="section-title mb-3">Action items</div>
        <div className="space-y-3">
          {analysis.action_items.map((a, i) => {
            const pc = PRIORITY_CONFIG[a.priority];
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-slate-100">
                <span className="text-base mt-0.5 flex-shrink-0">{pc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-ink">{a.action}</span>
                    <span className={pc.cls}>{pc.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{a.impact}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Locked corpus note */}
      <div className="card bg-violet-50 border-violet-100">
        <div className="section-title text-violet-500 mb-2">Locked corpus — when it unlocks</div>
        <p className="text-sm text-violet-800 leading-relaxed">{analysis.locked_corpus_note}</p>
      </div>

      {/* Disclaimer — always visible, non-collapsible */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="text-xs font-semibold text-slate-500 mb-1">⚖️ Disclaimer</div>
        <p className="text-xs text-slate-500 leading-relaxed">{analysis.disclaimer}</p>
      </div>
    </div>
  );
}
