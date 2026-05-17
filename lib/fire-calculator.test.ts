import { describe, it, expect } from "vitest";
import {
  inflationAdjustedExpense, fireCorpusTarget, epfProjection, ppfProjection,
  equityProjection, calculateSavingsRate, assetAllocation, milestoneProjections,
  fireBridgeAnalysis, yearByYearProjection, formatINR,
} from "./fire-calculator";

describe("inflationAdjustedExpense", () => {
  it("compounds at 6% by default", () => {
    expect(inflationAdjustedExpense(100000, 10)).toBeCloseTo(100000 * Math.pow(1.06, 10), 2);
  });
});

describe("fireCorpusTarget", () => {
  it("applies pure 25x rule with no buffer", () => {
    expect(fireCorpusTarget(100000, 0, 0.07)).toBe(100000 * 12 * 25);
  });
  it("inflates expense before applying 25x rule", () => {
    const inflated = 100000 * Math.pow(1.07, 10);
    expect(fireCorpusTarget(100000, 10, 0.07)).toBeCloseTo(inflated * 12 * 25, 2);
  });
});

describe("epfProjection", () => {
  it("grows lump + contributions", () => {
    const v = epfProjection(500000, 5000, 5000, 10);
    expect(v).toBeGreaterThan(500000);
  });
  it("returns current if 0 years", () => {
    expect(epfProjection(500000, 5000, 5000, 0)).toBeCloseTo(500000, 2);
  });
});

describe("ppfProjection", () => {
  it("grows over years", () => {
    expect(ppfProjection(100000, 12500, 15)).toBeGreaterThan(100000 + 12500 * 12 * 15);
  });
});

describe("equityProjection", () => {
  it("compounds at 12% default", () => {
    expect(equityProjection(0, 10000, 1)).toBeGreaterThan(120000);
  });
});

describe("calculateSavingsRate", () => {
  it("returns percentage", () => {
    expect(calculateSavingsRate(100000, 50000)).toBe(50);
  });
  it("clamps at 100", () => {
    expect(calculateSavingsRate(100000, 200000)).toBe(100);
  });
  it("handles zero income", () => {
    expect(calculateSavingsRate(0, 50000)).toBe(0);
  });
});

describe("assetAllocation", () => {
  it("classifies holdings into buckets", () => {
    const a = assetAllocation([
      { category: "indian_stock", name: "X", value_inr: 100 },
      { category: "epf", name: "EPF", value_inr: 100 },
      { category: "gold", name: "G", value_inr: 100 },
      { category: "fd", name: "FD", value_inr: 100 },
    ]);
    expect(a.equityPct).toBe(25);
    expect(a.debtPct).toBe(25);
    expect(a.goldPct).toBe(25);
    expect(a.cashPct).toBe(25);
  });
  it("returns zeros when empty", () => {
    expect(assetAllocation([])).toEqual({ equityPct: 0, debtPct: 0, goldPct: 0, cashPct: 0 });
  });
});

describe("milestoneProjections", () => {
  it("returns 0 months if already at threshold", () => {
    const m = milestoneProjections(2e7, 50000);
    expect(m.oneCr).toBe(0);
    expect(m.twoCr).toBe(0);
  });
  it("returns finite months for reachable target", () => {
    const m = milestoneProjections(0, 100000);
    expect(m.oneCr).toBeGreaterThan(0);
    expect(m.oneCr).toBeLessThan(120);
  });
});

describe("fireBridgeAnalysis", () => {
  it("flags on-track when surplus", () => {
    const r = fireBridgeAnalysis(2e7, 1.5e7);
    expect(r.isOnTrack).toBe(true);
    expect(r.gap).toBe(0);
    expect(r.surplusOrDeficit).toBe(5e6);
  });
  it("flags shortfall", () => {
    const r = fireBridgeAnalysis(1e7, 2e7);
    expect(r.isOnTrack).toBe(false);
    expect(r.gap).toBe(1e7);
  });
});

describe("yearByYearProjection", () => {
  it("produces years+1 entries and marks fire year", () => {
    const out = yearByYearProjection(0, 100000, 30, 1e7, 0.12, 30);
    expect(out.length).toBe(31);
    expect(out.some(p => p.isFireYear)).toBe(true);
  });
});

describe("formatINR", () => {
  it("formats Cr / L / K / raw", () => {
    expect(formatINR(11500000)).toBe("₹1.15Cr");
    expect(formatINR(4970000)).toBe("₹49.70L");
    expect(formatINR(5500)).toBe("₹5.5K");
    expect(formatINR(500)).toBe("₹500");
  });
  it("supports negative amounts", () => {
    expect(formatINR(-150000)).toBe("-₹1.50L");
  });
  it("returns ₹0 for NaN", () => {
    expect(formatINR(NaN)).toBe("₹0");
  });
});
