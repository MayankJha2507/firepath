"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/fire-calculator";

export type BannerState = "on_track" | "close" | "needs_work";

interface Props {
  state: BannerState;
  projectedFireAge: number;
  targetFireAge: number;
  diffYears: number;
  additionalSipNeeded: number;
  monthlySurplus?: number;
  acceleratedFireAge?: number;
  yearsSavedIfSurplusInvested?: number;
}

const STATE_VARS = {
  on_track:   { bg: "var(--banner-success-bg)", border: "var(--banner-success-border)", text: "var(--banner-success-text)" },
  close:      { bg: "var(--banner-close-bg)",   border: "var(--banner-close-border)",   text: "var(--banner-close-text)"   },
  needs_work: { bg: "var(--banner-danger-bg)",   border: "var(--banner-danger-border)",  text: "var(--banner-danger-text)"  },
};

export default function FireStatusBanner({
  state, projectedFireAge, targetFireAge, diffYears, additionalSipNeeded,
  monthlySurplus = 0, acceleratedFireAge, yearsSavedIfSurplusInvested = 0,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem("firepath-banner-dismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (state !== "on_track" || confettiFired.current) return;
    const today = new Date().toDateString();
    const last = localStorage.getItem("firepath-last-confetti");
    if (last === today) return;
    confettiFired.current = true;
    localStorage.setItem("firepath-last-confetti", today);
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.4 },
        colors: ["#F97316", "#7C5FF5", "#4ADE80", "#FCD34D"],
      });
    });
  }, [state]);

  if (dismissed) return null;

  const yearsEarly = Math.abs(Math.round(diffYears));
  const { bg, border, text } = STATE_VARS[state];

  const showSurplusNudge = monthlySurplus >= 10000 && yearsSavedIfSurplusInvested >= 1;
  const surplusYears = Math.min(yearsSavedIfSurplusInvested, 99); // cap display

  const icons = { on_track: "🔥", close: "⚡", needs_work: "📈" };
  const titles = {
    on_track: `You're on track to retire at ${projectedFireAge} — ${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} early`,
    close: `You're close — projected retirement at ${projectedFireAge}`,
    needs_work: `Projected retirement at ${projectedFireAge} — ${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} behind`,
  };
  const bodies = {
    on_track: "Keep your current SIP pace and you'll get there.",
    close: `${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} behind target. ${
      additionalSipNeeded > 0
        ? `A SIP increase of ${formatINR(Math.ceil(additionalSipNeeded / 1000) * 1000)}/month closes the gap.`
        : "A small SIP increase will close the gap."
    }`,
    needs_work: `Your top lever: increase monthly SIP by ${
      additionalSipNeeded > 0 ? formatINR(Math.ceil(additionalSipNeeded / 1000) * 1000) : "₹15,000"
    } to close the gap significantly.`,
  };

  return (
    <div
      className="relative rounded-xl px-4 py-3.5"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("firepath-banner-dismissed", "true");
        }}
        className="absolute top-2.5 right-3 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity leading-none"
        style={{ color: text }}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0 mt-0.5">{icons[state]}</span>
        <div>
          <div className="font-semibold text-sm" style={{ color: text }}>{titles[state]}</div>
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: text, opacity: 0.9 }}>{bodies[state]}</div>

          {/* Surplus opportunity line */}
          {showSurplusNudge && state !== "on_track" && (
            <div className="text-xs mt-2 flex items-center gap-1 flex-wrap" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--warning)" }}>💡</span>
              <span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{formatINR(monthlySurplus)}/mo</span>
                {" sitting idle — investing it moves FIRE to "}
                <span className="font-medium" style={{ color: "var(--success)" }}>age {acceleratedFireAge}</span>
                {` (${surplusYears} yr${surplusYears !== 1 ? "s" : ""} earlier)`}
              </span>
              <Link href="/portfolio" className="hover:opacity-80 ml-1" style={{ color: "var(--orange)" }}>
                Invest surplus →
              </Link>
            </div>
          )}

          {/* On track + surplus: upgrade message */}
          {showSurplusNudge && state === "on_track" && (
            <div className="text-xs mt-2 flex items-center gap-1 flex-wrap" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--warning)" }}>💡</span>
              <span>
                {formatINR(monthlySurplus)}/mo sitting idle — investing it could enable FAT FIRE at the same age
              </span>
              <Link href="/portfolio" className="hover:opacity-80 ml-1" style={{ color: "var(--orange)" }}>
                Invest surplus →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
