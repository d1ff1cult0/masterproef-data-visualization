/**
 * Experiment methodology configuration.
 * Mirrors config.py and core/experiment_utils.py for display on the landing page.
 */

export const METHODOLOGY = {
  dataset: {
    name: "BE_ENTSOE",
    description: "Belgian electricity prices from ENTSO-E",
  },
  dataSplit: {
    trainStart: "2023-02-01",
    trainEnd: "2025-05-01",
    valStart: "2025-05-02",
    valEnd: "2025-07-31",
    testStart: "2025-08-01",
    testEnd: "2026-01-31",
    validationFraction: 0.1,
    testDurationMonths: 6,
  },
  sequenceConfig: {
    inputWindow: 168,
    outputHorizon: 24,
    inputWindowDescription: "168 hours (7 days)",
    outputHorizonDescription: "24 hours (1 day)",
  },
  modelConfig: {
    description: "Optimized via grid search (Notebook 2)",
    d_model: 224,
    num_heads: 7,
    num_layers: 3,
    ff_dim: 256,
    dropout: 0.15,
  },
  trainingConfig: {
    batch_size: 32,
    epochs: 30,
    learning_rate: "7e-4",
    patience: 5,
    n_runs: 10,
    random_state: 42,
  },
  preprocessing: {
    default: "Standard scaling (QuantileTransformer Normal for some experiments)",
  },
} as const;
