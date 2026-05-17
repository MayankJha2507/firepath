import { projectCorpusAt } from "./fire-calculator";

export interface SWPRow {
  age: number;
  year: number;
  corpusStart: number;
  annualWithdrawal: number;
  monthlyWithdrawal: number;
  growth: number;
  corpusEnd: number;
  isExhausted: boolean;
}

export interface SWPResult {
  corpusAtRetirement: number;
  retirementAge: number;
  monthlyWithdrawalAtRetirement: number;
  lastsUntilAge: number | "beyond_90";
  isSustainable: boolean;
  yearsLasted: number;
  rows: SWPRow[];
}

export function calculateSWP(
  corpusAtRetirement: number,
  monthlyExpenseTodayValue: number,
  retirementAge: number,
  currentAge: number,
  inflationRate: number,
  postRetirementGrowthRate = 0.08
): SWPResult {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  const monthlyWithdrawalAtRetirement =
    monthlyExpenseTodayValue * Math.pow(1 + inflationRate, yearsToRetirement);

  const maxAge = 95;
  const rows: SWPRow[] = [];
  let corpus = corpusAtRetirement;
  let lastsUntilAge: number | "beyond_90" = "beyond_90";
  let yearsLasted = maxAge - retirementAge + 1;

  for (let year = 0; year <= maxAge - retirementAge; year++) {
    const age = retirementAge + year;
    const corpusStart = corpus;

    const monthlyWithdrawal =
      monthlyWithdrawalAtRetirement * Math.pow(1 + inflationRate, year);
    const annualWithdrawal = monthlyWithdrawal * 12;

    const afterWithdrawal = corpus - annualWithdrawal;
    const growth = Math.max(afterWithdrawal, 0) * postRetirementGrowthRate;
    corpus = Math.max(afterWithdrawal + growth, 0);

    const isExhausted = corpus <= 0;

    rows.push({
      age,
      year,
      corpusStart,
      annualWithdrawal,
      monthlyWithdrawal,
      growth: Math.max(growth, 0),
      corpusEnd: corpus,
      isExhausted,
    });

    if (isExhausted) {
      lastsUntilAge = age;
      yearsLasted = year;
      break;
    }
  }

  return {
    corpusAtRetirement,
    retirementAge,
    monthlyWithdrawalAtRetirement,
    lastsUntilAge,
    isSustainable:
      lastsUntilAge === "beyond_90" ||
      (typeof lastsUntilAge === "number" && lastsUntilAge >= 90),
    yearsLasted,
    rows,
  };
}

export { projectCorpusAt };
