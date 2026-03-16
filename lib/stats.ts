/**
 * Statistical tests for model comparison.
 */

/** Two-tailed critical values for t-distribution at α=0.05 */
const T_CRITICAL_05: Record<number, number> = {
  1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31,
  9: 2.26, 10: 2.23, 11: 2.20, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13,
  16: 2.12, 17: 2.11, 18: 2.10, 19: 2.09, 20: 2.09, 25: 2.06, 30: 2.04,
  40: 2.02, 60: 2.00, 120: 1.98, 999: 1.96,
};

function getCriticalValue(df: number): number {
  if (df <= 0) return Infinity;
  const keys = Object.keys(T_CRITICAL_05).map(Number).sort((a, b) => a - b);
  for (const k of keys) {
    if (df <= k) return T_CRITICAL_05[k];
  }
  return 1.96;
}

export interface PairedTTestResult {
  meanDiff: number;
  stdDiff: number;
  tStat: number;
  df: number;
  pSignificant: boolean;
  winner: "A" | "B" | "tie";
  /** For lowerBetter metrics: A wins if meanDiff > 0 (A has higher values = worse). So B wins. */
}

/**
 * Paired t-test for comparing two models across multiple runs.
 * Returns whether the difference is statistically significant (p < 0.05).
 * @param runsA - Metric values from model A (one per run)
 * @param runsB - Metric values from model B (one per run)
 * @param lowerBetter - If true, lower values are better (e.g. MAE, RMSE)
 */
export function pairedTTest(
  runsA: number[],
  runsB: number[],
  lowerBetter: boolean
): PairedTTestResult | null {
  const n = Math.min(runsA.length, runsB.length);
  if (n < 2) return null;

  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = runsA[i];
    const b = runsB[i];
    if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) continue;
    diffs.push(a - b);
  }
  if (diffs.length < 2) return null;

  const meanDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const variance =
    diffs.reduce((s, d) => s + (d - meanDiff) ** 2, 0) / (diffs.length - 1);
  const stdDiff = Math.sqrt(variance);
  const df = diffs.length - 1;
  const tStat = stdDiff > 1e-10 ? Math.abs(meanDiff) / (stdDiff / Math.sqrt(diffs.length)) : 0;
  const critical = getCriticalValue(df);
  const pSignificant = tStat > critical;

  let winner: "A" | "B" | "tie" = "tie";
  if (pSignificant) {
    if (lowerBetter) {
      winner = meanDiff > 0 ? "B" : "A"; // A - B > 0 means A is worse, so B wins
    } else {
      winner = meanDiff > 0 ? "A" : "B"; // A - B > 0 means A is better
    }
  }

  return {
    meanDiff,
    stdDiff,
    tStat,
    df,
    pSignificant,
    winner,
  };
}
