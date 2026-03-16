/**
 * Compute extreme event performance metrics from prediction data.
 */

export interface ModelKey {
  prefix: string;
  label: string;
  color: string;
}

export interface DataPoint {
  y_test: number;
  [key: string]: number | string | [number, number] | undefined;
}

export interface ExtremeEventStats {
  pctNegativeActual: number;
  top10Count: number;
  bottom10Count: number;
  modelStats: {
    label: string;
    color: string;
    pctNegativePred: number;
    top10: {
      n: number;
      mae: number | null;
      rmse: number | null;
      mpiw: number | null;
      intervalScore: number | null;
      crps: number | null;
      picp: number;
      maeRatio: number;
    };
    bottom10: {
      n: number;
      mae: number | null;
      rmse: number | null;
      mpiw: number | null;
      intervalScore: number | null;
      crps: number | null;
      picp: number;
      maeRatio: number;
    };
  }[];
}

const EXTREME_PERCENTILE = 0.1;

export function computeExtremeEventStats(
  data: DataPoint[],
  modelKeys: ModelKey[],
  overallMaes: Record<string, number>
): ExtremeEventStats | null {
  if (data.length === 0 || modelKeys.length === 0) return null;

  const sortedByPrice = [...data].sort((a, b) => (a.y_test as number) - (b.y_test as number));
  const n = sortedByPrice.length;
  const top10Count = Math.max(1, Math.floor(n * EXTREME_PERCENTILE));
  const bottom10Count = Math.max(1, Math.floor(n * EXTREME_PERCENTILE));

  const top10Points = sortedByPrice.slice(-top10Count);
  const bottom10Points = sortedByPrice.slice(0, bottom10Count);

  const pctNegativeActual = (data.filter((p) => (p.y_test as number) < 0).length / data.length) * 100;

  const modelStats = modelKeys.map(({ prefix, label, color }) => {
    const meanKey = `${prefix}_mean`;
    const qLoKey = `${prefix}_q_0.025`;
    const qHiKey = `${prefix}_q_0.975`;

    let top10AE = 0, top10SE = 0, top10MPIW = 0, top10MPIWCount = 0, top10IS = 0, top10ISCount = 0, top10CRPS = 0, top10CRPSCount = 0, top10N = 0;
    let bottom10AE = 0, bottom10SE = 0, bottom10MPIW = 0, bottom10MPIWCount = 0, bottom10IS = 0, bottom10ISCount = 0, bottom10CRPS = 0, bottom10CRPSCount = 0, bottom10N = 0;

    const quantileKeys: [number, string][] = [
      [0.025, qLoKey], [0.1, `${prefix}_q_0.1`], [0.25, `${prefix}_q_0.25`],
      [0.5, `${prefix}_q_0.5`], [0.75, `${prefix}_q_0.75`], [0.9, `${prefix}_q_0.9`], [0.975, qHiKey],
    ];

    for (const p of top10Points) {
      const actual = p.y_test as number;
      const pred = Number(p[meanKey]) ?? 0;
      if (actual == null || Number.isNaN(actual)) continue;
      top10AE += Math.abs(actual - pred);
      top10SE += (actual - pred) ** 2;
      top10N++;

      const lo = Number(p[qLoKey]);
      const hi = Number(p[qHiKey]);
      if (!isNaN(lo) && !isNaN(hi) && lo !== 0 && hi !== 0) {
        top10MPIW += hi - lo;
        top10MPIWCount++;
        top10IS += hi - lo;
        if (actual < lo) top10IS += (2 / 0.05) * (lo - actual);
        if (actual > hi) top10IS += (2 / 0.05) * (actual - hi);
        top10ISCount++;
      }

      const quantiles = quantileKeys.map(([q, key]) => [q, Number(p[key])] as [number, number]).filter(([, v]) => !isNaN(v) && v !== 0);
      if (quantiles.length >= 2) {
        let pb = 0;
        for (const [tau, qv] of quantiles) {
          pb += actual >= qv ? tau * (actual - qv) : (1 - tau) * (qv - actual);
        }
        top10CRPS += pb / quantiles.length;
        top10CRPSCount++;
      }
    }

    for (const p of bottom10Points) {
      const actual = p.y_test as number;
      const pred = Number(p[meanKey]) ?? 0;
      if (actual == null || Number.isNaN(actual)) continue;
      bottom10AE += Math.abs(actual - pred);
      bottom10SE += (actual - pred) ** 2;
      bottom10N++;

      const lo = Number(p[qLoKey]);
      const hi = Number(p[qHiKey]);
      if (!isNaN(lo) && !isNaN(hi) && lo !== 0 && hi !== 0) {
        bottom10MPIW += hi - lo;
        bottom10MPIWCount++;
        bottom10IS += hi - lo;
        if (actual < lo) bottom10IS += (2 / 0.05) * (lo - actual);
        if (actual > hi) bottom10IS += (2 / 0.05) * (actual - hi);
        bottom10ISCount++;
      }

      const quantiles = quantileKeys.map(([q, key]) => [q, Number(p[key])] as [number, number]).filter(([, v]) => !isNaN(v) && v !== 0);
      if (quantiles.length >= 2) {
        let pb = 0;
        for (const [tau, qv] of quantiles) {
          pb += actual >= qv ? tau * (actual - qv) : (1 - tau) * (qv - actual);
        }
        bottom10CRPS += pb / quantiles.length;
        bottom10CRPSCount++;
      }
    }

    const pctNegativePred = (data.filter((p) => (Number(p[meanKey]) ?? 0) < 0).length / data.length) * 100;
    const overallMae = overallMaes[label] ?? 0;
    const top10Mae = top10N > 0 ? top10AE / top10N : 0;
    const bottom10Mae = bottom10N > 0 ? bottom10AE / bottom10N : 0;

    const top10PICPRate = top10N > 0
      ? (top10Points.filter((p) => {
          const actual = p.y_test as number;
          const lo = Number(p[qLoKey]);
          const hi = Number(p[qHiKey]);
          return !isNaN(lo) && !isNaN(hi) && actual >= lo && actual <= hi;
        }).length / top10N) * 100
      : 0;

    const bottom10PICPRate = bottom10N > 0
      ? (bottom10Points.filter((p) => {
          const actual = p.y_test as number;
          const lo = Number(p[qLoKey]);
          const hi = Number(p[qHiKey]);
          return !isNaN(lo) && !isNaN(hi) && actual >= lo && actual <= hi;
        }).length / bottom10N) * 100
      : 0;

    return {
      label,
      color,
      pctNegativePred,
      top10: {
        n: top10N,
        mae: top10N > 0 ? top10AE / top10N : null,
        rmse: top10N > 0 ? Math.sqrt(top10SE / top10N) : null,
        mpiw: top10MPIWCount > 0 ? top10MPIW / top10MPIWCount : null,
        intervalScore: top10ISCount > 0 ? top10IS / top10ISCount : null,
        crps: top10CRPSCount > 0 ? top10CRPS / top10CRPSCount : null,
        picp: top10PICPRate,
        maeRatio: overallMae > 0 ? top10Mae / overallMae : 0,
      },
      bottom10: {
        n: bottom10N,
        mae: bottom10N > 0 ? bottom10AE / bottom10N : null,
        rmse: bottom10N > 0 ? Math.sqrt(bottom10SE / bottom10N) : null,
        mpiw: bottom10MPIWCount > 0 ? bottom10MPIW / bottom10MPIWCount : null,
        intervalScore: bottom10ISCount > 0 ? bottom10IS / bottom10ISCount : null,
        crps: bottom10CRPSCount > 0 ? bottom10CRPS / bottom10CRPSCount : null,
        picp: bottom10PICPRate,
        maeRatio: overallMae > 0 ? bottom10Mae / overallMae : 0,
      },
    };
  });

  return {
    pctNegativeActual,
    top10Count,
    bottom10Count,
    modelStats,
  };
}
