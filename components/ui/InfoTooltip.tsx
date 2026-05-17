"use client";

import { useState } from "react";

interface Props {
  content: string;
}

export function InfoTooltip({ content }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={e => { e.preventDefault(); setShow(p => !p); }}
        className="inline-flex items-center transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="More info"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>

      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                     rounded-xl shadow-xl p-3
                     text-xs leading-relaxed normal-case font-normal tracking-normal
                     pointer-events-none"
          style={{
            width: "min(14rem, calc(100vw - 2rem))",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {content}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 block w-3 h-3 rotate-45 -mt-1.5"
            style={{
              background: "var(--bg-card)",
              borderRight: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          />
        </span>
      )}
    </span>
  );
}
