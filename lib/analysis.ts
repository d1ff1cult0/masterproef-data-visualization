/**
 * Pure computation functions for the Analysis tab.
 * Reuses ModelKey / DataPoint from extreme-events.ts.
 */

import type { ModelKey, DataPoint } from "./extreme-events";

// ── Feature 1: Per-Hour MAE ─────────────────────────────────────────────────

export interface PerHourRow {
  hour: number;
  [modelLabel: string]: number;
}

export function computePerHourMAE(
  data: DataPoint[],
  modelKeys: ModelKey[]
): PerHourRow[] {
  // bucket points by hour (0-23)
  const buckets: DataPoint[][] = Array.from({ length: 24 }, () => []);
  for (const p of data) {
    const h = Number(p.hour);
    if (h >= 0 && h < 24) buckets[h].push(p);
  }

  return buckets.map((points, hour) => {
    const row: PerHourRow = { hour };
    for (const { prefix, label } of modelKeys) {
      const meanKey = `${prefix}_mean`;
      let ae = 0;
      let n = 0;
      for (const p of points) {
        const actual = p.y_test as number;
        const pred = Number(p[meanKey]);
        if (!isNaN(actual) && !isNaN(pred)) {
          ae += Math.abs(actual - pred);
          n++;
        }
      }
      row[label] = n > 0 ? ae / n : 0;
    }
    return row;
  });
}

// ── Feature 2: Regime Breakdown ─────────────────────────────────────────────

export interface RegimeRow {
  regime: string;
  n: number;
  [key: string]: number | string; // ${label}_mae, ${label}_rmse, ${label}_crps
}

const QUANTILE_KEYS: [number, string][] = [
  [0.025, "q_0.025"],
  [0.1, "q_0.1"],
  [0.25, "q_0.25"],
  [0.5, "q_0.5"],
  [0.75, "q_0.75"],
  [0.9, "q_0.9"],
  [0.975, "q_0.975"],
];

function crpsFromQuantiles(
  actual: number,
  quantiles: [number, number][]
): number | null {
  if (quantiles.length < 2) return null;
  let pb = 0;
  for (const [tau, qv] of quantiles) {
    pb += actual >= qv ? tau * (actual - qv) : (1 - tau) * (qv - actual);
  }
  return pb / quantiles.length;
}

function metricsForSubset(
  points: DataPoint[],
  prefix: string
): { mae: number; rmse: number; crps: number | null } {
  const meanKey = `${prefix}_mean`;
  let ae = 0;
  let se = 0;
  let crpsSum = 0;
  let crpsN = 0;
  let n = 0;

  for (const p of points) {
    const actual = p.y_test as number;
    const pred = Number(p[meanKey]);
    if (isNaN(actual) || isNaN(pred)) continue;
    ae += Math.abs(actual - pred);
    se += (actual - pred) ** 2;
    n++;

    const qs = QUANTILE_KEYS.map(
      ([tau, qSuffix]) => [tau, Number(p[`${prefix}_${qSuffix}`])] as [number, number]
    ).filter(([, v]) => !isNaN(v) && v !== 0);
    const c = crpsFromQuantiles(actual, qs);
    if (c !== null) {
      crpsSum += c;
      crpsN++;
    }
  }

  return {
    mae: n > 0 ? ae / n : 0,
    rmse: n > 0 ? Math.sqrt(se / n) : 0,
    crps: crpsN > 0 ? crpsSum / crpsN : null,
  };
}

export function computeRegimeMetrics(
  data: DataPoint[],
  modelKeys: ModelKey[]
): { rows: RegimeRow[]; p10: number; p90: number } {
  // compute daily mean price and derive percentile thresholds
  const dailyMap = new Map<number, number[]>();
  for (const p of data) {
    const day = Number(p.day);
    if (isNaN(day)) continue;
    if (!dailyMap.has(day)) dailyMap.set(day, []);
    dailyMap.get(day)!.push(p.y_test as number);
  }
  const dailyMeans = new Map<number, number>();
  for (const [day, prices] of dailyMap) {
    dailyMeans.set(day, prices.reduce((a, b) => a + b, 0) / prices.length);
  }
  const sortedMeans = [...dailyMeans.values()].sort((a, b) => a - b);
  const p10 = sortedMeans[Math.floor(sortedMeans.length * 0.1)] ?? 0;
  const p90 = sortedMeans[Math.floor(sortedMeans.length * 0.9)] ?? 0;

  // classify each point
  const low: DataPoint[] = [];
  const normal: DataPoint[] = [];
  const high: DataPoint[] = [];
  for (const p of data) {
    const dm = dailyMeans.get(Number(p.day));
    if (dm === undefined) continue;
    if (dm < p10) low.push(p);
    else if (dm > p90) high.push(p);
    else normal.push(p);
  }

  const regimes: [string, DataPoint[]][] = [
    ["Low (<p10)", low],
    ["Normal", normal],
    ["High (>p90)", high],
    ["Overall", data],
  ];

  const rows: RegimeRow[] = regimes.map(([regime, points]) => {
    const row: RegimeRow = { regime, n: points.length };
    for (const { prefix, label } of modelKeys) {
      const m = metricsForSubset(points, prefix);
      row[`${label}_mae`] = m.mae;
      row[`${label}_rmse`] = m.rmse;
      row[`${label}_crps`] = m.crps ?? 0;
    }
    return row;
  });

  return { rows, p10, p90 };
}

// ── Feature 3: Ensemble Builder ─────────────────────────────────────────────

export interface EnsembleResult {
  mae: number;
  rmse: number;
  crps: number | null;
}

export function computeEnsembleMetrics(
  data: DataPoint[],
  modelKeys: ModelKey[],
  weights: number[]
): EnsembleResult {
  let ae = 0;
  let se = 0;
  let crpsSum = 0;
  let crpsN = 0;
  let n = 0;

  for (const p of data) {
    const actual = p.y_test as number;
    if (isNaN(actual)) continue;

    // weighted mean prediction
    let ensMean = 0;
    let validMean = true;
    for (let i = 0; i < modelKeys.length; i++) {
      const pred = Number(p[`${modelKeys[i].prefix}_mean`]);
      if (isNaN(pred)) {
        validMean = false;
        break;
      }
      ensMean += weights[i] * pred;
    }
    if (!validMean) continue;

    ae += Math.abs(actual - ensMean);
    se += (actual - ensMean) ** 2;
    n++;

    // weighted quantile ensemble for CRPS
    const ensQ: [number, number][] = [];
    for (const [tau, qSuffix] of QUANTILE_KEYS) {
      let ensQVal = 0;
      let valid = true;
      for (let i = 0; i < modelKeys.length; i++) {
        const qv = Number(p[`${modelKeys[i].prefix}_${qSuffix}`]);
        if (isNaN(qv) || qv === 0) {
          valid = false;
          break;
        }
        ensQVal += weights[i] * qv;
      }
      if (valid) ensQ.push([tau, ensQVal]);
    }
    const c = crpsFromQuantiles(actual, ensQ);
    if (c !== null) {
      crpsSum += c;
      crpsN++;
    }
  }

  return {
    mae: n > 0 ? ae / n : 0,
    rmse: n > 0 ? Math.sqrt(se / n) : 0,
    crps: crpsN > 0 ? crpsSum / crpsN : null,
  };
}

/** Compute individual model MAE (for comparison / Inverse-MAE weights). */
export function computeModelMAE(
  data: DataPoint[],
  prefix: string
): number {
  const meanKey = `${prefix}_mean`;
  let ae = 0;
  let n = 0;
  for (const p of data) {
    const actual = p.y_test as number;
    const pred = Number(p[meanKey]);
    if (!isNaN(actual) && !isNaN(pred)) {
      ae += Math.abs(actual - pred);
      n++;
    }
  }
  return n > 0 ? ae / n : 0;
}

// ── Feature 4: Calibration Plot ─────────────────────────────────────────────

export interface CalibrationRow {
  nominal: number;
  perfect: number;
  [modelLabel: string]: number;
}

const NOMINAL_LEVELS = [0.025, 0.1, 0.25, 0.5, 0.75, 0.9, 0.975];

export function computeCalibration(
  data: DataPoint[],
  modelKeys: ModelKey[]
): CalibrationRow[] {
  // prepend (0,0) and append (1,1) for the diagonal
  const rows: CalibrationRow[] = [{ nominal: 0, perfect: 0 }];

  for (const nominal of NOMINAL_LEVELS) {
    const row: CalibrationRow = { nominal, perfect: nominal };
    for (const { prefix, label } of modelKeys) {
      const qKey = `${prefix}_q_${nominal}`;
      let below = 0;
      let total = 0;
      for (const p of data) {
        const actual = p.y_test as number;
        const qv = Number(p[qKey]);
        if (isNaN(actual) || isNaN(qv) || qv === 0) continue;
        if (actual <= qv) below++;
        total++;
      }
      row[label] = total > 0 ? below / total : NaN;
    }
    rows.push(row);
  }

  rows.push({ nominal: 1, perfect: 1 });

  // fill model values at endpoints for continuous lines
  for (const { label } of modelKeys) {
    rows[0][label] = 0;
    rows[rows.length - 1][label] = 1;
  }

  return rows;
}
