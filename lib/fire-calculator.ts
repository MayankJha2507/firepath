import type { Holding } from "./types";

export function inflationAdjustedExpense(monthly: number, years: number, rate = 0.06): number {
  return monthly * Math.pow(1 + rate, years);
}

export function fireCorpusTarget(inflationAdjMonthly: number): number {
  return inflationAdjMonthly * 12 * 25 * 1.2;
}

// Future value of annuity (monthly compounding annual rate)
function fvAnnuity(monthly: number, years: number, annualRate: number): number {
  if (years <= 0 || monthly <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

function fvLump(present: number, years: number, annualRate: number): number {
  if (years <= 0) return present;
  return present * Math.pow(1 + annualRate, years);
}

export function epfProjection(
  current: number, yourContrib: number, employerContrib: number,
  years: number, rate = 0.0825
): number {
  return fvLump(current, years, rate) + fvAnnuity(yourContrib + employerContrib, years, rate);
}

export function npsProjection(
  current: number, monthlyContrib: number, years: number, rate = 0.105
) {
  const atRetirement = fvLump(current, years, rate) + fvAnnuity(monthlyContrib, years, rate);
  // Assume retirement at fire_target_age; growth continues to 60 if fire_target<60.
  // Caller passes years-to-retirement; we compute at60 separately by passing years-to-60.
  const at60 = atRetirement; // Caller can re-call with years-to-60 for this.
  const lumpsum60 = at60 * 0.6;
  const annuityCorpus60 = at60 * 0.4;
  const estimatedMonthlyAnnuity = annuityCorpus60 * 0.005;
  return { atRetirement, at60, lumpsum60, annuityCorpus60, estimatedMonthlyAnnuity };
}

export function ppfProjection(
  current: number, monthlyContrib: number, yearsToMaturity: number, rate = 0.071
): number {
  return fvLump(current, yearsToMaturity, rate) + fvAnnuity(monthlyContrib, yearsToMaturity, rate);
}

export function equityProjection(
  current: number, monthlySIP: number, years: number, rate = 0.12
): number {
  return fvLump(current, years, rate) + fvAnnuity(monthlySIP, years, rate);
}

export function savingsRate(monthlyInvestment: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.min(100, Math.max(0, (monthlyInvestment / monthlyIncome) * 100));
}

const EQUITY_CATS = new Set(["indian_stock", "us_stock", "mf"]);
const DEBT_CATS = new Set(["epf", "nps", "ppf", "lic"]);
const GOLD_CATS = new Set(["gold"]);
const CASH_CATS = new Set(["fd"]);

export function assetAllocation(holdings: Holding[]) {
  let equity = 0, debt = 0, gold = 0, cash = 0;
  for (const h of holdings) {
    const v = h.value_inr || 0;
    if (EQUITY_CATS.has(h.category)) equity += v;
    else if (DEBT_CATS.has(h.category)) debt += v;
    else if (GOLD_CATS.has(h.category)) gold += v;
    else if (CASH_CATS.has(h.category)) cash += v;
  }
  const total = equity + debt + gold + cash;
  if (total === 0) return { equityPct: 0, debtPct: 0, goldPct: 0, cashPct: 0 };
  return {
    equityPct: (equity / total) * 100,
    debtPct: (debt / total) * 100,
    goldPct: (gold / total) * 100,
    cashPct: (cash / total) * 100,
  };
}

// Returns months until corpus crosses each threshold via SIP + compounding.
function monthsToTarget(current: number, monthlySIP: number, target: number, rate = 0.12): number {
  if (current >= target) return 0;
  if (monthlySIP <= 0 && current * Math.pow(1 + rate, 100) < target) return Infinity;
  const r = rate / 12;
  let corpus = current;
  for (let m = 1; m <= 12 * 60; m++) {
    corpus = corpus * (1 + r) + monthlySIP;
    if (corpus >= target) return m;
  }
  return Infinity;
}

export function milestoneProjections(currentLiquid: number, monthlySIP: number, rate = 0.12) {
  return {
    oneCr: monthsToTarget(currentLiquid, monthlySIP, 1e7, rate),
    twoCr: monthsToTarget(currentLiquid, monthlySIP, 2e7, rate),
    fiveCr: monthsToTarget(currentLiquid, monthlySIP, 5e7, rate),
    tenCr: monthsToTarget(currentLiquid, monthlySIP, 1e8, rate),
  };
}

export function fireBridgeAnalysis(liquidAtRetirement: number, fireTarget: number) {
  const gap = Math.max(0, fireTarget - liquidAtRetirement);
  const surplusOrDeficit = liquidAtRetirement - fireTarget;
  return { gap, isOnTrack: liquidAtRetirement >= fireTarget, surplusOrDeficit };
}

export function yearByYearProjection(
  currentLiquid: number, monthlySIP: number, years: number,
  fireTarget: number, rate = 0.12, startAge = 30
) {
  const out: Array<{ year: number; age: number; corpus: number; target: number; isFireYear: boolean }> = [];
  let corpus = currentLiquid;
  let fireMarked = false;
  for (let y = 0; y <= years; y++) {
    const isFireYear = !fireMarked && corpus >= fireTarget;
    if (isFireYear) fireMarked = true;
    out.push({ year: y, age: startAge + y, corpus, target: fireTarget, isFireYear });
    corpus = fvLump(corpus, 1, rate) + fvAnnuity(monthlySIP, 1, rate);
  }
  return out;
}

export function formatINR(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
