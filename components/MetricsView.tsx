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
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";
import type { SelectedModel, MetricsResponse, RunMetrics } from "@/lib/types";
import { METRIC_LABELS, KEY_METRICS } from "@/lib/types";
import { pairedTTest } from "@/lib/stats";
import { ExportableChart } from "./ExportableChart";

interface MetricsViewProps {
  selectedModels: SelectedModel[];
}

interface ModelMetrics {
  key: string;
  label: string;
  color: string;
  summary: { avg: RunMetrics; std: RunMetrics } | null;
  runs: RunMetrics[];
}

const SCATTER_METRIC_OPTIONS = ["MAE", "RMSE", "CRPS", "PICP", "R2", "IntervalScore"];

export default function MetricsView({ selectedModels }: MetricsViewProps) {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(KEY_METRICS);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [scatterMetric, setScatterMetric] = useState<string>("MAE");

  useEffect(() => {
    if (selectedModels.length === 0) return;
    setLoading(true);

    const fetches = selectedModels.map((m) =>
      fetch(`/api/metrics?experiment=${encodeURIComponent(m.experiment)}&model=${encodeURIComponent(m.model)}`)
        .then((r) => r.json())
        .then((data: MetricsResponse) => ({
          key: `${m.experiment}/${m.model}`,
          label: m.model.replace(/_/g, " "),
          color: m.color,
          summary: data.summary ? { avg: data.summary.avg, std: data.summary.std } : null,
          runs: data.runs,
        }))
    );

    Promise.all(fetches)
      .then(setModelMetrics)
      .finally(() => setLoading(false));
  }, [selectedModels]);

  const allMetricKeys = useMemo(() => {
    if (modelMetrics.length === 0) return [];
    const keys = new Set<string>();
    for (const m of modelMetrics) {
      const source = m.summary?.avg ?? m.runs[0];
      if (source) Object.keys(source).forEach((k) => keys.add(k));
    }
    return Array.from(keys).filter((k) => k in METRIC_LABELS);
  }, [modelMetrics]);

  const displayMetrics = showAllMetrics ? allMetricKeys : selectedMetrics;

  const scatterData = useMemo(() => {
    return modelMetrics.map((m) => {
      const trainTime = m.summary?.avg?.training_time ?? m.runs[0]?.training_time ?? 0;
      const metricVal = m.summary?.avg?.[scatterMetric] ?? m.runs[0]?.[scatterMetric] ?? 0;
      return {
        name: m.label,
        x: trainTime,
        y: metricVal,
        fill: m.color,
      };
    });
  }, [modelMetrics, scatterMetric]);

  const tTestResults = useMemo(() => {
    const results: { metric: string; modelA: string; modelB: string; result: NonNullable<ReturnType<typeof pairedTTest>> }[] = [];
    for (let i = 0; i < modelMetrics.length; i++) {
      for (let j = i + 1; j < modelMetrics.length; j++) {
        const ma = modelMetrics[i];
        const mb = modelMetrics[j];
        for (const metric of KEY_METRICS) {
          const runsA = ma.runs.map((r) => r[metric]).filter((v) => v != null && !Number.isNaN(v));
          const runsB = mb.runs.map((r) => r[metric]).filter((v) => v != null && !Number.isNaN(v));
          const meta = METRIC_LABELS[metric];
          const res = pairedTTest(runsA, runsB, meta?.lowerBetter ?? true);
          if (res != null) {
            results.push({
              metric,
              modelA: ma.label,
              modelB: mb.label,
              result: res,
            });
          }
        }
      }
    }
    return results;
  }, [modelMetrics]);

  const formatValue = (val: number | null | undefined, metric: string): string => {
    if (val === null || val === undefined) return "N/A";
    const meta = METRIC_LABELS[metric];
    if (!meta) return val.toFixed(2);
    const fmtMatch = meta.format.match(/\.(\d+)f/);
    const decimals = fmtMatch ? parseInt(fmtMatch[1]) : 2;
    return val.toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-500">Loading metrics...</div>
      </div>
    );
  }

  if (modelMetrics.length === 0) return null;

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Metrics Comparison
        </h2>
        <button
          onClick={() => setShowAllMetrics(!showAllMetrics)}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          {showAllMetrics ? "Show Key Metrics" : "Show All Metrics"}
        </button>
      </div>

      {!showAllMetrics && (
        <div className="flex flex-wrap gap-1.5">
          {allMetricKeys.map((key) => (
            <button
              key={key}
              onClick={() =>
                setSelectedMetrics((prev) =>
                  prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                )
              }
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                selectedMetrics.includes(key)
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {METRIC_LABELS[key]?.label ?? key}
            </button>
          ))}
        </div>
      )}

      {/* Scatter: Training time vs metric */}
      <ExportableChart title="Training Time vs Metric" filename="scatter-chart">
      <div className="border border-zinc-200 rounded-lg p-4 bg-white">
        <div className="chart-export-exclude flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-700">
            Training Time vs Metric
          </h3>
          <select
            value={scatterMetric}
            onChange={(e) => setScatterMetric(e.target.value)}
            className="text-xs px-2 py-1.5 rounded border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SCATTER_METRIC_OPTIONS.filter((k) => k in METRIC_LABELS).map((k) => (
              <option key={k} value={k}>
                {METRIC_LABELS[k]?.label ?? k} (Y-axis)
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              type="number"
              dataKey="x"
              name="Training Time"
              unit="s"
              tick={{ fontSize: 10, fill: "#71717a" }}
              stroke="#d4d4d8"
            />
            <YAxis
              type="number"
              dataKey="y"
              name={METRIC_LABELS[scatterMetric]?.label ?? scatterMetric}
              tick={{ fontSize: 10, fill: "#71717a" }}
              stroke="#d4d4d8"
            />
            <ZAxis type="number" range={[50, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                fontSize: 11,
                backgroundColor: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 6,
              }}
              formatter={(value, name, props) => {
                const p = (props as { payload?: { x?: number } })?.payload;
                if (name === "x") return [p?.x != null ? p.x.toFixed(1) + " s" : String(value), "Training Time"];
                if (name === "y") return [value != null ? Number(value).toFixed(3) : String(value), METRIC_LABELS[scatterMetric]?.label ?? scatterMetric];
                return [value, name];
              }}
              labelFormatter={(_, payload) => (payload as unknown as { payload?: { name?: string } }[])?.[0]?.payload?.name ?? ""}
            />
            {modelMetrics.map((m, i) => (
              <Scatter
                key={m.key}
                name={m.label}
                data={scatterData.filter((d) => d.name === m.label)}
                fill={m.color}
                fillOpacity={0.8}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      </ExportableChart>

      {/* Paired t-test results */}
      {tTestResults.length > 0 && (
        <div className="border border-zinc-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">
            Paired t-Test (p &lt; 0.05)
          </h3>
          <p className="text-xs text-zinc-500 mb-3">
            Compares models across runs. Significant difference indicates one model is statistically better.
          </p>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200">
                  <th className="text-left py-2 px-2 font-medium">Metric</th>
                  <th className="text-left py-2 px-2 font-medium">Model A</th>
                  <th className="text-left py-2 px-2 font-medium">Model B</th>
                  <th className="text-right py-2 px-2 font-medium">t</th>
                  <th className="text-right py-2 px-2 font-medium">df</th>
                  <th className="text-center py-2 px-2 font-medium">Winner</th>
                </tr>
              </thead>
              <tbody>
                {tTestResults.map((r, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 text-zinc-600">
                    <td className="py-1.5 px-2">{METRIC_LABELS[r.metric]?.label ?? r.metric}</td>
                    <td className="py-1.5 px-2">{r.modelA}</td>
                    <td className="py-1.5 px-2">{r.modelB}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{r.result.tStat.toFixed(2)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{r.result.df}</td>
                    <td className="text-center py-1.5 px-2">
                      {r.result.pSignificant ? (
                        <span className={`font-medium ${r.result.winner === "A" ? "text-blue-600" : r.result.winner === "B" ? "text-emerald-600" : "text-zinc-500"}`}>
                          {r.result.winner === "A" ? r.modelA : r.result.winner === "B" ? r.modelB : "—"}
                        </span>
                      ) : (
                        <span className="text-zinc-400">No significant diff.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left py-2 px-3 font-medium text-zinc-600 text-xs">
                Metric
              </th>
              {modelMetrics.map((m) => (
                <th key={m.key} className="text-right py-2 px-3 text-xs font-medium">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-zinc-600 truncate max-w-[140px]">
                      {m.label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayMetrics.map((metric, idx) => {
              const meta = METRIC_LABELS[metric];
              const values = modelMetrics.map((m) => {
                return m.summary?.avg?.[metric] ?? m.runs[0]?.[metric] ?? null;
              });
              const validValues = values.filter((v): v is number => v !== null);
              const best = meta?.lowerBetter
                ? Math.min(...validValues)
                : Math.max(...validValues);

              return (
                <tr
                  key={metric}
                  className={`border-b border-zinc-100 ${
                    idx % 2 === 0 ? "" : "bg-zinc-50/50"
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-zinc-700 text-xs">
                    {meta?.label ?? metric}
                    {meta && (
                      <span className="ml-1 text-zinc-400">
                        ({meta.lowerBetter ? "lower better" : "higher better"})
                      </span>
                    )}
                  </td>
                  {modelMetrics.map((m, mIdx) => {
                    const val = values[mIdx];
                    const std = m.summary?.std?.[metric];
                    const isBest = val !== null && val === best;

                    return (
                      <td
                        key={m.key}
                        className={`py-2 px-3 text-right text-xs tabular-nums ${
                          isBest
                            ? "font-semibold text-emerald-600"
                            : "text-zinc-600"
                        }`}
                      >
                        {formatValue(val, metric)}
                        {std !== undefined && std !== null && (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayMetrics.map((metric) => {
          const meta = METRIC_LABELS[metric];
          const barData = modelMetrics.map((m) => ({
            name: m.label.length > 20 ? m.label.substring(0, 20) + "..." : m.label,
            value: m.summary?.avg?.[metric] ?? m.runs[0]?.[metric] ?? 0,
            std: m.summary?.std?.[metric] ?? 0,
            color: m.color,
          }));

          return (
            <ExportableChart
              key={metric}
              title={meta?.label ?? metric}
              filename={`metric-${metric}`}
            >
            <div className="border border-zinc-200 rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} stroke="#d4d4d8" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10, fill: "#71717a" }}
                    width={100}
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
                      const v = Number(value);
                      const std = (props.payload as Record<string, number>)?.std ?? 0;
                      return [`${v.toFixed(3)} ± ${std.toFixed(3)}`, meta?.label ?? metric];
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </ExportableChart>
          );
        })}
      </div>

      {modelMetrics.some((m) => m.runs.length > 1) && (
        <div className="border border-zinc-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">
            Per-Run Breakdown
          </h3>
          {modelMetrics
            .filter((m) => m.runs.length > 1)
            .map((m) => (
              <div key={m.key} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-xs font-medium text-zinc-600">{m.label}</span>
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
      )}
    </div>
  );
}
