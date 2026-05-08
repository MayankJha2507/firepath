"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatINR, fireCorpusTarget, inflationAdjustedExpense } from "@/lib/fire-calculator";

const NAV_MAIN = [
  { label: "Dashboard", icon: "🏠", href: "/dashboard" },
  { label: "Portfolio",  icon: "📊", href: "/portfolio" },
  { label: "Analysis",   icon: "🤖", href: "/analysis" },
  { label: "History",    icon: "📈", href: "/history" },
];
const NAV_ACCOUNT = [
  { label: "Settings", icon: "⚙️", href: "/settings" },
];

interface CorpusData {
  total: number;
  fireAge: number | null;
  fireTarget: number;
  age: number;
}

function NavItem({
  href, icon, label, active, onClick,
}: {
  href: string; icon: string; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <div className="relative mb-0.5">
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-orange-400 rounded-r" />
      )}
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ml-0.5
          ${active
            ? "text-orange-400 bg-white/[0.08]"
            : "text-white/60 hover:text-white/90 hover:bg-white/[0.05]"
          }`}
      >
        <span className="text-base leading-none">{icon}</span>
        {label}
      </Link>
    </div>
  );
}

function CorpusMiniCard({ data, loading }: { data: CorpusData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 space-y-2">
        <div className="h-2.5 bg-white/10 rounded w-3/4 animate-pulse" />
        <div className="h-3.5 bg-white/10 rounded w-1/2 animate-pulse" />
        <div className="h-2.5 bg-white/10 rounded w-2/3 animate-pulse" />
        <div className="h-1.5 bg-white/10 rounded-full mt-1 animate-pulse" />
      </div>
    );
  }
  if (!data) return null;

  const pct = Math.min(100, Math.round((data.total / data.fireTarget) * 100));
  const yearsToFire = data.fireAge !== null ? Math.max(0, Math.round(data.fireAge - data.age)) : null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
      <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1">Total corpus</div>
      <div className="text-sm font-bold text-white mb-0.5">{formatINR(data.total)}</div>
      <div className="text-xs text-white/50 mb-2.5">
        {yearsToFire !== null
          ? `FIRE in ${yearsToFire} yr${yearsToFire !== 1 ? "s" : ""}`
          : "Set up portfolio"}
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-white/30 mt-1">{pct}% of FIRE target</div>
    </div>
  );
}

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
      <Link
        href="/dashboard"
        onClick={onNavClick}
        className="flex items-center gap-2 px-5 py-5 shrink-0"
      >
        <span className="font-bold text-white text-xl tracking-tight">
          FIRE<span className="text-orange-500">path</span>
        </span>
      </Link>

      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">
          Main
        </div>
        {NAV_MAIN.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
            onClick={onNavClick}
          />
        ))}
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2 mt-5">
          Account
        </div>
        {NAV_ACCOUNT.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.08] shrink-0">
        <CorpusMiniCard data={corpusData} loading={loading} />
      </div>
    </>
  );
}

export default function SideNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [corpusData, setCorpusData] = useState<CorpusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Close mobile menu on route change
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
          .select("age, fire_target_age, fire_monthly_expense, monthly_expense")
          .eq("id", user.id)
          .single(),
      ]);

      if (!cancelled && snap && profile) {
        const yearsToFire = Math.max(1, (profile.fire_target_age || 45) - (profile.age || 30));
        const inflAdj = inflationAdjustedExpense(
          profile.fire_monthly_expense || profile.monthly_expense || 60000,
          yearsToFire
        );
        setCorpusData({
          total: snap.total_corpus,
          fireAge: snap.projected_fire_age ?? null,
          fireTarget: fireCorpusTarget(inflAdj),
          age: profile.age || 30,
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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F1729] border-b border-white/[0.08] flex items-center px-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="ml-3 font-bold text-white text-lg tracking-tight">
          FIRE<span className="text-orange-500">path</span>
        </Link>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#0F1729] border-r border-white/[0.08] flex-col z-30">
        <SidebarContent
          pathname={pathname}
          corpusData={corpusData}
          loading={loading}
        />
      </div>

      {/* Mobile: backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-[240px] bg-[#0F1729] border-r border-white/[0.08] flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 shrink-0">
          <Link
            href="/dashboard"
            className="font-bold text-white text-xl tracking-tight"
            onClick={() => setMobileOpen(false)}
          >
            FIRE<span className="text-orange-500">path</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">Main</div>
          {NAV_MAIN.map(item => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2 mt-5">Account</div>
          {NAV_ACCOUNT.map(item => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.08] shrink-0">
          <CorpusMiniCard data={corpusData} loading={loading} />
        </div>
      </div>
    </>
  );
}
