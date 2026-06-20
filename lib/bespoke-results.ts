import fs from "fs";
import path from "path";
import type { ModelInfo, RunMetrics } from "./types";
import { readNpz } from "./npz-reader";

/**
 * Some analysis notebooks (Nb10 conformal calibration, Nb15 per-hour conformal,
 * Nb16 ensemble probabilistic) do not write the standard
 * `<model>/run_<i>/metrics.json` + `predictions.npz` layout that `save_run`/`save_summary`
 * produce. Instead each writes a single results `.npz` (y_test + interval/quantile
 * series, day-major shape `(n_days, 24)`) plus, optionally, a method-keyed
 * `summary.csv` (`method,PICP,MPIW,CRPS,MAE`).
 *
 * This adapter exposes one synthetic model per *method* so they load like any other
 * model: metrics come from `summary.csv` (or are computed from the npz when no csv
 * exists), and the prediction chart is served from the shared npz with the method's
 * own band series remapped to canonical `median`/`lower`/`upper` keys.
 */

/** Canonical chart series keys -> raw npz array name for one method. */
export interface BespokeSeriesMap {
  median?: string;
  lower?: string;
  upper?: string;
  point?: string;
}

interface BespokeMethod {
  /** URL-safe id; used as the trailing path segment of the model name. */
  id: string;
  displayName: string;
  /** Exact `method` value in summary.csv; omit to compute metrics from the npz. */
  csvMethod?: string;
  series: BespokeSeriesMap;
}

interface BespokeFolderSpec {
  folder: string;
  npz: string;
  methods: BespokeMethod[];
}

const BESPOKE_FOLDERS: BespokeFolderSpec[] = [
  {
    folder: "sequential_conformal",
    npz: "conformal_results.npz",
    methods: [
      {
        id: "uncalibrated",
        displayName: "Uncalibrated",
        series: { median: "median_uncal", lower: "lower_uncal", upper: "upper_uncal" },
      },
      {
        id: "enbpi",
        displayName: "EnbPI",
        series: { median: "median_uncal", lower: "lower_enbpi", upper: "upper_enbpi" },
      },
      {
        id: "acp",
        displayName: "ACP",
        series: { median: "median_uncal", lower: "lower_acp", upper: "upper_acp" },
      },
    ],
  },
  {
    folder: "perhour_conformal",
    npz: "perhour_results.npz",
    methods: [
      {
        id: "uncalibrated_jsu",
        displayName: "Uncalibrated JSU",
        csvMethod: "Uncalibrated JSU",
        series: { median: "median_uncal", lower: "lower_uncal", upper: "upper_uncal" },
      },
      {
        id: "enbpi_pooled",
        displayName: "EnbPI pooled",
        csvMethod: "EnbPI pooled (Nb10)",
        series: { median: "median_uncal", lower: "lo_pool", upper: "hi_pool" },
      },
      {
        id: "enbpi_perhour",
        displayName: "EnbPI per-hour",
        csvMethod: "EnbPI per-hour",
        series: { median: "median_uncal", lower: "lo_ph", upper: "hi_ph" },
      },
      {
        id: "acp_pooled",
        displayName: "ACP pooled",
        csvMethod: "ACP pooled (Nb10)",
        series: { median: "median_uncal", lower: "lo_acp_pool", upper: "hi_acp_pool" },
      },
      {
        id: "acp_perhour",
        displayName: "ACP per-hour",
        csvMethod: "ACP per-hour",
        series: { median: "median_uncal", lower: "lo_acp_ph", upper: "hi_acp_ph" },
      },
    ],
  },
  {
    folder: "ensemble_probabilistic",
    npz: "ensemble.npz",
    methods: [
      {
        id: "ens_uncal_perseed",
        displayName: "Ensemble (uncalibrated) — per-seed mean",
        csvMethod: "Ensemble (uncalibrated) - per-seed mean",
        series: { median: "ens_median", lower: "ens_lo", upper: "ens_hi", point: "lear_point" },
      },
      {
        id: "ens_acp_perseed",
        displayName: "Ensemble + per-hour ACP — per-seed mean",
        csvMethod: "Ensemble + per-hour ACP - per-seed mean",
        series: { median: "ens_median", lower: "lo_acp", upper: "hi_acp", point: "lear_point" },
      },
      {
        id: "ens_uncal_seedens",
        displayName: "Ensemble (uncalibrated) — seed-ensemble",
        csvMethod: "Ensemble (uncalibrated) - seed-ensemble",
        series: { median: "ens_median", lower: "ens_lo", upper: "ens_hi", point: "lear_point" },
      },
      {
        id: "ens_acp_seedens",
        displayName: "Ensemble + per-hour ACP — seed-ensemble",
        csvMethod: "Ensemble + per-hour ACP - seed-ensemble",
        series: { median: "ens_median", lower: "lo_acp", upper: "hi_acp", point: "lear_point" },
      },
    ],
  },
];

const SPEC_BY_FOLDER = new Map(BESPOKE_FOLDERS.map((s) => [s.folder, s]));

export function isBespokeFolder(folder: string): boolean {
  return SPEC_BY_FOLDER.has(folder);
}

/** Parse a model name of the form `<folder>/<methodId>` into its bespoke spec + method. */
function resolveBespokeMethod(
  model: string
): { spec: BespokeFolderSpec; method: BespokeMethod } | null {
  const slash = model.indexOf("/");
  if (slash < 0) return null;
  const folder = model.slice(0, slash);
  const methodId = model.slice(slash + 1);
  const spec = SPEC_BY_FOLDER.get(folder);
  if (!spec) return null;
  const method = spec.methods.find((m) => m.id === methodId);
  if (!method) return null;
  return { spec, method };
}

export function isBespokeModel(experiment: string, model: string): boolean {
  return resolveBespokeMethod(model) != null;
}

function npzPath(resultsDir: string, spec: BespokeFolderSpec): string {
  return path.join(resultsDir, spec.folder, spec.npz);
}

function npzKeyCache(resultsDir: string, spec: BespokeFolderSpec): Set<string> | null {
  const file = npzPath(resultsDir, spec);
  if (!fs.existsSync(file)) return null;
  try {
    return new Set(Object.keys(readNpz(file)));
  } catch {
    return null;
  }
}

/** True if the folder's npz exists and contains y_test. */
export function bespokeFolderHasResults(resultsDir: string, folder: string): boolean {
  const spec = SPEC_BY_FOLDER.get(folder);
  if (!spec) return false;
  const keys = npzKeyCache(resultsDir, spec);
  return keys != null && keys.has("y_test");
}

export function listBespokeModels(resultsDir: string, folder: string): ModelInfo[] {
  const spec = SPEC_BY_FOLDER.get(folder);
  if (!spec) return [];
  const keys = npzKeyCache(resultsDir, spec);
  if (!keys || !keys.has("y_test")) return [];

  return spec.methods
    .filter((m) => {
      // Keep a method only if every band series it references is present.
      const required = [m.series.median, m.series.lower, m.series.upper].filter(
        (k): k is string => Boolean(k)
      );
      return required.every((k) => keys.has(k));
    })
    .map((m) => ({
      name: `${spec.folder}/${m.id}`,
      displayName: m.displayName,
      runs: 1,
      hasSummary: false,
    }));
}

interface CsvSummary {
  header: string[];
  rows: Map<string, Record<string, number>>;
}

function parseCsvSummary(file: string): CsvSummary | null {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf-8").trim();
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const header = lines[0].split(",").map((s) => s.trim());
  const methodIdx = header.indexOf("method");
  if (methodIdx < 0) return null;
  const rows = new Map<string, Record<string, number>>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < header.length) continue;
    const method = cols[methodIdx].trim();
    const rec: Record<string, number> = {};
    for (let c = 0; c < header.length; c++) {
      if (c === methodIdx) continue;
      const v = Number(cols[c]);
      if (Number.isFinite(v)) rec[header[c]] = v;
    }
    rows.set(method, rec);
  }
  return { header, rows };
}

/** Coverage / width / MAE from the method's bands; used when no summary.csv exists. */
function computeMetricsFromNpz(
  resultsDir: string,
  spec: BespokeFolderSpec,
  method: BespokeMethod
): RunMetrics | null {
  const file = npzPath(resultsDir, spec);
  if (!fs.existsSync(file)) return null;
  let arrays: Record<string, number[][]>;
  try {
    arrays = readNpz(file);
  } catch {
    return null;
  }
  const y = arrays.y_test;
  const lo = method.series.lower ? arrays[method.series.lower] : undefined;
  const hi = method.series.upper ? arrays[method.series.upper] : undefined;
  const med = method.series.median ? arrays[method.series.median] : undefined;
  if (!Array.isArray(y) || y.length === 0) return null;

  let covered = 0;
  let widthSum = 0;
  let absErrSum = 0;
  let n = 0;
  for (let r = 0; r < y.length; r++) {
    const yr = y[r];
    for (let c = 0; c < yr.length; c++) {
      const yv = yr[c];
      if (!Number.isFinite(yv)) continue;
      n++;
      const l = lo?.[r]?.[c];
      const u = hi?.[r]?.[c];
      if (Number.isFinite(l) && Number.isFinite(u)) {
        widthSum += (u as number) - (l as number);
        if (yv >= (l as number) && yv <= (u as number)) covered++;
      }
      const m = med?.[r]?.[c];
      if (Number.isFinite(m)) absErrSum += Math.abs(yv - (m as number));
    }
  }
  if (n === 0) return null;
  const out: Record<string, number> = {
    PICP: covered / n,
    MPIW: widthSum / n,
  };
  if (med) out.MAE = absErrSum / n;
  return out as RunMetrics;
}

/** Metrics for a bespoke method, from summary.csv when available, else computed. */
export function readBespokeMetrics(
  resultsDir: string,
  experiment: string,
  model: string
): RunMetrics | null {
  void experiment;
  const resolved = resolveBespokeMethod(model);
  if (!resolved) return null;
  const { spec, method } = resolved;

  if (method.csvMethod) {
    const csv = parseCsvSummary(path.join(resultsDir, spec.folder, "summary.csv"));
    const rec = csv?.rows.get(method.csvMethod);
    if (rec) return { ...rec } as RunMetrics;
  }
  return computeMetricsFromNpz(resultsDir, spec, method);
}

/** Absolute path to the shared npz backing a bespoke model's prediction chart. */
export function getBespokeNpzPath(resultsDir: string, model: string): string | null {
  const resolved = resolveBespokeMethod(model);
  if (!resolved) return null;
  const file = npzPath(resultsDir, resolved.spec);
  return fs.existsSync(file) ? file : null;
}

/**
 * Remap the raw npz arrays to a method's canonical chart series
 * (`y_test` + `median`/`lower`/`upper`/`point`), dropping unrelated series so the
 * chart shows only this method's bands.
 */
export function remapBespokeArrays(
  model: string,
  arrays: Record<string, unknown>
): Record<string, unknown> | null {
  const resolved = resolveBespokeMethod(model);
  if (!resolved) return null;
  const { series } = resolved.method;
  const out: Record<string, unknown> = {};
  if (arrays.y_test != null) out.y_test = arrays.y_test;
  const map: [keyof BespokeSeriesMap, string | undefined][] = [
    ["median", series.median],
    ["lower", series.lower],
    ["upper", series.upper],
    ["point", series.point],
  ];
  for (const [canonical, raw] of map) {
    if (raw && arrays[raw] != null) out[canonical] = arrays[raw];
  }
  return out;
}
