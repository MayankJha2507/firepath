"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import Link from "next/link";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { outer: string; text: string }> = {
  sm: { outer: "w-7 h-7", text: "text-[10px]" },
  md: { outer: "w-9 h-9", text: "text-xs" },
  lg: { outer: "w-12 h-12", text: "text-sm" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AvatarMenu({
  name, email, size = "md",
}: {
  name: string; email: string; size?: Size;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const sz = SIZE_MAP[size];
  const displayName = name || email?.split("@")[0] || "User";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`${sz.outer} rounded-full flex items-center justify-center font-semibold ${sz.text} text-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-opacity hover:opacity-90`}
        style={{ background: "var(--accent)", focusRingColor: "var(--accent)" } as React.CSSProperties}
        aria-label="Account menu"
        title={displayName}
      >
        {initials(displayName)}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-60 rounded-xl py-1 z-50 shadow-lg"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ background: "var(--accent)" }}
              >
                {initials(displayName)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {displayName}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {email}
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="py-1" style={{ borderBottom: "1px solid var(--border)" }}>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>⚙️</span> Settings
            </Link>
          </div>

          {/* Theme selector */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
              Theme
            </div>
            <div className="flex gap-1">
              {(["light", "dark", "system"] as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTheme(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: theme === t ? "var(--orange)" : "var(--bg-secondary)",
                    color: theme === t ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{ color: "var(--danger)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span>⬚</span> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
