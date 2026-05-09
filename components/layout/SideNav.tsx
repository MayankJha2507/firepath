"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatINR, fireCorpusTarget, inflationAdjustedExpense } from "@/lib/fire-calculator";

// ─── nav structure ────────────────────────────────────────────────────────

const NAV_MAIN = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Portfolio", href: "/portfolio",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    label: "Analysis", href: "/analysis",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "History", href: "/history",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const NAV_ACCOUNT = [
  {
    label: "Settings", href: "/settings",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ─── types ────────────────────────────────────────────────────────────────

interface CorpusData {
  total: number;
  fireAge: number | null;
  fireTarget: number;
  age: number;
  completeness: number | null;
  missingSections: number;
}

// ─── nav item ─────────────────────────────────────────────────────────────

function NavItem({
  href, icon, label, active, onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 relative
        ${active
          ? "bg-orange-50 text-orange-600"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-orange-500 rounded-r-full" />
      )}
      <span className={active ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600"}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ─── corpus mini card ──────────────────────────────────────────────────────

function CorpusMiniCard({ data, loading }: { data: CorpusData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
        <div className="h-2.5 bg-slate-200 rounded w-3/4 animate-pulse" />
        <div className="h-3.5 bg-slate-200 rounded w-1/2 animate-pulse" />
        <div className="h-1.5 bg-slate-200 rounded-full mt-2 animate-pulse" />
      </div>
    );
  }
  if (!data) return null;

  const pct = Math.min(100, Math.round((data.total / data.fireTarget) * 100));
  const yearsToFire = data.fireAge !== null ? Math.max(0, Math.round(data.fireAge - data.age)) : null;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">
        Total corpus
      </div>
      <div className="text-sm font-bold text-slate-800 mb-0.5">{formatINR(data.total)}</div>
      <div className="text-xs text-slate-500 mb-2.5">
        {yearsToFire !== null ? `FIRE in ${yearsToFire} yr${yearsToFire !== 1 ? "s" : ""}` : "Set up portfolio"}
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-400 mt-1.5">{pct}% of FIRE target</div>

      {data.completeness !== null && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Portfolio accuracy</span>
            <span>{data.completeness}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.completeness === 100 ? "bg-emerald-500" : "bg-amber-400"
              }`}
              style={{ width: `${data.completeness}%` }}
            />
          </div>
          {data.missingSections > 0 && (
            <div className="text-[10px] text-slate-400 mt-1">
              {data.missingSections} section{data.missingSections !== 1 ? "s" : ""} still estimated
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── sidebar content ──────────────────────────────────────────────────────

function SidebarContent({
  pathname,
  corpusData,
  loading,
  onNavClick,
}: {
  pathname: string;
  corpusData: CorpusData | null;
  loading: boolean;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 shrink-0">
        <Link href="/dashboard" onClick={onNavClick} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">
            FIRE<span className="text-orange-500">path</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Main
        </div>
        {NAV_MAIN.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            onClick={onNavClick}
          />
        ))}

        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-5">
          Account
        </div>
        {NAV_ACCOUNT.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Corpus card */}
      <div className="p-3 border-t border-slate-100 shrink-0">
        <CorpusMiniCard data={corpusData} loading={loading} />
      </div>
    </>
  );
}

// ─── main export ──────────────────────────────────────────────────────────

export default function SideNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [corpusData, setCorpusData] = useState<CorpusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setLoading(false); return; }

      const [{ data: snap }, { data: profile }] = await Promise.all([
        supabase
          .from("portfolio_snapshots")
          .select("total_corpus, projected_fire_age")
          .eq("user_id", user.id)
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("age, fire_target_age, fire_monthly_expense, monthly_expense, data_completeness")
          .eq("id", user.id)
          .single(),
      ]);

      if (!cancelled && snap && profile) {
        const yearsToFire = Math.max(1, (profile.fire_target_age || 45) - (profile.age || 30));
        const inflAdj = inflationAdjustedExpense(
          profile.fire_monthly_expense || profile.monthly_expense || 60000,
          yearsToFire
        );
        const dc: Record<string, string> = profile.data_completeness || {};
        const keys = Object.keys(dc);
        const exactCount = keys.filter(k => dc[k] === "exact").length;
        const completeness = keys.length > 0 ? Math.round((exactCount / keys.length) * 100) : null;
        const missingSections = keys.filter(k => dc[k] !== "exact").length;
        setCorpusData({
          total: snap.total_corpus,
          fireAge: snap.projected_fire_age ?? null,
          fireTarget: fireCorpusTarget(inflAdj),
          age: profile.age || 30,
          completeness,
          missingSections,
        });
      }
      if (!cancelled) setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="ml-3 font-bold text-slate-900 text-base tracking-tight">
          FIRE<span className="text-orange-500">path</span>
        </Link>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-slate-200 flex-col z-30">
        <SidebarContent pathname={pathname} corpusData={corpusData} loading={loading} />
      </div>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-[220px] bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Link href="/dashboard" className="font-bold text-slate-900 text-base" onClick={() => setMobileOpen(false)}>
            FIRE<span className="text-orange-500">path</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Main</div>
          {NAV_MAIN.map(item => (
            <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setMobileOpen(false)} />
          ))}
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-5">Account</div>
          {NAV_ACCOUNT.map(item => (
            <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <CorpusMiniCard data={corpusData} loading={loading} />
        </div>
      </div>
    </>
  );
}
