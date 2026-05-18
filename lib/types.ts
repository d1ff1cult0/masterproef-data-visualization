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
 * Top-level result folders produced or consumed by the active notebooks in
 * `notebooks/Nb*.ipynb`. This is also the dashboard allowlist; folders only
 * referenced by `notebooks/legacy/` should not appear in the sidebar.
 */
export const EXPERIMENT_NOTEBOOK_MAP: Record<string, number> = {
  head_study: 2,
  head_study_torch: 2,
  head_study_torch_rolling: 2,

  transformer_grid_search: 3,
  window_length_study: 3,
  transformer_optimization: 3,
  dropout_model_size: 3,
  arch_optimization_rolling: 3,

  rolling_evaluation: 4,
  rolling_recalibration: 4,

  preprocessing_study_online_rolling: 5,

  probabilistic_lear_baseline: 6,
  lear_transformer_residual_rolling: 6,
  "13_improved_transformer": 6,

  dataset_v1_vs_v2: 7,
  feature_selection_v2: 7,
  feature_selection_rolling: 7,
  feature_ablation_prices_vs_full: 7,

  directions_210: 8,
  price_floor_comparison: 8,
  lear_transformer_ensemble: 8,
  closing_the_gap: 8,
  unified_best_config_cascade: 8,

  benchmark: 9,
  hybrid_comparison: 9,
  moe_comparison: 9,
  levy_processes_study: 9,
  hybrid_sde_rolling: 9,
  patchtst: 9,

  sequential_conformal: 10,

  keras_pytorch_jsu_10run: 11,
  train_val_test_window_study: 11,
  train_val_test_window_study_lear: 11,
  val_split_trick: 11,

  rolling_quickstart: 12,
  rolling_quickstart_pit: 12,
  rolling_pit_full: 12,
  final_model: 12,

  lear_informed_transformer: 13,
  reported_results: 14,
  perhour_conformal: 15,
  ensemble_probabilistic: 16,
  rolling_transformer_differencing_jsu_param_average: 17,
};

export const ACTIVE_EXPERIMENT_NAMES = Object.keys(EXPERIMENT_NOTEBOOK_MAP);

const EXPERIMENT_TIE_ORDER: Record<string, number> = {
  head_study: 1,
  head_study_torch: 2,
  head_study_torch_rolling: 3,

  transformer_grid_search: 1,
  window_length_study: 2,
  transformer_optimization: 3,
  dropout_model_size: 4,
  arch_optimization_rolling: 5,

  rolling_evaluation: 1,
  rolling_recalibration: 2,

  probabilistic_lear_baseline: 1,
  lear_transformer_residual_rolling: 2,
  "13_improved_transformer": 3,

  dataset_v1_vs_v2: 1,
  feature_selection_v2: 2,
  feature_selection_rolling: 3,
  feature_ablation_prices_vs_full: 4,

  directions_210: 1,
  price_floor_comparison: 2,
  lear_transformer_ensemble: 3,
  closing_the_gap: 4,
  unified_best_config_cascade: 5,

  benchmark: 1,
  hybrid_comparison: 2,
  moe_comparison: 3,
  levy_processes_study: 4,
  hybrid_sde_rolling: 5,
  patchtst: 6,

  keras_pytorch_jsu_10run: 1,
  train_val_test_window_study: 2,
  train_val_test_window_study_lear: 3,
  val_split_trick: 4,

  rolling_quickstart: 1,
  rolling_quickstart_pit: 2,
  rolling_pit_full: 3,
  final_model: 4,
};

/** Overrides numeric badge when one notebook maps to several result folders. */
export const EXPERIMENT_NOTEBOOK_BADGE: Partial<Record<string, string>> = {
  head_study: "2·1",
  head_study_torch: "2·2",
  head_study_torch_rolling: "2·3",
  transformer_grid_search: "3·1",
  window_length_study: "3·2",
  transformer_optimization: "3·3",
  dropout_model_size: "3·4",
  arch_optimization_rolling: "3·5",
  rolling_evaluation: "4·1",
  rolling_recalibration: "4·2",
  probabilistic_lear_baseline: "6·1",
  lear_transformer_residual_rolling: "6·2",
  "13_improved_transformer": "6·3",
  dataset_v1_vs_v2: "7·1",
  feature_selection_v2: "7·2",
  feature_selection_rolling: "7·3",
  feature_ablation_prices_vs_full: "7·4",
  directions_210: "8·1",
  price_floor_comparison: "8·2",
  lear_transformer_ensemble: "8·3",
  closing_the_gap: "8·4",
  unified_best_config_cascade: "8·5",
  benchmark: "9·1",
  hybrid_comparison: "9·2",
  moe_comparison: "9·3",
  levy_processes_study: "9·4",
  hybrid_sde_rolling: "9·5",
  patchtst: "9·6",
  keras_pytorch_jsu_10run: "11·1",
  train_val_test_window_study: "11·2",
  train_val_test_window_study_lear: "11·3",
  val_split_trick: "11·4",
  rolling_quickstart: "12·1",
  rolling_quickstart_pit: "12·2",
  rolling_pit_full: "12·3",
  final_model: "12·4",
};

/** Sort key: primary notebook number, then the active-notebook folder order. */
export function compareExperimentsByNotebook(aName: string, bName: string): number {
  const na = EXPERIMENT_NOTEBOOK_MAP[aName] ?? 999;
  const nb = EXPERIMENT_NOTEBOOK_MAP[bName] ?? 999;
  if (na !== nb) return na - nb;
  const ta = EXPERIMENT_TIE_ORDER[aName] ?? 999;
  const tb = EXPERIMENT_TIE_ORDER[bName] ?? 999;
  if (ta !== tb) return ta - tb;
  return aName.localeCompare(bName);
}

/** Short badge for the experiments list (number, or disambiguated label for multi-folder notebooks). */
export function getExperimentNotebookBadge(experimentName: string): string | null {
  const custom = EXPERIMENT_NOTEBOOK_BADGE[experimentName];
  if (custom != null) return custom;
  const n = EXPERIMENT_NOTEBOOK_MAP[experimentName];
  return n !== undefined ? String(n) : null;
}
