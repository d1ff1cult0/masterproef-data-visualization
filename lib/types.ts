export interface Experiment {
  name: string;
  displayName: string;
  models: ModelInfo[];
  hasResults: boolean;
}

export interface ModelInfo {
  name: string;
  displayName: string;
  runs: number;
  hasSummary: boolean;
}

export interface RunMetrics {
  MAE: number;
  MSE: number;
  RMSE: number;
  MAPE: number;
  R2: number;
  PICP: number;
  MPIW: number;
  PINAW: number;
  IntervalScore: number;
  CRPS: number;
  NLL: number;
  Pinball_10: number;
  Pinball_50: number;
  Pinball_90: number;
  Avg_Pinball: number;
  training_time: number;
  [key: string]: number;
}

export interface ModelSummary {
  avg: RunMetrics;
  std: RunMetrics;
  n_runs: number;
  config?: Record<string, unknown>;
  experiment_version?: string;
}

export interface MetricsResponse {
  experiment: string;
  model: string;
  summary: ModelSummary | null;
  runs: RunMetrics[];
}

export interface PredictionPoint {
  index: number;
  hour: number;
  day: number;
  date: string;
  y_test: number;
  [key: string]: number | string;
}

export interface PredictionResponse {
  experiment: string;
  model: string;
  run: string;
  totalDays: number;
  startDay: number;
  endDay: number;
  keys: string[];
  data: PredictionPoint[];
}

export interface SelectedModel {
  experiment: string;
  model: string;
  run: string;
  color: string;
}

export const METRIC_LABELS: Record<string, { label: string; lowerBetter: boolean; format: string }> = {
  MAE: { label: "MAE", lowerBetter: true, format: ".2f" },
  MSE: { label: "MSE", lowerBetter: true, format: ".1f" },
  RMSE: { label: "RMSE", lowerBetter: true, format: ".2f" },
  MAPE: { label: "MAPE (%)", lowerBetter: true, format: ".1f" },
  R2: { label: "R²", lowerBetter: false, format: ".4f" },
  PICP: { label: "PICP", lowerBetter: false, format: ".4f" },
  MPIW: { label: "MPIW", lowerBetter: true, format: ".2f" },
  PINAW: { label: "PINAW", lowerBetter: true, format: ".4f" },
  IntervalScore: { label: "Interval Score", lowerBetter: true, format: ".2f" },
  CRPS: { label: "CRPS", lowerBetter: true, format: ".2f" },
  MAD: { label: "MAD", lowerBetter: true, format: ".2f" },
  NLL: { label: "NLL", lowerBetter: true, format: ".2f" },
  Pinball_10: { label: "Pinball 10%", lowerBetter: true, format: ".2f" },
  Pinball_50: { label: "Pinball 50%", lowerBetter: true, format: ".2f" },
  Pinball_90: { label: "Pinball 90%", lowerBetter: true, format: ".2f" },
  Avg_Pinball: { label: "Avg Pinball", lowerBetter: true, format: ".2f" },
  training_time: { label: "Training Time (s)", lowerBetter: true, format: ".1f" },
};

export const MODEL_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#e11d48", "#65a30d", "#c2410c", "#7c3aed",
  "#0d9488", "#d97706", "#4f46e5", "#059669", "#be123c",
];

export const KEY_METRICS = ["MAE", "RMSE", "CRPS", "R2", "PICP", "IntervalScore"];

/**
 * Maps results folder names under `results/` to thesis notebook numbers for sorting and default badges.
 * Add new folders here when notebooks write new top-level result directories.
 * `v2_vs_v21_comparison` is mapped to 39 as a placeholder until it matches a numbered notebook in the repo.
 */
export const EXPERIMENT_NOTEBOOK_MAP: Record<string, number> = {
  transformer_grid_search: 2,
  lag_study: 3,
  window_length_study: 3,
  head_study: 4,
  head_study_torch: 4,
  head_study_torch_rolling: 4,
  preprocessing_study: 5,
  preprocessing_study_online_rolling: 5,
  benchmark: 6,
  hybrid_comparison: 7,
  price_floor_comparison: 8,
  moe_comparison: 9,
  directions_210: 10,
  rolling_evaluation: 11,
  levy_processes_study: 12,
  encoder_decoder_test: 13,
  "13_improved_transformer": 13,
  keras_pytorch_jsu_10run: 14,
  train_val_test_window_study: 15,
  train_val_test_window_study_lear: 16,
  lear_transformer_ensemble: 17,
  rolling_recalibration: 19,
  probabilistic_lear_baseline: 20,
  lear_feature_transformer: 21,
  patchtst: 22,
  sequential_conformal: 23,
  dataset_v1_vs_v2: 24,
  v2_vs_v21_comparison: 39,
  transformer_optimization: 25,
  feature_selection_v2: 26,
  feature_selection_rolling: 33,
  arch_optimization_rolling: 34,
  closing_the_gap: 27,
  final_model: 28,
  val_split_trick: 29,
  dropout_model_size: 30,
  rolling_quickstart: 32,
  rolling_quickstart_pit: 32,
  rolling_pit: 32,
  rolling_pit_full: 32,
  lear_transformer_residual_rolling: 35,
  hybrid_sde_rolling: 36,
  unified_best_config_cascade: 37,
  feature_ablation_prices_vs_full: 38,
};

/**
 * Notebook 32 writes several top-level result roots (different cells). Same sort key (32), distinct badges.
 * Order here is sidebar order among notebook-32 experiments.
 */
const ROLLING_NOTEBOOK_32_ORDER: string[] = [
  "rolling_quickstart",
  "rolling_quickstart_pit",
  "rolling_pit",
  "rolling_pit_full",
];

/** Overrides numeric badge when one notebook maps to several result folders (see ROLLING_NOTEBOOK_32_ORDER). */
export const EXPERIMENT_NOTEBOOK_BADGE: Partial<Record<string, string>> = {
  rolling_quickstart: "32·1",
  rolling_quickstart_pit: "32·2",
  rolling_pit: "32·2b",
  rolling_pit_full: "32·3",
};

function notebook32TieIndex(experimentName: string): number {
  const i = ROLLING_NOTEBOOK_32_ORDER.indexOf(experimentName);
  return i === -1 ? 999 : i;
}

/** Sort key: primary notebook number, then tie-break (e.g. notebook 32 variants). */
export function compareExperimentsByNotebook(aName: string, bName: string): number {
  const na = EXPERIMENT_NOTEBOOK_MAP[aName] ?? 999;
  const nb = EXPERIMENT_NOTEBOOK_MAP[bName] ?? 999;
  if (na !== nb) return na - nb;
  if (na === 32) {
    const ta = notebook32TieIndex(aName);
    const tb = notebook32TieIndex(bName);
    if (ta !== tb) return ta - tb;
  }
  return aName.localeCompare(bName);
}

/** Short badge for the experiments list (number, or disambiguated label for multi-folder notebooks). */
export function getExperimentNotebookBadge(experimentName: string): string | null {
  const custom = EXPERIMENT_NOTEBOOK_BADGE[experimentName];
  if (custom != null) return custom;
  const n = EXPERIMENT_NOTEBOOK_MAP[experimentName];
  return n !== undefined ? String(n) : null;
}
