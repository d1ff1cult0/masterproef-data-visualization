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

export interface NotebookExperimentGroup {
  name: string;
  notebook: number;
  displayName: string;
  resultFolders: string[];
}

/**
 * Sidebar contract: exactly the active notebooks that live directly under
 * `notebooks/`, excluding `Nb01_EDA.ipynb` because it is data analysis only.
 */
export const NOTEBOOK_EXPERIMENT_GROUPS: NotebookExperimentGroup[] = [
  {
    name: "nb02_output_head_study",
    notebook: 2,
    displayName: "Output Head Study",
    resultFolders: ["head_study_torch"],
  },
  {
    name: "nb03_architecture_optimization",
    notebook: 3,
    displayName: "Architecture Optimization",
    resultFolders: [
      "transformer_grid_search",
      "window_length_study",
      "transformer_optimization",
      "dropout_model_size",
      "arch_optimization_rolling",
    ],
  },
  {
    name: "nb04_rolling_recalibration",
    notebook: 4,
    displayName: "Rolling Recalibration",
    resultFolders: ["rolling_evaluation", "rolling_recalibration"],
  },
  {
    name: "nb05_preprocessing",
    notebook: 5,
    displayName: "Preprocessing",
    resultFolders: ["preprocessing_study_online_rolling"],
  },
  {
    name: "nb06_lear_benchmark",
    notebook: 6,
    displayName: "LEAR Benchmark",
    resultFolders: ["probabilistic_lear_baseline", "lear_transformer_residual_rolling"],
  },
  {
    name: "nb07_feature_selection",
    notebook: 7,
    displayName: "Feature Selection",
    resultFolders: [
      "dataset_v1_vs_v2",
      "feature_selection_v2",
      "feature_selection_rolling",
      "feature_ablation_prices_vs_full",
    ],
  },
  {
    name: "nb08_ensemble_methods",
    notebook: 8,
    displayName: "Ensemble Methods",
    resultFolders: [
      "directions_210",
      "price_floor_comparison",
      "lear_transformer_ensemble",
      "closing_the_gap",
      "unified_best_config_cascade",
    ],
  },
  {
    name: "nb09_alternative_architectures",
    notebook: 9,
    displayName: "Alternative Architectures",
    resultFolders: [
      "benchmark",
      "hybrid_comparison",
      "moe_comparison",
      "levy_processes_study",
      "hybrid_sde_rolling",
    ],
  },
  {
    name: "nb10_conformal_calibration",
    notebook: 10,
    displayName: "Conformal Calibration",
    resultFolders: ["sequential_conformal"],
  },
  {
    name: "nb11_methodology",
    notebook: 11,
    displayName: "Methodology",
    resultFolders: ["keras_pytorch_jsu_10run", "train_val_test_window_study", "val_split_trick"],
  },
  {
    name: "nb12_final_results",
    notebook: 12,
    displayName: "Final Results",
    resultFolders: ["rolling_quickstart", "rolling_quickstart_pit", "final_model"],
  },
  {
    name: "nb13_lear_informed_transformer",
    notebook: 13,
    displayName: "LEAR Informed Transformer",
    resultFolders: ["lear_informed_transformer"],
  },
  {
    name: "nb14_reported_results",
    notebook: 14,
    displayName: "Reported Results",
    resultFolders: ["reported_results"],
  },
  {
    name: "nb15_perhour_conformal",
    notebook: 15,
    displayName: "Per-Hour Conformal",
    resultFolders: ["perhour_conformal"],
  },
  {
    name: "nb16_ensemble_probabilistic",
    notebook: 16,
    displayName: "Ensemble Probabilistic",
    resultFolders: ["ensemble_probabilistic"],
  },
  {
    name: "nb17_rolling_transformer_differencing_jsu_param_average",
    notebook: 17,
    displayName: "Rolling Transformer Differencing JSU Param Average",
    resultFolders: ["rolling_transformer_differencing_jsu_param_average"],
  },
];

export const ACTIVE_EXPERIMENT_NAMES = NOTEBOOK_EXPERIMENT_GROUPS.map((group) => group.name);

export const EXPERIMENT_NOTEBOOK_MAP: Record<string, number> = Object.fromEntries(
  NOTEBOOK_EXPERIMENT_GROUPS.map((group) => [group.name, group.notebook])
);

const EXPERIMENT_TIE_ORDER: Record<string, number> = Object.fromEntries(
  NOTEBOOK_EXPERIMENT_GROUPS.map((group, index) => [group.name, index])
);

export const EXPERIMENT_NOTEBOOK_BADGE: Partial<Record<string, string>> = {};

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
