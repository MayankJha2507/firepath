export interface Assumptions {
  equityCagr: number;   // 12
  epfRate: number;      // 8.25
  npsCagr: number;      // 10.5
  ppfRate: number;      // 7.1
  inflation: number;    // 6
  goldCagr: number;     // 8
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  equityCagr: 12,
  epfRate: 8.25,
  npsCagr: 10.5,
  ppfRate: 7.1,
  inflation: 6,
  goldCagr: 8,
};
