"use client";

import { METHODOLOGY } from "@/lib/methodology";

const TRAIN_COLOR = "#2563eb";
const VAL_COLOR = "#16a34a";
const TEST_COLOR = "#dc2626";

function parseDate(s: string): number {
  return new Date(s + "T00:00:00Z").getTime();
}

export default function MethodologySection() {
  const { dataSplit, sequenceConfig, modelConfig, trainingConfig } = METHODOLOGY;
  const start = parseDate(dataSplit.trainStart);
  const end = parseDate(dataSplit.testEnd);
  const total = end - start;

  const segments = [
    {
      label: "Train",
      start: parseDate(dataSplit.trainStart),
      end: parseDate(dataSplit.trainEnd),
      color: TRAIN_COLOR,
    },
    {
      label: "Validation",
      start: parseDate(dataSplit.valStart),
      end: parseDate(dataSplit.valEnd),
      color: VAL_COLOR,
    },
    {
      label: "Test",
      start: parseDate(dataSplit.testStart),
      end: parseDate(dataSplit.testEnd),
      color: TEST_COLOR,
    },
  ].map((s) => ({
    ...s,
    left: ((s.start - start) / total) * 100,
    width: ((s.end - s.start) / total) * 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">
          Experiment Methodology
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Standard setup used across all experiments for fair comparison.
        </p>
      </div>

      <div className="prose prose-sm max-w-none text-zinc-700 space-y-4">
        <p>
          All experiments follow a unified pipeline. Model hyperparameters were
          optimized beforehand via a grid search (Notebook 2) and are kept
          fixed across subsequent studies. Each configuration is run multiple
          times ({trainingConfig.n_runs} runs) to account for statistical
          variability; reported metrics are the mean ± standard deviation across
          runs.
        </p>
        <p>
          The dataset is split chronologically: training data from the start
          date, validation as the last {dataSplit.validationFraction * 100}% of
          the pre-test period, and test data as the final{" "}
          {dataSplit.testDurationMonths} months. This ensures no future
          information leaks into training.
        </p>
      </div>

      {/* Data split timeline */}
      <div className="border border-zinc-200 rounded-lg p-4 bg-white">
        <h3 className="text-sm font-medium text-zinc-700 mb-4">
          Data Split Timeline
        </h3>
        <div className="space-y-3">
          <div className="relative h-10 bg-zinc-100 rounded overflow-hidden">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className="absolute top-0 h-full rounded-sm transition-opacity hover:opacity-90"
                style={{
                  left: `${seg.left}%`,
                  width: `${seg.width}%`,
                  backgroundColor: seg.color,
                }}
                title={`${seg.label}: ${segments.find((s) => s.label === seg.label)?.start ? new Date(seg.start).toLocaleDateString() : ""} – ${new Date(seg.end).toLocaleDateString()}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-6 text-xs">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-zinc-600 font-medium">{seg.label}:</span>
                <span className="text-zinc-500">
                  {new Date(seg.start).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(seg.end).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parameters tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700">
              Model Parameters (Grid Search)
            </h3>
          </div>
          <dl className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">d_model</dt>
              <dd className="font-mono text-zinc-700">{modelConfig.d_model}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">num_heads</dt>
              <dd className="font-mono text-zinc-700">{modelConfig.num_heads}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">num_layers</dt>
              <dd className="font-mono text-zinc-700">{modelConfig.num_layers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">ff_dim</dt>
              <dd className="font-mono text-zinc-700">{modelConfig.ff_dim}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">dropout</dt>
              <dd className="font-mono text-zinc-700">{modelConfig.dropout}</dd>
            </div>
          </dl>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-700">
              Training & Sequence Config
            </h3>
          </div>
          <dl className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Input window</dt>
              <dd className="font-mono text-zinc-700">
                {sequenceConfig.inputWindow}h ({sequenceConfig.inputWindowDescription})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Output horizon</dt>
              <dd className="font-mono text-zinc-700">
                {sequenceConfig.outputHorizon}h ({sequenceConfig.outputHorizonDescription})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Batch size</dt>
              <dd className="font-mono text-zinc-700">{trainingConfig.batch_size}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Epochs</dt>
              <dd className="font-mono text-zinc-700">{trainingConfig.epochs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Learning rate</dt>
              <dd className="font-mono text-zinc-700">{trainingConfig.learning_rate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Early stopping patience</dt>
              <dd className="font-mono text-zinc-700">{trainingConfig.patience}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Runs per config</dt>
              <dd className="font-mono text-zinc-700">{trainingConfig.n_runs}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
