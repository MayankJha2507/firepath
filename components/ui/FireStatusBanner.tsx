"use client";

import { useState, useEffect, useRef } from "react";
import { formatINR } from "@/lib/fire-calculator";

export type BannerState = "on_track" | "close" | "needs_work";

interface Props {
  state: BannerState;
  projectedFireAge: number;
  targetFireAge: number;
  diffYears: number;
  additionalSipNeeded: number;
}

export default function FireStatusBanner({
  state, projectedFireAge, targetFireAge, diffYears, additionalSipNeeded,
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
  const earlyOrLate = diffYears > 0 ? "early" : "behind";

  const config = {
    on_track: {
      icon: "🔥",
      title: `You're on track to retire at ${projectedFireAge} — ${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} early`,
      body: "Keep your current SIP pace and you'll get there.",
      bg: "linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(22,163,74,0.06) 100%)",
      border: "#4ADE80",
      text: "#166534",
    },
    close: {
      icon: "⚡",
      title: `You're close — projected retirement at ${projectedFireAge}`,
      body: `${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} behind target. ${
        additionalSipNeeded > 0
          ? `A SIP increase of ${formatINR(Math.ceil(additionalSipNeeded / 1000) * 1000)}/month closes the gap.`
          : "Small SIP increase will close the gap."
      }`,
      bg: "linear-gradient(135deg, rgba(253,212,77,0.12) 0%, rgba(217,119,6,0.06) 100%)",
      border: "#FCD34D",
      text: "#92400e",
    },
    needs_work: {
      icon: "📈",
      title: `Projected retirement at ${projectedFireAge} — ${yearsEarly} year${yearsEarly !== 1 ? "s" : ""} ${earlyOrLate}`,
      body: `Your top lever: increase monthly SIP by ${
        additionalSipNeeded > 0
          ? formatINR(Math.ceil(additionalSipNeeded / 1000) * 1000)
          : "₹15,000"
      } to close the gap significantly.`,
      bg: "linear-gradient(135deg, rgba(248,113,113,0.10) 0%, rgba(220,38,38,0.05) 100%)",
      border: "#F87171",
      text: "#991b1b",
    },
  }[state];

  return (
    <div
      className="relative rounded-xl px-4 py-3.5"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("firepath-banner-dismissed", "true");
        }}
        className="absolute top-2.5 right-3 text-sm opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: config.text }}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0 mt-0.5">{config.icon}</span>
        <div>
          <div className="font-semibold text-sm" style={{ color: config.text }}>
            {config.title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: config.text, opacity: 0.85 }}>
            {config.body}
          </div>
        </div>
      </div>
    </div>
  );
}
