"use client";

import { useState } from "react";
import { formatINR } from "@/lib/fire-calculator";

interface BreakdownItem {
  label: string;
  value: number;
  pct: number;
}

interface Props {
  variant: "liquid" | "total";
  items: BreakdownItem[];
  total: number;
  children: React.ReactNode;
}

export function CorpusBreakdownPopover({ variant, items, total, children }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(prev => !prev)}
    >
      {children}

      {show && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-64 rounded-xl shadow-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Arrow pointer */}
          <div
            className="absolute -top-1.5 left-6 w-3 h-3 rotate-45"
            style={{
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--border)",
              borderTop: "1px solid var(--border)",
            }}
          />

          <div
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {variant === "liquid" ? "Liquid breakdown" : "Total breakdown"}
          </div>

          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatINR(item.value)}
                    </span>
                    <span className="text-xs w-7 text-right" style={{ color: "var(--text-secondary)" }}>
                      {item.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: "var(--bg-secondary)" }}>
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(item.pct, 100)}%`, background: "var(--orange)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-3 pt-3 flex justify-between items-center"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Total
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatINR(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
