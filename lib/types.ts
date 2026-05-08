export type HoldingCategory =
  | "indian_stock" | "us_stock" | "mf" | "epf" | "nps"
  | "ppf" | "gold" | "fd" | "lic" | "other";

export interface Holding {
  id?: string;
  category: HoldingCategory;
  name: string;
  value_inr: number;
  monthly_contribution?: number;
  notes?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  fire_target_age: number | null;
  monthly_income: number | null;
  monthly_expense: number | null;
  parent_support: number | null;
  tax_bracket: number;
  tax_regime: "new" | "old";
  fire_monthly_expense: number | null;
  risk_score: number | null;
  tier: "free" | "pro";
}

export interface Snapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_corpus: number;
  liquid_corpus: number;
  locked_corpus: number;
  equity_pct: number;
  debt_pct: number;
  gold_pct: number;
  cash_pct: number;
  savings_rate: number;
  projected_fire_age: number;
}
