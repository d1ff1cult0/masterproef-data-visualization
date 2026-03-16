import fs from "fs";

// ──────────────────── Types ────────────────────

export interface SummaryStatRow {
  column: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
  skewness: number;
  kurtosis: number;
  iqr: number;
}

export interface EDAResult {
  overview: {
    totalRows: number;
    totalColumns: number;
    dateRange: { start: string; end: string };
    columns: string[];
    frequency: string;
  };
  summaryStats: SummaryStatRow[];
  priceSeries: { date: string; avg: number; min: number; max: number; rollingMean: number; rollingStd: number }[];
  monthlyAvgPrices: { month: string; avg: number; median: number }[];
  priceDistribution: {
    histogram: { binStart: number; binEnd: number; count: number }[];
    boxPlot: { min: number; q1: number; median: number; q3: number; max: number; whiskerLow: number; whiskerHigh: number; outlierCount: number };
    qqPlot: { theoretical: number; actual: number }[];
    stats: { mean: number; std: number; skewness: number; kurtosis: number };
  };
  negativePrices: {
    count: number;
    pct: number;
    avgNegative: number;
    minPrice: number;
    timeline: { date: string; price: number }[];
    monthlyDistribution: { month: string; count: number; pct: number }[];
    hourlyDistribution: { hour: number; count: number; pct: number }[];
  };
  temporalPatterns: {
    hourly: { hour: number; mean: number; median: number; std: number; q25: number; q75: number }[];
    daily: { day: number; name: string; mean: number; median: number; std: number }[];
    monthly: { month: number; name: string; mean: number; median: number; std: number }[];
  };
  heatmaps: {
    weekly: { hour: number; day: number; dayName: string; value: number }[];
    monthly: { hour: number; month: number; monthName: string; value: number }[];
  };
  weekendWeekday: {
    weekday: { mean: number; median: number; std: number; min: number; max: number; count: number };
    weekend: { mean: number; median: number; std: number; min: number; max: number; count: number };
    weekdayHist: { binStart: number; binEnd: number; count: number }[];
    weekendHist: { binStart: number; binEnd: number; count: number }[];
    weekdayByHour: { hour: number; mean: number }[];
    weekendByHour: { hour: number; mean: number }[];
  };
  correlations: {
    features: string[];
    matrix: number[][];
    withPrices: { feature: string; correlation: number }[];
    scatterVsPrices: { feature: string; points: { x: number; y: number }[] }[];
  };
  crossBorder: {
    daily: { date: string; BE: number; FR: number; NL: number }[];
    spreads: { date: string; BE_FR: number; BE_NL: number }[];
    spreadStats: { name: string; mean: number; std: number; min: number; max: number; pctPositive: number }[];
  };
  loadAnalysis: {
    forecastVsActual: { forecast: number; actual: number }[];
    imbalanceHist: { binStart: number; binEnd: number; count: number }[];
    imbalanceStats: { mean: number; std: number; min: number; max: number; skewness: number; kurtosis: number; shapiroWilk?: { W: number; pValue: number } };
  };
  renewables: {
    weekly: { week: string; wind: number; solar: number }[];
  };
  crossBorderFlows: {
    weekly: { week: string; BE_NL: number; BE_FR: number; BE_DE: number }[];
  };
  autocorrelation: {
    acf: { lag: number; value: number; ci: number }[];
    priceChangesHist: { binStart: number; binEnd: number; count: number }[];
    priceChangeStats: { mean: number; std: number; skewness: number; kurtosis: number };
  };
  featureDistributions: { feature: string; histogram: { binStart: number; binEnd: number; count: number }[]; mean: number; std: number }[];
  outlierAnalysis: {
    boxPlots: { feature: string; q1: number; median: number; q3: number; whiskerLow: number; whiskerHigh: number; outlierCount: number; totalCount: number }[];
  };
  pairPlot: {
    features: string[];
    data: Record<string, number>[];
  };
  volatility: {
    daily: { date: string; volatility: number; price: number }[];
    monthly: { month: string; volatility: number; avgPrice: number }[];
  };
  yearOverYear: {
    years: number[];
    monthlyByYear: { month: number; monthName: string; values: { year: number; avg: number }[] }[];
  };
  priceDurationCurve: { pct: number; price: number }[];
  peakOffPeak: {
    peak: { mean: number; median: number; std: number; count: number };
    offPeak: { mean: number; median: number; std: number; count: number };
  };
}

// ──────────────────── Statistical Helpers ────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function variance(arr: number[], m?: number): number {
  if (arr.length < 2) return 0;
  const mu = m ?? mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - mu) ** 2;
  return s / (arr.length - 1);
}

function stddev(arr: number[], m?: number): number {
  return Math.sqrt(variance(arr, m));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function skewness(arr: number[], m?: number, s?: number): number {
  const n = arr.length;
  if (n < 3) return 0;
  const mu = m ?? mean(arr);
  const sigma = s ?? stddev(arr, mu);
  if (sigma === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += ((arr[i] - mu) / sigma) ** 3;
  return (n * sum) / ((n - 1) * (n - 2));
}

function kurtosis(arr: number[], m?: number, s?: number): number {
  const n = arr.length;
  if (n < 4) return 0;
  const mu = m ?? mean(arr);
  const sigma = s ?? stddev(arr, mu);
  if (sigma === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += ((arr[i] - mu) / sigma) ** 4;
  return sum / n - 3;
}

function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

function normalInvCDF(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/** Standard normal CDF (Abramowitz & Stegun 26.2.17) */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const p = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return x >= 0 ? p : 1 - p;
}

/** Shapiro-Wilk test for normality. Returns W and p-value. For n>5000, samples 5000 points. */
function shapiroWilk(values: number[]): { W: number; pValue: number } | null {
  let x = [...values].sort((a, b) => a - b);
  if (x.length > 5000) x = sampleArray(x, 5000);
  const n = x.length;
  if (n < 3) return null;

  function poly(cc: number[], nord: number, xx: number): number {
    let ret = cc[0];
    if (nord > 1) {
      let p = xx * cc[nord - 1];
      for (let j = nord - 2; j > 0; j--) p = (p + cc[j]) * xx;
      ret += p;
    }
    return ret;
  }

  const nn2 = Math.floor(n / 2);
  const a: number[] = [];
  const g = [-2.273, 0.459];
  const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
  const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
  const c3 = [0.544, -0.39978, 0.025054, -6.714e-4];
  const c4 = [1.3822, -0.77857, 0.062767, -0.0020322];
  const c5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
  const c6 = [-0.4803, -0.082676, 0.0030302];
  const small = 1e-19;
  const an = n;
  const an25 = an + 0.25;

  let summ2 = 0;
  for (let i = 1; i <= nn2; i++) {
    const ai = normalInvCDF((i - 0.375) / an25);
    a[i] = ai;
    summ2 += ai * ai;
  }
  summ2 *= 2;
  const ssumm2 = Math.sqrt(summ2);
  const rsn = 1 / Math.sqrt(an);
  let a1 = poly(c1, 6, rsn) - a[1] / ssumm2;

  let i1: number;
  let fac: number;
  if (n > 5) {
    i1 = 3;
    const a2 = -a[2] / ssumm2 + poly(c2, 6, rsn);
    fac = Math.sqrt((summ2 - 2 * a[1] * a[1] - 2 * a[2] * a[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
    a[2] = a2;
  } else {
    i1 = 2;
    fac = Math.sqrt((summ2 - 2 * a[1] * a[1]) / (1 - 2 * a1 * a1));
  }
  a[1] = a1;
  for (let i = i1; i <= nn2; i++) a[i] /= -fac;

  const range = x[n - 1] - x[0];
  if (range < small) return null;

  let sa = -a[1];
  let sx = x[0] / range;
  let xx = x[0] / range;
  for (let i = 1, j = n - 1; i < n; j--) {
    const xi = x[i] / range;
    if (xx - xi > small) return null;
    sx += xi;
    i++;
    if (i !== j) sa += (i - j > 0 ? 1 : -1) * a[Math.min(i, j)];
    xx = xi;
  }

  sa /= n;
  sx /= n;
  let ssa = 0, ssx = 0, sax = 0;
  for (let i = 0, j = n - 1; i < n; i++, j--) {
    const asa = (i !== j ? ((i - j > 0 ? 1 : -1) * a[1 + Math.min(i, j)] - sa) : -sa);
    const xsx = x[i] / range - sx;
    ssa += asa * asa;
    ssx += xsx * xsx;
    sax += asa * xsx;
  }

  const ssassx = Math.sqrt(ssa * ssx);
  const w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx);
  const w = 1 - w1;

  let pw: number;
  if (n === 3) {
    const stqr = Math.asin(Math.sqrt(0.75));
    pw = (6 / Math.PI) * (Math.asin(Math.sqrt(w)) - stqr);
    pw = Math.max(0, pw);
  } else {
    const y = Math.log(w1);
    const xxLog = Math.log(an);
    let m: number, s: number;
    if (n <= 11) {
      const gamma = poly(g, 2, an);
      if (y >= gamma) {
        pw = 1e-99;
      } else {
        const yTrans = -Math.log(gamma - y);
        m = poly(c3, 4, an);
        s = Math.exp(poly(c4, 4, an));
        pw = 1 - normalCDF((yTrans - m) / s);
      }
    } else {
      m = poly(c5, 4, xxLog);
      s = Math.exp(poly(c6, 3, xxLog));
      pw = 1 - normalCDF((y - m) / s);
    }
  }

  return { W: w, pValue: Math.max(1e-99, Math.min(1, pw)) };
}

function histogram(values: number[], bins: number): { binStart: number; binEnd: number; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;
  const result: { binStart: number; binEnd: number; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    result.push({ binStart: min + i * binWidth, binEnd: min + (i + 1) * binWidth, count: 0 });
  }
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    result[idx].count++;
  }
  return result;
}

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    result.push(arr[Math.floor(i * step)]);
  }
  return result;
}

// ──────────────────── CSV Parsing ────────────────────

interface DataRow {
  Date: string;
  Prices: number;
  Hour: number;
  DayOfWeek: number;
  Month: number;
  IsWeekend: number;
  DayOfYear: number;
  WeekOfYear: number;
  NL_Prices: number;
  FR_Prices: number;
  FR_Generation_Forecast: number;
  BE_Wind_Forecast: number;
  FR_Load_Forecast: number;
  BE_Load_Actual: number;
  BE_Load_Forecast: number;
  BE_Solar_Forecast: number;
  Price_Spread_FR: number;
  Flow_BE_NL: number;
  BE_Generation_Actual: number;
  Flow_BE_FR: number;
  BE_Load_Imbalance: number;
  Price_Spread_NL: number;
  Flow_BE_DE: number;
  [key: string]: number | string;
}

function parseCSV(filePath: string): { headers: string[]; rows: DataRow[] } {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim().length > 0);
  const headers = lines[0].split(",");
  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    const row: Record<string, number | string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j] === "Date") {
        row[headers[j]] = vals[j];
      } else {
        row[headers[j]] = parseFloat(vals[j]) || 0;
      }
    }
    rows.push(row as DataRow);
  }
  return { headers, rows };
}

// ──────────────────── Grouping Helpers ────────────────────

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function statsForGroup(values: number[]): { mean: number; median: number; std: number; min: number; max: number; q25: number; q75: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  return {
    mean: m,
    median: quantile(sorted, 0.5),
    std: stddev(values, m),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q25: quantile(sorted, 0.25),
    q75: quantile(sorted, 0.75),
  };
}

// ──────────────────── Feature Sets ────────────────────

const KEY_FEATURES = [
  "Prices", "NL_Prices", "FR_Prices",
  "FR_Generation_Forecast", "BE_Wind_Forecast", "FR_Load_Forecast",
  "BE_Load_Actual", "BE_Load_Forecast", "BE_Solar_Forecast",
  "Price_Spread_FR", "Price_Spread_NL",
  "Flow_BE_NL", "Flow_BE_FR", "Flow_BE_DE",
  "BE_Generation_Actual", "BE_Load_Imbalance",
];

const PAIR_PLOT_FEATURES = ["Prices", "FR_Prices", "NL_Prices", "BE_Load_Actual", "BE_Wind_Forecast", "BE_Solar_Forecast"];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NUMERIC_COLUMNS = [
  "Prices", "Hour", "DayOfWeek", "Month", "IsWeekend", "DayOfYear", "WeekOfYear",
  "Hour_sin", "Hour_cos", "DayOfWeek_sin", "DayOfWeek_cos", "Month_sin", "Month_cos",
  "NL_Prices", "FR_Prices",
  "FR_Generation_Forecast", "BE_Wind_Forecast", "FR_Load_Forecast",
  "BE_Load_Actual", "BE_Load_Forecast", "BE_Solar_Forecast",
  "Price_Spread_FR", "Flow_BE_NL", "BE_Generation_Actual",
  "Flow_BE_FR", "BE_Load_Imbalance", "Price_Spread_NL", "Flow_BE_DE",
];

// ──────────────────── Main Computation ────────────────────

let cachedResult: EDAResult | null = null;

export function computeEDA(): EDAResult {
  if (cachedResult) return cachedResult;

  const datasetPath = process.env.DATASET_PATH!;
  const { headers, rows } = parseCSV(datasetPath);
  const n = rows.length;

  // Overview
  const overview = {
    totalRows: n,
    totalColumns: headers.length,
    dateRange: { start: rows[0].Date, end: rows[n - 1].Date },
    columns: headers,
    frequency: "Hourly",
  };

  // Summary Statistics
  const summaryStats: SummaryStatRow[] = NUMERIC_COLUMNS.map(col => {
    const vals = rows.map(r => Number(r[col]));
    const sorted = [...vals].sort((a, b) => a - b);
    const m = mean(vals);
    const s = stddev(vals, m);
    const q25v = quantile(sorted, 0.25);
    const q75v = quantile(sorted, 0.75);
    return {
      column: col,
      count: vals.length,
      mean: m,
      std: s,
      min: sorted[0],
      q25: q25v,
      median: quantile(sorted, 0.5),
      q75: q75v,
      max: sorted[sorted.length - 1],
      skewness: skewness(vals, m, s),
      kurtosis: kurtosis(vals, m, s),
      iqr: q75v - q25v,
    };
  });

  // Price Series (daily aggregation)
  const prices = rows.map(r => r.Prices);
  const dailyGroups = groupBy(rows, r => r.Date.slice(0, 10));
  const dailyEntries = [...dailyGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const dailyAvgs = dailyEntries.map(([date, group]) => {
    const p = group.map(r => r.Prices);
    return { date, avg: mean(p), min: Math.min(...p), max: Math.max(...p) };
  });

  const rollingWindow = 7;
  const priceSeries = dailyAvgs.map((d, i) => {
    const windowStart = Math.max(0, i - rollingWindow + 1);
    const window = dailyAvgs.slice(windowStart, i + 1).map(x => x.avg);
    return {
      date: d.date,
      avg: round(d.avg),
      min: round(d.min),
      max: round(d.max),
      rollingMean: round(mean(window)),
      rollingStd: round(stddev(window)),
    };
  });

  // Monthly Average Prices
  const monthlyGroups = groupBy(rows, r => r.Date.slice(0, 7));
  const monthlyAvgPrices = [...monthlyGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, group]) => {
      const p = group.map(r => r.Prices);
      const sorted = [...p].sort((a, b) => a - b);
      return { month, avg: round(mean(p)), median: round(quantile(sorted, 0.5)) };
    });

  // Price Distribution
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const priceMean = mean(prices);
  const priceStd = stddev(prices, priceMean);
  const q1 = quantile(sortedPrices, 0.25);
  const q3 = quantile(sortedPrices, 0.75);
  const iqr = q3 - q1;
  const whiskerLow = Math.max(sortedPrices[0], q1 - 1.5 * iqr);
  const whiskerHigh = Math.min(sortedPrices[sortedPrices.length - 1], q3 + 1.5 * iqr);
  const outlierCount = sortedPrices.filter(v => v < whiskerLow || v > whiskerHigh).length;

  const qqN = 200;
  const qqPlot: { theoretical: number; actual: number }[] = [];
  for (let i = 0; i < qqN; i++) {
    const p = (i + 0.5) / qqN;
    qqPlot.push({
      theoretical: round(normalInvCDF(p) * priceStd + priceMean),
      actual: round(quantile(sortedPrices, p)),
    });
  }

  const priceDistribution = {
    histogram: histogram(prices, 60),
    boxPlot: {
      min: sortedPrices[0],
      q1: round(q1),
      median: round(quantile(sortedPrices, 0.5)),
      q3: round(q3),
      max: sortedPrices[sortedPrices.length - 1],
      whiskerLow: round(whiskerLow),
      whiskerHigh: round(whiskerHigh),
      outlierCount,
    },
    qqPlot,
    stats: {
      mean: round(priceMean),
      std: round(priceStd),
      skewness: round(skewness(prices, priceMean, priceStd)),
      kurtosis: round(kurtosis(prices, priceMean, priceStd)),
    },
  };

  // Negative Prices
  const negPrices = rows.filter(r => r.Prices < 0);
  const negPriceValues = negPrices.map(r => r.Prices);
  const negMonthlyGroups = groupBy(negPrices, r => r.Date.slice(0, 7));
  const negHourlyGroups = groupBy(negPrices, r => String(r.Hour));

  const negativePrices = {
    count: negPrices.length,
    pct: round((negPrices.length / n) * 100),
    avgNegative: negPriceValues.length > 0 ? round(mean(negPriceValues)) : 0,
    minPrice: negPriceValues.length > 0 ? Math.min(...negPriceValues) : 0,
    timeline: negPrices.map(r => ({ date: r.Date, price: round(r.Prices) })),
    monthlyDistribution: [...monthlyGroups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, group]) => {
        const negCount = negMonthlyGroups.get(month)?.length ?? 0;
        return { month, count: negCount, pct: round((negCount / group.length) * 100) };
      }),
    hourlyDistribution: Array.from({ length: 24 }, (_, h) => {
      const count = negHourlyGroups.get(String(h))?.length ?? 0;
      const totalAtHour = rows.filter(r => r.Hour === h).length;
      return { hour: h, count, pct: round(totalAtHour > 0 ? (count / totalAtHour) * 100 : 0) };
    }),
  };

  // Temporal Patterns
  const hourlyGroups = groupBy(rows, r => String(r.Hour));
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const group = hourlyGroups.get(String(h)) ?? [];
    const p = group.map(r => r.Prices);
    const st = statsForGroup(p);
    return { hour: h, mean: round(st.mean), median: round(st.median), std: round(st.std), q25: round(st.q25), q75: round(st.q75) };
  });

  const dowGroups = groupBy(rows, r => String(r.DayOfWeek));
  const daily = Array.from({ length: 7 }, (_, d) => {
    const group = dowGroups.get(String(d)) ?? [];
    const p = group.map(r => r.Prices);
    const st = statsForGroup(p);
    return { day: d, name: DAY_NAMES[d], mean: round(st.mean), median: round(st.median), std: round(st.std) };
  });

  const monGroups = groupBy(rows, r => String(r.Month));
  const monthly = Array.from({ length: 12 }, (_, m) => {
    const group = monGroups.get(String(m + 1)) ?? [];
    const p = group.map(r => r.Prices);
    if (p.length === 0) return { month: m + 1, name: MONTH_NAMES[m], mean: 0, median: 0, std: 0 };
    const st = statsForGroup(p);
    return { month: m + 1, name: MONTH_NAMES[m], mean: round(st.mean), median: round(st.median), std: round(st.std) };
  });

  // Heatmaps
  const weeklyHeatmap: EDAResult["heatmaps"]["weekly"] = [];
  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 7; d++) {
      const group = rows.filter(r => r.Hour === h && r.DayOfWeek === d);
      weeklyHeatmap.push({ hour: h, day: d, dayName: DAY_NAMES[d], value: round(mean(group.map(r => r.Prices))) });
    }
  }
  const monthlyHeatmap: EDAResult["heatmaps"]["monthly"] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 1; m <= 12; m++) {
      const group = rows.filter(r => r.Hour === h && r.Month === m);
      if (group.length === 0) { monthlyHeatmap.push({ hour: h, month: m, monthName: MONTH_NAMES[m - 1], value: 0 }); continue; }
      monthlyHeatmap.push({ hour: h, month: m, monthName: MONTH_NAMES[m - 1], value: round(mean(group.map(r => r.Prices))) });
    }
  }

  // Weekend vs Weekday
  const weekdayRows = rows.filter(r => r.IsWeekend === 0);
  const weekendRows = rows.filter(r => r.IsWeekend === 1);
  const weekdayPrices = weekdayRows.map(r => r.Prices);
  const weekendPrices = weekendRows.map(r => r.Prices);
  const wdStats = statsForGroup(weekdayPrices);
  const weStats = statsForGroup(weekendPrices);
  const histRangeMin = quantile(sortedPrices, 0.02);
  const histRangeMax = quantile(sortedPrices, 0.98);
  const weekdayByHour = Array.from({ length: 24 }, (_, h) => {
    const p = weekdayRows.filter(r => r.Hour === h).map(r => r.Prices);
    return { hour: h, mean: p.length > 0 ? round(mean(p)) : 0 };
  });
  const weekendByHour = Array.from({ length: 24 }, (_, h) => {
    const p = weekendRows.filter(r => r.Hour === h).map(r => r.Prices);
    return { hour: h, mean: p.length > 0 ? round(mean(p)) : 0 };
  });
  const weekendWeekday = {
    weekday: { mean: round(wdStats.mean), median: round(wdStats.median), std: round(wdStats.std), min: round(wdStats.min), max: round(wdStats.max), count: weekdayPrices.length },
    weekend: { mean: round(weStats.mean), median: round(weStats.median), std: round(weStats.std), min: round(weStats.min), max: round(weStats.max), count: weekendPrices.length },
    weekdayHist: histogramFixed(weekdayPrices, 40, histRangeMin, histRangeMax),
    weekendHist: histogramFixed(weekendPrices, 40, histRangeMin, histRangeMax),
    weekdayByHour,
    weekendByHour,
  };

  // Correlations
  const featureArrays: Record<string, number[]> = {};
  for (const f of KEY_FEATURES) {
    featureArrays[f] = rows.map(r => Number(r[f]));
  }
  const corrMatrix: number[][] = KEY_FEATURES.map(f1 =>
    KEY_FEATURES.map(f2 => round(correlation(featureArrays[f1], featureArrays[f2])))
  );
  const withPrices = KEY_FEATURES
    .filter(f => f !== "Prices")
    .map(f => ({ feature: f, correlation: round(correlation(featureArrays["Prices"], featureArrays[f])) }))
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  const topCorrelated = withPrices.slice(0, 4);
  const scatterVsPrices = topCorrelated.map(({ feature }) => {
    const sampled = sampleArray(rows, 400);
    return {
      feature,
      points: sampled.map(r => ({ x: round(Number(r[feature])), y: round(r.Prices) })),
    };
  });

  // Cross-border Prices
  const crossBorderDaily = dailyEntries.map(([date, group]) => ({
    date,
    BE: round(mean(group.map(r => r.Prices))),
    FR: round(mean(group.map(r => r.FR_Prices))),
    NL: round(mean(group.map(r => r.NL_Prices))),
  }));
  const crossBorderSpreads = dailyEntries.map(([date, group]) => ({
    date,
    BE_FR: round(mean(group.map(r => r.Prices - r.FR_Prices))),
    BE_NL: round(mean(group.map(r => r.Prices - r.NL_Prices))),
  }));
  const beFrSpreads = rows.map(r => r.Price_Spread_FR);
  const beNlSpreads = rows.map(r => r.Price_Spread_NL);
  const spreadStats = [
    { name: "BE-FR", ...spreadStatsCalc(beFrSpreads) },
    { name: "BE-NL", ...spreadStatsCalc(beNlSpreads) },
  ];

  // Load Analysis
  const loadSampled = sampleArray(rows, 500);
  const loadAnalysis = {
    forecastVsActual: loadSampled.map(r => ({ forecast: round(r.BE_Load_Forecast), actual: round(r.BE_Load_Actual) })),
    imbalanceHist: histogram(rows.map(r => r.BE_Load_Imbalance), 50),
    imbalanceStats: (() => {
      const vals = rows.map(r => r.BE_Load_Imbalance);
      const m = mean(vals);
      const s = stddev(vals, m);
      const sw = shapiroWilk(vals);
      return {
        mean: round(m), std: round(s),
        min: round(Math.min(...vals)), max: round(Math.max(...vals)),
        skewness: round(skewness(vals, m, s)), kurtosis: round(kurtosis(vals, m, s)),
        shapiroWilk: sw ? { W: round(sw.W), pValue: sw.pValue } : undefined,
      };
    })(),
  };

  // Renewables
  const weeklyRenewableGroups = groupBy(rows, r => {
    const d = r.Date.slice(0, 10);
    const wy = String(r.WeekOfYear).padStart(2, "0");
    const year = d.slice(0, 4);
    return `${year}-W${wy}`;
  });
  const renewablesWeekly = [...weeklyRenewableGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, group]) => ({
      week,
      wind: round(mean(group.map(r => r.BE_Wind_Forecast))),
      solar: round(mean(group.map(r => r.BE_Solar_Forecast))),
    }));

  // Cross-border Flows
  const flowsWeekly = [...weeklyRenewableGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, group]) => ({
      week,
      BE_NL: round(mean(group.map(r => r.Flow_BE_NL))),
      BE_FR: round(mean(group.map(r => r.Flow_BE_FR))),
      BE_DE: round(mean(group.map(r => r.Flow_BE_DE))),
    }));

  // Autocorrelation
  const maxLag = 168;
  const priceMu = mean(prices);
  let denom = 0;
  for (let i = 0; i < n; i++) denom += (prices[i] - priceMu) ** 2;
  const ci = 1.96 / Math.sqrt(n);
  const acf: { lag: number; value: number; ci: number }[] = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    let num = 0;
    for (let i = 0; i < n - lag; i++) num += (prices[i] - priceMu) * (prices[i + lag] - priceMu);
    acf.push({ lag, value: round(denom > 0 ? num / denom : 0), ci: round(ci) });
  }

  const priceChanges = prices.slice(1).map((p, i) => p - prices[i]);
  const pcMean = mean(priceChanges);
  const pcStd = stddev(priceChanges, pcMean);

  const autocorrelationResult = {
    acf,
    priceChangesHist: histogram(priceChanges, 120),
    priceChangeStats: {
      mean: round(pcMean),
      std: round(pcStd),
      skewness: round(skewness(priceChanges, pcMean, pcStd)),
      kurtosis: round(kurtosis(priceChanges, pcMean, pcStd)),
    },
  };

  // Feature Distributions
  const featureDistributions = KEY_FEATURES.map(feature => {
    const vals = rows.map(r => Number(r[feature]));
    const m = mean(vals);
    return { feature, histogram: histogram(vals, 40), mean: round(m), std: round(stddev(vals, m)) };
  });

  // Outlier Analysis (standardized)
  const outlierBoxPlots = KEY_FEATURES.map(feature => {
    const vals = rows.map(r => Number(r[feature]));
    const m = mean(vals);
    const s = stddev(vals, m);
    const standardized = s > 0 ? vals.map(v => (v - m) / s) : vals.map(() => 0);
    const sorted = [...standardized].sort((a, b) => a - b);
    const sq1 = quantile(sorted, 0.25);
    const sq3 = quantile(sorted, 0.75);
    const siqr = sq3 - sq1;
    const wl = Math.max(sorted[0], sq1 - 1.5 * siqr);
    const wh = Math.min(sorted[sorted.length - 1], sq3 + 1.5 * siqr);
    const outliers = sorted.filter(v => v < wl || v > wh);
    return {
      feature,
      q1: round(sq1), median: round(quantile(sorted, 0.5)), q3: round(sq3),
      whiskerLow: round(wl), whiskerHigh: round(wh),
      outlierCount: outliers.length, totalCount: n,
    };
  });

  // Pair Plot
  const pairSampled = sampleArray(rows, 300);
  const pairData = pairSampled.map(r => {
    const obj: Record<string, number> = {};
    for (const f of PAIR_PLOT_FEATURES) obj[f] = round(Number(r[f]));
    return obj;
  });

  // Volatility
  const dailyReturns = dailyAvgs.slice(1).map((d, i) => ({
    date: d.date,
    ret: d.avg - dailyAvgs[i].avg,
    price: d.avg,
  }));
  const volWindow = 14;
  const volatilityDaily = dailyReturns.map((d, i) => {
    const start = Math.max(0, i - volWindow + 1);
    const window = dailyReturns.slice(start, i + 1).map(x => x.ret);
    return { date: d.date, volatility: round(stddev(window)), price: round(d.price) };
  });
  const volMonthlyGroups = groupBy(dailyAvgs, d => d.date.slice(0, 7));
  const volatilityMonthly = [...volMonthlyGroups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, group]) => {
      const p = group.map(g => g.avg);
      return { month, volatility: round(stddev(p)), avgPrice: round(mean(p)) };
    });

  // Year over Year
  const yearGroups = groupBy(rows, r => r.Date.slice(0, 4));
  const years = [...yearGroups.keys()].sort();
  const monthlyByYear: EDAResult["yearOverYear"]["monthlyByYear"] = Array.from({ length: 12 }, (_, m) => ({
    month: m + 1,
    monthName: MONTH_NAMES[m],
    values: years.map(year => {
      const group = (yearGroups.get(year) ?? []).filter(r => r.Month === m + 1);
      return { year: parseInt(year), avg: group.length > 0 ? round(mean(group.map(r => r.Prices))) : 0 };
    }).filter(v => v.avg !== 0),
  }));

  // Price Duration Curve
  const descendingPrices = [...prices].sort((a, b) => b - a);
  const priceDurationCurve = sampleArray(
    descendingPrices.map((p, i) => ({ pct: round((i / (descendingPrices.length - 1)) * 100), price: round(p) })),
    200
  );

  // Peak / Off-Peak (peak = 8:00-20:00 weekdays)
  const peakRows = rows.filter(r => r.IsWeekend === 0 && r.Hour >= 8 && r.Hour < 20);
  const offPeakRows = rows.filter(r => !(r.IsWeekend === 0 && r.Hour >= 8 && r.Hour < 20));
  const peakPrices = peakRows.map(r => r.Prices);
  const offPeakPricesArr = offPeakRows.map(r => r.Prices);
  const peakStats = statsForGroup(peakPrices);
  const offPeakStats = statsForGroup(offPeakPricesArr);

  cachedResult = {
    overview,
    summaryStats,
    priceSeries,
    monthlyAvgPrices,
    priceDistribution,
    negativePrices,
    temporalPatterns: { hourly, daily, monthly },
    heatmaps: { weekly: weeklyHeatmap, monthly: monthlyHeatmap },
    weekendWeekday: weekendWeekday,
    correlations: { features: KEY_FEATURES, matrix: corrMatrix, withPrices, scatterVsPrices },
    crossBorder: { daily: crossBorderDaily, spreads: crossBorderSpreads, spreadStats },
    loadAnalysis,
    renewables: { weekly: renewablesWeekly },
    crossBorderFlows: { weekly: flowsWeekly },
    autocorrelation: autocorrelationResult,
    featureDistributions,
    outlierAnalysis: { boxPlots: outlierBoxPlots },
    pairPlot: { features: PAIR_PLOT_FEATURES, data: pairData },
    volatility: { daily: volatilityDaily, monthly: volatilityMonthly },
    yearOverYear: { years: years.map(Number), monthlyByYear },
    priceDurationCurve,
    peakOffPeak: {
      peak: { mean: round(peakStats.mean), median: round(peakStats.median), std: round(peakStats.std), count: peakPrices.length },
      offPeak: { mean: round(offPeakStats.mean), median: round(offPeakStats.median), std: round(offPeakStats.std), count: offPeakPricesArr.length },
    },
  };

  return cachedResult;
}

// ──────────────────── Lightweight Price Timeline ────────────────────

let cachedPriceTimeline: { date: string; price: number }[] | null = null;

/**
 * Returns daily average price series for the data split timeline.
 * Lightweight: only parses Date and Prices, no full EDA.
 */
export function getPriceTimeline(): { date: string; price: number }[] {
  if (cachedPriceTimeline) return cachedPriceTimeline;
  const datasetPath = process.env.DATASET_PATH!;
  const { rows } = parseCSV(datasetPath);
  const dailyGroups = groupBy(rows, (r) => r.Date.slice(0, 10));
  const dailyEntries = [...dailyGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  cachedPriceTimeline = dailyEntries.map(([date, group]) => ({
    date,
    price: round(mean(group.map((r) => r.Prices))),
  }));
  return cachedPriceTimeline;
}

// ──────────────────── Utility ────────────────────

function round(v: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function histogramFixed(values: number[], bins: number, min: number, max: number): { binStart: number; binEnd: number; count: number }[] {
  const range = max - min || 1;
  const binWidth = range / bins;
  const result: { binStart: number; binEnd: number; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    result.push({ binStart: round(min + i * binWidth), binEnd: round(min + (i + 1) * binWidth), count: 0 });
  }
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    result[idx].count++;
  }
  return result;
}

function spreadStatsCalc(values: number[]): { mean: number; std: number; min: number; max: number; pctPositive: number } {
  const m = mean(values);
  return {
    mean: round(m),
    std: round(stddev(values, m)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
    pctPositive: round((values.filter(v => v > 0).length / values.length) * 100),
  };
}
