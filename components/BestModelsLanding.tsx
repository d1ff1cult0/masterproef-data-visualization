"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SelectedModel } from "@/lib/types";
import {
  METRIC_LABELS,
  KEY_METRICS,
  MODEL_COLORS,
  getExperimentNotebookBadge,
} from "@/lib/types";
import MethodologySection from "./MethodologySection";
import { ExportableChart } from "./ExportableChart";

interface BestModelEntry {
  experiment: string;
  model: string;
  experimentDisplayName: string;
  modelDisplayName: string;
  rank: number;
  mae: number;
  summary: { avg: Record<string, number>; std?: Record<string, number>; n_runs: number } | null;
  runs: Record<string, number>[];
}

interface BestModelsLandingProps {
  onCompareInDashboard?: (models: SelectedModel[]) => void;
}

const ALL_DISPLAY_METRICS = [
  "MAE",
  "RMSE",
  "MSE",
  "MAPE",
  "R2",
  "PICP",
  "MPIW",
  "PINAW",
  "IntervalScore",
  "CRPS",
  "NLL",
  "Pinball_10",
  "Pinball_50",
  "Pinball_90",
  "Avg_Pinball",
  "training_time",
];

function formatValue(val: number | null | undefined, metric: string): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  const meta = METRIC_LABELS[metric];
  if (!meta) return val.toFixed(2);
  const fmtMatch = meta.format.match(/\.(\d+)f/);
  const decimals = fmtMatch ? parseInt(fmtMatch[1]) : 2;
  return val.toFixed(decimals);
}

function getValue(entry: BestModelEntry, metric: string): number | null {
  const avg = entry.summary?.avg?.[metric];
  if (avg != null && !Number.isNaN(avg)) return avg;
  if (entry.runs.length > 0) {
    const vals = entry.runs.map((r) => r[metric]).filter((v) => v != null && !Number.isNaN(v));
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return null;
}

function getStd(entry: BestModelEntry, metric: string): number | null {
  const std = entry.summary?.std?.[metric];
  if (std != null && !Number.isNaN(std)) return std;
  if (entry.runs.length > 1) {
    const vals = entry.runs.map((r) => r[metric]).filter((v) => v != null && !Number.isNaN(v));
    if (vals.length < 2) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    return Math.sqrt(variance);
  }
  return null;
}

const METRIC_OPTIONS = ["MAE", "RMSE", "CRPS", "R2", "PICP", "IntervalScore", "MAPE", "MSE", "MPIW", "PINAW"];

export default function BestModelsLanding({ onCompareInDashboard }: BestModelsLandingProps) {
  const [models, setModels] = useState<BestModelEntry[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("MAE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/best-models?n=10&metric=${encodeURIComponent(selectedMetric)}`)
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models ?? []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load best models");
        setModels([]);
      })
      .finally(() => setLoading(false));
  }, [selectedMetric]);

  const top10Models = models.slice(0, 10);
  const top5Models = models.slice(0, 5);
  const modelColors = useMemo(() => {
    return models.map((_, i) => MODEL_COLORS[i % MODEL_COLORS.length]);
  }, [models]);

  const TOP10_TABLE_METRICS = ["MAE", "RMSE", "CRPS", "MPIW", "PICP", "IntervalScore"];

  const handleCompareInDashboard = () => {
    if (!onCompareInDashboard || top5Models.length === 0) return;
    const selected: SelectedModel[] = top5Models.map((m, i) => ({
      experiment: m.experiment,
      model: m.model,
      run: "average",
      color: modelColors[i],
    }));
    onCompareInDashboard(selected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-zinc-500">Loading best models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-zinc-500">
          Ensure the results directory exists and contains experiment data.
        </p>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-zinc-600">No model results found on disk.</p>
        <p className="text-xs text-zinc-500">
          Run experiments first, then the best 5 models will appear here.
        </p>
      </div>
    );
  }

  const barDataByMetric = KEY_METRICS.map((metric) => {
    const meta = METRIC_LABELS[metric];
    const values = top5Models.map((m) => getValue(m, metric));
    const validValues = values.filter((v): v is number => v != null);
    const best = meta?.lowerBetter
      ? Math.min(...validValues)
      : Math.max(...validValues);

    return {
      metric,
      label: meta?.label ?? metric,
      data: top5Models.map((m, i) => ({
        name: m.modelDisplayName.replace(/_/g, " "),
        shortName: m.modelDisplayName.length > 20
          ? m.modelDisplayName.substring(0, 18) + "…"
          : m.modelDisplayName.replace(/_/g, " "),
        value: getValue(m, metric) ?? 0,
        std: getStd(m, metric) ?? 0,
        color: modelColors[i],
        isBest: (getValue(m, metric) ?? NaN) === best && validValues.length > 0,
      })),
    };
  });

  return (
    <div className="p-6 space-y-8 max-w-full">
      <MethodologySection />

      {/* Top 10 models comparison table */}
      {top10Models.length > 0 && (
        <div className="border-t border-zinc-200 pt-8">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Top 10 Models — Key Metrics
          </h2>
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="text-left py-2.5 px-4 font-medium text-zinc-600 text-xs w-8">#</th>
                    <th className="text-left py-2.5 px-4 font-medium text-zinc-600 text-xs min-w-[140px]">Model</th>
                    {TOP10_TABLE_METRICS.map((m) => (
                      <th key={m} className="text-right py-2.5 px-4 text-xs font-medium text-zinc-600">
                        {METRIC_LABELS[m]?.label ?? m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top10Models.map((m, i) => {
                    const notebookBadge = getExperimentNotebookBadge(m.experiment);
                    return (
                      <tr key={`${m.experiment}/${m.model}`} className="border-b border-zinc-100">
                        <td className="py-2 px-4 font-medium text-zinc-500 text-xs">{m.rank}</td>
                        <td className="py-2 px-4 font-medium text-zinc-700 text-xs">
                          <span className="truncate block max-w-[180px]" title={m.modelDisplayName}>
                            {m.modelDisplayName.replace(/_/g, " ")}
                          </span>
                          {notebookBadge != null && (
                            <span className="text-zinc-400 text-xs font-normal block">
                              Notebook {notebookBadge}
                            </span>
                          )}
                        </td>
                        {TOP10_TABLE_METRICS.map((metric) => {
                          const val = getValue(m, metric);
                          const std = getStd(m, metric);
                          return (
                            <td key={metric} className="py-2 px-4 text-right text-xs tabular-nums text-zinc-600">
                              {formatValue(val, metric)}
                              {std != null && std > 0 && (
                                <span className="text-zinc-400 ml-1">± {formatValue(std, metric)}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Top 5 Models by {METRIC_LABELS[selectedMetric]?.label ?? selectedMetric}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Best-performing models across all experiments, ranked by your selected metric.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="metric-select" className="text-sm font-medium text-zinc-600">
              Rank by:
            </label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="text-sm border border-zinc-300 rounded-md px-3 py-1.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABELS[m]?.label ?? m}
                </option>
              ))}
            </select>
            {onCompareInDashboard && (
            <button
              onClick={handleCompareInDashboard}
              className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Compare in Dashboard
            </button>
          )}
          </div>
        </div>

      {/* Rank cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {top5Models.map((m, i) => {
          const notebookBadge = getExperimentNotebookBadge(m.experiment);
          return (
            <div
              key={`${m.experiment}/${m.model}`}
              className="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: modelColors[i] }}
                >
                  #{m.rank}
                </span>
                <span className="text-xs text-zinc-500">
                  {notebookBadge != null ? `Notebook ${notebookBadge}` : m.experimentDisplayName}
                </span>
              </div>
              <h3 className="font-medium text-zinc-900 text-sm truncate" title={m.modelDisplayName}>
                {m.modelDisplayName.replace(/_/g, " ")}
              </h3>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{METRIC_LABELS[selectedMetric]?.label ?? selectedMetric}</span>
                  <span className="font-medium tabular-nums text-zinc-700">
                    {formatValue(getValue(m, selectedMetric), selectedMetric)}
                  </span>
                </div>
                {KEY_METRICS.filter((k) => k !== selectedMetric).slice(0, 3).map((k) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-500">{METRIC_LABELS[k]?.label ?? k}</span>
                    <span className="tabular-nums text-zinc-600">
                      {formatValue(getValue(m, k), k)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar charts for key metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {barDataByMetric.map(({ metric, label, data }) => (
          <ExportableChart key={metric} title={label} filename={`best-models-${metric}`}>
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  stroke="#d4d4d8"
                />
                <YAxis
                  dataKey="shortName"
                  type="category"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  width={120}
                  stroke="#d4d4d8"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 6,
                  }}
                  formatter={(value, _name, props) => {
                    const payload = props.payload as { value: number; std: number; isBest?: boolean };
                    const std = payload?.std ?? 0;
                    const suffix = payload?.isBest ? " ★" : "";
                    return [`${Number(value).toFixed(3)} ± ${std.toFixed(3)}${suffix}`, label];
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      stroke={entry.isBest ? "#0d9488" : "none"}
                      strokeWidth={entry.isBest ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </ExportableChart>
        ))}
      </div>

      {/* Full metrics table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-700">
            Full Metrics Table
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left py-2.5 px-4 font-medium text-zinc-600 text-xs w-40">
                  Metric
                </th>
                {top5Models.map((m, i) => (
                  <th key={i} className="text-right py-2.5 px-4 text-xs font-medium">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: modelColors[i] }}
                      />
                      <span className="text-zinc-600 truncate max-w-[140px]">
                        {m.modelDisplayName.replace(/_/g, " ")}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_DISPLAY_METRICS.map((metric, idx) => {
                const meta = METRIC_LABELS[metric];
                const values = top5Models.map((m) => getValue(m, metric));
                const validValues = values.filter((v): v is number => v != null);
                const best =
                  meta?.lowerBetter
                    ? Math.min(...validValues)
                    : Math.max(...validValues);

                return (
                  <tr
                    key={metric}
                    className={`border-b border-zinc-100 ${
                      idx % 2 === 0 ? "" : "bg-zinc-50/50"
                    }`}
                  >
                    <td className="py-2 px-4 font-medium text-zinc-700 text-xs">
                      {meta?.label ?? metric}
                      {meta && (
                        <span className="ml-1 text-zinc-400 font-normal">
                          ({meta.lowerBetter ? "↓" : "↑"})
                        </span>
                      )}
                    </td>
                    {top5Models.map((m, mIdx) => {
                      const val = values[mIdx];
                      const std = getStd(m, metric);
                      const isBest = val != null && val === best && validValues.length > 0;

                      return (
                        <td
                          key={mIdx}
                          className={`py-2 px-4 text-right text-xs tabular-nums ${
                            isBest ? "font-semibold text-emerald-600" : "text-zinc-600"
                          }`}
                        >
                          {formatValue(val, metric)}
                          {std != null && std > 0 && (
                            <span className="text-zinc-400 ml-1">
                              ± {formatValue(std, metric)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-run breakdown for models with multiple runs */}
      {top5Models.some((m) => m.runs.length > 1) && (
        <div className="border border-zinc-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">
            Per-Run Breakdown
          </h3>
          <div className="space-y-4">
            {top5Models
              .filter((m) => m.runs.length > 1)
              .map((m, i) => (
                <div key={`${m.experiment}/${m.model}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: modelColors[i] }}
                    />
                    <span className="text-xs font-medium text-zinc-600">
                      {m.modelDisplayName.replace(/_/g, " ")} ({m.runs.length} runs)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="text-left py-1 px-2 font-medium">Run</th>
                          {KEY_METRICS.map((k) => (
                            <th key={k} className="text-right py-1 px-2 font-medium">
                              {METRIC_LABELS[k]?.label ?? k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.runs.map((run, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-zinc-100 text-zinc-600"
                          >
                            <td className="py-1 px-2 font-medium">#{idx}</td>
                            {KEY_METRICS.map((k) => (
                              <td key={k} className="text-right py-1 px-2 tabular-nums">
                                {formatValue(run[k], k)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
