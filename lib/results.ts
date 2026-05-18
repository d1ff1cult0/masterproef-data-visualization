import fs from "fs";
import path from "path";
import type { Experiment, ModelInfo, ModelSummary, RunMetrics } from "./types";
import { ACTIVE_EXPERIMENT_NAMES } from "./types";
import { METRIC_LABELS } from "./types";

function firstExistingPath(candidates: string[]): string {
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolveResultsDir(): string {
  if (process.env.RESULTS_DIR) return process.env.RESULTS_DIR;
  const home = process.env.HOME || "";
  return firstExistingPath([
    path.resolve(process.cwd(), "../results"),
    path.resolve(process.cwd(), "../../masterproef_new/results"),
    home ? path.join(home, "masterproef_new/results") : "",
  ].filter(Boolean));
}

const RESULTS_DIR = resolveResultsDir();

const ALLOWED_EXPERIMENTS: ReadonlySet<string> = new Set(ACTIVE_EXPERIMENT_NAMES);

const VIRTUAL_GRID_SEARCH_EXPERIMENT = "transformer_grid_search";
const GRID_MODEL_PATTERN = /^grid_[0-9a-f]+$/i;

/** Test window start; keep in sync with `scripts/npz_predictions_bundle.py` comment. */
export const PREDICTION_CHART_TEST_START = new Date("2025-08-08T00:00:00Z");

const TEST_START_DATE = PREDICTION_CHART_TEST_START;

export function getResultsDir(): string {
  return RESULTS_DIR;
}

export function generateDateLabels(
  nDays: number,
  startDay: number = 0,
  hoursPerDay: number = 24
): string[] {
  const labels: string[] = [];
  for (let d = startDay; d < startDay + nDays; d++) {
    const dayDate = new Date(TEST_START_DATE);
    dayDate.setUTCDate(dayDate.getUTCDate() + d);
    const dateStr = dayDate.toISOString().split("T")[0];
    for (let h = 0; h < hoursPerDay; h++) {
      labels.push(`${dateStr} ${String(h).padStart(2, "0")}:00`);
    }
  }
  return labels;
}

function dirContainsRunSubdirs(absDir: string): boolean {
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return false;
  return fs.readdirSync(absDir).some((e) => {
    if (!e.startsWith("run_")) return false;
    return fs.statSync(path.join(absDir, e)).isDirectory();
  });
}

/**
 * Model directories are leaves that directly contain run_* folders (e.g. lag_study/foo
 * or rolling_quickstart/rolling/baseline). Supports arbitrary nesting.
 */
function findModelRelativePaths(experimentRoot: string): string[] {
  const out: string[] = [];

  function walk(rel: string): void {
    const abs = rel ? path.join(experimentRoot, rel) : experimentRoot;
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return;
    if (dirContainsRunSubdirs(abs)) {
      out.push(rel);
      return;
    }
    for (const ent of fs.readdirSync(abs)) {
      if (ent.startsWith("run_")) continue;
      const childAbs = path.join(abs, ent);
      if (!fs.statSync(childAbs).isDirectory()) continue;
      const childRel = rel ? `${rel}/${ent}` : ent;
      walk(childRel);
    }
  }

  walk("");
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function isExperimentDir(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return false;
  return findModelRelativePaths(dirPath).length > 0;
}

function getModelInfo(experimentDir: string, relModelPath: string): ModelInfo | null {
  const modelPath = path.join(experimentDir, ...relModelPath.split("/"));
  if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) return null;
  const entries = fs.readdirSync(modelPath);
  const runDirs = entries.filter((e) => e.startsWith("run_") && fs.statSync(path.join(modelPath, e)).isDirectory());
  if (runDirs.length === 0) return null;

  const hasSummary = fs.existsSync(path.join(modelPath, "summary.json"));
  const displayName = relModelPath
    .split("/")
    .map((seg) => seg.replace(/_/g, " ").replace(/\(([^)]+)\)/g, "($1)"))
    .join(" / ");

  return {
    name: relModelPath,
    displayName,
    runs: runDirs.length,
    hasSummary,
  };
}

function displayNameForExperiment(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveModelDir(experiment: string, model: string): string {
  if (experiment === VIRTUAL_GRID_SEARCH_EXPERIMENT && GRID_MODEL_PATTERN.test(model)) {
    return path.join(RESULTS_DIR, model);
  }
  return path.join(RESULTS_DIR, experiment, model);
}

function listVirtualGridSearchExperiment(entries: string[]): Experiment | null {
  if (!ALLOWED_EXPERIMENTS.has(VIRTUAL_GRID_SEARCH_EXPERIMENT)) return null;

  const models = entries
    .filter((entry) => GRID_MODEL_PATTERN.test(entry))
    .map((entry) => {
      const dirPath = path.join(RESULTS_DIR, entry);
      if (!dirContainsRunSubdirs(dirPath)) return null;
      return getModelInfo(RESULTS_DIR, entry);
    })
    .filter((model): model is ModelInfo => model != null);

  if (models.length === 0) return null;
  models.sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: VIRTUAL_GRID_SEARCH_EXPERIMENT,
    displayName: "Transformer Grid Search",
    models,
    hasResults: fs.existsSync(path.join(RESULTS_DIR, "transformer_grid_search_results.json")),
  };
}

export function listExperiments(): Experiment[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];

  const entries = fs.readdirSync(RESULTS_DIR);
  const experiments: Experiment[] = [];

  const gridSearch = listVirtualGridSearchExperiment(entries);
  if (gridSearch) experiments.push(gridSearch);

  for (const entry of entries) {
    if (!ALLOWED_EXPERIMENTS.has(entry)) continue;
    if (entry === VIRTUAL_GRID_SEARCH_EXPERIMENT) continue;
    const dirPath = path.join(RESULTS_DIR, entry);
    if (!isExperimentDir(dirPath)) continue;

    const models: ModelInfo[] = [];

    for (const rel of findModelRelativePaths(dirPath)) {
      const modelInfo = getModelInfo(dirPath, rel);
      if (modelInfo) models.push(modelInfo);
    }

    if (models.length > 0) {
      experiments.push({
        name: entry,
        displayName: displayNameForExperiment(entry),
        models,
        hasResults: fs.existsSync(path.join(dirPath, "results.json")),
      });
    }
  }

  return experiments;
}

export function readRunMetrics(experiment: string, model: string, runIdx: number): RunMetrics | null {
  const metricsPath = path.join(resolveModelDir(experiment, model), `run_${runIdx}`, "metrics.json");
  if (!fs.existsSync(metricsPath)) return null;
  const raw = fs.readFileSync(metricsPath, "utf-8");
  return JSON.parse(raw) as RunMetrics;
}

export function readAllRunMetrics(experiment: string, model: string): RunMetrics[] {
  const modelDir = resolveModelDir(experiment, model);
  if (!fs.existsSync(modelDir)) return [];

  const entries = fs.readdirSync(modelDir);
  const runDirs = entries
    .filter((e) => e.startsWith("run_"))
    .sort((a, b) => {
      const aIdx = parseInt(a.replace("run_", ""));
      const bIdx = parseInt(b.replace("run_", ""));
      return aIdx - bIdx;
    });

  const metrics: RunMetrics[] = [];
  for (const dir of runDirs) {
    const metricsPath = path.join(modelDir, dir, "metrics.json");
    if (fs.existsSync(metricsPath)) {
      const raw = fs.readFileSync(metricsPath, "utf-8");
      metrics.push(JSON.parse(raw) as RunMetrics);
    }
  }
  return metrics;
}

export function readModelSummary(experiment: string, model: string): ModelSummary | null {
  const summaryPath = path.join(resolveModelDir(experiment, model), "summary.json");
  if (!fs.existsSync(summaryPath)) return null;
  const raw = fs.readFileSync(summaryPath, "utf-8");
  return JSON.parse(raw) as ModelSummary;
}

export function getPredictionsPath(experiment: string, model: string, runIdx: number): string {
  return path.join(resolveModelDir(experiment, model), `run_${runIdx}`, "predictions.npz");
}

/** Absolute directory for a model path (may contain `/`, e.g. `rolling/online_daily`). */
export function getModelResultsDir(experiment: string, model: string): string {
  return resolveModelDir(experiment, model);
}

/** Run indices under `modelDir` that have a `predictions.npz` file. */
export function listRunsWithPredictions(experiment: string, model: string): number[] {
  const modelDir = getModelResultsDir(experiment, model);
  if (!fs.existsSync(modelDir) || !fs.statSync(modelDir).isDirectory()) return [];
  const out: number[] = [];
  for (const ent of fs.readdirSync(modelDir)) {
    if (!ent.startsWith("run_")) continue;
    const idx = parseInt(ent.replace("run_", ""), 10);
    if (Number.isNaN(idx)) continue;
    const npz = path.join(modelDir, ent, "predictions.npz");
    if (fs.existsSync(npz)) out.push(idx);
  }
  out.sort((a, b) => a - b);
  return out;
}

export function getRunCount(experiment: string, model: string): number {
  const modelDir = resolveModelDir(experiment, model);
  if (!fs.existsSync(modelDir)) return 0;
  return fs.readdirSync(modelDir).filter((e) => e.startsWith("run_")).length;
}

export interface BestModelEntry {
  experiment: string;
  model: string;
  experimentDisplayName: string;
  modelDisplayName: string;
  rank: number;
  mae: number;
  summary: ModelSummary | null;
  runs: RunMetrics[];
}

function getMetricValue(
  summary: ModelSummary | null,
  runs: RunMetrics[],
  metric: string
): number | null {
  const avg = summary?.avg?.[metric];
  if (avg != null && !Number.isNaN(avg)) return avg;
  if (runs.length > 0) {
    const vals = runs.map((r) => r[metric]).filter((v) => v != null && !Number.isNaN(v));
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return null;
}

/**
 * Returns the top N models ranked by the specified metric.
 * Uses summary.avg when available, otherwise the mean of runs.
 * @param n - Number of models to return
 * @param metric - Metric to rank by (default: MAE). Lower-is-better metrics sort ascending; higher-is-better (R2, PICP) sort descending.
 */
export function getBestModels(
  n: number = 5,
  metric: string = "MAE"
): BestModelEntry[] {
  const experiments = listExperiments();
  const candidates: { entry: Omit<BestModelEntry, "rank">; value: number }[] = [];

  const meta = METRIC_LABELS[metric];
  const lowerBetter = meta?.lowerBetter ?? true;

  for (const exp of experiments) {
    for (const modelInfo of exp.models) {
      const runs = readAllRunMetrics(exp.name, modelInfo.name);
      const summary = readModelSummary(exp.name, modelInfo.name);
      const value = getMetricValue(summary, runs, metric);
      if (value == null || Number.isNaN(value)) continue;

      candidates.push({
        entry: {
          experiment: exp.name,
          model: modelInfo.name,
          experimentDisplayName: exp.displayName,
          modelDisplayName: modelInfo.displayName,
          mae: getMetricValue(summary, runs, "MAE") ?? value,
          summary,
          runs,
        },
        value,
      });
    }
  }

  candidates.sort((a, b) =>
    lowerBetter ? a.value - b.value : b.value - a.value
  );
  return candidates.slice(0, n).map((c, i) => ({
    ...c.entry,
    rank: i + 1,
  }));
}
