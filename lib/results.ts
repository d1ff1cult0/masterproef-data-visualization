import fs from "fs";
import path from "path";
import type { Experiment, ModelInfo, ModelSummary, RunMetrics } from "./types";
import { NOTEBOOK_EXPERIMENT_GROUPS } from "./types";
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

const NOTEBOOK_GROUP_BY_NAME = new Map(
  NOTEBOOK_EXPERIMENT_GROUPS.map((group) => [group.name, group])
);
const ACTIVE_RESULT_FOLDERS: ReadonlySet<string> = new Set(
  NOTEBOOK_EXPERIMENT_GROUPS.flatMap((group) => group.resultFolders)
);

const VIRTUAL_GRID_SEARCH_EXPERIMENT = "transformer_grid_search";
const GRID_MODEL_PATTERN = /^grid_[0-9a-f]+$/i;
const RUN_DIR_PATTERN = /^run_(\d+)$/;
const IGNORED_RESULT_DIRS: ReadonlySet<string> = new Set([
  "__pycache__",
  "_cache",
  "_lear_cache",
  "figures",
  "state",
]);

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

function isDirectModelDir(absDir: string): boolean {
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return false;
  return (
    fs.existsSync(path.join(absDir, "metrics.json")) ||
    fs.existsSync(path.join(absDir, "predictions.npz")) ||
    fs.existsSync(path.join(absDir, "predictions_acp_perhour.npz"))
  );
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
    if (rel && isDirectModelDir(abs)) {
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

function getRunCountForModelDir(modelPath: string): number {
  if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) return 0;
  const runDirs = fs
    .readdirSync(modelPath)
    .filter((e) => RUN_DIR_PATTERN.test(e) && fs.statSync(path.join(modelPath, e)).isDirectory());
  if (runDirs.length > 0) return runDirs.length;
  return isDirectModelDir(modelPath) ? 1 : 0;
}

function getModelInfo(experimentDir: string, relModelPath: string): ModelInfo | null {
  const modelPath = path.join(experimentDir, ...relModelPath.split("/"));
  if (!fs.existsSync(modelPath) || !fs.statSync(modelPath).isDirectory()) return null;
  const runs = getRunCountForModelDir(modelPath);
  if (runs === 0) return null;

  const hasSummary = fs.existsSync(path.join(modelPath, "summary.json"));
  const displayName = relModelPath
    .split("/")
    .map((seg) => seg.replace(/_/g, " ").replace(/\(([^)]+)\)/g, "($1)"))
    .join(" / ");

  return {
    name: relModelPath,
    displayName,
    runs,
    hasSummary,
  };
}

function displayNameForExperiment(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveModelDir(experiment: string, model: string): string {
  if (NOTEBOOK_GROUP_BY_NAME.has(experiment)) {
    const [folder, ...modelParts] = model.split("/");
    if (folder === VIRTUAL_GRID_SEARCH_EXPERIMENT && modelParts.length === 1 && GRID_MODEL_PATTERN.test(modelParts[0])) {
      return path.join(RESULTS_DIR, modelParts[0]);
    }
    return path.join(RESULTS_DIR, folder, ...modelParts);
  }
  if (experiment === VIRTUAL_GRID_SEARCH_EXPERIMENT && GRID_MODEL_PATTERN.test(model)) {
    return path.join(RESULTS_DIR, model);
  }
  return path.join(RESULTS_DIR, experiment, model);
}

function getMetricFromRecord(
  record: Record<string, unknown> | null | undefined,
  metric: string
): number | null {
  if (!record) return null;
  const direct = record[metric];
  const directValue = toFiniteNumber(direct);
  if (directValue != null) return directValue;

  const lowerMetric = metric.toLowerCase();
  const key = Object.keys(record).find((k) => k.toLowerCase() === lowerMetric);
  return key ? toFiniteNumber(record[key]) : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function listVirtualGridSearchExperiment(entries: string[]): Experiment | null {
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

function prefixModelInfo(folder: string, model: ModelInfo, showFolder: boolean): ModelInfo {
  return {
    ...model,
    name: `${folder}/${model.name}`,
    displayName: showFolder
      ? `${displayNameForExperiment(folder)} / ${model.displayName}`
      : model.displayName,
  };
}

function listModelsForResultFolder(folder: string, showFolder: boolean): ModelInfo[] {
  const entries = fs.existsSync(RESULTS_DIR) ? fs.readdirSync(RESULTS_DIR) : [];

  if (folder === VIRTUAL_GRID_SEARCH_EXPERIMENT) {
    return (listVirtualGridSearchExperiment(entries)?.models ?? []).map((model) =>
      prefixModelInfo(folder, model, showFolder)
    );
  }

  const dirPath = path.join(RESULTS_DIR, folder);
  if (!isExperimentDir(dirPath)) return [];

  return findModelRelativePaths(dirPath)
    .map((rel) => getModelInfo(dirPath, rel))
    .filter((model): model is ModelInfo => model != null)
    .map((model) => prefixModelInfo(folder, model, showFolder));
}

function createNotebookExperiment(group: (typeof NOTEBOOK_EXPERIMENT_GROUPS)[number]): Experiment {
  const visibleFolders = group.resultFolders.filter((folder) => {
    if (folder === VIRTUAL_GRID_SEARCH_EXPERIMENT) {
      const entries = fs.existsSync(RESULTS_DIR) ? fs.readdirSync(RESULTS_DIR) : [];
      return listVirtualGridSearchExperiment(entries) != null;
    }
    return isExperimentDir(path.join(RESULTS_DIR, folder));
  });
  const showFolder = visibleFolders.length > 1;
  const models = group.resultFolders.flatMap((folder) => listModelsForResultFolder(folder, showFolder));

  return {
    name: group.name,
    displayName: group.displayName,
    models,
    hasResults: models.length > 0,
  };
}

export function listExperiments(options: { includeUnmapped?: boolean } = {}): Experiment[] {
  void options;
  return NOTEBOOK_EXPERIMENT_GROUPS.map((group) => createNotebookExperiment(group));
}

export function readRunMetrics(experiment: string, model: string, runIdx: number): RunMetrics | null {
  const modelDir = resolveModelDir(experiment, model);
  const metricsPath = path.join(modelDir, `run_${runIdx}`, "metrics.json");
  const directMetricsPath = path.join(modelDir, "metrics.json");
  if (!fs.existsSync(metricsPath) && runIdx === 0 && fs.existsSync(directMetricsPath)) {
    const raw = fs.readFileSync(directMetricsPath, "utf-8");
    return JSON.parse(raw) as RunMetrics;
  }
  if (!fs.existsSync(metricsPath)) return null;
  const raw = fs.readFileSync(metricsPath, "utf-8");
  return JSON.parse(raw) as RunMetrics;
}

export function readAllRunMetrics(experiment: string, model: string): RunMetrics[] {
  const modelDir = resolveModelDir(experiment, model);
  if (!fs.existsSync(modelDir)) return [];

  const directMetricsPath = path.join(modelDir, "metrics.json");
  if (fs.existsSync(directMetricsPath)) {
    const raw = fs.readFileSync(directMetricsPath, "utf-8");
    return [JSON.parse(raw) as RunMetrics];
  }

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
  const modelDir = resolveModelDir(experiment, model);
  const directPredictionsPath = path.join(modelDir, "predictions.npz");
  if (runIdx === 0 && fs.existsSync(directPredictionsPath)) return directPredictionsPath;
  return path.join(modelDir, `run_${runIdx}`, "predictions.npz");
}

/** Absolute directory for a model path (may contain `/`, e.g. `rolling/online_daily`). */
export function getModelResultsDir(experiment: string, model: string): string {
  return resolveModelDir(experiment, model);
}

/** Run indices under `modelDir` that have a `predictions.npz` file. */
export function listRunsWithPredictions(experiment: string, model: string): number[] {
  const modelDir = getModelResultsDir(experiment, model);
  if (!fs.existsSync(modelDir) || !fs.statSync(modelDir).isDirectory()) return [];
  if (fs.existsSync(path.join(modelDir, "predictions.npz"))) return [0];
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
  return getRunCountForModelDir(modelDir);
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
  const avg = getMetricFromRecord(summary?.avg, metric);
  if (avg != null) return avg;
  if (runs.length > 0) {
    const vals = runs
      .map((r) => getMetricFromRecord(r, metric))
      .filter((v): v is number => v != null);
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
  let candidates = collectBestModelCandidates(experiments, metric);

  if (candidates.length === 0) {
    candidates = collectBestModelCandidatesFromMetricFiles(metric);
  }

  const meta = METRIC_LABELS[metric];
  const lowerBetter = meta?.lowerBetter ?? true;

  candidates.sort((a, b) =>
    lowerBetter ? a.value - b.value : b.value - a.value
  );
  return candidates.slice(0, n).map((c, i) => ({
    ...c.entry,
    rank: i + 1,
  }));
}

function collectBestModelCandidates(
  experiments: Experiment[],
  metric: string
): { entry: Omit<BestModelEntry, "rank">; value: number }[] {
  const candidates: { entry: Omit<BestModelEntry, "rank">; value: number }[] = [];

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

  return candidates;
}

function collectBestModelCandidatesFromMetricFiles(
  metric: string
): { entry: Omit<BestModelEntry, "rank">; value: number }[] {
  if (!fs.existsSync(RESULTS_DIR) || !fs.statSync(RESULTS_DIR).isDirectory()) return [];

  const grouped = new Map<string, {
    experiment: string;
    model: string;
    experimentDisplayName: string;
    modelDisplayName: string;
    runs: RunMetrics[];
  }>();

  function walk(absDir: string): void {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    const metricsPath = path.join(absDir, "metrics.json");
    const dirName = path.basename(absDir);
    if (RUN_DIR_PATTERN.test(dirName) && fs.existsSync(metricsPath)) {
      const parsed = parseModelPathFromRunDir(absDir);
      if (!parsed) return;
      try {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf-8")) as RunMetrics;
        const key = `${parsed.experiment}\u0000${parsed.model}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.runs.push(metrics);
        } else {
          grouped.set(key, {
            ...parsed,
            runs: [metrics],
          });
        }
      } catch {
        return;
      }
      return;
    }

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (ent.name.startsWith(".") || IGNORED_RESULT_DIRS.has(ent.name)) continue;
      walk(path.join(absDir, ent.name));
    }
  }

  walk(RESULTS_DIR);

  const candidates: { entry: Omit<BestModelEntry, "rank">; value: number }[] = [];
  for (const item of grouped.values()) {
    const value = getMetricValue(null, item.runs, metric);
    if (value == null) continue;
    candidates.push({
      entry: {
        experiment: item.experiment,
        model: item.model,
        experimentDisplayName: item.experimentDisplayName,
        modelDisplayName: item.modelDisplayName,
        mae: getMetricValue(null, item.runs, "MAE") ?? value,
        summary: null,
        runs: item.runs,
      },
      value,
    });
  }
  return candidates;
}

function parseModelPathFromRunDir(runDir: string): {
  experiment: string;
  model: string;
  experimentDisplayName: string;
  modelDisplayName: string;
} | null {
  const rel = path.relative(RESULTS_DIR, runDir);
  if (rel.startsWith("..")) return null;
  const parts = rel.split(path.sep);
  if (parts.length < 2) return null;
  const runPart = parts.at(-1);
  if (!runPart || !RUN_DIR_PATTERN.test(runPart)) return null;
  const modelParts = parts.slice(0, -1);
  if (modelParts.length === 1) {
    const only = modelParts[0];
    if (!GRID_MODEL_PATTERN.test(only)) return null;
    const group = NOTEBOOK_EXPERIMENT_GROUPS.find((item) =>
      item.resultFolders.includes(VIRTUAL_GRID_SEARCH_EXPERIMENT)
    );
    if (!group) return null;
    return {
      experiment: group.name,
      model: `${VIRTUAL_GRID_SEARCH_EXPERIMENT}/${only}`,
      experimentDisplayName: group.displayName,
      modelDisplayName: `${displayNameForExperiment(VIRTUAL_GRID_SEARCH_EXPERIMENT)} / ${only.replace(/_/g, " ")}`,
    };
  }

  const [experiment, ...modelPartsOnly] = modelParts;
  if (!ACTIVE_RESULT_FOLDERS.has(experiment)) return null;
  const model = modelPartsOnly.join("/");
  const group = NOTEBOOK_EXPERIMENT_GROUPS.find((item) => item.resultFolders.includes(experiment));
  if (!group) return null;
  return {
    experiment: group.name,
    model: `${experiment}/${model}`,
    experimentDisplayName: group.displayName,
    modelDisplayName: `${displayNameForExperiment(experiment)} / ${model
      .split("/")
      .map((seg) => seg.replace(/_/g, " ").replace(/\(([^)]+)\)/g, "($1)"))
      .join(" / ")}`,
  };
}
