import type { Holding } from "./types";

export function inflationAdjustedExpense(monthly: number, years: number, rate = 0.06): number {
  return monthly * Math.pow(1 + rate, years);
}

export function fireCorpusTarget(
  monthlyExpenseToday: number,
  yearsToRetirement: number,
  inflationRate: number
): number {
  const inflated = monthlyExpenseToday * Math.pow(1 + inflationRate, yearsToRetirement);
  return inflated * 12 * 25;
}

export function calculateSavingsRate(monthlyIncome: number, totalMonthlyInvestments: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.min((totalMonthlyInvestments / monthlyIncome) * 100, 100);
}

export function projectedFireAge(
  currentAge: number,
  currentLiquidCorpus: number,
  totalMonthlyInvestments: number,
  fireTarget: number,
  equityRate: number
): number {
  let corpus = currentLiquidCorpus;
  const annualInvestment = totalMonthlyInvestments * 12;
  for (let y = 0; y <= 50; y++) {
    if (corpus >= fireTarget) return currentAge + y;
    corpus = (corpus + annualInvestment) * (1 + equityRate);
  }
  return currentAge + 50;
}

export function projectCorpusAt(
  currentLiquid: number,
  monthlySIP: number,
  years: number,
  equityRate = 0.12
): number {
  let corpus = currentLiquid;
  const annualSIP = monthlySIP * 12;
  for (let y = 0; y < years; y++) {
    corpus = (corpus + annualSIP) * (1 + equityRate);
  }
  return corpus;
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

export function formatINR(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export const formatCurrency = formatINR;

// ─── detailed breakdown types ─────────────────────────────────────────────

export interface YearlyValue {
  age: number;
  value: number;
}

export interface ThreeScenario {
  age: number;
  conservative: number;
  base: number;
  optimistic: number;
}

// ─── detailed breakdown functions ─────────────────────────────────────────

export function epfBreakdown(
  currentValue: number,
  yourMonthly: number,
  employerMonthly: number,
  currentAge: number,
  retirementAge: number,
  rate = 0.0825
): {
  currentBalance: number;
  yourFutureContributions: number;
  employerFutureContributions: number;
  interestEarned: number;
  totalAtRetirement: number;
  growthMultiple: number;
  yearByYear: YearlyValue[];
} {
  const years = Math.max(0, retirementAge - currentAge);
  const monthlyTotal = yourMonthly + employerMonthly;
  let balance = currentValue;
  const yearByYear: YearlyValue[] = [];
  let yourContribs = 0;
  let employerContribs = 0;

  for (let y = 0; y < years; y++) {
    yourContribs += yourMonthly * 12;
    employerContribs += employerMonthly * 12;
    balance = (balance + monthlyTotal * 12) * (1 + rate);
    yearByYear.push({ age: currentAge + y + 1, value: balance });
  }

  return {
    currentBalance: currentValue,
    yourFutureContributions: yourContribs,
    employerFutureContributions: employerContribs,
    interestEarned: balance - currentValue - yourContribs - employerContribs,
    totalAtRetirement: balance,
    growthMultiple: currentValue > 0 ? balance / currentValue : 0,
    yearByYear,
  };
}

export function npsBreakdown(
  currentValue: number,
  monthlyContrib: number,
  currentAge: number,
  retirementAge: number,
  rate = 0.105
): {
  atRetirement: number;
  at60: number;
  lumpsum60: number;
  annuityCorpus: number;
  monthlyAnnuity: number;
  futureContributions: number;
  returnsEarned: number;
  yearByYear: YearlyValue[];
} {
  const years = Math.max(0, retirementAge - currentAge);
  let balance = currentValue;
  let contribs = 0;
  const yearByYear: YearlyValue[] = [];

  for (let y = 0; y < years; y++) {
    contribs += monthlyContrib * 12;
    balance = (balance + monthlyContrib * 12) * (1 + rate);
    yearByYear.push({ age: currentAge + y + 1, value: balance });
  }
  const atRetirement = balance;

  const yearsTo60 = Math.max(0, 60 - retirementAge);
  for (let y = 0; y < yearsTo60; y++) {
    balance = balance * (1 + rate);
    yearByYear.push({ age: retirementAge + y + 1, value: balance });
  }

  const at60 = balance;
  const lumpsum60 = at60 * 0.6;
  const annuityCorpus = at60 * 0.4;

  return {
    atRetirement,
    at60,
    lumpsum60,
    annuityCorpus,
    monthlyAnnuity: annuityCorpus * 0.005,
    futureContributions: contribs,
    returnsEarned: at60 - currentValue - contribs,
    yearByYear,
  };
}

export function ppfBreakdown(
  currentValue: number,
  monthlyContrib: number,
  currentAge: number,
  yearsToMaturity: number,
  rate = 0.071
): {
  atMaturity: number;
  yourContributions: number;
  interestEarned: number;
  maturityAge: number;
  maturityYear: number;
  growthMultiple: number;
  yearByYear: YearlyValue[];
} {
  const years = Math.max(0, yearsToMaturity);
  let balance = currentValue;
  let contribs = 0;
  const yearByYear: YearlyValue[] = [];

  for (let y = 0; y < years; y++) {
    contribs += monthlyContrib * 12;
    balance = (balance + monthlyContrib * 12) * (1 + rate);
    yearByYear.push({ age: currentAge + y + 1, value: balance });
  }

  return {
    atMaturity: balance,
    yourContributions: contribs,
    interestEarned: balance - currentValue - contribs,
    maturityAge: currentAge + yearsToMaturity,
    maturityYear: new Date().getFullYear() + yearsToMaturity,
    growthMultiple: currentValue > 0 ? balance / currentValue : 0,
    yearByYear,
  };
}

export function equityBreakdown(
  currentValue: number,
  monthlyInvestment: number,
  currentAge: number,
  retirementAge: number
): {
  conservative: number;
  base: number;
  optimistic: number;
  contributions: number;
  returnsBase: number;
  growthMultipleBase: number;
  yearByYear: ThreeScenario[];
} {
  const years = Math.max(0, retirementAge - currentAge);
  const rates = [0.10, 0.12, 0.15];
  const results = rates.map(rate => {
    let balance = currentValue;
    const yearly: number[] = [];
    for (let y = 0; y < years; y++) {
      balance = (balance + monthlyInvestment * 12) * (1 + rate);
      yearly.push(balance);
    }
    return { final: balance, yearly };
  });

  const contribs = monthlyInvestment * 12 * years;
  const yearByYear: ThreeScenario[] = results[0].yearly.map((_, i) => ({
    age: currentAge + i + 1,
    conservative: results[0].yearly[i],
    base: results[1].yearly[i],
    optimistic: results[2].yearly[i],
  }));

  return {
    conservative: results[0].final,
    base: results[1].final,
    optimistic: results[2].final,
    contributions: contribs,
    returnsBase: results[1].final - currentValue - contribs,
    growthMultipleBase: currentValue > 0 ? results[1].final / currentValue : 0,
    yearByYear,
  };
}

export function goldBreakdown(
  currentValue: number,
  currentAge: number,
  retirementAge: number,
  rate = 0.08
): {
  atRetirement: number;
  returnsEarned: number;
  growthMultiple: number;
  yearByYear: YearlyValue[];
} {
  const years = Math.max(0, retirementAge - currentAge);
  let balance = currentValue;
  const yearByYear: YearlyValue[] = [];

  for (let y = 0; y < years; y++) {
    balance = balance * (1 + rate);
    yearByYear.push({ age: currentAge + y + 1, value: balance });
  }

  return {
    atRetirement: balance,
    returnsEarned: balance - currentValue,
    growthMultiple: currentValue > 0 ? balance / currentValue : 0,
    yearByYear,
  };
}

// ─── savings rate / networthify functions ─────────────────────────────────

export function yearsToFireFromSavingsRate(
  savingsRatePct: number,
  currentLiquidCorpus: number,
  monthlyIncome: number,
  fireTarget: number,
  equityRate = 0.12
): number {
  const annualInvestment = (monthlyIncome * savingsRatePct / 100) * 12;
  let corpus = currentLiquidCorpus;
  for (let y = 0; y <= 50; y++) {
    if (corpus >= fireTarget) return y;
    corpus = (corpus + annualInvestment) * (1 + equityRate);
  }
  return 50;
}

export interface FireVariant {
  type: "Lean FIRE" | "FIRE" | "FAT FIRE";
  monthlyAmountToday: number;
  monthlyAmountAtRetirement: number;
  corpusNeeded: number;
  projectedCorpusAtTargetAge: number;
  achievableByTargetAge: boolean;
  surplusOrGap: number;
  isCurrentTarget: boolean;
  color: string;
}

export function calculateFireVariants(
  monthlyExpenseToday: number,
  currentAge: number,
  fireTargetAge: number,
  currentLiquidCorpus: number,
  monthlySIP: number,
  inflationRate = 0.07,
  equityRate = 0.12
): FireVariant[] {
  const yearsToRetirement = Math.max(1, fireTargetAge - currentAge);
  const inflationMultiplier = Math.pow(1 + inflationRate, yearsToRetirement);

  // Project corpus at target age — constant across all variants
  let projectedCorpus = currentLiquidCorpus;
  const annualSIP = monthlySIP * 12;
  for (let y = 0; y < yearsToRetirement; y++) {
    projectedCorpus = (projectedCorpus + annualSIP) * (1 + equityRate);
  }

  const LIFESTYLE_MULTIPLIERS = {
    "Lean FIRE": 0.6,
    "FIRE": 1.0,
    "FAT FIRE": 2.0,
  } as const;

  const VARIANT_COLORS = {
    "Lean FIRE": "#9CA3AF",
    "FIRE": "#F97316",
    "FAT FIRE": "#7C5FF5",
  } as const;

  const base = (["Lean FIRE", "FIRE", "FAT FIRE"] as const).map(type => {
    const multiplier = LIFESTYLE_MULTIPLIERS[type];
    const monthlyToday = monthlyExpenseToday * multiplier;
    const monthlyAtRetirement = monthlyToday * inflationMultiplier;
    const corpusNeeded = monthlyAtRetirement * 12 * 25;
    return {
      type,
      monthlyAmountToday: monthlyToday,
      monthlyAmountAtRetirement: monthlyAtRetirement,
      corpusNeeded,
      isCurrentTarget: type === "FIRE",
      color: VARIANT_COLORS[type],
    };
  });

  return base.map(v => ({
    ...v,
    projectedCorpusAtTargetAge: projectedCorpus,
    achievableByTargetAge: projectedCorpus >= v.corpusNeeded,
    surplusOrGap: projectedCorpus - v.corpusNeeded,
  }));
}

export interface YearByYearRow {
  year: number;
  age: number;
  annualIncome: number;
  annualExpenses: number;
  annualInvestment: number;
  portfolioROI: number;
  roiCoversPct: number;
  netWorthChange: number;
  netWorth: number;
  isFireYear: boolean;
  fireAnnualNeed: number;
}

export function generateYearByYearTable(
  currentAge: number,
  currentLiquidCorpus: number,
  monthlyIncome: number,
  monthlyExpenseToday: number,
  monthlyInvestment: number,
  fireTarget: number,
  fireMonthlyExpenseToday: number,
  equityRate = 0.12,
  inflationRate = 0.07,
  incomeGrowthRate = 0.08
): YearByYearRow[] {
  const rows: YearByYearRow[] = [];
  let netWorth = currentLiquidCorpus;
  let annualIncome = monthlyIncome * 12;
  let annualExpenses = monthlyExpenseToday * 12;
  let annualInvestment = monthlyInvestment * 12;
  let fireAchievedYear: number | null = null;

  // Fixed annual need at retirement — same target the banner uses
  const fireAnnualNeed = fireTarget * 0.04;

  for (let year = 0; year <= 40; year++) {
    const roi = netWorth * equityRate;
    // Progress = what % of fireTarget corpus have we reached?
    const roiCoversPct = fireTarget > 0 ? (netWorth / fireTarget) * 100 : 0;
    const isFireYear = roiCoversPct >= 100 && fireAchievedYear === null;
    if (isFireYear) fireAchievedYear = year;

    const netWorthChange = year === 0 ? 0 : annualInvestment + roi;

    rows.push({
      year, age: currentAge + year,
      annualIncome, annualExpenses, annualInvestment,
      portfolioROI: roi,
      roiCoversPct,
      netWorthChange,
      netWorth,
      isFireYear,
      fireAnnualNeed,
    });

    if (year > 0) netWorth = Math.max(netWorth + annualInvestment + roi, 0);

    annualIncome *= (1 + incomeGrowthRate);
    annualExpenses *= (1 + inflationRate);
    annualInvestment *= (1 + incomeGrowthRate);

    if (fireAchievedYear !== null && year >= fireAchievedYear + 3) break;
  }

  return rows;
}
