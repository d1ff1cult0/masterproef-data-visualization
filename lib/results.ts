import fs from "fs";
import path from "path";
import type { Experiment, ModelInfo, ModelSummary, RunMetrics } from "./types";
import { METRIC_LABELS } from "./types";

const RESULTS_DIR = process.env.RESULTS_DIR || path.resolve(process.cwd(), "../results");

const TEST_START_DATE = new Date("2025-08-08T00:00:00Z");

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

function isExperimentDir(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return false;
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const subPath = path.join(dirPath, entry);
    if (!fs.statSync(subPath).isDirectory()) continue;
    const subEntries = fs.readdirSync(subPath);
    if (subEntries.some((e) => e.startsWith("run_"))) return true;
  }
  return false;
}

function getModelInfo(modelPath: string): ModelInfo | null {
  if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) return null;
  const entries = fs.readdirSync(modelPath);
  const runDirs = entries.filter((e) => e.startsWith("run_") && fs.statSync(path.join(modelPath, e)).isDirectory());
  if (runDirs.length === 0) return null;

  const hasSummary = fs.existsSync(path.join(modelPath, "summary.json"));
  const dirName = path.basename(modelPath);

  return {
    name: dirName,
    displayName: dirName.replace(/_/g, " ").replace(/\(([^)]+)\)/g, "($1)"),
    runs: runDirs.length,
    hasSummary,
  };
}

export function listExperiments(): Experiment[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];

  const entries = fs.readdirSync(RESULTS_DIR);
  const experiments: Experiment[] = [];

  for (const entry of entries) {
    const dirPath = path.join(RESULTS_DIR, entry);
    if (!isExperimentDir(dirPath)) continue;

    const subEntries = fs.readdirSync(dirPath);
    const models: ModelInfo[] = [];

    for (const sub of subEntries) {
      const modelInfo = getModelInfo(path.join(dirPath, sub));
      if (modelInfo) models.push(modelInfo);
    }

    if (models.length > 0) {
      experiments.push({
        name: entry,
        displayName: entry.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        models,
        hasResults: fs.existsSync(path.join(dirPath, "results.json")),
      });
    }
  }

  return experiments;
}

export function readRunMetrics(experiment: string, model: string, runIdx: number): RunMetrics | null {
  const metricsPath = path.join(RESULTS_DIR, experiment, model, `run_${runIdx}`, "metrics.json");
  if (!fs.existsSync(metricsPath)) return null;
  const raw = fs.readFileSync(metricsPath, "utf-8");
  return JSON.parse(raw) as RunMetrics;
}

export function readAllRunMetrics(experiment: string, model: string): RunMetrics[] {
  const modelDir = path.join(RESULTS_DIR, experiment, model);
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
  const summaryPath = path.join(RESULTS_DIR, experiment, model, "summary.json");
  if (!fs.existsSync(summaryPath)) return null;
  const raw = fs.readFileSync(summaryPath, "utf-8");
  return JSON.parse(raw) as ModelSummary;
}

export function getPredictionsPath(experiment: string, model: string, runIdx: number): string {
  return path.join(RESULTS_DIR, experiment, model, `run_${runIdx}`, "predictions.npz");
}

export function getRunCount(experiment: string, model: string): number {
  const modelDir = path.join(RESULTS_DIR, experiment, model);
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
