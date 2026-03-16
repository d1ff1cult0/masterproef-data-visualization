"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { ZoomableTimeSeriesChart } from "./ZoomableTimeSeriesChart";
import { METHODOLOGY } from "@/lib/methodology";

const TRAIN_COLOR = "#2563eb";
const VAL_COLOR = "#16a34a";
const TEST_COLOR = "#dc2626";

function parseDate(s: string): number {
  return new Date(s + "T00:00:00Z").getTime();
}

export default function MethodologySection() {
  const { dataSplit, sequenceConfig, modelConfig, trainingConfig } = METHODOLOGY;
  const [priceSeries, setPriceSeries] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/price-timeline")
      .then((r) => r.json())
      .then((data) => setPriceSeries(data.series ?? []))
      .catch(() => setPriceSeries([]))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Data split timeline with price time series */}
      <div className="border border-zinc-200 rounded-lg p-4 bg-white">
        <h3 className="text-sm font-medium text-zinc-700 mb-4">
          Data Split Timeline
        </h3>
        <div className="space-y-3">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
              Loading price data…
            </div>
          ) : priceSeries.length > 0 ? (
            <ZoomableTimeSeriesChart
              data={priceSeries}
              xDataKey="date"
              height={220}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              chartType="LineChart"
              formatXLabel={(v) =>
                new Date(v + "T00:00:00Z").toLocaleDateString("en-GB", {
                  month: "short",
                  year: "2-digit",
                })
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                type="category"
                tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={(v) =>
                  new Date(v + "T00:00:00Z").toLocaleDateString("en-GB", {
                    month: "short",
                    year: "2-digit",
                  })
                }
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#71717a" }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: 6,
                }}
                labelFormatter={(label) =>
                  new Date(label + "T00:00:00Z").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                }
                formatter={(value: unknown) => [`€${Number(value ?? 0).toFixed(2)}`, "Daily avg"]}
              />
              <ReferenceArea
                x1={dataSplit.trainStart}
                x2={dataSplit.trainEnd}
                fill={TRAIN_COLOR}
                fillOpacity={0.2}
              />
              <ReferenceArea
                x1={dataSplit.valStart}
                x2={dataSplit.valEnd}
                fill={VAL_COLOR}
                fillOpacity={0.2}
              />
              <ReferenceArea
                x1={dataSplit.testStart}
                x2={dataSplit.testEnd}
                fill={TEST_COLOR}
                fillOpacity={0.2}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#18181b"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            </ZoomableTimeSeriesChart>
          ) : (
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
                  title={`${seg.label}: ${new Date(seg.start).toLocaleDateString()} – ${new Date(seg.end).toLocaleDateString()}`}
                />
              ))}
            </div>
          )}
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
